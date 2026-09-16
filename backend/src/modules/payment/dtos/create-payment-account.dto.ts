import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentMethodType } from "@prisma/client";

export class CreatePaymentAccountDto {
  @ApiProperty({ enum: PaymentMethodType })
  @IsEnum(PaymentMethodType)
  method: PaymentMethodType;

  @ApiProperty({ description: "Account display name" })
  @IsString()
  accountName: string;

  @ApiProperty({ description: "Account number" })
  @IsString()
  accountNumber: string;

  @ApiPropertyOptional({ description: "QR image URL" })
  @IsOptional()
  @IsString()
  qrImageUrl?: string;

  @ApiPropertyOptional({ description: "Set as active account for this method" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
