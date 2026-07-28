import { Module } from "@nestjs/common";
import { MerchantsModule } from "../merchants/merchants.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [MerchantsModule],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
