import { Module } from "@nestjs/common";
import { IdentidadModule } from "../identidad/identidad.module";
import { PagosController } from "./pagos.controller";
import { PagosService } from "./pagos.service";

/**
 * Módulo `pagos` de EvePay. El repositorio y el PaymentProvider vienen del módulo
 * global (RepositoriesModule), compartidos con `webhooks` y `conciliacion`.
 */
@Module({
  imports: [IdentidadModule],
  controllers: [PagosController],
  providers: [PagosService],
  exports: [PagosService]
})
export class PagosModule {}
