import { Module } from "@nestjs/common";
import { ConciliacionModule } from "../conciliacion/conciliacion.module";
import { LedgerModule } from "../ledger/ledger.module";
import { MerchantsModule } from "../merchants/merchants.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminAuditService } from "./admin-audit.service";
import { COMERCIOS_REPOSITORY } from "./comercios.repository";
import { DrizzleComerciosRepository } from "./drizzle-comercios.repository";
import { PERFILES_REPOSITORY } from "./perfiles.repository";
import { DrizzlePerfilesRepository } from "./drizzle-perfiles.repository";
import { DB, type Db } from "../../database/drizzle";
import { PerfilComercioService } from "./perfil-comercio.service";
import { ProvidersService } from "./providers.service";
import { PagosAdminService } from "./pagos-admin.service";
import { ConciliacionAdminService } from "./conciliacion-admin.service";

@Module({
  imports: [MerchantsModule, LedgerModule, ConciliacionModule],
  controllers: [AdminController],
  providers: [
    {
      // El repositorio necesita la auditoría porque el rastro viaja dentro de
      // la misma transacción que la escritura.
      provide: COMERCIOS_REPOSITORY,
      inject: [DB, AdminAuditService],
      useFactory: (db: Db, auditoria: AdminAuditService) =>
        new DrizzleComerciosRepository(db, auditoria)
    },
    {
      provide: PERFILES_REPOSITORY,
      inject: [DB, AdminAuditService],
      useFactory: (db: Db, auditoria: AdminAuditService) =>
        new DrizzlePerfilesRepository(db, auditoria)
    },
    AdminService,
    AdminAuditService,
    ProvidersService,
    PagosAdminService,
    ConciliacionAdminService,
    PerfilComercioService
  ]
})
export class AdminModule {}
