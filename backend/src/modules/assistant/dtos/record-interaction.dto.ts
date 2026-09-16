import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CustomerInteractionType } from "@prisma/client";

export class RecordCustomerInteractionDto {
  @ApiProperty({ enum: CustomerInteractionType })
  @IsEnum(CustomerInteractionType)
  type: CustomerInteractionType;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  searchTerm?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  categoryId?: string;

  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z0-9_]+$/, {
    message: "intent must be a lowercase identifier",
  })
  intent?: string;

  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z0-9_]+$/, {
    message: "context must be a lowercase identifier",
  })
  context?: string;

  @ApiPropertyOptional({
    description: "Structured payload (budget, basket ids, etc.)",
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
