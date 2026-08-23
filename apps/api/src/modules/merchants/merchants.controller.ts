import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  UseGuards
} from "@nestjs/common";
import { CrearMerchantInputSchema, type Merchant } from "@evetev/shared";
import { currentContext } from "../../common/request-context";
import { Role } from "../identidad/roles";
import { Roles } from "../identidad/roles.decorator";
import { RolesGuard } from "../identidad/roles.guard";
import { MerchantsService } from "./merchants.service";

@Controller("merchants")
@UseGuards(RolesGuard)
export class MerchantsController {
  constructor(private readonly merchants: MerchantsService) {}

  /** GET /v1/merchants/me — perfil del comercio autenticado (para el portal). */
  @Get("me")
  @Roles(Role.ADMIN_COMERCIO, Role.SUPER_ADMIN)
  async mio(): Promise<Merchant> {
    const { tenantId } = currentContext();
    const merchant = await this.merchants.obtenerPorTenant(tenantId);
    if (!merchant) throw new NotFoundException("Comercio no encontrado.");
    return merchant;
  }

  /** POST /v1/merchants — da de alta un comercio para el tenant del contexto. */
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN_COMERCIO)
  async crear(@Body() body: unknown): Promise<Merchant> {
    const parsed = CrearMerchantInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const ctx = currentContext();
    return this.merchants.registrar(ctx.tenantId, parsed.data);
  }
}
