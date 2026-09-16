import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SearchQueryDto {
  @ApiProperty({ description: "Search query (2-100 characters)" })
  @IsString()
  @MinLength(2)
  q!: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  limit?: number = 24;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: ["NEW", "USED"] })
  @IsOptional()
  @IsIn(["NEW", "USED"])
  condition?: "NEW" | "USED";

  @ApiPropertyOptional({
    enum: ["relevance", "price", "createdAt"],
    default: "relevance",
  })
  @IsOptional()
  @IsIn(["relevance", "price", "createdAt"])
  sortBy?: "relevance" | "price" | "createdAt" = "relevance";

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc" = "desc";
}

export interface SearchSuggestionDto {
  type: "product" | "category" | "tag";
  label: string;
  value: string;
}

export interface SearchResultMetaDto {
  intent: string;
  normalizedQuery: string;
  fallbackUsed: boolean;
  hasPersonalization: boolean;
  totalBeforePagination: number;
}

export interface SearchResultDto {
  products: Array<Record<string, unknown>>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  suggestions: SearchSuggestionDto[];
  meta: SearchResultMetaDto;
}
