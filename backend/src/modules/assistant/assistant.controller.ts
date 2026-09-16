import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UserRole } from "../users/enums/user-role.enum";
import { CustomerEventsService } from "../customer-events/customer-events.service";
import { RecordCustomerInteractionDto } from "./dtos/record-interaction.dto";
import { CUSTOMER_EVENT_SOURCES } from "../customer-events/customer-events.constants";

@ApiTags("assistant")
@ApiBearerAuth()
@Controller("assistant")
@Roles(UserRole.CUSTOMER)
export class AssistantController {
  constructor(private readonly customerEventsService: CustomerEventsService) {}

  /** Backward-compatible chatbot event endpoint — same storage as POST /events. */
  @Post("interactions")
  recordInteraction(
    @CurrentUser("id") userId: string,
    @Body() dto: RecordCustomerInteractionDto,
  ) {
    return this.customerEventsService.recordEvent(dto, {
      userId,
      defaultSource: CUSTOMER_EVENT_SOURCES.CHATBOT,
    });
  }
}
