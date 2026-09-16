import { Module } from "@nestjs/common";
import { CustomerIntelligenceService } from "./customer-intelligence.service";

@Module({
  providers: [CustomerIntelligenceService],
  exports: [CustomerIntelligenceService],
})
export class CustomerIntelligenceModule {}
