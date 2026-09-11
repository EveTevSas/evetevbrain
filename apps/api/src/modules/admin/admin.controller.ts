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
  Query
} from "@nestjs/common";
import {
  RangoFechasSchema,
  TarifaComercioSchema,
  TarifaProveedorSchema,
  type SaludProvider
} from "@evetev/shared";
import { z } from "zod";
import { currentContextOrNull } from "../../common/request-context";
import { Role } from "../identidad/roles";
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
    private readonly custodia: CustodiaAdminService
  ) {}

  /** GET /v1/admin/merchants — lista todos los comercios (para el panel y verificar auth). */
  @Get("merchants")
  async listarComercios(): Promise<ComercioListado[]> {
    this.verificarAdmin();
    return this.admin.listarComercios();
  }

  /** POST /v1/admin/merchants — crea tenant + merchant + API keys (live y test). */
  @Post("merchants")
  @HttpCode(201)
  async crearComercio(@Body() body: unknown): Promise<ComercioCreado> {
    this.verificarAdmin();

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
    this.verificarAdmin();
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
    this.verificarAdmin();
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
    this.verificarAdmin();
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
    this.verificarAdmin();
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
    this.verificarAdmin();
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
    this.verificarAdmin();
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
    this.verificarAdmin();
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
    this.verificarAdmin();
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
    this.verificarAdmin();
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
    this.verificarAdmin();
    if (!UUID_RE.test(tenantId)) throw new BadRequestException("tenantId inválido.");
    return this.custodia.balanceComercio(tenantId);
  }

  /** GET /v1/admin/tarifas — la tarifa vigente de cada comercio que tiene una. */
  @Get("tarifas")
  async tarifasVigentes(): Promise<TarifaVigenteDeComercio[]> {
    this.verificarAdmin();
    return this.tarifas.tarifasVigentes();
  }

  /** GET /v1/admin/providers — estado de la adquirencia (CA-11, CA-13). */
  @Get("providers")
  async listarProveedores(): Promise<EstadoProveedores> {
    this.verificarAdmin();
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
    this.verificarAdmin();
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
    this.verificarAdmin();
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
    this.verificarAdmin();

    const parsed = TarifaProveedorSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.tarifas.asignarTarifaProveedor(provider, parsed.data, this.actor());
  }

  /** GET /v1/admin/pagos — listado cross-tenant con filtros (CA-15). */
  @Get("pagos")
  async listarPagos(@Query() query: Record<string, string | undefined>): Promise<PaginaPagos> {
    this.verificarAdmin();

    const parsed = FiltrosPagosSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.pagos.listar(parsed.data);
  }

  /** GET /v1/admin/pagos/:id — un cobro concreto. */
  @Get("pagos/:id")
  async obtenerPago(@Param("id") id: string): Promise<PagoAdmin> {
    this.verificarAdmin();
    if (!UUID_RE.test(id)) throw new BadRequestException("id inválido.");
    return this.pagos.obtener(id);
  }

  /**
   * GET /v1/admin/pagos/:id/timeline — transiciones, webhooks (con sus
   * reenvíos) y asientos de ledger, en orden (CA-16).
   */
  @Get("pagos/:id/timeline")
  async timelinePago(@Param("id") id: string): Promise<EventoTimeline[]> {
    this.verificarAdmin();
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
    this.verificarAdmin();
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
    this.verificarAdmin();
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
    this.verificarAdmin();
    if (tenantId && !UUID_RE.test(tenantId)) throw new BadRequestException("tenantId inválido.");
    const n = Number(limite);
    return this.conciliacion.historico(tenantId, Number.isFinite(n) && n > 0 ? n : 50);
  }

  /** GET /v1/admin/ledger/:tenantId — saldos reconstruidos y asientos (CA-21). */
  @Get("ledger/:tenantId")
  async ledger(@Param("tenantId") tenantId: string): Promise<LedgerTenant> {
    this.verificarAdmin();
    if (!UUID_RE.test(tenantId)) throw new BadRequestException("tenantId inválido.");
    return this.conciliacion.ledger(tenantId);
  }

  /** GET /v1/admin/consignaciones — las registradas, la más reciente primero. */
  @Get("consignaciones")
  async listarConsignaciones(@Query("limite") limite?: string): Promise<Consignacion[]> {
    this.verificarAdmin();
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
    this.verificarAdmin();
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
    this.verificarAdmin();

    const parsed = RegistrarConsignacionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.custodia.registrarConsignacion(parsed.data, this.actor());
  }

  /** GET /v1/admin/recaudo/cuadre?fecha= — libro vs banco al cierre de la fecha (CA-8). */
  @Get("recaudo/cuadre")
  async cuadreCustodia(@Query("fecha") fecha?: string): Promise<CuadreCustodia> {
    this.verificarAdmin();
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
    this.verificarAdmin();

    const parsed = RegistrarSaldoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.custodia.registrarSaldoRecaudo(parsed.data, this.actor());
  }

  /** GET /v1/admin/auditoria — últimas acciones administrativas (CA-4). */
  @Get("auditoria")
  async listarAuditoria(@Query("limite") limite?: string): Promise<AccionAdmin[]> {
    this.verificarAdmin();
    const n = Number(limite);
    return this.auditoria.listar(Number.isFinite(n) && n > 0 ? n : 100);
  }

  /** Quién queda registrado en la auditoría: siempre una persona con nombre. */
  private actor(): string {
    return currentContextOrNull()?.actor || "desconocido";
  }

  /**
   * Acceso admin (CA-3 de admin-console): rol super_admin en el JWT de
   * Supabase, que TenantMiddleware deja en el contexto. Sin contexto no hay
   * identidad, y eso se lee como no autorizado (403), nunca como un 500 que
   * además delate que el endpoint existe.
   *
   * Aquí vivía además un `X-Admin-Secret` compartido, retirado en F1. Un
   * secreto que usan varias personas no distingue quién hizo qué, así que la
   * auditoría no podía nombrar a nadie, y revocarlo obligaba a rotarlo para
   * todos a la vez.
   */
  private verificarAdmin(): void {
    if (currentContextOrNull()?.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException("Acceso de administrador requerido.");
    }
  }
}
