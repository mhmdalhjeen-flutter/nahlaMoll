import { Controller, Get, Query, Param, Headers } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Public } from "../../common/decorators/public.decorator";
import { ProductsService } from "./products.service";
import { ProductDiscoveryService } from "./product-discovery.service";
import { ProductSearchService } from "./product-search.service";
import { ProductsQueryDto } from "./dtos/products-query.dto";
import { DiscoveryQueryDto } from "./dtos/discovery-query.dto";
import { SearchQueryDto } from "./dtos/search-query.dto";

@Controller("products")
@Public()
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productDiscoveryService: ProductDiscoveryService,
    private readonly productSearchService: ProductSearchService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  async findAll(@Query() query: ProductsQueryDto) {
    return this.productsService.findAll({
      skip: query.skip,
      take: query.limit,
      where: {
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.condition ? { condition: query.condition } : {}),
      },
      orderBy: {
        [query.sortBy]: query.sortOrder,
      },
    });
  }

  @Get("discovery")
  async getDiscovery(
    @Query() query: DiscoveryQueryDto,
    @Headers("authorization") authorization?: string,
  ) {
    const userId = this.extractOptionalUserId(authorization);
    return this.productDiscoveryService.buildFeed(userId, query);
  }

  @Get("recommended")
  async getRecommended() {
    return this.productsService.findRecommended();
  }

  @Get("offers")
  async getOffers() {
    return this.productsService.findOffers();
  }

  @Get("search")
  async search(
    @Query() query: SearchQueryDto,
    @Headers("authorization") authorization?: string,
    @Headers("x-session-id") sessionId?: string,
  ) {
    const userId = this.extractOptionalUserId(authorization);
    return this.productSearchService.search(query, {
      userId,
      sessionId: sessionId?.trim() || undefined,
    });
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.productsService.findOneActive(id);
  }

  private extractOptionalUserId(authorization?: string): string | undefined {
    if (!authorization?.startsWith("Bearer ")) return undefined;
    try {
      const payload = this.jwtService.verify<{ sub?: string }>(
        authorization.slice(7),
      );
      return payload.sub;
    } catch {
      return undefined;
    }
  }
}
