import { Module } from "@nestjs/common";
import { MerchantsModule } from "../merchants/merchants.module";
import { AdminController, AdminUIController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminAuditService } from "./admin-audit.service";

@Module({
  imports: [MerchantsModule],
  controllers: [AdminController, AdminUIController],
  providers: [AdminService, AdminAuditService]
})
export class AdminModule {}
