import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Res
} from "@nestjs/common";
import { aCsv, type ColumnaCsv } from "../../common/csv";

/** Lo único que el exporte necesita de la respuesta HTTP: poner dos cabeceras. */
interface RespuestaConCabeceras {
  setHeader(nombre: string, valor: string): void;
}
import {
  EstadoLoteSchema,
  PoliticaDispersionSchema,
  ReglaRiesgoSchema,
  RangoFechasSchema,
  TarifaComercioSchema,
  TarifaProveedorSchema,
  type PoliticaDispersion,
  type SaludProvider
} from "@evetev/shared";
import { z } from "zod";
import { currentContextOrNull } from "../../common/request-context";
import { ROLES_INTERNOS, type Role } from "../identidad/roles";
import { puede, rolesPara, type Accion } from "./permisos";
import { RiesgoAdminService } from "./riesgo-admin.service";
import {
  ReembolsosAdminService,
  type Contracargo,
  type Reembolso
} from "./reembolsos-admin.service";
import {
  ReportesAdminService,
  type EstadoCuenta,
  type FilaFiscal,
  type Resumen,
  type ResumenComercio
} from "./reportes-admin.service";
import type {
  CasoRiesgo,
  Coincidencia,
  EntradaLista,
  Evaluacion,
  ReglaGuardada,
  ResumenRiesgo
} from "../riesgo/riesgo.repository";
import {
  DispersionAdminService,
  type BalanceDispersion,
  type BalanceDispersionComercio,
  type ItemLote,
  type Lote,
  type Retencion
} from "./dispersion-admin.service";
import {
  AdminService,
  type ApiKeyRotada,
  type ComercioCreado,
  type ComercioListado
} from "./admin.service";
import { AdminAuditService, type AccionAdmin } from "./admin-audit.service";
import { CrearComercioSchema, PerfilComercioSchema } from "./perfil-comercio.schema";
import { PerfilComercioService, type PerfilGuardado } from "./perfil-comercio.service";
import { ProvidersService, type EstadoProveedores } from "./providers.service";
import {
  TarifasAdminService,
  type TarifaComercioAdmin,
  type TarifaProveedorAdmin
} from "./tarifas-admin.service";
import type {
  TarifaVigenteDeComercio,
  VersionTarifaComercio,
  VersionTarifaProveedor
} from "../tarifas/tarifas.repository";
import {
  CustodiaAdminService,
  type BalanceComercio,
  type CobroPorConsignar,
  type Consignacion,
  type CuadreCustodia,
  type RegistrarConsignacionInput
} from "./custodia-admin.service";
import {
  ConciliacionAdminService,
  type CorridaConciliacion,
  type LedgerTenant
} from "./conciliacion-admin.service";
import {
  PagosAdminService,
  type EventoTimeline,
  type PagoAdmin,
  type PaginaPagos,
  type ResultadoReverificacion
} from "./pagos-admin.service";

const RotarApiKeySchema = z.object({
  environment: z.enum(["live", "test"])
});

const CambiarEstadoSchema = z.object({
  activo: z.boolean()
});

/** Solo los dos estados que un humano decide; los otros los pone el flujo. */
const CambiarKycSchema = z.object({
  estado: z.enum(["aprobado", "rechazado"])
});

/** Filtros del listado de pagos; todo opcional y validado en la frontera (§3). */
const FiltrosPagosSchema = z.object({
  tenantId: z.string().uuid().optional(),
  estado: z.enum(["creado", "pendiente", "aprobado", "fallido", "conciliado"]).optional(),
  desde: z.string().datetime().optional(),
  hasta: z.string().datetime().optional(),
  referencia: z.string().min(1).max(120).optional(),
  limite: z.coerce.number().int().min(1).max(200).optional(),
  cursorAt: z.string().datetime().optional(),
  cursorId: z.string().uuid().optional()
});

/** Las mismas reglas del alta: un nombre que no se podría crear tampoco se puede poner. */
const RenombrarComercioSchema = CrearComercioSchema.pick({ legalName: true, displayName: true });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Una fecha de calendario, la del extracto: sin hora ni zona. */
const FechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha va como AAAA-MM-DD");

/** Lo que operación copia del extracto más los cobros que marca (ledger-custodia CA-4). */
const RegistrarConsignacionSchema = z.object({
  provider: z.string().trim().min(1).max(40),
  referenciaBancaria: z.string().trim().min(1).max(120),
  fecha: FechaSchema,
  montoMinor: z.number().int().positive(),
  paymentIds: z.array(z.string().uuid()).min(1).max(500),
  nota: z.string().trim().max(500).optional()
});

const MesSchema = z.string().regex(/^\d{4}-\d{2}$/, "El mes va como AAAA-MM");

const RegistrarSaldoSchema = z.object({
  fecha: FechaSchema,
  saldoMinor: z.number().int().nonnegative(),
  nota: z.string().trim().max(500).optional()
});

/**
 * Endpoints de admin (uso exclusivo de Evetev).
 * Acceso: JWT de Supabase con rol super_admin. Los consume apps/evepay-admin.
 */
@Controller("admin")
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly auditoria: AdminAuditService,
    private readonly providers: ProvidersService,
    private readonly pagos: PagosAdminService,
    private readonly conciliacion: ConciliacionAdminService,
    private readonly perfiles: PerfilComercioService,
    private readonly tarifas: TarifasAdminService,
    private readonly custodia: CustodiaAdminService,
    private readonly dispersion: DispersionAdminService,
    private readonly riesgo: RiesgoAdminService,
    private readonly reportes: ReportesAdminService,
    private readonly reembolsos: ReembolsosAdminService
  ) {}

  /** GET /v1/admin/merchants — lista todos los comercios (para el panel y verificar auth). */
  @Get("merchants")
  async listarComercios(): Promise<ComercioListado[]> {
    this.exigir("leer");
    return this.admin.listarComercios();
  }

  /** POST /v1/admin/merchants — crea tenant + merchant + API keys (live y test). */
  @Post("merchants")
  @HttpCode(201)
  async crearComercio(@Body() body: unknown): Promise<ComercioCreado> {
    this.exigir("comercios.escribir");

    const parsed = CrearComercioSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.admin.crearComercio(parsed.data, this.actor());
  }

  /**
   * POST /v1/admin/merchants/:tenantId/api-keys/rotate — nueva clave y las
   * anteriores del mismo entorno revocadas, en una sola operación (CA-9).
   */
  @Post("merchants/:tenantId/api-keys/rotate")
  @HttpCode(200)
  async rotarApiKey(
    @Param("tenantId") tenantId: string,
    @Body() body: unknown
  ): Promise<ApiKeyRotada> {
    this.exigir("comercios.escribir");
    if (!UUID_RE.test(tenantId)) {
      throw new BadRequestException("tenantId inválido.");
    }

    const parsed = RotarApiKeySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.admin.rotarApiKey(tenantId, parsed.data.environment, this.actor());
  }

  /**
   * POST /v1/admin/merchants/:tenantId/estado — activa o desactiva el comercio
   * (CA-10). No borra nada: su historial y su ledger siguen consultables.
   */
  @Post("merchants/:tenantId/estado")
  @HttpCode(200)
  async cambiarEstado(
    @Param("tenantId") tenantId: string,
    @Body() body: unknown
  ): Promise<{ tenantId: string; estado: string }> {
    this.exigir("comercios.escribir");
    if (!UUID_RE.test(tenantId)) {
      throw new BadRequestException("tenantId inválido.");
    }

    const parsed = CambiarEstadoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.admin.cambiarEstadoComercio(tenantId, parsed.data.activo, this.actor());
  }

  /**
   * PUT /v1/admin/merchants/:tenantId/nombre — corrige la razón social y el
   * nombre visible. Es PUT porque se mandan los dos juntos, y el rastro guarda
   * cómo se llamaba antes.
   */
  @Put("merchants/:tenantId/nombre")
  @HttpCode(200)
  async renombrarComercio(
    @Param("tenantId") tenantId: string,
    @Body() body: unknown
  ): Promise<{ tenantId: string; legalName: string; displayName: string }> {
    this.exigir("comercios.escribir");
    if (!UUID_RE.test(tenantId)) throw new BadRequestException("tenantId inválido.");

    const parsed = RenombrarComercioSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.admin.renombrarComercio(
      tenantId,
      parsed.data.legalName,
      parsed.data.displayName,
      this.actor()
    );
  }

  /** GET /v1/admin/merchants/:tenantId — ficha del comercio. */
  @Get("merchants/:tenantId")
  async obtenerComercio(@Param("tenantId") tenantId: string): Promise<ComercioListado> {
    this.exigir("leer");
    if (!UUID_RE.test(tenantId)) throw new BadRequestException("tenantId inválido.");

    const comercio = await this.admin.obtenerComercio(tenantId);
    if (!comercio) throw new NotFoundException("Comercio no encontrado.");
    return comercio;
  }

  /**
   * GET /v1/admin/merchants/:tenantId/perfil — datos del comercio: quién es,
   * dónde está, quién lo representa, quién está detrás y dónde se le dispersa.
   */
  @Get("merchants/:tenantId/perfil")
  async obtenerPerfil(@Param("tenantId") tenantId: string): Promise<PerfilGuardado | null> {
    this.exigir("leer");
    if (!UUID_RE.test(tenantId)) throw new BadRequestException("tenantId inválido.");
    return this.perfiles.obtener(tenantId);
  }

  /**
   * PUT /v1/admin/merchants/:tenantId/perfil — crea o reemplaza el perfil.
   * Es PUT y no PATCH porque se guarda completo: un perfil a medias no se
   * distingue de uno con campos borrados a propósito.
   */
  @Put("merchants/:tenantId/perfil")
  @HttpCode(200)
  async guardarPerfil(
    @Param("tenantId") tenantId: string,
    @Body() body: unknown
  ): Promise<{ ok: true }> {
    this.exigir("comercios.escribir");
    if (!UUID_RE.test(tenantId)) throw new BadRequestException("tenantId inválido.");

    const parsed = PerfilComercioSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    await this.perfiles.guardar(tenantId, parsed.data, this.actor());
    return { ok: true };
  }

  /**
   * POST /v1/admin/merchants/:tenantId/kyc — aprueba o rechaza el comercio a
   * mano (CA-22). Es el único camino cuando el proveedor no manda eventos de
   * comercios, y desde que cobrar exige estar aprobado, también el que
   * habilita a cobrar.
   */
  @Post("merchants/:tenantId/kyc")
  @HttpCode(200)
  async cambiarKyc(
    @Param("tenantId") tenantId: string,
    @Body() body: unknown
  ): Promise<{ tenantId: string; merchantId: string; estado: string }> {
    this.exigir("comercios.escribir");
    if (!UUID_RE.test(tenantId)) throw new BadRequestException("tenantId inválido.");

    const parsed = CambiarKycSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.admin.cambiarEstadoKyc(tenantId, parsed.data.estado, this.actor());
  }

  /**
   * GET /v1/admin/merchants/:tenantId/tarifa — la vigente y el historial de lo
   * que EvePay le cobra al comercio (spec `comisiones`).
   */
  @Get("merchants/:tenantId/tarifa")
  async tarifaComercio(@Param("tenantId") tenantId: string): Promise<TarifaComercioAdmin> {
    this.exigir("leer");
    if (!UUID_RE.test(tenantId)) throw new BadRequestException("tenantId inválido.");
    return this.tarifas.tarifaComercio(tenantId);
  }

  /**
   * PUT /v1/admin/merchants/:tenantId/tarifa — agrega una versión (CA-1). Los
   * rangos y el IVA (solo 0 % o 19 %) se validan aquí (CA-8, CA-11) y otra vez
   * en la base, que es la que manda.
   */
  @Put("merchants/:tenantId/tarifa")
  @HttpCode(200)
  async asignarTarifaComercio(
    @Param("tenantId") tenantId: string,
    @Body() body: unknown
  ): Promise<VersionTarifaComercio> {
    this.exigir("tarifas.escribir");
    if (!UUID_RE.test(tenantId)) throw new BadRequestException("tenantId inválido.");

    const parsed = TarifaComercioSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.tarifas.asignarTarifaComercio(tenantId, parsed.data, this.actor());
  }

  /**
   * GET /v1/admin/merchants/:tenantId/balance — de quién es cada peso del
   * comercio, reconstruido desde el ledger (ledger-custodia CA-9).
   */
  @Get("merchants/:tenantId/balance")
  async balanceComercio(@Param("tenantId") tenantId: string): Promise<BalanceComercio> {
    this.exigir("leer");
    if (!UUID_RE.test(tenantId)) throw new BadRequestException("tenantId inválido.");
    return this.custodia.balanceComercio(tenantId);
  }

  /** GET /v1/admin/tarifas — la tarifa vigente de cada comercio que tiene una. */
  @Get("tarifas")
  async tarifasVigentes(): Promise<TarifaVigenteDeComercio[]> {
    this.exigir("leer");
    return this.tarifas.tarifasVigentes();
  }

  /** GET /v1/admin/providers — estado de la adquirencia (CA-11, CA-13). */
  @Get("providers")
  async listarProveedores(): Promise<EstadoProveedores> {
    this.exigir("leer");
    return this.providers.estado();
  }

  /**
   * POST /v1/admin/providers/health — comprobación real contra el proveedor
   * activo (CA-12). Es de solo lectura, pero va por POST porque sale a la red
   * del proveedor: no debe dispararse por un prefetch ni quedar cacheada.
   */
  @Post("providers/health")
  @HttpCode(200)
  async saludProveedor(): Promise<SaludProvider & { proveedor: string }> {
    this.exigir("proveedores.salud");
    const salud = await this.providers.salud();

    // Comprobar la adquirencia es una acción de operación: queda registrada,
    // así se puede reconstruir qué se sabía y cuándo ante un incidente.
    await this.auditoria.registrar({
      actor: this.actor(),
      accion: "proveedor.salud",
      objetoTipo: "proveedor",
      objetoId: salud.proveedor,
      detalle: { ok: salud.ok, detalle: salud.detalle, duracionMs: salud.duracionMs }
    });

    return salud;
  }

  /**
   * GET /v1/admin/providers/:provider/tarifa — lo que el proveedor le cobra a
   * EvePay, con su historial y si lo descuenta de la consignación.
   */
  @Get("providers/:provider/tarifa")
  async tarifaProveedor(@Param("provider") provider: string): Promise<TarifaProveedorAdmin> {
    this.exigir("leer");
    return this.tarifas.tarifaProveedor(provider);
  }

  /**
   * PUT /v1/admin/providers/:provider/tarifa — agrega una versión. Afecta a
   * todos los comercios a la vez desde el siguiente cobro.
   */
  @Put("providers/:provider/tarifa")
  @HttpCode(200)
  async asignarTarifaProveedor(
    @Param("provider") provider: string,
    @Body() body: unknown
  ): Promise<VersionTarifaProveedor> {
    this.exigir("tarifas.escribir");

    const parsed = TarifaProveedorSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.tarifas.asignarTarifaProveedor(provider, parsed.data, this.actor());
  }

  /** GET /v1/admin/pagos — listado cross-tenant con filtros (CA-15). */
  @Get("pagos")
  async listarPagos(@Query() query: Record<string, string | undefined>): Promise<PaginaPagos> {
    this.exigir("leer");

    const parsed = FiltrosPagosSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.pagos.listar(parsed.data);
  }

  /** GET /v1/admin/pagos/:id — un cobro concreto. */
  @Get("pagos/:id")
  async obtenerPago(@Param("id") id: string): Promise<PagoAdmin> {
    this.exigir("leer");
    if (!UUID_RE.test(id)) throw new BadRequestException("id inválido.");
    return this.pagos.obtener(id);
  }

  /**
   * GET /v1/admin/pagos/:id/timeline — transiciones, webhooks (con sus
   * reenvíos) y asientos de ledger, en orden (CA-16).
   */
  @Get("pagos/:id/timeline")
  async timelinePago(@Param("id") id: string): Promise<EventoTimeline[]> {
    this.exigir("leer");
    if (!UUID_RE.test(id)) throw new BadRequestException("id inválido.");
    return this.pagos.timeline(id);
  }

  /**
   * POST /v1/admin/pagos/:id/reverify — consulta el estado al proveedor y lo
   * aplica solo si la máquina de estados lo permite (CA-17, CA-18).
   */
  @Post("pagos/:id/reverify")
  @HttpCode(200)
  async reverificarPago(@Param("id") id: string): Promise<ResultadoReverificacion> {
    this.exigir("pagos.reverificar");
    if (!UUID_RE.test(id)) throw new BadRequestException("id inválido.");
    return this.pagos.reverificar(id, this.actor());
  }

  /**
   * POST /v1/admin/conciliacion/:tenantId/run — concilia el rango y guarda la
   * corrida (CA-19). Si el proveedor no da liquidaciones, la registra como
   * "no soportada" en vez de un reporte vacío que parezca cuadrado (CA-20).
   */
  @Post("conciliacion/:tenantId/run")
  @HttpCode(200)
  async correrConciliacion(
    @Param("tenantId") tenantId: string,
    @Body() body: unknown
  ): Promise<CorridaConciliacion> {
    this.exigir("conciliacion.correr");
    if (!UUID_RE.test(tenantId)) throw new BadRequestException("tenantId inválido.");

    const parsed = RangoFechasSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.conciliacion.correr(tenantId, parsed.data, this.actor());
  }

  /** GET /v1/admin/conciliacion/reportes — histórico de corridas (CA-19). */
  @Get("conciliacion/reportes")
  async historicoConciliacion(
    @Query("tenantId") tenantId?: string,
    @Query("limite") limite?: string
  ): Promise<CorridaConciliacion[]> {
    this.exigir("leer");
    if (tenantId && !UUID_RE.test(tenantId)) throw new BadRequestException("tenantId inválido.");
    const n = Number(limite);
    return this.conciliacion.historico(tenantId, Number.isFinite(n) && n > 0 ? n : 50);
  }

  /** GET /v1/admin/ledger/:tenantId — saldos reconstruidos y asientos (CA-21). */
  @Get("ledger/:tenantId")
  async ledger(@Param("tenantId") tenantId: string): Promise<LedgerTenant> {
    this.exigir("leer");
    if (!UUID_RE.test(tenantId)) throw new BadRequestException("tenantId inválido.");
    return this.conciliacion.ledger(tenantId);
  }

  /** GET /v1/admin/consignaciones — las registradas, la más reciente primero. */
  @Get("consignaciones")
  async listarConsignaciones(@Query("limite") limite?: string): Promise<Consignacion[]> {
    this.exigir("leer");
    const n = Number(limite);
    return this.custodia.listarConsignaciones(Number.isFinite(n) && n > 0 ? n : 50);
  }

  /**
   * GET /v1/admin/consignaciones/pendientes?provider= — cobros aprobados del
   * proveedor que aún no están en ninguna consignación, con lo que debe por
   * cada uno. Sin proveedor, el activo.
   */
  @Get("consignaciones/pendientes")
  async cobrosPorConsignar(@Query("provider") provider?: string): Promise<CobroPorConsignar[]> {
    this.exigir("leer");
    return this.custodia.cobrosPorConsignar(provider?.trim() || this.providers.nombreActivo());
  }

  /**
   * POST /v1/admin/consignaciones — registra una consignación del proveedor y
   * concilia los cobros que cubre, todo o nada (ledger-custodia CA-4 a CA-7).
   */
  @Post("consignaciones")
  @HttpCode(201)
  async registrarConsignacion(
    @Body() body: unknown
  ): Promise<{ id: string } & RegistrarConsignacionInput> {
    this.exigir("consignaciones.registrar");

    const parsed = RegistrarConsignacionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.custodia.registrarConsignacion(parsed.data, this.actor());
  }

  /** GET /v1/admin/recaudo/cuadre?fecha= — libro vs banco al cierre de la fecha (CA-8). */
  @Get("recaudo/cuadre")
  async cuadreCustodia(@Query("fecha") fecha?: string): Promise<CuadreCustodia> {
    this.exigir("leer");
    if (fecha !== undefined && !FechaSchema.safeParse(fecha).success) {
      throw new BadRequestException("La fecha va como AAAA-MM-DD.");
    }
    return this.custodia.cuadreCustodia(fecha);
  }

  /** POST /v1/admin/recaudo/saldos — el saldo del banco a una fecha, del extracto (CA-8). */
  @Post("recaudo/saldos")
  @HttpCode(201)
  async registrarSaldoRecaudo(
    @Body() body: unknown
  ): Promise<{ id: string; cuadre: CuadreCustodia }> {
    this.exigir("recaudo.saldo");

    const parsed = RegistrarSaldoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.custodia.registrarSaldoRecaudo(parsed.data, this.actor());
  }

  // --- Dispersión (spec dispersion) ---

  /** GET /v1/admin/dispersion/balances — disponible, pendiente, retenido y en lote de cada comercio (CA-1). */
  @Get("dispersion/balances")
  async balancesDispersion(): Promise<BalanceDispersionComercio[]> {
    this.exigir("leer");
    return this.dispersion.balances();
  }

  /** GET /v1/admin/merchants/:tenantId/dispersion — política y balance de dispersión del comercio. */
  @Get("merchants/:tenantId/dispersion")
  async dispersionComercio(@Param("tenantId") tenantId: string): Promise<{
    politica: PoliticaDispersion & { actualizadaPor: string | null };
    balance: BalanceDispersion;
  }> {
    this.exigir("leer");
    if (!UUID_RE.test(tenantId)) throw new BadRequestException("tenantId inválido.");
    const [politica, balance] = await Promise.all([
      this.dispersion.politica(tenantId),
      this.dispersion.balance(tenantId)
    ]);
    return { politica, balance };
  }

  /** PUT /v1/admin/merchants/:tenantId/dispersion — T+N, reserva y retención del primer cobro (CA-11). */
  @Put("merchants/:tenantId/dispersion")
  @HttpCode(200)
  async guardarPoliticaDispersion(
    @Param("tenantId") tenantId: string,
    @Body() body: unknown
  ): Promise<PoliticaDispersion & { actualizadaPor: string | null }> {
    this.exigir("dispersion.politica");
    if (!UUID_RE.test(tenantId)) throw new BadRequestException("tenantId inválido.");
    const parsed = PoliticaDispersionSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    await this.dispersion.guardarPolitica(tenantId, parsed.data, this.quien());
    return this.dispersion.politica(tenantId);
  }

  /** GET /v1/admin/dispersion/lotes?estado= — lotes, los abiertos primero. */
  @Get("dispersion/lotes")
  async listarLotes(@Query("estado") estado?: string): Promise<Lote[]> {
    this.exigir("leer");
    if (estado !== undefined && estado !== "") {
      const parsed = EstadoLoteSchema.safeParse(estado);
      if (!parsed.success) throw new BadRequestException("Estado de lote inválido.");
      return this.dispersion.listarLotes(parsed.data);
    }
    return this.dispersion.listarLotes();
  }

  /** GET /v1/admin/dispersion/lotes/:id — el lote con sus items. */
  @Get("dispersion/lotes/:id")
  async obtenerLote(@Param("id") id: string): Promise<Lote & { items: ItemLote[] }> {
    this.exigir("leer");
    if (!UUID_RE.test(id)) throw new BadRequestException("id inválido.");
    return this.dispersion.lote(id);
  }

  /** POST /v1/admin/dispersion/lotes — ops prepara el lote de un comercio (CA-2, CA-3). */
  @Post("dispersion/lotes")
  @HttpCode(201)
  async prepararLote(@Body() body: unknown): Promise<Lote> {
    this.exigir("lotes.preparar");
    const parsed = z.object({ tenantId: z.string().uuid() }).safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.dispersion.prepararLote(parsed.data.tenantId, this.quien());
  }

  /** POST /v1/admin/dispersion/lotes/:id/aprobar — finanzas, otra persona que quien preparó (CA-4). */
  @Post("dispersion/lotes/:id/aprobar")
  @HttpCode(200)
  async aprobarLote(@Param("id") id: string): Promise<Lote> {
    this.exigir("lotes.aprobar");
    if (!UUID_RE.test(id)) throw new BadRequestException("id inválido.");
    return this.dispersion.aprobarLote(id, this.quien());
  }

  /** POST /v1/admin/dispersion/lotes/:id/pagar — registra el pago hecho desde el banco (CA-5, CA-6). */
  @Post("dispersion/lotes/:id/pagar")
  @HttpCode(200)
  async pagarLote(@Param("id") id: string, @Body() body: unknown): Promise<Lote> {
    this.exigir("lotes.pagar");
    if (!UUID_RE.test(id)) throw new BadRequestException("id inválido.");
    const parsed = z
      .object({
        fecha: FechaSchema,
        referenciaPago: z.string().trim().min(1).max(120),
        comprobante: z.string().trim().max(500).optional()
      })
      .safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.dispersion.registrarPago(id, parsed.data, this.quien());
  }

  /** POST /v1/admin/dispersion/lotes/:id/fallar — el banco no pagó; los cobros vuelven a disponible (CA-7). */
  @Post("dispersion/lotes/:id/fallar")
  @HttpCode(200)
  async fallarLote(@Param("id") id: string, @Body() body: unknown): Promise<Lote> {
    this.exigir("lotes.pagar");
    if (!UUID_RE.test(id)) throw new BadRequestException("id inválido.");
    const parsed = z.object({ motivo: z.string().trim().min(3).max(500) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.dispersion.marcarFallido(id, parsed.data.motivo, this.quien());
  }

  /** GET /v1/admin/dispersion/retenciones?tenantId= — retenciones, las activas primero. */
  @Get("dispersion/retenciones")
  async listarRetenciones(@Query("tenantId") tenantId?: string): Promise<Retencion[]> {
    this.exigir("leer");
    if (tenantId && !UUID_RE.test(tenantId)) throw new BadRequestException("tenantId inválido.");
    return this.dispersion.listarRetenciones(tenantId || undefined);
  }

  /** POST /v1/admin/dispersion/retenciones/:id/liberar — con motivo; el rol depende del tipo (CA-10). */
  @Post("dispersion/retenciones/:id/liberar")
  @HttpCode(200)
  async liberarRetencion(@Param("id") id: string, @Body() body: unknown): Promise<Retencion> {
    this.exigir("leer");
    if (!UUID_RE.test(id)) throw new BadRequestException("id inválido.");
    const parsed = z.object({ motivo: z.string().trim().min(3).max(500) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.dispersion.liberarRetencion(id, parsed.data.motivo, this.quien());
  }

  // --- Riesgo del comercio (spec riesgo-comercio) ---

  /** GET /v1/admin/riesgo/reglas — todas las reglas, globales primero, con sus disparos de 30 días. */
  @Get("riesgo/reglas")
  async listarReglasRiesgo(): Promise<ReglaGuardada[]> {
    this.exigir("leer");
    return this.riesgo.listarReglas();
  }

  /** PUT /v1/admin/riesgo/reglas — crea (sin id) o cambia (con id) una regla; solo super_admin (CA-8, CA-11). */
  @Put("riesgo/reglas")
  @HttpCode(200)
  async guardarReglaRiesgo(@Body() body: unknown): Promise<ReglaGuardada> {
    this.exigir("riesgo.reglas");
    const parsed = z
      .object({ id: z.string().uuid().nullable().optional() })
      .and(ReglaRiesgoSchema)
      .safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const { id, ...regla } = parsed.data;
    return this.riesgo.guardarRegla(id ?? null, regla, this.actor());
  }

  /** GET /v1/admin/riesgo/evaluaciones?tenantId=&limite= — qué decidió el motor y por qué. */
  @Get("riesgo/evaluaciones")
  async listarEvaluacionesRiesgo(
    @Query("tenantId") tenantId?: string,
    @Query("limite") limite?: string
  ): Promise<Evaluacion[]> {
    this.exigir("leer");
    if (tenantId && !UUID_RE.test(tenantId)) throw new BadRequestException("tenantId inválido.");
    const n = Number(limite);
    return this.riesgo.listarEvaluaciones(
      tenantId || undefined,
      Number.isFinite(n) && n > 0 ? n : 100
    );
  }

  /** GET /v1/admin/riesgo/resumen — evaluadas, rechazadas y retenidas hoy (Bogotá) y cuántas esperan revisión. */
  @Get("riesgo/resumen")
  async resumenRiesgo(): Promise<ResumenRiesgo> {
    this.exigir("leer");
    return this.riesgo.resumen();
  }

  /** GET /v1/admin/riesgo/cola — cobros retenidos por riesgo, con su evaluación (CA-10). */
  @Get("riesgo/cola")
  async colaRiesgo(): Promise<CasoRiesgo[]> {
    this.exigir("leer");
    return this.riesgo.colaRiesgo();
  }

  /** GET /v1/admin/riesgo/listas — la lista restrictiva, activas primero. */
  @Get("riesgo/listas")
  async listaRestrictiva(): Promise<EntradaLista[]> {
    this.exigir("leer");
    return this.riesgo.listarLista();
  }

  /** POST /v1/admin/riesgo/listas — agrega una entrada (ops). */
  @Post("riesgo/listas")
  @HttpCode(201)
  async agregarALista(@Body() body: unknown): Promise<{ id: string }> {
    this.exigir("riesgo.listas");
    const parsed = z
      .object({
        tipoDocumento: z.enum(["NIT", "CC", "CE", "PA"]),
        numeroDocumento: z.string().trim().min(3).max(30),
        nombre: z.string().trim().min(2).max(200),
        fuente: z.enum(["OFAC", "ONU", "PEP", "interna"]),
        motivo: z.string().trim().max(500).nullable().optional()
      })
      .safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const id = await this.riesgo.agregarALista(
      { ...parsed.data, motivo: parsed.data.motivo ?? null },
      this.actor()
    );
    return { id };
  }

  /** POST /v1/admin/riesgo/listas/:id/desactivar — no se borra: se desactiva. */
  @Post("riesgo/listas/:id/desactivar")
  @HttpCode(200)
  async desactivarDeLista(@Param("id") id: string): Promise<{ ok: true }> {
    this.exigir("riesgo.listas");
    if (!UUID_RE.test(id)) throw new BadRequestException("id inválido.");
    await this.riesgo.desactivarDeLista(id, this.actor());
    return { ok: true };
  }

  /** POST /v1/admin/riesgo/listas/verificar — cruza documentos con la lista, sin efectos. */
  @Post("riesgo/listas/verificar")
  @HttpCode(200)
  async verificarLista(@Body() body: unknown): Promise<Coincidencia[]> {
    this.exigir("leer");
    const parsed = z
      .object({
        documentos: z
          .array(
            z.object({
              tipo: z.enum(["NIT", "CC", "CE", "PA"]),
              numero: z.string().trim().min(3).max(30),
              quien: z.string().trim().max(120).default("consulta")
            })
          )
          .min(1)
          .max(50)
      })
      .safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.riesgo.coincidencias(parsed.data.documentos);
  }

  // --- Reembolsos y contracargos (spec reembolsos-contracargos) ---

  /** GET /v1/admin/pagos/:id/reembolsos — lo devuelto de un cobro, con el reparto de cada uno. */
  @Get("pagos/:id/reembolsos")
  async listarReembolsos(@Param("id") id: string): Promise<Reembolso[]> {
    this.exigir("leer");
    if (!UUID_RE.test(id)) throw new BadRequestException("id inválido.");
    return this.reembolsos.listarReembolsos(id);
  }

  /** POST /v1/admin/pagos/:id/reembolsos — finanzas registra un reembolso ya pagado desde el banco (CA-1, CA-2). */
  @Post("pagos/:id/reembolsos")
  @HttpCode(201)
  async registrarReembolso(@Param("id") id: string, @Body() body: unknown): Promise<Reembolso> {
    this.exigir("reembolsos.registrar");
    if (!UUID_RE.test(id)) throw new BadRequestException("id inválido.");
    const parsed = z
      .object({
        montoMinor: z.number().int().positive(),
        motivo: z.string().trim().min(3).max(500),
        fecha: FechaSchema,
        referenciaPago: z.string().trim().min(1).max(120),
        comprobante: z.string().trim().max(500).optional()
      })
      .safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.reembolsos.registrarReembolso(id, parsed.data, this.quien());
  }

  /** GET /v1/admin/contracargos?estado=&paymentId= — los abiertos primero, por fecha límite. */
  @Get("contracargos")
  async listarContracargos(
    @Query("estado") estado?: string,
    @Query("paymentId") paymentId?: string
  ): Promise<Contracargo[]> {
    this.exigir("leer");
    const est = z
      .enum(["recibido", "en_evidencia", "ganado", "perdido"])
      .optional()
      .safeParse(estado || undefined);
    if (!est.success) throw new BadRequestException("Estado de contracargo inválido.");
    if (paymentId && !UUID_RE.test(paymentId)) throw new BadRequestException("paymentId inválido.");
    return this.reembolsos.listarContracargos(est.data, paymentId || undefined);
  }

  /** POST /v1/admin/pagos/:id/contracargos — registra el reclamo de la red con su fecha límite (CA-3). */
  @Post("pagos/:id/contracargos")
  @HttpCode(201)
  async registrarContracargo(@Param("id") id: string, @Body() body: unknown): Promise<Contracargo> {
    this.exigir("contracargos.gestionar");
    if (!UUID_RE.test(id)) throw new BadRequestException("id inválido.");
    const parsed = z
      .object({
        montoMinor: z.number().int().positive(),
        motivoRed: z.string().trim().min(3).max(500),
        referenciaRed: z.string().trim().max(120).optional(),
        fechaLimiteEvidencia: FechaSchema
      })
      .safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.reembolsos.registrarContracargo(id, parsed.data, this.quien());
  }

  /** POST /v1/admin/contracargos/:id/evidencia — lo que se le envía a la red. */
  @Post("contracargos/:id/evidencia")
  @HttpCode(200)
  async evidenciaContracargo(@Param("id") id: string, @Body() body: unknown): Promise<Contracargo> {
    this.exigir("contracargos.gestionar");
    if (!UUID_RE.test(id)) throw new BadRequestException("id inválido.");
    const parsed = z.object({ evidencia: z.string().trim().min(3).max(4000) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.reembolsos.evidencia(id, parsed.data.evidencia, this.quien());
  }

  /** POST /v1/admin/contracargos/:id/resolver — ganado o perdido; perdido saca el dinero (CA-3). */
  @Post("contracargos/:id/resolver")
  @HttpCode(200)
  async resolverContracargo(@Param("id") id: string, @Body() body: unknown): Promise<Contracargo> {
    this.exigir("contracargos.resolver");
    if (!UUID_RE.test(id)) throw new BadRequestException("id inválido.");
    const parsed = z
      .object({
        resultado: z.enum(["ganado", "perdido"]),
        nota: z.string().trim().max(500).optional(),
        fecha: FechaSchema.optional(),
        referenciaPago: z.string().trim().max(120).optional()
      })
      .safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.reembolsos.resolver(id, parsed.data, this.quien());
  }

  // --- Command Center y reportes (Fase 10) ---

  /** GET /v1/admin/merchants-resumen — volumen del mes, por pagar, tarifa y riesgo de cada comercio. */
  @Get("merchants-resumen")
  async resumenComercios(): Promise<ResumenComercio[]> {
    this.exigir("leer");
    return this.reportes.comercios();
  }

  /** GET /v1/admin/resumen — la portada: cifras reales de hoy, del mes y de la custodia. */
  @Get("resumen")
  async resumen(): Promise<Resumen> {
    this.exigir("leer");
    return this.reportes.resumen();
  }

  /** GET /v1/admin/merchants/:tenantId/estado-cuenta?desde&hasta — movimientos del ledger del comercio. */
  @Get("merchants/:tenantId/estado-cuenta")
  async estadoCuenta(
    @Param("tenantId") tenantId: string,
    @Query("desde") desde?: string,
    @Query("hasta") hasta?: string
  ): Promise<EstadoCuenta> {
    this.exigir("leer");
    if (!UUID_RE.test(tenantId)) throw new BadRequestException("tenantId inválido.");
    const rango = this.rango(desde, hasta);
    return this.reportes.estadoCuenta(tenantId, rango.desde, rango.hasta);
  }

  /** GET /v1/admin/reportes/fiscal?mes=AAAA-MM — base, comisión, IVA, costo y margen por comercio. */
  @Get("reportes/fiscal")
  async reporteFiscal(@Query("mes") mes?: string): Promise<FilaFiscal[]> {
    this.exigir("leer");
    return this.reportes.fiscal(this.mes(mes));
  }

  /**
   * GET /v1/admin/exportar/:recurso.csv — pagos, consignaciones, lotes,
   * estado de cuenta o fiscal, en CSV para Excel. Los montos van en la unidad
   * mínima como enteros; la moneda, en su columna.
   */
  @Get("exportar/:recurso")
  async exportar(
    @Param("recurso") recurso: string,
    @Query() query: Record<string, string | undefined>,
    @Res({ passthrough: true }) res: RespuestaConCabeceras
  ): Promise<string> {
    this.exigir("leer");
    const nombre = recurso.replace(/\.csv$/, "");
    let csv: string;
    switch (nombre) {
      case "pagos": {
        const parsed = FiltrosPagosSchema.safeParse({ ...query, limite: "200" });
        if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
        const filas = [];
        let cursor: { at: string; id: string } | null = null;
        // Hasta 5 000 filas: un exporte contable, no una réplica de la base.
        for (let pagina = 0; pagina < 25; pagina++) {
          const p = await this.pagos.listar({
            ...parsed.data,
            cursorAt: cursor?.at,
            cursorId: cursor?.id
          });
          filas.push(...p.pagos);
          if (!p.siguiente) break;
          cursor = p.siguiente;
        }
        csv = aCsv(filas, [
          { titulo: "Cobro", valor: (f) => f.id },
          { titulo: "Comercio", valor: (f) => f.tenantNombre },
          { titulo: "Referencia", valor: (f) => f.referencia },
          { titulo: "Monto", valor: (f) => f.montoMinor },
          { titulo: "Moneda", valor: (f) => f.moneda },
          { titulo: "Estado", valor: (f) => f.estado },
          { titulo: "Proveedor", valor: (f) => f.provider },
          { titulo: "Id proveedor", valor: (f) => f.providerPaymentId },
          { titulo: "Creado", valor: (f) => f.creadoEn },
          { titulo: "Actualizado", valor: (f) => f.actualizadoEn }
        ]);
        break;
      }
      case "consignaciones":
        csv = aCsv(await this.custodia.listarConsignaciones(200), [
          { titulo: "Fecha", valor: (f) => f.fecha },
          { titulo: "Proveedor", valor: (f) => f.provider },
          { titulo: "Referencia bancaria", valor: (f) => f.referenciaBancaria },
          { titulo: "Monto", valor: (f) => f.montoMinor },
          { titulo: "Cobros", valor: (f) => f.cobros },
          { titulo: "Comercios", valor: (f) => f.comercios },
          { titulo: "Nota", valor: (f) => f.nota },
          { titulo: "Registrada por", valor: (f) => f.registradaPor },
          { titulo: "Registrada en", valor: (f) => f.registradaEn }
        ]);
        break;
      case "lotes":
        csv = aCsv(await this.dispersion.listarLotes(undefined, 200), [
          { titulo: "Lote", valor: (f) => f.id },
          { titulo: "Comercio", valor: (f) => f.tenantNombre },
          { titulo: "Estado", valor: (f) => f.estado },
          { titulo: "Monto", valor: (f) => f.montoMinor },
          { titulo: "Reserva", valor: (f) => f.reservaMinor },
          { titulo: "Cobros", valor: (f) => f.cobros },
          { titulo: "Banco", valor: (f) => f.cuenta.banco },
          { titulo: "Cuenta", valor: (f) => f.cuenta.numeroCuenta },
          { titulo: "Titular", valor: (f) => f.cuenta.titularCuenta },
          { titulo: "Preparó", valor: (f) => f.preparadoPor },
          { titulo: "Aprobó", valor: (f) => f.aprobadoPor },
          { titulo: "Fecha pago", valor: (f) => f.fechaPago },
          { titulo: "Referencia pago", valor: (f) => f.referenciaPago },
          { titulo: "Pagó", valor: (f) => f.pagadoPor },
          { titulo: "Fallo", valor: (f) => f.falloMotivo }
        ]);
        break;
      case "estado-cuenta": {
        const tenantId = query.tenantId ?? "";
        if (!UUID_RE.test(tenantId)) throw new BadRequestException("tenantId inválido.");
        const rango = this.rango(query.desde, query.hasta);
        const ec = await this.reportes.estadoCuenta(tenantId, rango.desde, rango.hasta);
        csv = aCsv(ec.lineas, [
          { titulo: "Fecha", valor: (f) => f.posteadoEn },
          { titulo: "Asiento", valor: (f) => f.asientoId },
          { titulo: "Tipo", valor: (f) => f.kind },
          { titulo: "Detalle", valor: (f) => f.memo },
          { titulo: "Referencia cobro", valor: (f) => f.referencia },
          { titulo: "Cuenta", valor: (f) => f.cuenta },
          { titulo: "Naturaleza", valor: (f) => f.naturaleza },
          { titulo: "Débito", valor: (f) => (f.direccion === "debit" ? f.montoMinor : "") },
          { titulo: "Crédito", valor: (f) => (f.direccion === "credit" ? f.montoMinor : "") }
        ] as ColumnaCsv<(typeof ec.lineas)[number]>[]);
        break;
      }
      case "fiscal":
        csv = aCsv(await this.reportes.fiscal(this.mes(query.mes)), [
          { titulo: "Comercio", valor: (f) => f.tenantNombre },
          { titulo: "Documento", valor: (f) => f.documento },
          { titulo: "Cobros", valor: (f) => f.cobros },
          { titulo: "Base", valor: (f) => f.baseMinor },
          { titulo: "Comisión", valor: (f) => f.comisionMinor },
          { titulo: "IVA", valor: (f) => f.ivaMinor },
          { titulo: "Costo proveedor", valor: (f) => f.costoMinor },
          { titulo: "Margen", valor: (f) => f.margenMinor }
        ]);
        break;
      default:
        throw new NotFoundException(`No hay exporte "${nombre}".`);
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="evepay-${nombre}-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    return csv;
  }

  /** Rango de fechas de calendario; por defecto los últimos 30 días. */
  private rango(desde?: string, hasta?: string): { desde: string; hasta: string } {
    const hoy = new Date().toISOString().slice(0, 10);
    const hace30 = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const d = desde || hace30;
    const h = hasta || hoy;
    if (!FechaSchema.safeParse(d).success || !FechaSchema.safeParse(h).success || d > h) {
      throw new BadRequestException(
        "El rango va como desde=AAAA-MM-DD&hasta=AAAA-MM-DD, con desde ≤ hasta."
      );
    }
    return { desde: d, hasta: h };
  }

  private mes(mes?: string): string {
    const m = mes || new Date().toISOString().slice(0, 7);
    if (!MesSchema.safeParse(m).success) throw new BadRequestException("El mes va como AAAA-MM.");
    return m;
  }

  /** GET /v1/admin/auditoria — últimas acciones administrativas (CA-4). */
  @Get("auditoria")
  async listarAuditoria(@Query("limite") limite?: string): Promise<AccionAdmin[]> {
    this.exigir("leer");
    const n = Number(limite);
    return this.auditoria.listar(Number.isFinite(n) && n > 0 ? n : 100);
  }

  /** Quién queda registrado en la auditoría: siempre una persona con nombre. */
  private actor(): string {
    return currentContextOrNull()?.actor || "desconocido";
  }

  /** Quién actúa y con qué rol, para el cuatro ojos y la auditoría de dispersión. */
  private quien(): { actor: string; rol: string } {
    return { actor: this.actor(), rol: currentContextOrNull()?.role ?? "" };
  }

  /**
   * Acceso por acción (spec `rbac-operativo`): el rol viene del JWT de
   * Supabase que TenantMiddleware deja en el contexto, y la tabla de permisos
   * dice qué roles internos pueden hacer cada cosa. Sin contexto no hay
   * identidad, y eso se lee como no autorizado (403), nunca como un 500 que
   * además delate que el endpoint existe.
   *
   * Aquí vivía además un `X-Admin-Secret` compartido, retirado en F1. Un
   * secreto que usan varias personas no distingue quién hizo qué, así que la
   * auditoría no podía nombrar a nadie, y revocarlo obligaba a rotarlo para
   * todos a la vez.
   */
  private exigir(accion: Accion): void {
    const role = currentContextOrNull()?.role ?? "";
    if (puede(role, accion)) return;
    if (ROLES_INTERNOS.includes(role as Role)) {
      throw new ForbiddenException(
        `Esta acción requiere el rol ${rolesPara(accion).join(" o ")}; tu rol es ${role}.`
      );
    }
    throw new ForbiddenException("Acceso de administrador requerido.");
  }
}
