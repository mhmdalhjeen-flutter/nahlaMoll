import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CustomerIntelligenceService } from "../customer-intelligence/customer-intelligence.service";
import type { CustomerAffinityProfile } from "../customer-intelligence/customer-intelligence.types";
import { ProductsService } from "./products.service";
import { DiscoveryQueryDto } from "./dtos/discovery-query.dto";
import {
  AGGREGATE_FETCH_BUFFER,
  buildIntelligenceScoringContext,
  buildPopularityReason,
  DEFAULT_SECTION_LIMIT,
  MIN_SECTION_PRODUCTS,
  pickUniqueIds,
  rankFreeDeliveryCandidates,
  rankPersonalizedCandidates,
  shouldIncludeSection,
  type DiscoveryProductCandidate,
  type ProductRankingSignals,
  type RankedDiscoveryProduct,
} from "./product-discovery.logic";

export type DiscoverySectionType =
  "personalized" | "free_delivery_boost" | "most_ordered" | "most_favorited";

export type DiscoveryProductDto = Awaited<
  ReturnType<ProductsService["findManyByIds"]>
>[number] & {
  recommendationReason?: string;
};

export interface DiscoverySectionDto {
  sectionType: DiscoverySectionType;
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  products: DiscoveryProductDto[];
}

export interface DiscoveryFeedDto {
  sections: DiscoverySectionDto[];
  meta: {
    hasPersonalData: boolean;
    hasCartContext: boolean;
  };
}

const CANCELLED_STATUSES = ["CANCELLED"] as const;
const POPULARITY_CACHE_TTL_MS = 60_000;

interface StorePopularitySignals {
  orderQtyByProduct: Map<string, number>;
  favoriteCountByProduct: Map<string, number>;
}

@Injectable()
export class ProductDiscoveryService {
  private popularityCache = new Map<
    string,
    { expiresAt: number; signals: StorePopularitySignals }
  >();

  constructor(
    private prisma: PrismaService,
    private productsService: ProductsService,
    private customerIntelligenceService: CustomerIntelligenceService,
  ) {}

  private get availableProductWhere(): Prisma.ProductWhereInput {
    return {
      isActive: true,
      isAvailable: true,
      availability: { not: "UNAVAILABLE" },
    };
  }

  private categoryFilter(categoryId?: string): Prisma.ProductWhereInput {
    return categoryId ? { categoryId } : {};
  }

  private parseCartIds(raw?: string): string[] {
    if (!raw?.trim()) return [];
    return [
      ...new Set(
        raw
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ];
  }

  private parseRequestedSections(
    raw?: string,
  ): Set<DiscoverySectionType> | null {
    if (!raw?.trim()) return null;
    const allowed: DiscoverySectionType[] = [
      "personalized",
      "free_delivery_boost",
      "most_ordered",
      "most_favorited",
    ];
    const requested = raw
      .split(",")
      .map((part) => part.trim())
      .filter((part): part is DiscoverySectionType =>
        allowed.includes(part as DiscoverySectionType),
      );
    return requested.length > 0 ? new Set(requested) : null;
  }

  private shouldBuildSection(
    type: DiscoverySectionType,
    requested: Set<DiscoverySectionType> | null,
  ): boolean {
    return !requested || requested.has(type);
  }

  async buildFeed(
    userId: string | undefined,
    query: DiscoveryQueryDto,
  ): Promise<DiscoveryFeedDto> {
    const limit = query.limit ?? DEFAULT_SECTION_LIMIT;
    const cartProductIds = this.parseCartIds(query.cartProductIds);
    const displayProgress = query.displayProgress ?? 0;
    const remainingScore = query.remainingScore ?? 0;
    const categoryId = query.categoryId;
    const requestedSections = this.parseRequestedSections(query.sections);

    const [profile, popularity] = await Promise.all([
      userId
        ? this.customerIntelligenceService.buildProfile({ userId })
        : Promise.resolve(null),
      this.loadStorePopularitySignals(categoryId),
    ]);
    const hasPersonalData = profile?.hasBehavioralData ?? false;

    const shownProductIds = new Set<string>();
    const sections: DiscoverySectionDto[] = [];

    const hasCartContext =
      userId &&
      cartProductIds.length > 0 &&
      displayProgress > 0 &&
      displayProgress < 95 &&
      remainingScore > 0;

    const sectionBuilders: Array<() => Promise<DiscoverySectionDto | null>> =
      [];

    if (
      userId &&
      hasPersonalData &&
      profile &&
      this.shouldBuildSection("personalized", requestedSections)
    ) {
      sectionBuilders.push(() =>
        this.buildPersonalizedSection(
          profile,
          limit,
          categoryId,
          shownProductIds,
          cartProductIds,
          popularity,
        ),
      );
    }

    if (
      hasCartContext &&
      profile &&
      this.shouldBuildSection("free_delivery_boost", requestedSections)
    ) {
      sectionBuilders.push(() =>
        this.buildFreeDeliverySection(
          cartProductIds,
          limit,
          categoryId,
          shownProductIds,
          remainingScore,
          profile,
          popularity,
        ),
      );
    }

    for (const build of sectionBuilders) {
      const section = await build();
      if (!section) continue;
      section.products.forEach((p) => shownProductIds.add(p.id));
      sections.push(section);
    }

    const includeMostOrdered = this.shouldBuildSection(
      "most_ordered",
      requestedSections,
    );
    const includeMostFavorited = this.shouldBuildSection(
      "most_favorited",
      requestedSections,
    );
    if (includeMostOrdered || includeMostFavorited) {
      const popularitySections = await this.buildPopularitySectionsBatch(
        limit,
        shownProductIds,
        popularity,
        { includeMostOrdered, includeMostFavorited },
      );
      for (const section of popularitySections) {
        section.products.forEach((p) => shownProductIds.add(p.id));
        sections.push(section);
      }
    }

    return {
      sections,
      meta: {
        hasPersonalData,
        hasCartContext: Boolean(hasCartContext),
      },
    };
  }

  private async loadStorePopularitySignals(
    categoryId?: string,
  ): Promise<StorePopularitySignals> {
    const cacheKey = categoryId ?? "__all__";
    const cached = this.popularityCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return cached.signals;
    }

    const signals = await this.loadStorePopularitySignalsUncached(categoryId);
    this.popularityCache.set(cacheKey, {
      expiresAt: now + POPULARITY_CACHE_TTL_MS,
      signals,
    });
    return signals;
  }

  private async loadStorePopularitySignalsUncached(
    categoryId?: string,
  ): Promise<StorePopularitySignals> {
    const [orderAggregates, favoriteAggregates] = await Promise.all([
      this.prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true },
        where: {
          productId: { not: null },
          order: { status: { notIn: [...CANCELLED_STATUSES] } },
          product: {
            ...this.availableProductWhere,
            ...this.categoryFilter(categoryId),
          },
        },
        orderBy: { _sum: { quantity: "desc" } },
        take: AGGREGATE_FETCH_BUFFER,
      }),
      this.prisma.favorite.groupBy({
        by: ["productId"],
        _count: { productId: true },
        where: {
          product: {
            ...this.availableProductWhere,
            ...this.categoryFilter(categoryId),
          },
        },
        orderBy: { _count: { productId: "desc" } },
        take: AGGREGATE_FETCH_BUFFER,
      }),
    ]);

    const orderQtyByProduct = new Map<string, number>();
    for (const row of orderAggregates) {
      if (!row.productId) continue;
      orderQtyByProduct.set(row.productId, row._sum.quantity ?? 0);
    }

    const favoriteCountByProduct = new Map<string, number>();
    for (const row of favoriteAggregates) {
      favoriteCountByProduct.set(row.productId, row._count.productId);
    }

    return { orderQtyByProduct, favoriteCountByProduct };
  }

  private async loadReviewSignals(
    productIds: string[],
  ): Promise<Map<string, ProductRankingSignals>> {
    if (productIds.length === 0) return new Map();

    const aggregates = await this.prisma.review.groupBy({
      by: ["productId"],
      where: { productId: { in: productIds } },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const map = new Map<string, ProductRankingSignals>();
    for (const row of aggregates) {
      map.set(row.productId, {
        averageRating: row._avg.rating ?? 0,
        reviewCount: row._count.rating,
      });
    }
    return map;
  }

  private buildSignalsMap(
    productIds: string[],
    popularity: StorePopularitySignals,
    reviewSignals: Map<string, ProductRankingSignals>,
  ): Map<string, ProductRankingSignals> {
    const map = new Map<string, ProductRankingSignals>();
    for (const id of productIds) {
      map.set(id, {
        orderQuantity: popularity.orderQtyByProduct.get(id) ?? 0,
        favoriteCount: popularity.favoriteCountByProduct.get(id) ?? 0,
        ...reviewSignals.get(id),
      });
    }
    return map;
  }

  private attachProductsWithReasonsFromCandidates(
    ranked: RankedDiscoveryProduct[],
    candidates: Array<
      Awaited<ReturnType<ProductsService["findManyByIds"]>>[number]
    >,
  ): DiscoveryProductDto[] {
    if (ranked.length === 0) return [];

    const byId = new Map(candidates.map((product) => [product.id, product]));
    const result: DiscoveryProductDto[] = [];
    for (const row of ranked) {
      const product = byId.get(row.productId);
      if (!product) continue;
      result.push({
        ...product,
        recommendationReason: row.reason,
      });
    }
    return result;
  }

  private isOfferActive(product: {
    hasOffer: boolean;
    offerStartDate: Date | null;
    offerEndDate: Date | null;
  }): boolean {
    if (!product.hasOffer) return false;
    const now = new Date();
    if (product.offerStartDate && product.offerStartDate > now) return false;
    if (product.offerEndDate && product.offerEndDate < now) return false;
    return true;
  }

  private toCandidate(product: {
    id: string;
    categoryId: string;
    name: string;
    tags: string[];
    isRecommended: boolean;
    freeDeliveryValue: Prisma.Decimal | number;
    hasOffer: boolean;
    offerStartDate: Date | null;
    offerEndDate: Date | null;
  }): DiscoveryProductCandidate {
    return {
      id: product.id,
      categoryId: product.categoryId,
      name: product.name,
      tags: product.tags ?? [],
      isRecommended: product.isRecommended,
      freeDeliveryValue: Number(product.freeDeliveryValue ?? 0),
      hasActiveOffer: this.isOfferActive(product),
    };
  }

  private async buildPopularitySectionsBatch(
    limit: number,
    shownProductIds: Set<string>,
    popularity: StorePopularitySignals,
    options: {
      includeMostOrdered: boolean;
      includeMostFavorited: boolean;
    },
  ): Promise<DiscoverySectionDto[]> {
    const sections: DiscoverySectionDto[] = [];
    const workingShown = new Set(shownProductIds);
    const fetchIds = new Set<string>();
    let orderedIds: string[] = [];
    let favoritedIds: string[] = [];

    if (options.includeMostOrdered) {
      const rankedIds = [...popularity.orderQtyByProduct.entries()]
        .filter(([, qty]) => qty > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);
      orderedIds = pickUniqueIds(rankedIds, workingShown, limit);
      orderedIds.forEach((id) => {
        fetchIds.add(id);
        workingShown.add(id);
      });
    }

    if (options.includeMostFavorited) {
      const rankedIds = [...popularity.favoriteCountByProduct.entries()]
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);
      const minFavoriteCount = rankedIds.length > limit * 2 ? 2 : 1;
      const filtered = rankedIds.filter(
        (id) =>
          (popularity.favoriteCountByProduct.get(id) ?? 0) >= minFavoriteCount,
      );
      favoritedIds = pickUniqueIds(filtered, workingShown, limit);
      favoritedIds.forEach((id) => fetchIds.add(id));
    }

    if (fetchIds.size === 0) return sections;

    const products = await this.productsService.findManyByIds([...fetchIds]);
    const productById = new Map(products.map((product) => [product.id, product]));
    const reason = buildPopularityReason();

    if (options.includeMostOrdered && orderedIds.length > 0) {
      const orderedProducts = orderedIds
        .map((id) => productById.get(id))
        .filter(Boolean)
        .map((product) => ({
          ...product!,
          recommendationReason: reason,
        }));
      if (orderedProducts.length >= MIN_SECTION_PRODUCTS) {
        sections.push({
          sectionType: "most_ordered",
          title: "🔥 الأكثر طلبًا",
          viewAllHref: "/products?section=most_ordered",
          products: orderedProducts,
        });
      }
    }

    if (options.includeMostFavorited && favoritedIds.length > 0) {
      const favoritedProducts = favoritedIds
        .map((id) => productById.get(id))
        .filter(Boolean)
        .map((product) => ({
          ...product!,
          recommendationReason: reason,
        }));
      if (favoritedProducts.length >= MIN_SECTION_PRODUCTS) {
        sections.push({
          sectionType: "most_favorited",
          title: "❤️ الأكثر إضافة للمفضلة",
          viewAllHref: "/products?section=most_favorited",
          products: favoritedProducts,
        });
      }
    }

    return sections;
  }

  private async buildPersonalizedSection(
    profile: CustomerAffinityProfile,
    limit: number,
    categoryId: string | undefined,
    shownProductIds: Set<string>,
    cartProductIds: string[],
    popularity: StorePopularitySignals,
  ): Promise<DiscoverySectionDto | null> {
    const products = await this.findPersonalizedProducts(
      profile,
      limit,
      categoryId,
      shownProductIds,
      cartProductIds,
      popularity,
    );

    if (
      !shouldIncludeSection(
        products.map((p) => p.id),
        shownProductIds,
        products.length + shownProductIds.size,
      )
    ) {
      return null;
    }

    if (products.length < MIN_SECTION_PRODUCTS) return null;

    return {
      sectionType: "personalized",
      title: "✨ ممكن يعجبك",
      products,
    };
  }

  private async buildFreeDeliverySection(
    cartProductIds: string[],
    limit: number,
    categoryId: string | undefined,
    shownProductIds: Set<string>,
    remainingScore: number,
    profile: CustomerAffinityProfile,
    popularity: StorePopularitySignals,
  ): Promise<DiscoverySectionDto | null> {
    const products = await this.findFreeDeliveryBoostProducts(
      cartProductIds,
      limit,
      categoryId,
      shownProductIds,
      remainingScore,
      profile,
      popularity,
    );

    if (
      !shouldIncludeSection(
        products.map((p) => p.id),
        shownProductIds,
        products.length + shownProductIds.size,
      )
    ) {
      return null;
    }

    if (products.length < MIN_SECTION_PRODUCTS) return null;

    return {
      sectionType: "free_delivery_boost",
      title: "🚚 ممكن يساعدك في التوصيل المجاني",
      products,
    };
  }

  private async findPersonalizedProducts(
    profile: CustomerAffinityProfile,
    limit: number,
    categoryId: string | undefined,
    excludeIds: Set<string>,
    cartProductIds: string[],
    popularity: StorePopularitySignals,
  ): Promise<DiscoveryProductDto[]> {
    const intelligence = buildIntelligenceScoringContext(profile);

    const rankedCategoryIds = [...intelligence.categoryScores.entries()]
      .sort(
        (a, b) =>
          b[1].score + b[1].recentScore - (a[1].score + a[1].recentScore),
      )
      .map(([id]) => id);

    if (rankedCategoryIds.length === 0 && intelligence.tagScores.size === 0) {
      return [];
    }

    const affinityCategories = rankedCategoryIds.length
      ? await this.prisma.category.findMany({
          where: { id: { in: rankedCategoryIds } },
          select: { id: true, parentId: true },
        })
      : [];

    const parentIds = [
      ...new Set(affinityCategories.map((c) => c.parentId).filter(Boolean)),
    ] as string[];

    const siblingCategories =
      parentIds.length > 0
        ? await this.prisma.category.findMany({
            where: { parentId: { in: parentIds }, isActive: true },
            select: { id: true },
          })
        : [];

    const siblingCategoryIds = new Set(siblingCategories.map((c) => c.id));

    const candidateCategoryIds = categoryId
      ? rankedCategoryIds.filter((id) => id === categoryId)
      : [
          ...new Set([
            ...rankedCategoryIds.slice(0, 5),
            ...siblingCategories.map((c) => c.id),
          ]),
        ];

    const interestTags = [...intelligence.tagScores.keys()];
    const excludeList = [
      ...intelligence.interactedProductIds,
      ...intelligence.purchasedProductIds,
      ...cartProductIds,
      ...excludeIds,
    ];

    const candidates = await this.prisma.product.findMany({
      where: {
        ...this.availableProductWhere,
        id: { notIn: [...excludeList] },
        OR: [
          ...(candidateCategoryIds.length > 0
            ? [{ categoryId: { in: candidateCategoryIds } }]
            : []),
          ...(interestTags.length > 0
            ? [{ tags: { hasSome: interestTags } }]
            : []),
        ],
      },
      include: { category: true, variants: true },
      take: limit * 10,
      orderBy: [{ isRecommended: "desc" }, { createdAt: "desc" }],
    });

    if (candidates.length === 0) return [];

    const candidateIds = candidates.map((p) => p.id);
    const reviewSignals = await this.loadReviewSignals(candidateIds);
    const signalsByProduct = this.buildSignalsMap(
      candidateIds,
      popularity,
      reviewSignals,
    );

    const ranked = rankPersonalizedCandidates(
      candidates.map((p) => this.toCandidate(p)),
      intelligence,
      signalsByProduct,
      siblingCategoryIds,
      limit,
    );

    return this.attachProductsWithReasonsFromCandidates(ranked, candidates);
  }

  private async findFreeDeliveryBoostProducts(
    cartProductIds: string[],
    limit: number,
    categoryId: string | undefined,
    excludeIds: Set<string>,
    remainingScore: number,
    profile: CustomerAffinityProfile,
    popularity: StorePopularitySignals,
  ): Promise<DiscoveryProductDto[]> {
    const intelligence = buildIntelligenceScoringContext(profile);

    const [cartProducts, candidates] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: cartProductIds } },
        select: { categoryId: true },
      }),
      this.prisma.product.findMany({
        where: {
          ...this.availableProductWhere,
          ...this.categoryFilter(categoryId),
          id: { notIn: [...cartProductIds, ...excludeIds] },
          freeDeliveryValue: { gt: 0 },
        },
        include: { category: true, variants: true },
        take: limit * 10,
      }),
    ]);

    const cartCategoryIds = new Set(
      cartProducts.map((p) => p.categoryId).filter(Boolean),
    );

    if (candidates.length === 0) return [];

    const candidateIds = candidates.map((p) => p.id);
    const reviewSignals = await this.loadReviewSignals(candidateIds);
    const signalsByProduct = this.buildSignalsMap(
      candidateIds,
      popularity,
      reviewSignals,
    );

    const ranked = rankFreeDeliveryCandidates(
      candidates.map((p) => this.toCandidate(p)),
      {
        remainingScore,
        cartCategoryIds,
        intelligence,
        signalsByProduct,
        limit,
      },
    );

    return this.attachProductsWithReasonsFromCandidates(ranked, candidates);
  }
}
