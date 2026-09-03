import { Module } from "@nestjs/common";
import { ConciliacionModule } from "../conciliacion/conciliacion.module";
import { LedgerModule } from "../ledger/ledger.module";
import { MerchantsModule } from "../merchants/merchants.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminAuditService } from "./admin-audit.service";
import { PerfilComercioService } from "./perfil-comercio.service";
import { ProvidersService } from "./providers.service";
import { PagosAdminService } from "./pagos-admin.service";
import { ConciliacionAdminService } from "./conciliacion-admin.service";

@Module({
  imports: [MerchantsModule, LedgerModule, ConciliacionModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminAuditService,
    ProvidersService,
    PagosAdminService,
    ConciliacionAdminService,
    PerfilComercioService
  ]
})
export class AdminModule {}
