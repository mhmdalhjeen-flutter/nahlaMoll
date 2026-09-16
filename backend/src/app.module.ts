import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { ProductsModule } from "./modules/products/products.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { CartModule } from "./modules/cart/cart.module";
import { DeliveryModule } from "./modules/delivery/delivery.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { UploadModule } from "./modules/upload/upload.module";
import { FavoritesModule } from "./modules/favorites/favorites.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { AnnouncementsModule } from "./modules/announcements/announcements.module";
import { SupportModule } from "./modules/support/support.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PaymentModule } from "./modules/payment/payment.module";
import { StoreWaitModule } from "./modules/store-wait/store-wait.module";
import { AssistantModule } from "./modules/assistant/assistant.module";
import { CustomerEventsModule } from "./modules/customer-events/customer-events.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { HealthModule } from "./modules/health/health.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { RequestContextMiddleware } from "./common/middleware/request-context.middleware";
import {
  resolveRateLimitMax,
  resolveRateLimitTtl,
} from "./config/rate-limit.config";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    ThrottlerModule.forRoot([
      {
        // @nestjs/throttler v5: ttl is milliseconds; limit is per IP per route
        ttl: resolveRateLimitTtl(),
        limit: resolveRateLimitMax(),
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    CartModule,
    DeliveryModule,
    SettingsModule,
    OrdersModule,
    UploadModule,
    FavoritesModule,
    ReviewsModule,
    AnnouncementsModule,
    SupportModule,
    AnalyticsModule,
    PaymentModule,
    StoreWaitModule,
    AssistantModule,
    CustomerEventsModule,
    NotificationsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes("*");
  }
}
