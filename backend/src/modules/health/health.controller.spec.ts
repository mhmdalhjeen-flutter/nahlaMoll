import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

describe("HealthController", () => {
  let controller: HealthController;
  const healthService = {
    getHealth: jest.fn(),
    isDatabaseConnected: jest.fn(),
    getDatabaseHealthSuccess: jest.fn(),
    getDatabaseHealthFailure: jest.fn(),
    getReadinessSuccess: jest.fn(),
    getReadinessFailure: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: healthService }],
    }).compile();

    controller = module.get(HealthController);
  });

  function mockResponse() {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  }

  it("returns liveness from /health without DB probe", () => {
    healthService.getHealth.mockReturnValue({ status: "ok" });
    expect(controller.getHealth()).toEqual({ status: "ok" });
    expect(healthService.isDatabaseConnected).not.toHaveBeenCalled();
  });

  it("returns 200 for /health/db when database is connected", async () => {
    healthService.isDatabaseConnected.mockResolvedValue(true);
    healthService.getDatabaseHealthSuccess.mockReturnValue({
      status: "ok",
      database: "connected",
    });
    const res = mockResponse();

    await controller.getDatabaseHealth(res as never);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "ok",
      database: "connected",
    });
  });

  it("returns 503 for /health/db when database is unavailable", async () => {
    healthService.isDatabaseConnected.mockResolvedValue(false);
    healthService.getDatabaseHealthFailure.mockReturnValue({
      status: "unhealthy",
      database: "unavailable",
    });
    const res = mockResponse();

    await controller.getDatabaseHealth(res as never);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      status: "unhealthy",
      database: "unavailable",
    });
  });

  it("returns 503 for /health/ready when database is unavailable", async () => {
    healthService.isDatabaseConnected.mockResolvedValue(false);
    healthService.getReadinessFailure.mockReturnValue({
      status: "not_ready",
      database: "unavailable",
    });
    const res = mockResponse();

    await controller.getReadiness(res as never);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      status: "not_ready",
      database: "unavailable",
    });
  });
});
