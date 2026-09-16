import { Module } from "@nestjs/common";
import { AssistantController } from "./assistant.controller";
import { CustomerEventsModule } from "../customer-events/customer-events.module";

@Module({
  imports: [CustomerEventsModule],
  controllers: [AssistantController],
})
export class AssistantModule {}
