import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsBoolean,
  IsEnum,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DeliveryAreaType, DeliveryRegion } from "@prisma/client";

export class CreateDeliveryAreaDto {
  @ApiProperty({ description: "Area name (Arabic)" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: "Area name (English)" })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiProperty({ description: "Delivery fee" })
  @IsNumber()
  @Min(0)
  deliveryFee: number;

  @ApiPropertyOptional({
    description: "Eligible for free delivery",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  eligibleForFreeDelivery?: boolean = true;

  @ApiPropertyOptional({ description: "Is area active", default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({
    description: "Area hierarchy type",
    enum: DeliveryAreaType,
    default: DeliveryAreaType.MAIN,
  })
  @IsOptional()
  @IsEnum(DeliveryAreaType)
  areaType?: DeliveryAreaType = DeliveryAreaType.MAIN;

  @ApiPropertyOptional({ description: "Parent main area ID for sub-areas" })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({
    description: "Geographic region (required for main areas)",
    enum: DeliveryRegion,
  })
  @IsOptional()
  @IsEnum(DeliveryRegion)
  region?: DeliveryRegion;
}
