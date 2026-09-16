import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { ProductCondition } from "@prisma/client";
import { PaginationDto } from "../../../common/dtos/pagination.dto";

export class ProductsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filter products by category ID" })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: "Filter products by condition",
    enum: ProductCondition,
  })
  @IsOptional()
  @IsEnum(ProductCondition)
  condition?: ProductCondition;
}
