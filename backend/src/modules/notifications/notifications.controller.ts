import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UserRole } from "../users/enums/user-role.enum";
import { NotificationsService } from "./notifications.service";
import { UpdateNotificationPreferencesDto } from "./dtos/update-notification-preferences.dto";

@ApiTags("notifications")
@ApiBearerAuth()
@Controller("notifications")
@Roles(UserRole.CUSTOMER)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

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
