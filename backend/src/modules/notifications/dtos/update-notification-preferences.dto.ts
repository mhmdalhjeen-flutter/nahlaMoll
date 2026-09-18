import { IsBoolean, IsOptional, IsString, Matches } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { TIME_24H_PATTERN } from "../notification-preferences.constants";

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  orderUpdates?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  freeDelivery?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  favorites?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  offers?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  personalRecommendations?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  newProducts?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  abuAlaaNews?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  doNotDisturbEnabled?: boolean;

  @ApiPropertyOptional({ example: "22:00" })
  @IsOptional()
  @IsString()
  @Matches(TIME_24H_PATTERN, { message: "doNotDisturbFrom must be HH:mm" })
  doNotDisturbFrom?: string;

  @ApiPropertyOptional({ example: "08:00" })
  @IsOptional()
  @IsString()
  @Matches(TIME_24H_PATTERN, { message: "doNotDisturbUntil must be HH:mm" })
  doNotDisturbUntil?: string;
}
