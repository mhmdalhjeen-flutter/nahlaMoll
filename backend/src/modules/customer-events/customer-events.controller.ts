import { Body, Controller, Headers, Post } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UserRole } from "../users/enums/user-role.enum";
import { CustomerEventsService } from "./customer-events.service";
import { RecordCustomerEventDto } from "./dtos/record-customer-event.dto";
import { MergeCustomerSessionDto } from "./dtos/merge-customer-session.dto";
import { CUSTOMER_EVENT_SOURCES } from "./customer-events.constants";

@ApiTags("events")
@Controller("events")
export class CustomerEventsController {
  constructor(
    private readonly customerEventsService: CustomerEventsService,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @Post()
  recordEvent(
    @Body() dto: RecordCustomerEventDto,
    @Headers("authorization") authorization?: string,
  ) {
    const userId = this.extractOptionalUserId(authorization);
    return this.customerEventsService.recordEvent(dto, {
      userId,
      defaultSource: CUSTOMER_EVENT_SOURCES.STORE,
    });
  }

  @ApiBearerAuth()
  @Post("merge-session")
  @Roles(UserRole.CUSTOMER)
  mergeSession(
    @CurrentUser("id") userId: string,
    @Body() dto: MergeCustomerSessionDto,
  ) {
    return this.customerEventsService.mergeSessionToUser(dto.sessionId, userId);
  }

  private extractOptionalUserId(authorization?: string): string | undefined {
    if (!authorization?.startsWith("Bearer ")) return undefined;
    try {
      const payload = this.jwtService.verify<{ sub?: string }>(
        authorization.slice(7),
      );
      return payload.sub;
    } catch {
      return undefined;
    }
  }
}
