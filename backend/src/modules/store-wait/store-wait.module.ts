import { Module } from "@nestjs/common";
import { StoreWaitService } from "./store-wait.service";
import { StoreWaitController } from "./store-wait.controller";

@Module({
  controllers: [StoreWaitController],
  providers: [StoreWaitService],
  exports: [StoreWaitService],
})
export class StoreWaitModule {}
