import { PaginationDto } from "../../../common/dtos/pagination.dto";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class NotificationsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Items per page", default: 20 })
  limit?: number = 20;
}

export const NOTIFICATIONS_DEFAULT_LIMIT = 20;
