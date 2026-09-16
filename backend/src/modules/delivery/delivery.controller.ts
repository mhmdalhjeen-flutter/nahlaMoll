import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { DeliveryService } from "./delivery.service";
import { CalculateDeliveryDto } from "./dtos/calculate-delivery.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";

@Controller("delivery")
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Public()
  @Get("regions")
  getGeographicRegions() {
    return this.deliveryService.getGeographicRegions();
  }

  @Public()
  @Get("areas")
  async getDeliveryAreas() {
    return this.deliveryService.getActiveAreas();
  }

  @Public()
  @Get("areas/:id")
  async getDeliveryArea(@Param("id") id: string) {
    return this.deliveryService.getActiveAreaById(id);
  }

  @Post("calculate")
  async calculateDelivery(
    @CurrentUser("id") userId: string,
    @Body() calculateDeliveryDto: CalculateDeliveryDto,
  ) {
    return this.deliveryService.calculateFreeDelivery(
      userId,
      calculateDeliveryDto.deliveryAreaId,
    );
  }
}
