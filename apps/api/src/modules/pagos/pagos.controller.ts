import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { CrearCobroInputSchema, type Cobro } from "@evetev/shared";
import { currentContext } from "../../common/request-context";
import { Role } from "../identidad/roles";
import { Roles } from "../identidad/roles.decorator";
import { RolesGuard } from "../identidad/roles.guard";
import type { PaginaCobros, StatsCobros } from "./pagos.repository";
import { PagosService } from "./pagos.service";

@Controller("pagos")
@UseGuards(RolesGuard)
export class PagosController {
  constructor(private readonly pagos: PagosService) {}

  /** GET /v1/pagos/stats — métricas para el dashboard del comercio. */
  @Get("stats")
  @Roles(Role.ADMIN_COMERCIO, Role.SUPER_ADMIN)
  async stats(
    @Query("desde") desde?: string,
    @Query("hasta") hasta?: string
  ): Promise<StatsCobros> {
    const { tenantId } = currentContext();
    return this.pagos.stats(tenantId, desde, hasta);
  }

  /** GET /v1/pagos — lista de cobros con filtros y paginación. */
  @Get()
  @Roles(Role.ADMIN_COMERCIO, Role.SUPER_ADMIN)
  async listar(
    @Query("desde") desde?: string,
    @Query("hasta") hasta?: string,
    @Query("estado") estado?: string,
    @Query("page") page = "1",
    @Query("limit") limit = "20"
  ): Promise<PaginaCobros> {
    const { tenantId } = currentContext();
    return this.pagos.listar(tenantId, {
      desde,
      hasta,
      estado: estado as Cobro["estado"] | undefined,
      page: Math.max(1, Number(page)),
      limit: Math.min(100, Math.max(1, Number(limit)))
    });
  }

  /** GET /v1/pagos/:id — detalle de un cobro. */
  @Get(":id")
  @Roles(Role.ADMIN_COMERCIO, Role.SUPER_ADMIN)
  async obtener(@Param("id") id: string): Promise<Cobro | null> {
    const { tenantId } = currentContext();
    return this.pagos.obtener(tenantId, id);
  }

  /**
   * POST /v1/pagos — crea un cobro idempotente.
   * Requiere header `Idempotency-Key` (§4) y rol autorizado (§4). Valida con Zod (§3).
   */
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN_COMERCIO)
  async crear(
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: unknown
  ): Promise<Cobro> {
    const key = idempotencyKey?.trim();
    if (!key) {
      throw new BadRequestException("Falta el header 'Idempotency-Key'.");
    }

    const parsed = CrearCobroInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const ctx = currentContext();
    return this.pagos.crearCobro({ tenantId: ctx.tenantId, actor: ctx.actor }, parsed.data, key);
  }
}
