import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Headers,
  HttpCode,
  Param,
  Post,
  Query
} from "@nestjs/common";
import type { SaludProvider } from "@evetev/shared";
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
import { ProvidersService, type EstadoProveedores } from "./providers.service";
import {
  PagosAdminService,
  type EventoTimeline,
  type PagoAdmin,
  type PaginaPagos,
  type ResultadoReverificacion
} from "./pagos-admin.service";
import { ADMIN_HTML } from "./admin-page";

const CrearComercioSchema = z.object({
  legalName: z.string().min(3).max(200),
  displayName: z.string().min(2).max(100)
});

const RotarApiKeySchema = z.object({
  environment: z.enum(["live", "test"])
});

const CambiarEstadoSchema = z.object({
  activo: z.boolean()
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
 * Acceso: JWT de Supabase con rol super_admin, o el X-Admin-Secret transitorio.
 */
@Controller("admin")
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly auditoria: AdminAuditService,
    private readonly providers: ProvidersService,
    private readonly pagos: PagosAdminService
  ) {}

  /** GET /v1/admin/merchants — lista todos los comercios (para el panel y verificar auth). */
  @Get("merchants")
  async listarComercios(
    @Headers("x-admin-secret") secret: string | undefined
  ): Promise<ComercioListado[]> {
    this.verificarAdmin(secret);
    return this.admin.listarComercios();
  }

  /** POST /v1/admin/merchants — crea tenant + merchant + API keys (live y test). */
  @Post("merchants")
  @HttpCode(201)
  async crearComercio(
    @Headers("x-admin-secret") secret: string | undefined,
    @Body() body: unknown
  ): Promise<ComercioCreado> {
    this.verificarAdmin(secret);

    const parsed = CrearComercioSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.admin.crearComercio(parsed.data, this.actor(secret));
  }

  /**
   * POST /v1/admin/merchants/:tenantId/api-keys/rotate — nueva clave y las
   * anteriores del mismo entorno revocadas, en una sola operación (CA-9).
   */
  @Post("merchants/:tenantId/api-keys/rotate")
  @HttpCode(200)
  async rotarApiKey(
    @Headers("x-admin-secret") secret: string | undefined,
    @Param("tenantId") tenantId: string,
    @Body() body: unknown
  ): Promise<ApiKeyRotada> {
    this.verificarAdmin(secret);
    if (!UUID_RE.test(tenantId)) {
      throw new BadRequestException("tenantId inválido.");
    }

    const parsed = RotarApiKeySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.admin.rotarApiKey(tenantId, parsed.data.environment, this.actor(secret));
  }

  /**
   * POST /v1/admin/merchants/:tenantId/estado — activa o desactiva el comercio
   * (CA-10). No borra nada: su historial y su ledger siguen consultables.
   */
  @Post("merchants/:tenantId/estado")
  @HttpCode(200)
  async cambiarEstado(
    @Headers("x-admin-secret") secret: string | undefined,
    @Param("tenantId") tenantId: string,
    @Body() body: unknown
  ): Promise<{ tenantId: string; estado: string }> {
    this.verificarAdmin(secret);
    if (!UUID_RE.test(tenantId)) {
      throw new BadRequestException("tenantId inválido.");
    }

    const parsed = CambiarEstadoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.admin.cambiarEstadoComercio(tenantId, parsed.data.activo, this.actor(secret));
  }

  /** GET /v1/admin/providers — estado de la adquirencia (CA-11, CA-13). */
  @Get("providers")
  async listarProveedores(
    @Headers("x-admin-secret") secret: string | undefined
  ): Promise<EstadoProveedores> {
    this.verificarAdmin(secret);
    return this.providers.estado();
  }

  /**
   * POST /v1/admin/providers/health — comprobación real contra el proveedor
   * activo (CA-12). Es de solo lectura, pero va por POST porque sale a la red
   * del proveedor: no debe dispararse por un prefetch ni quedar cacheada.
   */
  @Post("providers/health")
  @HttpCode(200)
  async saludProveedor(
    @Headers("x-admin-secret") secret: string | undefined
  ): Promise<SaludProvider & { proveedor: string }> {
    this.verificarAdmin(secret);
    const salud = await this.providers.salud();

    // Comprobar la adquirencia es una acción de operación: queda registrada,
    // así se puede reconstruir qué se sabía y cuándo ante un incidente.
    await this.auditoria.registrar({
      actor: this.actor(secret),
      accion: "proveedor.salud",
      objetoTipo: "proveedor",
      objetoId: salud.proveedor,
      detalle: { ok: salud.ok, detalle: salud.detalle, duracionMs: salud.duracionMs }
    });

    return salud;
  }

  /** GET /v1/admin/pagos — listado cross-tenant con filtros (CA-15). */
  @Get("pagos")
  async listarPagos(
    @Headers("x-admin-secret") secret: string | undefined,
    @Query() query: Record<string, string | undefined>
  ): Promise<PaginaPagos> {
    this.verificarAdmin(secret);

    const parsed = FiltrosPagosSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.pagos.listar(parsed.data);
  }

  /** GET /v1/admin/pagos/:id — un cobro concreto. */
  @Get("pagos/:id")
  async obtenerPago(
    @Headers("x-admin-secret") secret: string | undefined,
    @Param("id") id: string
  ): Promise<PagoAdmin> {
    this.verificarAdmin(secret);
    if (!UUID_RE.test(id)) throw new BadRequestException("id inválido.");
    return this.pagos.obtener(id);
  }

  /**
   * GET /v1/admin/pagos/:id/timeline — transiciones, webhooks (con sus
   * reenvíos) y asientos de ledger, en orden (CA-16).
   */
  @Get("pagos/:id/timeline")
  async timelinePago(
    @Headers("x-admin-secret") secret: string | undefined,
    @Param("id") id: string
  ): Promise<EventoTimeline[]> {
    this.verificarAdmin(secret);
    if (!UUID_RE.test(id)) throw new BadRequestException("id inválido.");
    return this.pagos.timeline(id);
  }

  /**
   * POST /v1/admin/pagos/:id/reverify — consulta el estado al proveedor y lo
   * aplica solo si la máquina de estados lo permite (CA-17, CA-18).
   */
  @Post("pagos/:id/reverify")
  @HttpCode(200)
  async reverificarPago(
    @Headers("x-admin-secret") secret: string | undefined,
    @Param("id") id: string
  ): Promise<ResultadoReverificacion> {
    this.verificarAdmin(secret);
    if (!UUID_RE.test(id)) throw new BadRequestException("id inválido.");
    return this.pagos.reverificar(id, this.actor(secret));
  }

  /** GET /v1/admin/auditoria — últimas acciones administrativas (CA-4). */
  @Get("auditoria")
  async listarAuditoria(
    @Headers("x-admin-secret") secret: string | undefined,
    @Query("limite") limite?: string
  ): Promise<AccionAdmin[]> {
    this.verificarAdmin(secret);
    const n = Number(limite);
    return this.auditoria.listar(Number.isFinite(n) && n > 0 ? n : 100);
  }

  /**
   * Quién queda registrado en la auditoría. Con JWT es la persona; con el
   * secreto compartido no hay forma de saber quién lo usó, y eso se dice tal
   * cual en vez de atribuirlo a alguien. Es otra razón para retirarlo (F1).
   */
  private actor(secret: string | undefined): string {
    const ctx = currentContextOrNull();
    if (ctx?.role === Role.SUPER_ADMIN && ctx.actor) {
      return ctx.actor;
    }
    return secret ? "admin-secret (sin identificar)" : "desconocido";
  }

  /**
   * Acceso admin (CA-3 de admin-console): la vía principal es el JWT de
   * Supabase con rol super_admin (lo establece TenantMiddleware en el
   * contexto). `X-Admin-Secret` sigue aceptándose como mecanismo transitorio
   * hasta F1 (retiro junto con la página embebida).
   */
  private verificarAdmin(secret: string | undefined): void {
    if (currentContextOrNull()?.role === Role.SUPER_ADMIN) {
      return;
    }

    const expected = process.env.ADMIN_SECRET;
    if (!expected) throw new ForbiddenException("Acceso de administrador requerido.");
    if (!secret || secret !== expected)
      throw new ForbiddenException("Acceso de administrador requerido.");
  }
}

/**
 * Panel HTML de admin — servido en GET /admin (sin prefijo v1).
 * Fuera de este controlador para poder excluirlo del global prefix en AppModule.
 */
@Controller()
export class AdminUIController {
  @Get("admin")
  @Header("content-type", "text/html; charset=utf-8")
  @Header("cache-control", "no-store")
  pagina(): string {
    return ADMIN_HTML;
  }
}
