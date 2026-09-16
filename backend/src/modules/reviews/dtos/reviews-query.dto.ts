import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { MAX_REVIEW_LIST_LIMIT } from "../../../common/dtos/paginated-result.interface";

export class ReviewsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: MAX_REVIEW_LIST_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_REVIEW_LIST_LIMIT)
  limit?: number = 20;
}
