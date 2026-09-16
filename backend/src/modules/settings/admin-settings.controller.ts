import { Controller, Get, Put, Body } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { SettingsService } from "./settings.service";
import { UpdateSettingsDto } from "./dtos/update-settings.dto";
import { UserRole } from "../users/enums/user-role.enum";
import { StoreWaitService } from "../store-wait/store-wait.service";

@Controller("admin/settings")
@Roles(UserRole.ADMIN)
export class AdminSettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly storeWaitService: StoreWaitService,
  ) {}

  @Get()
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Put()
  async updateSettings(@Body() updateSettingsDto: UpdateSettingsDto) {
    const before = await this.settingsService.getStoreStatus();
    const updated =
      await this.settingsService.updateSettings(updateSettingsDto);
    const afterOpen = updated.isStoreOpen;

    if (!before.isOpen && afterOpen) {
      await this.storeWaitService.notifyWaitingCustomers();
    }

    return updated;
  }
}
