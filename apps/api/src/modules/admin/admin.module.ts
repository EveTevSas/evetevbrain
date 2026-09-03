import { Module } from "@nestjs/common";
import { LedgerModule } from "../ledger/ledger.module";
import { MerchantsModule } from "../merchants/merchants.module";
import { AdminController, AdminUIController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminAuditService } from "./admin-audit.service";
import { ProvidersService } from "./providers.service";
import { PagosAdminService } from "./pagos-admin.service";

@Module({
  imports: [MerchantsModule, LedgerModule],
  controllers: [AdminController, AdminUIController],
  providers: [AdminService, AdminAuditService, ProvidersService, PagosAdminService]
})
export class AdminModule {}
