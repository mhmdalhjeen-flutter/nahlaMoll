import { Module } from "@nestjs/common";
import { FavoritesService } from "./favorites.service";
import { FavoritesController } from "./favorites.controller";
import { ProductsModule } from "../products/products.module";
import { CustomerEventsModule } from "../customer-events/customer-events.module";

@Module({
  imports: [ProductsModule, CustomerEventsModule],
  controllers: [FavoritesController],
  providers: [FavoritesService],
  exports: [FavoritesService],
})
export class FavoritesModule {}
