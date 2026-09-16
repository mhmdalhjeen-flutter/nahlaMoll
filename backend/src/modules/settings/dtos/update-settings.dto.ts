import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsObject,
  IsNumber,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateSettingsDto {
  @ApiPropertyOptional({ description: "Store name (Arabic)" })
  @IsOptional()
  @IsString()
  storeName?: string;

  @ApiPropertyOptional({ description: "Store name (English)" })
  @IsOptional()
  @IsString()
  storeNameEn?: string;

  @ApiPropertyOptional({ description: "Store phone number" })
  @IsOptional()
  @IsString()
  storePhone?: string;

  @ApiPropertyOptional({ description: "Store email" })
  @IsOptional()
  @IsString()
  storeEmail?: string;

  @ApiPropertyOptional({ description: "Social media links" })
  @IsOptional()
  @IsObject()
  socialMediaLinks?: any;

  @ApiPropertyOptional({ description: "Is store open" })
  @IsOptional()
  @IsBoolean()
  isStoreOpen?: boolean;

  @ApiPropertyOptional({ description: "Store closed message (Arabic)" })
  @IsOptional()
  @IsString()
  storeClosedMessage?: string;

  @ApiPropertyOptional({ description: "Free delivery target" })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  freeDeliveryTarget?: number;

  @ApiPropertyOptional({ description: "Enable partial free delivery" })
  @IsOptional()
  @IsBoolean()
  partialFreeDeliveryEnabled?: boolean;

  @ApiPropertyOptional({ description: "Partial free delivery threshold" })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  partialFreeDeliveryThreshold?: number;

  @ApiPropertyOptional({
    description: "Partial free delivery discount (0-100)",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  partialFreeDeliveryDiscount?: number;

  @ApiPropertyOptional({ description: "Payment instructions (Arabic)" })
  @IsOptional()
  @IsString()
  paymentInstructions?: string;

  @ApiPropertyOptional({ description: "Payment instructions (English)" })
  @IsOptional()
  @IsString()
  paymentInstructionsEn?: string;

  @ApiPropertyOptional({ description: "Payment QR image URL" })
  @IsOptional()
  @IsString()
  paymentQrImage?: string;

  @ApiPropertyOptional({ description: "Payment account details (Arabic)" })
  @IsOptional()
  @IsString()
  paymentAccountDetails?: string;

  @ApiPropertyOptional({ description: "Payment account details (English)" })
  @IsOptional()
  @IsString()
  paymentAccountDetailsEn?: string;

  @ApiPropertyOptional({ description: "Cash on delivery enabled" })
  @IsOptional()
  @IsBoolean()
  codEnabled?: boolean;

  @ApiPropertyOptional({ description: "COD customer note" })
  @IsOptional()
  @IsString()
  codNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  bankOfPalestineEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  palPayEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  jawwalPayEnabled?: boolean;
}
