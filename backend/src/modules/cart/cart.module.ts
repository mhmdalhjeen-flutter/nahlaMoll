import { Module } from "@nestjs/common";
import { CartService } from "./cart.service";
import { CartController } from "./cart.controller";
import { ProductsModule } from "../products/products.module";
import { DeliveryModule } from "../delivery/delivery.module";
import { CustomerEventsModule } from "../customer-events/customer-events.module";

@Module({
  imports: [ProductsModule, DeliveryModule, CustomerEventsModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
