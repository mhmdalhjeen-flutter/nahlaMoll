import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CustomerIntelligenceModule } from "../customer-intelligence/customer-intelligence.module";
import { ProductsService } from "./products.service";
import { ProductDiscoveryService } from "./product-discovery.service";
import { ProductSearchService } from "./product-search.service";
import { ProductsController } from "./products.controller";
import { AdminProductsController } from "./admin-products.controller";

@Module({
  imports: [
    CustomerIntelligenceModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get<string>("JWT_EXPIRES_IN", "24h"),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ProductsController, AdminProductsController],
  providers: [ProductsService, ProductDiscoveryService, ProductSearchService],
  exports: [ProductsService, ProductDiscoveryService, ProductSearchService],
})
export class ProductsModule {}
