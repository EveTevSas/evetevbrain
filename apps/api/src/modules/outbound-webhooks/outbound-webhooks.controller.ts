import { BadRequestException, Body, Controller, Get, Post, Put, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { currentContext } from "../../common/request-context";
import { Role } from "../identidad/roles";
import { Roles } from "../identidad/roles.decorator";
import { RolesGuard } from "../identidad/roles.guard";
import { OutboundWebhooksService, type WebhookRegistrado } from "./outbound-webhooks.service";

const RegistrarSchema = z.object({
  url: z.string().url("La URL debe ser válida (https://)."),
  events: z.array(z.enum(["payment.completed", "payment.failed"])).optional()
});

const ActualizarSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.enum(["payment.completed", "payment.failed"])).optional(),
  activa: z.boolean().optional()
});

/**
 * Gestión del endpoint de webhook saliente del comercio.
 * POST  /v1/webhook-endpoint  — registrar (primera vez, devuelve secret)
 * GET   /v1/webhook-endpoint  — consultar config
 * PUT   /v1/webhook-endpoint  — actualizar URL / eventos / activar-desactivar
 */
@Controller("webhook-endpoint")
@UseGuards(RolesGuard)
@Roles(Role.ADMIN_COMERCIO, Role.SUPER_ADMIN)
export class OutboundWebhooksController {
  constructor(private readonly service: OutboundWebhooksService) {}

  @Post()
  async registrar(@Body() body: unknown): Promise<WebhookRegistrado> {
    const parsed = RegistrarSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const { tenantId } = currentContext();
    return this.service.registrar(tenantId, parsed.data);
  }

  @Get()
  async obtener(): Promise<WebhookRegistrado> {
    const { tenantId } = currentContext();
    return this.service.obtener(tenantId);
  }

  @Put()
  async actualizar(@Body() body: unknown): Promise<WebhookRegistrado> {
    const parsed = ActualizarSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const { tenantId } = currentContext();
    return this.service.actualizar(tenantId, parsed.data);
  }
}
