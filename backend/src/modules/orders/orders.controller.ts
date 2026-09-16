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
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dtos/create-order.dto";
import { SubmitPaymentDto } from "./dtos/submit-payment.dto";
import { OrdersQueryDto } from "./dtos/orders-query.dto";

@ApiTags("orders")
@ApiBearerAuth()
@Controller("orders")
@Roles(UserRole.CUSTOMER)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@CurrentUser("id") userId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(userId, dto);
  }

  @Get()
  findAll(@CurrentUser("id") userId: string, @Query() query: OrdersQueryDto) {
    return this.ordersService.findAllForCustomer(
      userId,
      query.page,
      query.limit,
    );
  }

  @Get(":id")
  findOne(@CurrentUser("id") userId: string, @Param("id") orderId: string) {
    return this.ordersService.findOneForCustomer(userId, orderId);
  }

  @Post(":id/payment")
  submitPayment(
    @CurrentUser("id") userId: string,
    @Param("id") orderId: string,
    @Body() dto: SubmitPaymentDto,
  ) {
    return this.ordersService.submitPayment(userId, orderId, dto);
  }

  @Post(":id/cancel")
  cancel(@CurrentUser("id") userId: string, @Param("id") orderId: string) {
    return this.ordersService.cancelForCustomer(userId, orderId);
  }

  @Delete(":id")
  remove(@CurrentUser("id") userId: string, @Param("id") orderId: string) {
    return this.ordersService.deleteForCustomer(userId, orderId);
  }
}
