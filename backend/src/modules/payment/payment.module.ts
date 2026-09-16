import { Module } from "@nestjs/common";
import { PaymentConfigService } from "./payment-config.service";
import { AdminPaymentController } from "./admin-payment.controller";

@Module({
  controllers: [AdminPaymentController],
  providers: [PaymentConfigService],
  exports: [PaymentConfigService],
})
export class PaymentModule {}
