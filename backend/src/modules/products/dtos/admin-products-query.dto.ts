import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../common/dtos/pagination.dto";

export class AdminProductsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filter products by category ID" })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: "Include inactive products in the listing",
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  includeInactive?: boolean;
}
