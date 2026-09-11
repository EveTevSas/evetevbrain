import { Module } from "@nestjs/common";
import { ConciliacionModule } from "../conciliacion/conciliacion.module";
import { RiesgoModule } from "../riesgo/riesgo.module";
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
import { TarifasAdminService } from "./tarifas-admin.service";
import { CustodiaAdminService } from "./custodia-admin.service";
import { DispersionAdminService } from "./dispersion-admin.service";
import { RiesgoAdminService } from "./riesgo-admin.service";
import { ReportesAdminService } from "./reportes-admin.service";
import { ReembolsosAdminService } from "./reembolsos-admin.service";

@Module({
  imports: [MerchantsModule, LedgerModule, ConciliacionModule, RiesgoModule],
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
    PerfilComercioService,
    TarifasAdminService,
    CustodiaAdminService,
    DispersionAdminService,
    RiesgoAdminService,
    ReportesAdminService,
    ReembolsosAdminService
  ]
})
export class AdminModule {}
