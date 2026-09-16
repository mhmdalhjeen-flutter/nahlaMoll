import { Injectable } from "@nestjs/common";
import { CustomerInteractionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  INTELLIGENCE_LOOKBACK_DAYS,
  INTELLIGENCE_MAX_EVENTS,
} from "./customer-intelligence.constants";
import {
  buildAffinityProfileFromSignals,
  expandOrderProductSignals,
  resolveSignals,
} from "./customer-intelligence.logic";
import type {
  CustomerAffinityProfile,
  IntelligenceSignalInput,
} from "./customer-intelligence.types";

const CANCELLED_STATUSES = ["CANCELLED"] as const;

const ORDER_EVENT_TYPES = new Set<CustomerInteractionType>([
  CustomerInteractionType.ORDER_CREATED,
  CustomerInteractionType.ORDER_COMPLETED,
]);

@Injectable()
export class CustomerIntelligenceService {
  constructor(private readonly prisma: PrismaService) {}

  async hasBehavioralData(userId: string): Promise<boolean> {
    const profile = await this.buildProfile({ userId });
    return profile.hasBehavioralData;
  }

  async buildProfile(input: {
    userId?: string;
    sessionId?: string;
    now?: Date;
  }): Promise<CustomerAffinityProfile> {
    const userId = input.userId?.trim();
    const sessionId = input.sessionId?.trim();

    if (!userId && !sessionId) {
      return this.emptyProfile();
    }

    const now = input.now ?? new Date();
    const since = new Date(now);
    since.setDate(since.getDate() - INTELLIGENCE_LOOKBACK_DAYS);

    const events = await this.prisma.customerInteraction.findMany({
      where: {
        createdAt: { gte: since },
        ...(userId ? { userId } : { sessionId, userId: null }),
      },
      orderBy: { createdAt: "desc" },
      take: INTELLIGENCE_MAX_EVENTS,
    });

    const rawSignals = this.eventsToSignals(events);

    if (userId) {
      rawSignals.push(
        ...(await this.loadSupplementalSignals(userId, rawSignals, since)),
      );
    }

    const enriched = await this.enrichSignals(rawSignals);
    const resolved = resolveSignals(enriched);
    const labels = await this.loadLabels(resolved);

    return buildAffinityProfileFromSignals(resolved, {
      userId,
      sessionId,
      now,
      categoryLabels: labels.categories,
      productLabels: labels.products,
    });
  }

  private emptyProfile(): CustomerAffinityProfile {
    return {
      computedAt: new Date().toISOString(),
      hasBehavioralData: false,
      signalCount: 0,
      categories: [],
      tags: [],
      products: [],
      searches: [],
      meta: { recentSignalCount: 0 },
    };
  }

  private eventsToSignals(
    events: Array<{
      type: CustomerInteractionType;
      createdAt: Date;
      productId: string | null;
      categoryId: string | null;
      searchTerm: string | null;
      source: string;
      metadata: unknown;
    }>,
  ): IntelligenceSignalInput[] {
    const signals: IntelligenceSignalInput[] = [];

    for (const event of events) {
      const metadata =
        event.metadata && typeof event.metadata === "object"
          ? (event.metadata as Record<string, unknown>)
          : null;

      if (ORDER_EVENT_TYPES.has(event.type) && !event.productId) {
        signals.push(...expandOrderProductSignals(metadata, event.createdAt));
        continue;
      }

      signals.push({
        type: event.type,
        createdAt: event.createdAt,
        productId: event.productId,
        categoryId: event.categoryId,
        searchTerm: event.searchTerm,
        source: event.source,
        metadata,
      });
    }

    return signals;
  }

  private async loadSupplementalSignals(
    userId: string,
    existing: IntelligenceSignalInput[],
    since: Date,
  ): Promise<IntelligenceSignalInput[]> {
    const coveredProducts = this.collectCoveredProducts(existing);

    const [favorites, cartItems, orderItems] = await Promise.all([
      this.prisma.favorite.findMany({
        where: { userId, createdAt: { gte: since } },
        select: {
          productId: true,
          createdAt: true,
          product: { select: { categoryId: true, tags: true } },
        },
      }),
      this.prisma.cartItem.findMany({
        where: { userId, createdAt: { gte: since } },
        select: {
          productId: true,
          createdAt: true,
          product: { select: { categoryId: true, tags: true } },
        },
      }),
      this.prisma.orderItem.findMany({
        where: {
          order: {
            customerId: userId,
            status: { notIn: [...CANCELLED_STATUSES] },
            createdAt: { gte: since },
          },
        },
        select: {
          productId: true,
          order: { select: { createdAt: true } },
          product: { select: { categoryId: true, tags: true } },
        },
        take: 60,
        orderBy: { order: { createdAt: "desc" } },
      }),
    ]);

    const supplemental: IntelligenceSignalInput[] = [];

    for (const fav of favorites) {
      if (coveredProducts.has(`favorite:${fav.productId}`)) continue;
      supplemental.push({
        type: "SUPPLEMENTAL_FAVORITE",
        createdAt: fav.createdAt,
        productId: fav.productId,
        categoryId: fav.product.categoryId,
        tags: fav.product.tags ?? [],
        source: "account",
      });
    }

    for (const item of cartItems) {
      if (coveredProducts.has(`cart:${item.productId}`)) continue;
      supplemental.push({
        type: "SUPPLEMENTAL_CART",
        createdAt: item.createdAt,
        productId: item.productId,
        categoryId: item.product.categoryId,
        tags: item.product.tags ?? [],
        source: "account",
      });
    }

    for (const item of orderItems) {
      if (!item.productId) continue;
      if (coveredProducts.has(`purchase:${item.productId}`)) continue;
      supplemental.push({
        type: "SUPPLEMENTAL_ORDER",
        createdAt: item.order.createdAt,
        productId: item.productId,
        categoryId: item.product?.categoryId ?? null,
        tags: item.product?.tags ?? [],
        source: "account",
      });
    }

    return supplemental;
  }

  private collectCoveredProducts(
    signals: IntelligenceSignalInput[],
  ): Set<string> {
    const covered = new Set<string>();

    for (const signal of signals) {
      if (!signal.productId) continue;

      if (
        signal.type === CustomerInteractionType.FAVORITE_ADDED ||
        signal.type === "SUPPLEMENTAL_FAVORITE"
      ) {
        covered.add(`favorite:${signal.productId}`);
      }
      if (
        signal.type === CustomerInteractionType.CART_ITEM_ADDED ||
        signal.type === "SUPPLEMENTAL_CART"
      ) {
        covered.add(`cart:${signal.productId}`);
      }
      if (
        signal.type === CustomerInteractionType.ORDER_CREATED ||
        signal.type === CustomerInteractionType.ORDER_COMPLETED ||
        signal.type === "SUPPLEMENTAL_ORDER"
      ) {
        covered.add(`purchase:${signal.productId}`);
      }
    }

    return covered;
  }

  private async enrichSignals(
    signals: IntelligenceSignalInput[],
  ): Promise<IntelligenceSignalInput[]> {
    const productIds = [
      ...new Set(
        signals.map((s) => s.productId).filter((id): id is string => !!id),
      ),
    ];

    if (productIds.length === 0) return signals;

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, categoryId: true, tags: true },
    });

    const byId = new Map(products.map((p) => [p.id, p]));

    return signals.map((signal) => {
      if (!signal.productId) return signal;
      const product = byId.get(signal.productId);
      if (!product) return signal;

      return {
        ...signal,
        categoryId: signal.categoryId ?? product.categoryId,
        tags: signal.tags?.length ? signal.tags : (product.tags ?? []),
      };
    });
  }

  private async loadLabels(resolved: ReturnType<typeof resolveSignals>) {
    const categoryIds = [
      ...new Set(
        resolved.map((s) => s.categoryId).filter((id): id is string => !!id),
      ),
    ];
    const productIds = [
      ...new Set(
        resolved.map((s) => s.productId).filter((id): id is string => !!id),
      ),
    ];

    const [categories, products] = await Promise.all([
      categoryIds.length
        ? this.prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      productIds.length
        ? this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    return {
      categories: new Map(categories.map((c) => [c.id, c.name])),
      products: new Map(products.map((p) => [p.id, p.name])),
    };
  }
}
