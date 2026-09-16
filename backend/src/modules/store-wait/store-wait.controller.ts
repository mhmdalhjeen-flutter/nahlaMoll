import { Controller, Get, Post, Delete, Body } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UserRole } from "../users/enums/user-role.enum";
import { StoreWaitService } from "./store-wait.service";
import { CreateStoreWaitDto } from "./dtos/create-store-wait.dto";

@Controller("store-wait")
@Roles(UserRole.CUSTOMER)
export class StoreWaitController {
  constructor(private readonly storeWaitService: StoreWaitService) {}

  @Get("me")
  async getMine(@CurrentUser("id") userId: string) {
    return this.storeWaitService.getActiveForUser(userId);
  }

  @Post()
  async register(
    @CurrentUser("id") userId: string,
    @Body() dto: CreateStoreWaitDto,
  ) {
    return this.storeWaitService.registerWait(userId, dto);
  }

  @Delete("me")
  async cancel(@CurrentUser("id") userId: string) {
    return this.storeWaitService.cancelActiveForUser(userId);
  }

  @Post("me/complete")
  async complete(@CurrentUser("id") userId: string) {
    return this.storeWaitService.completeActiveForUser(userId);
  }
}
