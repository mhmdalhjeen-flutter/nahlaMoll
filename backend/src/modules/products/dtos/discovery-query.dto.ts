import { IsOptional, IsString, IsNumber, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class DiscoveryQueryDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  /** Comma-separated product IDs currently in cart */
  @IsOptional()
  @IsString()
  cartProductIds?: string;

  /** Display progress 0–100 from authoritative cart summary (presentation only) */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  displayProgress?: number;

  /** Remaining score toward free delivery from cart summary */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  remainingScore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number;

  /** Comma-separated section types to build (default: all). */
  @IsOptional()
  @IsString()
  sections?: string;
}
