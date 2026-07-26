import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  UseGuards
} from "@nestjs/common";
import { CrearCobroInputSchema, type Cobro } from "@evetev/shared";
import { currentContext } from "../../common/request-context";
import { Role } from "../identidad/roles";
import { Roles } from "../identidad/roles.decorator";
import { RolesGuard } from "../identidad/roles.guard";
import { PagosService } from "./pagos.service";

@Controller("pagos")
@UseGuards(RolesGuard)
export class PagosController {
  constructor(private readonly pagos: PagosService) {}

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
