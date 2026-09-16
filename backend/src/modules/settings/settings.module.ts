import { Module } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { SettingsController } from "./settings.controller";
import { AdminSettingsController } from "./admin-settings.controller";
import { PaymentModule } from "../payment/payment.module";
import { StoreWaitModule } from "../store-wait/store-wait.module";

@Module({
  imports: [PaymentModule, StoreWaitModule],
  controllers: [SettingsController, AdminSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
