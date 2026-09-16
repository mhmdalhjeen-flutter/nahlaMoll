import { Controller, Get } from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator";
import { SettingsService } from "./settings.service";
import { PaymentConfigService } from "../payment/payment-config.service";

@Controller("settings")
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly paymentConfig: PaymentConfigService,
  ) {}

  @Public()
  @Get()
  async getSettings() {
    return this.settingsService.getPublicSettings();
  }

  @Public()
  @Get("delivery")
  async getDeliverySettings() {
    return this.settingsService.getDeliverySettings();
  }

  @Public()
  @Get("store-status")
  async getStoreStatus() {
    return this.settingsService.getStoreStatus();
  }

  @Public()
  @Get("payment")
  async getPaymentSettings() {
    return this.paymentConfig.getPublicPaymentConfig();
  }
}
