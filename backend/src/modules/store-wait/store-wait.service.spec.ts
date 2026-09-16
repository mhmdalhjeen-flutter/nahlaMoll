import { Test, TestingModule } from "@nestjs/testing";
import { StoreWaitRequestStatus, StoreWaitRequestType } from "@prisma/client";
import { StoreWaitService } from "./store-wait.service";
import { PrismaService } from "../prisma/prisma.service";
import { createMockPrismaService } from "../prisma/prisma.service.mock";

const mockPrisma = createMockPrismaService();

describe("StoreWaitService", () => {
  let service: StoreWaitService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreWaitService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(StoreWaitService);
  });

  it("upserts a single WAITING request per user", async () => {
    mockPrisma.storeWaitRequest.findFirst.mockResolvedValue(null);
    mockPrisma.storeWaitRequest.create.mockResolvedValue({
      id: "wait-1",
      userId: "user-1",
      type: StoreWaitRequestType.ADD_TO_CART,
      status: StoreWaitRequestStatus.WAITING,
      payload: { productId: "p1", variantId: null, quantity: 1 },
    });

    await service.registerWait("user-1", {
      type: StoreWaitRequestType.ADD_TO_CART,
      productId: "p1",
      quantity: 1,
    });

    expect(mockPrisma.storeWaitRequest.create).toHaveBeenCalled();
    expect(mockPrisma.storeWaitRequest.update).not.toHaveBeenCalled();
  });

  it("updates existing WAITING request instead of creating duplicate", async () => {
    mockPrisma.storeWaitRequest.findFirst.mockResolvedValue({
      id: "wait-1",
      userId: "user-1",
      status: StoreWaitRequestStatus.WAITING,
    });
    mockPrisma.storeWaitRequest.update.mockResolvedValue({ id: "wait-1" });

    await service.registerWait("user-1", {
      type: StoreWaitRequestType.ADD_TO_CART,
      productId: "p2",
      quantity: 2,
    });

    expect(mockPrisma.storeWaitRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "wait-1" },
      }),
    );
    expect(mockPrisma.storeWaitRequest.create).not.toHaveBeenCalled();
  });

  it("notifies waiting customers when store opens", async () => {
    mockPrisma.storeWaitRequest.findMany.mockResolvedValue([
      {
        id: "wait-1",
        userId: "user-1",
        status: StoreWaitRequestStatus.WAITING,
      },
    ]);
    mockPrisma.$transaction.mockResolvedValue([]);

    const result = await service.notifyWaitingCustomers();

    expect(result.notified).toBe(1);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });
});
