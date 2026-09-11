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
    reembolsos: boolean;
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
  /** Lo que el comercio debe por reembolsos de cobros ya pagados; se descuenta del siguiente lote. */
  deudaMinor: number;
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
  deudaMinor: number;
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
  tipo: "cobro" | "reserva_liberada" | "deuda";
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
  tipo: "primer_cobro" | "reserva" | "riesgo";
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

// --- Riesgo del comercio (Fase 9, spec riesgo-comercio) ---

export type TipoReglaRiesgo =
  | "limite_transaccion"
  | "limite_diario"
  | "limite_mensual"
  | "monto_atipico"
  | "geo_mismatch"
  | "intentos_tarjeta"
  | "score_proveedor";
export type ModoRegla = "activa" | "shadow" | "inactiva";

export interface ReglaRiesgo {
  id: string;
  nombre: string;
  tipo: TipoReglaRiesgo;
  tenantId: string | null;
  tenantNombre: string | null;
  parametros:
    | { limiteMinor: number }
    | { factor: number; minimoCobros: number }
    | { montoMinimoMinor: number }
    | { maxIntentos: number }
    | { scoreMaximo: number };
  accion: "rechazar" | "retener";
  modo: ModoRegla;
  prioridad: number;
  creadaPor: string;
  creadaEn: string;
  actualizadaPor: string;
  actualizadaEn: string;
  disparos30d: number;
}

export interface ReglaDisparada {
  id: string;
  nombre: string;
  tipo: TipoReglaRiesgo;
  modo: ModoRegla;
  accion: "rechazar" | "retener";
  actuo: boolean;
  detalle: string;
}

export interface EvaluacionRiesgo {
  id: string;
  tenantId: string;
  tenantNombre: string;
  paymentId: string | null;
  referencia: string | null;
  montoMinor: number;
  decision: "permitir" | "retener" | "rechazar";
  reglasDisparadas: ReglaDisparada[];
  senales: {
    hoyMinor: number;
    mesMinor: number;
    ticketPromedioMinor: number;
    cobrosHistoricos: number;
  };
  creadaEn: string;
}

export interface CasoRiesgo {
  retencionId: string;
  tenantId: string;
  tenantNombre: string;
  paymentId: string;
  referencia: string;
  estadoCobro: string;
  montoCobroMinor: number;
  montoRetenidoMinor: number;
  motivo: string;
  creadaEn: string;
  evaluacionId: string | null;
  reglasDisparadas: ReglaDisparada[];
}

export interface EntradaListaRestrictiva {
  id: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  fuente: "OFAC" | "ONU" | "PEP" | "interna";
  motivo: string | null;
  activa: boolean;
  agregadaPor: string;
  agregadaEn: string;
}

export interface CoincidenciaRestrictiva {
  quien: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  fuente: string;
  motivo: string | null;
}

export interface AccionAdmin {
  id: string;
  actor: string;
  accion: string;
  objetoTipo: string | null;
  objetoId: string | null;
  detalle: Record<string, unknown>;
  creadoEn: string;
}

export function listarReglasRiesgo(): Promise<ReglaRiesgo[]> {
  return apiGet<ReglaRiesgo[]>("/admin/riesgo/reglas");
}
export function listarEvaluacionesRiesgo(limite = 100): Promise<EvaluacionRiesgo[]> {
  return apiGet<EvaluacionRiesgo[]>(`/admin/riesgo/evaluaciones?limite=${limite}`);
}
export function colaRiesgo(): Promise<CasoRiesgo[]> {
  return apiGet<CasoRiesgo[]>("/admin/riesgo/cola");
}
export function listaRestrictiva(): Promise<EntradaListaRestrictiva[]> {
  return apiGet<EntradaListaRestrictiva[]>("/admin/riesgo/listas");
}
export function listarAuditoria(limite = 200): Promise<AccionAdmin[]> {
  return apiGet<AccionAdmin[]>(`/admin/auditoria?limite=${limite}`);
}

// --- Command Center y reportes (Fase 10) ---

export interface Resumen {
  volumenHoyMinor: number;
  cobrosHoy: number;
  volumenMesMinor: number;
  cobrosMes: number;
  aprobacionMesPct: number | null;
  comisionMesMinor: number;
  costoMesMinor: number;
  margenMesMinor: number;
  ivaMesMinor: number;
  porPagarMinor: number;
  retenidoMinor: number;
  enRecaudoMinor: number;
  enTransitoMinor: number;
  pendientesConsignar: number;
  pendientesConsignarMinor: number;
  lotesAbiertos: number;
  colaRiesgo: number;
  comerciosActivos: number;
  comerciosSinTarifa: number;
  comerciosSinKyc: number;
  asientosDescuadrados: number;
}

export interface LineaEstadoCuenta {
  posteadoEn: string;
  asientoId: string;
  kind: string;
  memo: string;
  paymentId: string | null;
  referencia: string | null;
  cuenta: string;
  naturaleza: string;
  direccion: "debit" | "credit";
  montoMinor: number;
}

export interface EstadoCuenta {
  tenantId: string;
  desde: string;
  hasta: string;
  lineas: LineaEstadoCuenta[];
  porCuenta: {
    cuenta: string;
    naturaleza: string;
    debitos: number;
    creditos: number;
    netoMinor: number;
  }[];
}

export interface FilaFiscal {
  tenantId: string;
  tenantNombre: string;
  documento: string | null;
  cobros: number;
  baseMinor: number;
  comisionMinor: number;
  ivaMinor: number;
  costoMinor: number;
  margenMinor: number;
}

export function resumenOperativo(): Promise<Resumen> {
  return apiGet<Resumen>("/admin/resumen");
}
export function estadoDeCuenta(
  tenantId: string,
  desde: string,
  hasta: string
): Promise<EstadoCuenta> {
  return apiGet<EstadoCuenta>(
    `/admin/merchants/${tenantId}/estado-cuenta?desde=${desde}&hasta=${hasta}`
  );
}
export function reporteFiscal(mes: string): Promise<FilaFiscal[]> {
  return apiGet<FilaFiscal[]>(`/admin/reportes/fiscal?mes=${mes}`);
}

/** Descarga un CSV de la API con la sesión de la persona: el navegador no tiene el JWT. */
export async function descargarCsv(
  recurso: string,
  query: Record<string, string | undefined>
): Promise<Response> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v) q.set(k, v);
  const supabase = await getSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new ErrorApi("La sesión expiró. Vuelve a entrar.", 401);
  return fetch(`${baseUrl()}/v1/admin/exportar/${recurso}.csv${q.toString() ? `?${q}` : ""}`, {
    headers: { authorization: `Bearer ${session.access_token}` },
    cache: "no-store"
  });
}

// --- Reembolsos y contracargos (Fase 11) ---

export interface Reembolso {
  id: string;
  tenantId: string;
  tenantNombre: string;
  paymentId: string;
  referencia: string;
  montoMinor: number;
  origen: "reembolso" | "contracargo";
  contracargoId: string | null;
  motivo: string;
  fechaPago: string;
  referenciaPago: string;
  comprobante: string | null;
  parteComercio: number;
  parteComision: number;
  parteIva: number;
  registradoPor: string;
  registradoEn: string;
}

export type EstadoContracargo = "recibido" | "en_evidencia" | "ganado" | "perdido";

export interface Contracargo {
  id: string;
  tenantId: string;
  tenantNombre: string;
  paymentId: string;
  referencia: string;
  estadoCobro: string;
  montoCobroMinor: number;
  montoMinor: number;
  motivoRed: string;
  referenciaRed: string | null;
  fechaLimiteEvidencia: string;
  estado: EstadoContracargo;
  evidencia: string | null;
  recibidoPor: string;
  recibidoEn: string;
  evidenciaPor: string | null;
  evidenciaEn: string | null;
  resueltoPor: string | null;
  resueltoEn: string | null;
  resolucionNota: string | null;
  diasParaEvidencia: number;
}

export function listarReembolsos(paymentId: string): Promise<Reembolso[]> {
  return apiGet<Reembolso[]>(`/admin/pagos/${paymentId}/reembolsos`);
}
export function listarContracargos(paymentId?: string): Promise<Contracargo[]> {
  return apiGet<Contracargo[]>(`/admin/contracargos${paymentId ? `?paymentId=${paymentId}` : ""}`);
}
