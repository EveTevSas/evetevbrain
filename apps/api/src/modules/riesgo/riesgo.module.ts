import { Module } from "@nestjs/common";
import { RiesgoService } from "./riesgo.service";

/** El repositorio viene del módulo global (RepositoriesModule). */
@Module({
  providers: [RiesgoService],
  exports: [RiesgoService]
})
export class RiesgoModule {}
