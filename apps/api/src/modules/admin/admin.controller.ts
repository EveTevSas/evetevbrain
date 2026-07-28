import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Post
} from "@nestjs/common";
import { z } from "zod";
import { AdminService, type ComercioCreado } from "./admin.service";

const CrearComercioSchema = z.object({
  legalName: z.string().min(3).max(200),
  displayName: z.string().min(2).max(100)
});

/**
 * Endpoints exclusivos de Evetev (admin interno).
 * Protegidos por `X-Admin-Secret` — debe coincidir con la var ADMIN_SECRET.
 * No están expuestos a comercios; nunca los documentes en la guía pública.
 */
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  /**
   * POST /v1/admin/merchants — onboarding de un comercio nuevo.
   * Crea tenant + merchant + dos API keys (live y test).
   * Las claves se devuelven UNA SOLA VEZ; el admin debe copiarlas al comercio.
   */
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

    return this.admin.crearComercio(parsed.data);
  }

  private verificarAdmin(secret: string | undefined): void {
    const expected = process.env.ADMIN_SECRET;
    if (!expected) {
      throw new ForbiddenException("ADMIN_SECRET no configurado.");
    }
    if (!secret || secret !== expected) {
      throw new ForbiddenException("Acceso de administrador requerido.");
    }
  }
}
