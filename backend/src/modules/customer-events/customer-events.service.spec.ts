import { Test, TestingModule } from "@nestjs/testing";
import { CustomerInteractionType } from "@prisma/client";
import { ValidationException } from "../../common/exceptions/business.exception";
import { PrismaService } from "../prisma/prisma.service";
import { CustomerEventsService } from "./customer-events.service";

describe("CustomerEventsService", () => {
  let service: CustomerEventsService;
  const prisma = {
    customerInteraction: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerEventsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CustomerEventsService);
  });

  it("records authenticated store events", async () => {
    prisma.customerInteraction.create.mockResolvedValue({
      id: "evt_1",
      createdAt: new Date("2026-01-01"),
    });

    const result = await service.recordEvent(
      {
        type: CustomerInteractionType.PRODUCT_VIEWED,
        productId: "prod_1",
        source: "product_detail",
      },
      { userId: "user_1" },
    );

    expect(result.id).toBe("evt_1");
    expect(prisma.customerInteraction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: CustomerInteractionType.PRODUCT_VIEWED,
          productId: "prod_1",
          source: "product_detail",
        }),
      }),
    );
  });

  it("requires userId or sessionId", async () => {
    await expect(
      service.recordEvent(
        {
          type: CustomerInteractionType.SEARCH_QUERY,
          searchTerm: "tea",
        },
        {},
      ),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it("rejects sensitive payloads", async () => {
    await expect(
      service.recordEvent(
        {
          type: CustomerInteractionType.SEARCH_QUERY,
          searchTerm: "my password is secret",
          sessionId: "sess_abc",
        },
        {},
      ),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it("merges guest session events to authenticated user", async () => {
    prisma.customerInteraction.updateMany.mockResolvedValue({ count: 3 });

    const result = await service.mergeSessionToUser("sess_abc", "user_1");

    expect(result).toEqual({ merged: 3 });
    expect(prisma.customerInteraction.updateMany).toHaveBeenCalledWith({
      where: { sessionId: "sess_abc", userId: null },
      data: { userId: "user_1", sessionId: null },
    });
  });

  it("recordInternal swallows validation errors", async () => {
    service.recordInternal({
      type: CustomerInteractionType.PRODUCT_VIEWED,
      userId: "user_1",
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(prisma.customerInteraction.create).not.toHaveBeenCalled();
  });
});
