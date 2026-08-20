import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Headers,
  HttpCode,
  Post
} from "@nestjs/common";
import { z } from "zod";
import { AdminService, type ComercioCreado, type ComercioListado } from "./admin.service";
import { ADMIN_HTML } from "./admin-page";

const CrearComercioSchema = z.object({
  legalName: z.string().min(3).max(200),
  displayName: z.string().min(2).max(100)
});

/**
 * Endpoints de admin (uso exclusivo de Evetev).
 * Protegidos por X-Admin-Secret == ADMIN_SECRET (env var).
 */
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

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
    return this.admin.crearComercio(parsed.data);
  }

  private verificarAdmin(secret: string | undefined): void {
    const expected = process.env.ADMIN_SECRET;
    if (!expected) throw new ForbiddenException("ADMIN_SECRET no configurado.");
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
