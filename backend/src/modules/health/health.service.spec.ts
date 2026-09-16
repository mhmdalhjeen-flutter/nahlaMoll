import { Test, TestingModule } from "@nestjs/testing";
import { HealthService } from "./health.service";
import { PrismaService } from "../prisma/prisma.service";

describe("HealthService", () => {
  let service: HealthService;
  const prisma = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(HealthService);
  });

  it("returns liveness without querying the database", () => {
    const health = service.getHealth();
    expect(health.status).toBe("ok");
    expect(health.service).toBe("backend-api");
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("reports database connected when probe succeeds", async () => {
    prisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    await expect(service.isDatabaseConnected()).resolves.toBe(true);
  });

  it("reports database unavailable when probe fails", async () => {
    prisma.$queryRaw.mockRejectedValue(new Error("connection refused"));
    await expect(service.isDatabaseConnected()).resolves.toBe(false);
  });

  it("returns safe unhealthy payload without internals", () => {
    const payload = service.getDatabaseHealthFailure();
    expect(payload).toEqual({
      status: "unhealthy",
      database: "unavailable",
    });
    expect(JSON.stringify(payload)).not.toContain("postgresql");
  });
});
