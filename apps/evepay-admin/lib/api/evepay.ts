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

export function apiPut<T>(ruta: string, cuerpo?: unknown): Promise<T> {
  return pedir<T>(ruta, { method: "PUT", body: JSON.stringify(cuerpo ?? {}) });
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
  /** false en los comercios creados antes de que se pidiera el perfil. */
  tienePerfil: boolean;
  documento: string | null;
  nombreComercial: string | null;
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
  capacidades: {
    altaDeComercios: boolean;
    liquidaciones: boolean;
    monedas: string[];
    custodia: boolean;
    dispersion: boolean;
    metodos: string[];
  };
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

export { formatoMonto } from "@/lib/formato";

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

// --- Perfil del comercio ---

export interface BeneficiarioFinal {
  nombre: string;
  tipoDocumento: "CC" | "CE" | "PA" | "NIT";
  numeroDocumento: string;
  participacion?: number;
  esPep: boolean;
}

/** Espejo de PerfilComercioSchema en la API. */
export interface PerfilComercio {
  tipoPersona: "natural" | "juridica";
  nombreComercial?: string;
  tipoDocumento: "NIT" | "CC" | "CE" | "PA";
  numeroDocumento: string;
  digitoVerificacion?: string;
  ciiu?: string;
  responsableIva: boolean;
  direccion: string;
  ciudad: string;
  departamento: string;
  telefono?: string;
  sitioWeb?: string;
  correoNotificaciones: string;
  correoFacturacion: string;
  direccionFacturacion?: string;
  repNombre: string;
  repTipoDocumento: "CC" | "CE" | "PA";
  repNumeroDocumento: string;
  repCorreo?: string;
  repTelefono?: string;
  repEsPep: boolean;
  contactoNombre: string;
  contactoCargo?: string;
  contactoCorreo: string;
  contactoTelefono?: string;
  banco?: string;
  tipoCuenta?: "ahorros" | "corriente";
  numeroCuenta?: string;
  titularCuenta?: string;
  titularDocumento?: string;
  rutVerificado: boolean;
  camaraComercioVerificada: boolean;
  cedulaRepVerificada: boolean;
  certificacionBancariaVerificada: boolean;
  beneficiarios: BeneficiarioFinal[];
}

export interface PerfilGuardado {
  perfil: Record<string, unknown>;
  beneficiarios: Record<string, unknown>[];
}

export function obtenerPerfil(tenantId: string): Promise<PerfilGuardado | null> {
  return apiGet<PerfilGuardado | null>(`/admin/merchants/${tenantId}/perfil`);
}

export function obtenerComercio(tenantId: string): Promise<Comercio> {
  return apiGet<Comercio>(`/admin/merchants/${tenantId}`);
}

// --- Tarifas (Fase 6, spec comisiones) ---

export interface VersionTarifaComercio {
  id: string;
  /** Puntos básicos: 290 = 2,90 %. */
  bps: number;
  /** Fijo por transacción en la unidad mínima (COP: pesos). */
  fijoMinor: number;
  /** IVA sobre la comisión: 0 (0 %) o 1900 (19 %). */
  ivaBps: 0 | 1900;
  vigenteDesde: string;
  creadaPor: string;
  creadaEn: string;
}

export interface VersionTarifaProveedor {
  id: string;
  provider: string;
  bps: number;
  fijoMinor: number;
  /** true: consigna monto − su tarifa. false: consigna todo y factura aparte. */
  descuentaEnConsignacion: boolean;
  vigenteDesde: string;
  creadaPor: string;
  creadaEn: string;
}

export interface TarifaComercioAdmin {
  vigente: VersionTarifaComercio | null;
  historial: VersionTarifaComercio[];
}

export interface TarifaProveedorAdmin {
  provider: string;
  vigente: VersionTarifaProveedor | null;
  historial: VersionTarifaProveedor[];
}

export interface TarifaVigenteDeComercio extends VersionTarifaComercio {
  tenantId: string;
}

export function tarifaDeComercio(tenantId: string): Promise<TarifaComercioAdmin> {
  return apiGet<TarifaComercioAdmin>(`/admin/merchants/${tenantId}/tarifa`);
}

export function tarifaDeProveedor(provider: string): Promise<TarifaProveedorAdmin> {
  return apiGet<TarifaProveedorAdmin>(`/admin/providers/${encodeURIComponent(provider)}/tarifa`);
}

/** La vigente de cada comercio que tiene una; quien no aparece no puede cobrar. */
export function tarifasVigentes(): Promise<TarifaVigenteDeComercio[]> {
  return apiGet<TarifaVigenteDeComercio[]>("/admin/tarifas");
}

// --- Custodia del recaudo (Fase 6, spec ledger-custodia) ---

export interface Consignacion {
  id: string;
  provider: string;
  referenciaBancaria: string;
  /** YYYY-MM-DD, la fecha del extracto. */
  fecha: string;
  montoMinor: number;
  nota: string | null;
  cobros: number;
  comercios: number;
  registradaPor: string;
  registradaEn: string;
}

export interface CobroPorConsignar {
  paymentId: string;
  tenantId: string;
  tenantNombre: string;
  referencia: string;
  providerPaymentId: string | null;
  montoMinor: number;
  /** Lo que el proveedor debe por este cobro con la tarifa fijada en él. */
  esperadoMinor: number;
  creadoEn: string;
}

export interface CuadreCustodia {
  fecha: string;
  saldoLibro: number;
  /** null si nadie registró el saldo del banco para esa fecha. */
  saldoBanco: number | null;
  /** banco − libro; null si no hay saldo registrado. 0 es cuadre. */
  diferencia: number | null;
  registradoPor: string | null;
  registradoEn: string | null;
}

export interface BalanceComercio {
  porPagar: number;
  comision: number;
  ivaPorPagar: number;
  costoProveedor: number;
  margen: number;
  enTransito: number;
  enRecaudo: number;
  porPagarProveedor: number;
  retenido: number;
  dispersado: number;
}

export function listarConsignaciones(): Promise<Consignacion[]> {
  return apiGet<Consignacion[]>("/admin/consignaciones");
}

export function cobrosPorConsignar(provider: string): Promise<CobroPorConsignar[]> {
  return apiGet<CobroPorConsignar[]>(
    `/admin/consignaciones/pendientes?provider=${encodeURIComponent(provider)}`
  );
}

export function cuadreCustodia(fecha?: string): Promise<CuadreCustodia> {
  return apiGet<CuadreCustodia>(`/admin/recaudo/cuadre${fecha ? `?fecha=${fecha}` : ""}`);
}

export function balanceDeComercio(tenantId: string): Promise<BalanceComercio> {
  return apiGet<BalanceComercio>(`/admin/merchants/${tenantId}/balance`);
}

// --- Dispersión (Fase 7, spec dispersion) ---

export type EstadoLote = "programado" | "aprobado" | "pagado" | "fallido";

export interface PoliticaDispersion {
  diasLiquidacion: number;
  reservaBps: number;
  diasReserva: number;
  retenerPrimerCobro: boolean;
  actualizadaPor: string | null;
}

export interface BalanceDispersion {
  disponibleMinor: number;
  pendienteMinor: number;
  retenidoMinor: number;
  enLoteMinor: number;
  cuentaCertificada: boolean;
  cuentaDetalle: string | null;
  cobrosDisponibles: number;
  diasLiquidacion: number;
  reservaBps: number;
  primerCobroRetenido: boolean;
}

export interface BalanceDispersionComercio extends BalanceDispersion {
  tenantId: string;
  tenantNombre: string;
  tenantEstado: string;
  loteAbierto: { id: string; estado: EstadoLote } | null;
}

export interface Lote {
  id: string;
  tenantId: string;
  tenantNombre: string;
  estado: EstadoLote;
  montoMinor: number;
  reservaMinor: number;
  cuenta: {
    banco: string;
    tipoCuenta: string;
    numeroCuenta: string;
    titularCuenta: string;
    titularDocumento: string;
  };
  preparadoPor: string;
  preparadoEn: string;
  aprobadoPor: string | null;
  aprobadoEn: string | null;
  fechaPago: string | null;
  referenciaPago: string | null;
  comprobante: string | null;
  pagadoPor: string | null;
  pagadoEn: string | null;
  falloMotivo: string | null;
  fallidoPor: string | null;
  fallidoEn: string | null;
  cobros: number;
}

export interface ItemLote {
  id: string;
  tipo: "cobro" | "reserva_liberada";
  paymentId: string | null;
  referencia: string | null;
  montoCobroMinor: number | null;
  retencionId: string | null;
  montoMinor: number;
  reservaMinor: number;
}

export interface Retencion {
  id: string;
  tenantId: string;
  tenantNombre: string;
  tipo: "primer_cobro" | "reserva";
  paymentId: string | null;
  referencia: string | null;
  loteId: string | null;
  montoMinor: number;
  liberarDesde: string | null;
  motivo: string;
  creadaPor: string;
  creadaEn: string;
  liberadaPor: string | null;
  liberadaEn: string | null;
  liberacionMotivo: string | null;
  pagadaEnLote: string | null;
  estado: "activa" | "pendiente" | "liberada" | "pagada" | "anulada";
}

export function balancesDispersion(): Promise<BalanceDispersionComercio[]> {
  return apiGet<BalanceDispersionComercio[]>("/admin/dispersion/balances");
}

export function dispersionDeComercio(
  tenantId: string
): Promise<{ politica: PoliticaDispersion; balance: BalanceDispersion }> {
  return apiGet(`/admin/merchants/${tenantId}/dispersion`);
}

export function listarLotes(): Promise<Lote[]> {
  return apiGet<Lote[]>("/admin/dispersion/lotes");
}

export function obtenerLote(id: string): Promise<Lote & { items: ItemLote[] }> {
  return apiGet(`/admin/dispersion/lotes/${id}`);
}

export function listarRetenciones(tenantId?: string): Promise<Retencion[]> {
  return apiGet<Retencion[]>(
    `/admin/dispersion/retenciones${tenantId ? `?tenantId=${tenantId}` : ""}`
  );
}
