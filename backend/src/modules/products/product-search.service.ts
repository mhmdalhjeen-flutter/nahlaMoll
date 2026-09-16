import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ValidationException } from "../../common/exceptions/business.exception";
import { CustomerIntelligenceService } from "../customer-intelligence/customer-intelligence.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProductsService } from "./products.service";
import { SearchQueryDto, SearchResultDto } from "./dtos/search-query.dto";
import {
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
  SEARCH_FETCH_BUFFER,
} from "./product-search.constants";
import {
  applySecondarySort,
  buildFallbackParsedQuery,
  buildIntelligenceContext,
  buildSearchSuggestions,
  paginateRanked,
  parseSearchQuery,
  rankSearchCandidates,
  type CatalogCategory,
  type SearchProductCandidate,
  type SearchRankContext,
} from "./product-search.logic";
import type { ProductRankingSignals } from "./product-discovery.logic";

const CANCELLED_STATUSES = ["CANCELLED"] as const;
const CATEGORY_CACHE_TTL_MS = 60_000;

type SearchProfile = Awaited<
  ReturnType<CustomerIntelligenceService["buildProfile"]>
>;

@Injectable()
export class ProductSearchService {
  private categoryCache: {
    expiresAt: number;
    categories: CatalogCategory[];
  } | null = null;

  constructor(
    private prisma: PrismaService,
    private productsService: ProductsService,
    private customerIntelligenceService: CustomerIntelligenceService,
  ) {}

  async search(
    query: SearchQueryDto,
    options?: { userId?: string; sessionId?: string },
  ): Promise<SearchResultDto> {
    const raw = query.q?.trim();
    if (!raw || raw.length < 2 || raw.length > 100) {
      throw new ValidationException(
        "Search query must contain between 2 and 100 characters",
      );
    }

    const page = query.page ?? 1;
    const limit = Math.min(
      query.limit ?? DEFAULT_SEARCH_LIMIT,
      MAX_SEARCH_LIMIT,
    );

    const profile = await this.loadSearchProfile(options);
    const hasPersonalization = profile?.hasBehavioralData ?? false;

    const categories = await this.loadActiveCategories();
    let parsed = parseSearchQuery(raw, categories);
    let fallbackUsed = false;

    let candidates = await this.fetchCandidates(parsed, query);
    let context = await this.buildRankContextAsync(
      candidates,
      parsed,
      profile,
    );
    let ranked = rankSearchCandidates(candidates, context);

    if (ranked.length === 0) {
      const fallbackParsed = buildFallbackParsedQuery(parsed, categories);
      if (fallbackParsed) {
        parsed = fallbackParsed;
        fallbackUsed = true;
        candidates = await this.fetchCandidates(parsed, query, {
          broaden: true,
        });
        context = await this.buildRankContextAsync(
          candidates,
          parsed,
          profile,
        );
        ranked = rankSearchCandidates(candidates, context, {
          fallbackMode: true,
        });
      }
    }

    if (ranked.length === 0 && parsed.matchedCategoryIds.length > 0) {
      fallbackUsed = true;
      candidates = await this.fetchCategoryProducts(
        parsed.matchedCategoryIds,
        query,
      );
      context = await this.buildRankContextAsync(
        candidates,
        parsed,
        profile,
      );
      ranked = rankSearchCandidates(candidates, context, {
        fallbackMode: true,
        minRelevanceScore: 0,
      });
    }

    const sorted = applySecondarySort(
      ranked,
      candidates,
      query.sortBy ?? "relevance",
      query.sortOrder ?? "desc",
    );

    const paginated = paginateRanked(sorted, page, limit);
    const pageIds = paginated.items.map((row) => row.productId);
    const products = await this.productsService.findManyByIds(pageIds);

    const suggestions = buildSearchSuggestions({
      parsed,
      ranked: sorted,
      products: candidates,
      categories,
    });

    return {
      products,
      total: paginated.total,
      page: paginated.page,
      limit: paginated.limit,
      totalPages: paginated.totalPages,
      suggestions,
      meta: {
        intent: parsed.intent,
        normalizedQuery: parsed.normalized,
        fallbackUsed,
        hasPersonalization,
        totalBeforePagination: paginated.total,
      },
    };
  }

  /** Backward-compatible array response for legacy callers. */
  async searchProducts(
    query: string,
    options?: { userId?: string; sessionId?: string },
  ) {
    const result = await this.search({ q: query }, options);
    return result.products;
  }

  private async loadSearchProfile(options?: {
    userId?: string;
    sessionId?: string;
  }): Promise<SearchProfile | null> {
    if (!options?.userId && !options?.sessionId) {
      return null;
    }
    return this.customerIntelligenceService.buildProfile({
      userId: options.userId,
      sessionId: options.sessionId,
    });
  }

  private async loadActiveCategories(): Promise<CatalogCategory[]> {
    const now = Date.now();
    if (this.categoryCache && this.categoryCache.expiresAt > now) {
      return this.categoryCache.categories;
    }

    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        nameEn: true,
        slug: true,
        description: true,
        parentId: true,
      },
    });

    this.categoryCache = {
      expiresAt: now + CATEGORY_CACHE_TTL_MS,
      categories,
    };

    return categories;
  }

  private get availableProductWhere(): Prisma.ProductWhereInput {
    return {
      isActive: true,
      isAvailable: true,
      availability: { not: "UNAVAILABLE" },
    };
  }

  private buildFetchWhere(
    parsed: ReturnType<typeof parseSearchQuery>,
    query: SearchQueryDto,
    options?: { broaden?: boolean },
  ): Prisma.ProductWhereInput {
    const terms = parsed.expandedTerms.filter((term) => term.length >= 2);
    const textOr: Prisma.ProductWhereInput[] = [];

    for (const term of terms.slice(0, options?.broaden ? 12 : 8)) {
      textOr.push(
        { name: { contains: term, mode: "insensitive" } },
        { nameEn: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { descriptionEn: { contains: term, mode: "insensitive" } },
      );
    }

    if (parsed.matchedTags.length > 0) {
      textOr.push({ tags: { hasSome: parsed.matchedTags } });
    }

    if (parsed.matchedCategoryIds.length > 0) {
      textOr.push({ categoryId: { in: parsed.matchedCategoryIds } });
    }

    for (const term of terms.slice(0, 6)) {
      textOr.push({
        category: { name: { contains: term, mode: "insensitive" } },
      });
      textOr.push({
        category: { slug: { contains: term, mode: "insensitive" } },
      });
    }

    if (options?.broaden && parsed.tokens.length > 0) {
      for (const token of parsed.tokens) {
        if (token.length < 2) continue;
        textOr.push(
          { name: { contains: token, mode: "insensitive" } },
          { tags: { has: token } },
        );
      }
    }

    if (textOr.length === 0 && parsed.normalized.length >= 2) {
      textOr.push(
        { name: { contains: parsed.cleaned, mode: "insensitive" } },
        { description: { contains: parsed.cleaned, mode: "insensitive" } },
      );
    }

    return {
      ...this.availableProductWhere,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.condition ? { condition: query.condition } : {}),
      OR: textOr,
    };
  }

  private async fetchCandidates(
    parsed: ReturnType<typeof parseSearchQuery>,
    query: SearchQueryDto,
    options?: { broaden?: boolean },
  ): Promise<SearchProductCandidate[]> {
    const where = this.buildFetchWhere(parsed, query, options);
    const rows = await this.prisma.product.findMany({
      where,
      include: { category: true },
      take: SEARCH_FETCH_BUFFER,
      orderBy: [{ isRecommended: "desc" }, { createdAt: "desc" }],
    });

    return rows.map((row) => this.toCandidate(row));
  }

  private async fetchCategoryProducts(
    categoryIds: string[],
    query: SearchQueryDto,
  ): Promise<SearchProductCandidate[]> {
    const rows = await this.prisma.product.findMany({
      where: {
        ...this.availableProductWhere,
        categoryId: { in: categoryIds },
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.condition ? { condition: query.condition } : {}),
      },
      include: { category: true },
      take: SEARCH_FETCH_BUFFER,
      orderBy: [{ isRecommended: "desc" }, { createdAt: "desc" }],
    });
    return rows.map((row) => this.toCandidate(row));
  }

  private toCandidate(row: {
    id: string;
    name: string;
    nameEn?: string | null;
    description: string;
    descriptionEn?: string | null;
    categoryId: string;
    tags: string[];
    isRecommended: boolean;
    isAvailable: boolean;
    availability: string;
    stock: number;
    price: Prisma.Decimal | number;
    hasOffer: boolean;
    offerStartDate: Date | null;
    offerEndDate: Date | null;
    category?: { id: string; name: string; slug: string } | null;
  }): SearchProductCandidate {
    return {
      id: row.id,
      name: row.name,
      nameEn: row.nameEn,
      description: row.description,
      descriptionEn: row.descriptionEn,
      categoryId: row.categoryId,
      tags: row.tags ?? [],
      isRecommended: row.isRecommended,
      isAvailable: row.isAvailable,
      availability: row.availability,
      stock: row.stock,
      price: Number(row.price),
      hasOffer: row.hasOffer,
      offerStartDate: row.offerStartDate,
      offerEndDate: row.offerEndDate,
      category: row.category,
    };
  }

  private async buildRankContextAsync(
    candidates: SearchProductCandidate[],
    parsed: ReturnType<typeof parseSearchQuery>,
    profile: SearchProfile | null,
  ): Promise<SearchRankContext> {
    const candidateIds = candidates.map((c) => c.id);
    const signalsByProduct = await this.loadSignalsForProducts(candidateIds);

    return {
      parsed,
      intelligence: buildIntelligenceContext(profile),
      signalsByProduct,
    };
  }

  private async loadSignalsForProducts(
    productIds: string[],
  ): Promise<Map<string, ProductRankingSignals>> {
    if (productIds.length === 0) return new Map();

    const [orderAggregates, favoriteAggregates, reviewAggregates] =
      await Promise.all([
        this.prisma.orderItem.groupBy({
          by: ["productId"],
          where: {
            productId: { in: productIds },
            order: { status: { notIn: [...CANCELLED_STATUSES] } },
          },
          _sum: { quantity: true },
        }),
        this.prisma.favorite.groupBy({
          by: ["productId"],
          where: { productId: { in: productIds } },
          _count: { productId: true },
        }),
        this.prisma.review.groupBy({
          by: ["productId"],
          where: { productId: { in: productIds } },
          _avg: { rating: true },
          _count: { rating: true },
        }),
      ]);

    const map = new Map<string, ProductRankingSignals>();
    for (const id of productIds) {
      map.set(id, {});
    }

    for (const row of orderAggregates) {
      if (!row.productId) continue;
      const existing = map.get(row.productId) ?? {};
      map.set(row.productId, {
        ...existing,
        orderQuantity: row._sum.quantity ?? 0,
      });
    }

    for (const row of favoriteAggregates) {
      const existing = map.get(row.productId) ?? {};
      map.set(row.productId, {
        ...existing,
        favoriteCount: row._count.productId,
      });
    }

    for (const row of reviewAggregates) {
      const existing = map.get(row.productId) ?? {};
      map.set(row.productId, {
        ...existing,
        averageRating: row._avg.rating ?? 0,
        reviewCount: row._count.rating,
      });
    }

    return map;
  }
}
