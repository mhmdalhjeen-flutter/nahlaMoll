import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UserRole } from "../users/enums/user-role.enum";
import { ReviewsService } from "./reviews.service";
import { CreateReviewDto } from "./dtos/create-review.dto";
import { ReviewsQueryDto } from "./dtos/reviews-query.dto";

@ApiTags("reviews")
@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get("product/:productId")
  findByProduct(
    @Param("productId") productId: string,
    @Query() query: ReviewsQueryDto,
  ) {
    return this.reviewsService.findByProduct(
      productId,
      query.page,
      query.limit,
    );
  }

  @Public()
  @Get("product/:productId/summary")
  getSummary(@Param("productId") productId: string) {
    return this.reviewsService.getProductRatingSummary(productId);
  }

  @Get("mine")
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth()
  findMine(@CurrentUser("id") userId: string) {
    return this.reviewsService.findMine(userId);
  }

  @Post("product/:productId")
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth()
  create(
    @CurrentUser("id") userId: string,
    @Param("productId") productId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(userId, productId, dto);
  }

  @Delete("product/:productId")
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth()
  remove(
    @CurrentUser("id") userId: string,
    @Param("productId") productId: string,
  ) {
    return this.reviewsService.remove(userId, productId);
  }
}
