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
import { UserRole } from "../users/enums/user-role.enum";
import { OrdersService } from "./orders.service";
import { UpdateOrderStatusDto } from "./dtos/update-order-status.dto";
import { AdminPaymentActionDto } from "./dtos/admin-payment-action.dto";
import { OrdersQueryDto } from "./dtos/orders-query.dto";

@ApiTags("admin-orders")
@ApiBearerAuth()
@Controller("admin/orders")
@Roles(UserRole.ADMIN)
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@Query() query: OrdersQueryDto) {
    return this.ordersService.findAllAdmin(query.page, query.limit);
  }

  @Get(":id")
  findOne(@Param("id") orderId: string) {
    return this.ordersService.findOneAdmin(orderId);
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id") orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatusAdmin(orderId, dto);
  }

  @Post(":id/payment/verify")
  verifyPayment(
    @Param("id") orderId: string,
    @Body() dto: AdminPaymentActionDto,
  ) {
    return this.ordersService.verifyPaymentAdmin(orderId, dto);
  }

  @Post(":id/payment/reject")
  rejectPayment(
    @Param("id") orderId: string,
    @Body() dto: AdminPaymentActionDto,
  ) {
    return this.ordersService.rejectPaymentAdmin(orderId, dto);
  }

  @Delete(":id")
  remove(@Param("id") orderId: string) {
    return this.ordersService.deleteAdmin(orderId);
  }
}
