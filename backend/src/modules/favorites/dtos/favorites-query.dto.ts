import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT,
} from "../../../common/dtos/paginated-result.interface";

export class FavoritesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: DEFAULT_LIST_LIMIT, maximum: MAX_LIST_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIST_LIMIT)
  limit?: number = DEFAULT_LIST_LIMIT;
}
