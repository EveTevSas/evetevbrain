import { BadRequestException, Body, Controller, Post, UseGuards } from "@nestjs/common";
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
