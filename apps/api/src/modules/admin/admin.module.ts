import { Module } from "@nestjs/common";
import { MerchantsModule } from "../merchants/merchants.module";
import { AdminController, AdminUIController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminAuditService } from "./admin-audit.service";
import { ProvidersService } from "./providers.service";

@Module({
  imports: [MerchantsModule],
  controllers: [AdminController, AdminUIController],
  providers: [AdminService, AdminAuditService, ProvidersService]
})
export class AdminModule {}
