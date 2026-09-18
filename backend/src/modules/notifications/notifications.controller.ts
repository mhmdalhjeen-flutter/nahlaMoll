import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UserRole } from "../users/enums/user-role.enum";
import { NotificationsService } from "./notifications.service";
import { PushSubscriptionService } from "./push-subscription.service";
import { UpdateNotificationPreferencesDto } from "./dtos/update-notification-preferences.dto";
import { NotificationsQueryDto } from "./dtos/notifications-query.dto";
import { RegisterPushSubscriptionDto } from "./dtos/register-push-subscription.dto";
import { DeletePushSubscriptionDto } from "./dtos/delete-push-subscription.dto";

@ApiTags("notifications")
@ApiBearerAuth()
@Controller("notifications")
@Roles(UserRole.CUSTOMER)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushSubscriptionService: PushSubscriptionService,
  ) {}

  @Get()
  list(
    @CurrentUser("id") userId: string,
    @Query() query: NotificationsQueryDto,
  ) {
    return this.notificationsService.findAllForCustomer(
      userId,
      query.page,
      query.limit,
    );
  }

  @Get("unread-count")
  unreadCount(@CurrentUser("id") userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Post("read-all")
  markAllRead(@CurrentUser("id") userId: string) {
    return this.notificationsService.markAllRead(userId);
  }

  @Post("push-subscriptions")
  registerPushSubscription(
    @CurrentUser("id") userId: string,
    @Body() dto: RegisterPushSubscriptionDto,
  ) {
    return this.pushSubscriptionService.register(userId, dto);
  }

  @Delete("push-subscriptions")
  deactivatePushSubscription(
    @CurrentUser("id") userId: string,
    @Body() dto: DeletePushSubscriptionDto,
  ) {
    return this.pushSubscriptionService.deactivate(userId, dto.endpoint);
  }

  @Post(":id/read")
  markRead(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.notificationsService.markRead(userId, id);
  }

  @Get("preferences")
  getPreferences(@CurrentUser("id") userId: string) {
    return this.notificationsService.getPreferences(userId);
  }

  @Patch("preferences")
  updatePreferences(
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(userId, dto);
  }
}
