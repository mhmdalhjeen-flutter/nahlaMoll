import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CustomerEventsController } from "./customer-events.controller";
import { CustomerEventsService } from "./customer-events.service";

@Module({
  imports: [
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
  controllers: [CustomerEventsController],
  providers: [CustomerEventsService],
  exports: [CustomerEventsService],
})
export class CustomerEventsModule {}
