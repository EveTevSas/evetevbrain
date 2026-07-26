import { BadRequestException, Body, Controller, Post, UseGuards } from "@nestjs/common";
import { RangoFechasSchema, type ReporteConciliacion } from "@evetev/shared";
import { currentContext } from "../../common/request-context";
import { Role } from "../identidad/roles";
import { Roles } from "../identidad/roles.decorator";
import { RolesGuard } from "../identidad/roles.guard";
import { ReconciliacionService } from "./reconciliacion.service";

@Controller("conciliacion")
@UseGuards(RolesGuard)
export class ConciliacionController {
  constructor(private readonly conciliacion: ReconciliacionService) {}

  /** POST /v1/conciliacion/run — concilia el rango para el tenant del contexto. */
  @Post("run")
  @Roles(Role.SUPER_ADMIN, Role.ADMIN_COMERCIO)
  async run(@Body() body: unknown): Promise<ReporteConciliacion> {
    const parsed = RangoFechasSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const ctx = currentContext();
    return this.conciliacion.conciliar(ctx.tenantId, parsed.data);
  }
}
