import { Injectable, Logger } from "@nestjs/common";
import { CustomerInteractionType, Prisma } from "@prisma/client";
import { ValidationException } from "../../common/exceptions/business.exception";
import { PrismaService } from "../prisma/prisma.service";
import { RecordCustomerEventDto } from "./dtos/record-customer-event.dto";
import {
  CUSTOMER_EVENT_SENSITIVE_PATTERN,
  CUSTOMER_EVENT_SOURCES,
} from "./customer-events.constants";

export interface RecordCustomerEventInput {
  userId?: string | null;
  sessionId?: string | null;
  type: CustomerInteractionType;
  searchTerm?: string | null;
  productId?: string | null;
  categoryId?: string | null;
  intent?: string | null;
  context?: string | null;
  metadata?: Record<string, unknown> | null;
  source?: string;
}

@Injectable()
export class CustomerEventsService {
  private readonly logger = new Logger(CustomerEventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordEvent(
    dto: RecordCustomerEventDto,
    options: { userId?: string; defaultSource?: string },
  ) {
    const userId = options.userId ?? null;
    const sessionId = dto.sessionId?.trim() || null;

    if (!userId && !sessionId) {
      throw new ValidationException("userId or sessionId required");
    }

    this.assertSafePayload(dto);

    return this.prisma.customerInteraction.create({
      data: this.buildCreateData(dto, userId, sessionId, options.defaultSource),
      select: { id: true, createdAt: true },
    });
  }

  /** Non-blocking server-side recording — never throws to callers. */
  recordInternal(input: RecordCustomerEventInput): void {
    void this.recordInternalAsync(input);
  }

  async mergeSessionToUser(sessionId: string, userId: string) {
    const normalizedSessionId = sessionId.trim();
    if (!normalizedSessionId) {
      throw new ValidationException("sessionId required");
    }

    const result = await this.prisma.customerInteraction.updateMany({
      where: {
        sessionId: normalizedSessionId,
        userId: null,
      },
      data: {
        userId,
        sessionId: null,
      },
    });

    return { merged: result.count };
  }

  private async recordInternalAsync(input: RecordCustomerEventInput) {
    try {
      const userId = input.userId?.trim() || null;
      const sessionId = input.sessionId?.trim() || null;

      if (!userId && !sessionId) {
        return;
      }

      const dto: RecordCustomerEventDto = {
        type: input.type,
        sessionId: sessionId ?? undefined,
        searchTerm: input.searchTerm ?? undefined,
        productId: input.productId ?? undefined,
        categoryId: input.categoryId ?? undefined,
        intent: input.intent ?? undefined,
        context: input.context ?? undefined,
        metadata: input.metadata ?? undefined,
        source: input.source,
      };

      this.assertSafePayload(dto);

      await this.prisma.customerInteraction.create({
        data: this.buildCreateData(
          dto,
          userId,
          sessionId,
          input.source ?? CUSTOMER_EVENT_SOURCES.SERVER,
        ),
      });
    } catch (error) {
      this.logger.warn(
        `Failed to record ${input.type}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private buildCreateData(
    dto: RecordCustomerEventDto,
    userId: string | null,
    sessionId: string | null,
    defaultSource?: string,
  ): Prisma.CustomerInteractionCreateInput {
    return {
      user: userId ? { connect: { id: userId } } : undefined,
      sessionId: userId ? null : sessionId,
      type: dto.type,
      searchTerm: dto.searchTerm?.trim() || null,
      productId: dto.productId?.trim() || null,
      categoryId: dto.categoryId?.trim() || null,
      intent: dto.intent?.trim() || null,
      context: dto.context?.trim() || null,
      metadata:
        dto.metadata == null
          ? undefined
          : (dto.metadata as Prisma.InputJsonValue),
      source:
        dto.source?.trim() || defaultSource || CUSTOMER_EVENT_SOURCES.STORE,
    };
  }

  private assertSafePayload(dto: RecordCustomerEventDto) {
    const blob = [
      dto.searchTerm,
      dto.intent,
      dto.context,
      dto.metadata ? JSON.stringify(dto.metadata) : "",
    ]
      .filter(Boolean)
      .join(" ");

    if (CUSTOMER_EVENT_SENSITIVE_PATTERN.test(blob)) {
      throw new ValidationException("Event payload rejected");
    }

    this.assertTypeRequirements(dto);
  }

  private assertTypeRequirements(dto: RecordCustomerEventDto) {
    const { type } = dto;

    if (
      (type === CustomerInteractionType.CHAT_SEARCH ||
        type === CustomerInteractionType.SEARCH_QUERY) &&
      (!dto.searchTerm?.trim() || dto.searchTerm.trim().length < 2)
    ) {
      throw new ValidationException("searchTerm required for search events");
    }

    if (
      (type === CustomerInteractionType.SEARCH_NO_RESULTS ||
        type === CustomerInteractionType.SEARCH_RESULT_CLICK) &&
      !dto.searchTerm?.trim()
    ) {
      throw new ValidationException(
        "searchTerm required for search result events",
      );
    }

    const productRequired = new Set<CustomerInteractionType>([
      CustomerInteractionType.CHAT_PRODUCT_CLICK,
      CustomerInteractionType.PRODUCT_VIEWED,
      CustomerInteractionType.PRODUCT_CLICKED,
      CustomerInteractionType.SEARCH_RESULT_CLICK,
      CustomerInteractionType.CART_ITEM_ADDED,
      CustomerInteractionType.CART_ITEM_REMOVED,
      CustomerInteractionType.CART_QUANTITY_CHANGED,
      CustomerInteractionType.FAVORITE_ADDED,
      CustomerInteractionType.FAVORITE_REMOVED,
      CustomerInteractionType.RECOMMENDATION_CLICKED,
      CustomerInteractionType.RECOMMENDATION_ADDED_TO_CART,
      CustomerInteractionType.RECOMMENDATION_PURCHASED,
    ]);

    if (productRequired.has(type) && !dto.productId?.trim()) {
      throw new ValidationException("productId required for this event type");
    }

    const categoryRequired = new Set<CustomerInteractionType>([
      CustomerInteractionType.CHAT_CATEGORY_CLICK,
      CustomerInteractionType.CATEGORY_VIEWED,
      CustomerInteractionType.CATEGORY_CLICKED,
    ]);

    if (categoryRequired.has(type) && !dto.categoryId?.trim()) {
      throw new ValidationException("categoryId required for category events");
    }

    if (type === CustomerInteractionType.CHAT_INTENT && !dto.intent?.trim()) {
      throw new ValidationException("intent required for CHAT_INTENT");
    }

    if (
      type === CustomerInteractionType.CHAT_BASKET_REQUEST &&
      !dto.intent?.trim()
    ) {
      throw new ValidationException("intent required for CHAT_BASKET_REQUEST");
    }

    if (
      type === CustomerInteractionType.CHAT_BASKET_ACCEPTED &&
      !dto.metadata
    ) {
      throw new ValidationException(
        "metadata required for CHAT_BASKET_ACCEPTED",
      );
    }

    const orderTypes = new Set<CustomerInteractionType>([
      CustomerInteractionType.ORDER_CREATED,
      CustomerInteractionType.ORDER_COMPLETED,
      CustomerInteractionType.ORDER_CANCELLED,
    ]);

    if (orderTypes.has(type)) {
      const orderId = dto.metadata?.orderId;
      if (typeof orderId !== "string" || !orderId.trim()) {
        throw new ValidationException(
          "metadata.orderId required for order events",
        );
      }
    }
  }
}
