import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query
} from "@nestjs/common";
import { RangoFechasSchema, type SaludProvider } from "@evetev/shared";
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    private readonly perfiles: PerfilComercioService
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
