import { IsString, IsOptional, IsBoolean } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCategoryDto {
  @ApiProperty({ description: "Category name (Arabic)" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: "Category name (English)" })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiProperty({ description: "URL-friendly slug" })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ description: "Category description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Category image URL" })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ description: "Parent category ID" })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: "Is category active", default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
