import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PaymentMethodType, UserRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { PaymentConfigService } from "./payment-config.service";
import { CreatePaymentAccountDto } from "./dtos/create-payment-account.dto";
import { UpdatePaymentAccountDto } from "./dtos/update-payment-account.dto";
import { UpdateCodSettingsDto } from "./dtos/update-cod-settings.dto";
import { UpdatePaymentMethodEnabledDto } from "./dtos/update-payment-method-enabled.dto";

@ApiTags("Admin Payment")
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller("admin/payment")
export class AdminPaymentController {
  constructor(private paymentConfig: PaymentConfigService) {}

  @Get("config")
  getConfig() {
    return this.paymentConfig.getAdminConfig();
  }

  @Patch("cod")
  updateCod(@Body() dto: UpdateCodSettingsDto) {
    return this.paymentConfig.updateCodSettings(dto);
  }

  @Patch("methods/:method/enabled")
  setMethodEnabled(
    @Param("method") method: PaymentMethodType,
    @Body() dto: UpdatePaymentMethodEnabledDto,
  ) {
    return this.paymentConfig.setMethodEnabled(method, dto.enabled);
  }

  @Post("accounts")
  createAccount(@Body() dto: CreatePaymentAccountDto) {
    return this.paymentConfig.createAccount(dto);
  }

  @Patch("accounts/:id")
  updateAccount(@Param("id") id: string, @Body() dto: UpdatePaymentAccountDto) {
    return this.paymentConfig.updateAccount(id, dto);
  }

  @Patch("accounts/:id/activate")
  activateAccount(@Param("id") id: string) {
    return this.paymentConfig.activateAccount(id);
  }

  @Delete("accounts/:id")
  removeAccount(@Param("id") id: string) {
    return this.paymentConfig.removeAccount(id);
  }
}
