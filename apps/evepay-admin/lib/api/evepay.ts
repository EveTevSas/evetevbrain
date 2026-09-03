import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Cliente de la API de EvePay para la consola.
 *
 * Reenvía el JWT de la persona que tiene la sesión, no una credencial de
 * servicio: así la API verifica el rol en cada llamada y la auditoría puede
 * decir quién hizo qué (CA-3, CA-4). Una llave de servicio compartida haría
 * que todas las acciones parecieran del mismo actor.
 *
 * La consola NO tiene base de datos: todo lo administrable pasa por aquí.
 */

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(/\/$/, "");
}

async function tokenDeSesion(): Promise<string> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new ErrorApi("La sesión expiró. Vuelve a entrar.", 401);
  }
  return session.access_token;
}

export class ErrorApi extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "ErrorApi";
  }
}

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${baseUrl()}/v1${ruta}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${await tokenDeSesion()}`,
        ...init?.headers
      },
      cache: "no-store"
    });
  } catch {
    // Distinguir "la API no responde" de "la API dijo que no" importa: lo
    // primero se arregla levantando el servicio, lo segundo cambiando la
    // petición. Un mensaje genérico haría perder ese tiempo.
    throw new ErrorApi(`No se pudo contactar la API de EvePay en ${baseUrl()}.`, 503);
  }

  if (!respuesta.ok) {
    throw new ErrorApi(await mensajeDeError(respuesta), respuesta.status);
  }
  return (await respuesta.json()) as T;
}

async function mensajeDeError(respuesta: Response): Promise<string> {
  if (respuesta.status === 403) return "Tu cuenta no tiene permisos para esta acción.";
  if (respuesta.status === 404) return "No se encontró el recurso.";
  try {
    const cuerpo = (await respuesta.json()) as { message?: unknown };
    if (typeof cuerpo.message === "string") return cuerpo.message;
  } catch {
    // cuerpo no-JSON: nos quedamos con el genérico de abajo
  }
  return `La API respondió ${respuesta.status}.`;
}

export function apiGet<T>(ruta: string): Promise<T> {
  return pedir<T>(ruta);
}

export function apiPost<T>(ruta: string, cuerpo?: unknown): Promise<T> {
  return pedir<T>(ruta, {
    method: "POST",
    body: JSON.stringify(cuerpo ?? {})
  });
}

// --- Tipos del contrato con la API (espejo de apps/api) ---

export interface ApiKeyResumen {
  prefix: string;
  environment: string;
  activa: boolean;
}

export interface Comercio {
  tenantId: string;
  legalName: string;
  displayName: string;
  estado: string;
  creadoEn: string;
  merchantId?: string;
  merchantEstado?: string;
  apiKeys: ApiKeyResumen[];
}

export interface ComercioCreado {
  tenantId: string;
  merchantId: string;
  apiKey: string;
  testApiKey: string;
  pasoManualProveedor: string | null;
}

export interface ApiKeyRotada {
  tenantId: string;
  environment: string;
  apiKey: string;
  prefix: string;
  desactivadas: number;
}

export function listarComercios(): Promise<Comercio[]> {
  return apiGet<Comercio[]>("/admin/merchants");
}

// --- Proveedores de pago (Fase C) ---

export interface VariableConfig {
  nombre: string;
  requerida: boolean;
  presente: boolean;
  para: string;
}

export type EstadoPaso = "listo" | "pendiente" | "manual";

export interface PasoHabilitacion {
  descripcion: string;
  estado: EstadoPaso;
  nota?: string;
}

export interface ProveedorInfo {
  nombre: string;
  activo: boolean;
  descripcion: string;
  capacidades: { altaDeComercios: boolean; liquidaciones: boolean; monedas: string[] };
  configuracion: VariableConfig[];
  webhook: string | null;
  checklist: PasoHabilitacion[];
}

export interface EstadoProveedores {
  activo: string;
  proveedores: ProveedorInfo[];
}

export interface SaludProveedor {
  proveedor: string;
  ok: boolean;
  detalle: string;
  duracionMs: number;
  verificadoEn: string;
}

export function estadoProveedores(): Promise<EstadoProveedores> {
  return apiGet<EstadoProveedores>("/admin/providers");
}

// --- Pagos (Fase D) ---

export interface PagoAdmin {
  id: string;
  tenantId: string;
  tenantNombre: string;
  merchantId: string;
  montoMinor: number;
  moneda: string;
  referencia: string;
  descripcion: string | null;
  estado: string;
  provider: string;
  providerPaymentId: string | null;
  checkoutUrl?: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface PaginaPagos {
  pagos: PagoAdmin[];
  siguiente: { at: string; id: string } | null;
}

export interface EventoTimeline {
  momento: string;
  origen: "transicion" | "webhook" | "ledger";
  titulo: string;
  detalle: Record<string, unknown>;
}

export interface ResultadoReverificacion {
  paymentId: string;
  estadoLocal: string;
  estadoProveedor: string;
  cambio: boolean;
  detalle: string;
}

export function listarPagos(filtros: Record<string, string | undefined>): Promise<PaginaPagos> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(filtros)) {
    if (v) q.set(k, v);
  }
  const cadena = q.toString();
  return apiGet<PaginaPagos>(`/admin/pagos${cadena ? `?${cadena}` : ""}`);
}

export function obtenerPago(id: string): Promise<PagoAdmin> {
  return apiGet<PagoAdmin>(`/admin/pagos/${id}`);
}

export function timelinePago(id: string): Promise<EventoTimeline[]> {
  return apiGet<EventoTimeline[]>(`/admin/pagos/${id}/timeline`);
}

/** Monto en la unidad mínima. Para COP el valor face: no se inventan decimales. */
export function formatoMonto(montoMinor: number, moneda: string): string {
  if (moneda === "COP") {
    return `$ ${montoMinor.toLocaleString("es-CO")}`;
  }
  return `${(montoMinor / 100).toLocaleString("es-CO", { minimumFractionDigits: 2 })} ${moneda}`;
}

export function listarComerciosParaFiltro(): Promise<Comercio[]> {
  return listarComercios();
}

// --- Conciliación y ledger (Fase E) ---

export type ModoConciliacion = "automatica" | "no_soportada";

export interface CorridaConciliacion {
  id: string;
  tenantId: string;
  tenantNombre: string;
  desde: string;
  hasta: string;
  modo: ModoConciliacion;
  provider: string;
  conciliados: number | null;
  diferencias: number | null;
  huerfanosProveedor: number | null;
  noConciliados: number | null;
  nota: string | null;
  actor: string;
  corridoEn: string;
}

export interface SaldoCuenta {
  cuenta: string;
  debitos: number;
  creditos: number;
  saldoMinor: number;
  movimientos: number;
}

export interface AsientoLedger {
  id: string;
  paymentId: string | null;
  kind: string;
  memo: string;
  posteadoEn: string;
  lineas: { cuenta: string; direccion: string; montoMinor: number }[];
  cuadra: boolean;
}

export interface LedgerTenant {
  saldos: SaldoCuenta[];
  asientos: AsientoLedger[];
  totalDebitos: number;
  totalCreditos: number;
  cuadra: boolean;
  asientosDescuadrados: string[];
}

export function historicoConciliacion(tenantId?: string): Promise<CorridaConciliacion[]> {
  return apiGet<CorridaConciliacion[]>(
    `/admin/conciliacion/reportes${tenantId ? `?tenantId=${tenantId}` : ""}`
  );
}

export function ledgerDeComercio(tenantId: string): Promise<LedgerTenant> {
  return apiGet<LedgerTenant>(`/admin/ledger/${tenantId}`);
}
