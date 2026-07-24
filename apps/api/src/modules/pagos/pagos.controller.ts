import { BadRequestException, Body, Controller, Headers, Post } from "@nestjs/common";
import { CrearCobroInputSchema, type Cobro } from "@evetev/shared";
import { PagosService } from "./pagos.service";

@Controller("pagos")
export class PagosController {
  constructor(private readonly pagos: PagosService) {}

  /**
   * POST /v1/pagos — crea un cobro idempotente.
   * Requiere header `Idempotency-Key` (§4). Valida el body con Zod (§3).
   */
  @Post()
  async crear(
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: unknown
  ): Promise<Cobro> {
    if (!idempotencyKey) {
      throw new BadRequestException("Falta el header 'Idempotency-Key'.");
    }

    const parsed = CrearCobroInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.pagos.crearCobro(parsed.data, idempotencyKey);
  }
}
