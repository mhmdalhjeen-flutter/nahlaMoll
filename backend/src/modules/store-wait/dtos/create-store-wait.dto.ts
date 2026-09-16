import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { StoreWaitRequestType } from "@prisma/client";

export class CreateStoreWaitDto {
  @ApiProperty({ enum: StoreWaitRequestType })
  @IsEnum(StoreWaitRequestType)
  type: StoreWaitRequestType;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.type === StoreWaitRequestType.ADD_TO_CART)
  @IsString()
  @IsNotEmpty()
  productId?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.type === StoreWaitRequestType.ADD_TO_CART)
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({ default: 1 })
  @ValidateIf((o) => o.type === StoreWaitRequestType.ADD_TO_CART)
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.type === StoreWaitRequestType.CHECKOUT)
  @IsString()
  @IsNotEmpty()
  deliveryAreaId?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.type === StoreWaitRequestType.CHECKOUT)
  @IsString()
  @IsNotEmpty()
  deliveryAddress?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.type === StoreWaitRequestType.CHECKOUT)
  @IsOptional()
  @IsString()
  notes?: string;
}
