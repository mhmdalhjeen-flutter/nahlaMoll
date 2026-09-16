import { Logger } from "@nestjs/common";
import { EventEmitter } from "events";
import { RequestContextMiddleware } from "./request-context.middleware";

describe("RequestContextMiddleware", () => {
  const middleware = new RequestContextMiddleware();
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();
    delete process.env.SLOW_REQUEST_MS;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createMockResponse() {
    const res = new EventEmitter() as EventEmitter & {
      statusCode: number;
      setHeader: jest.Mock;
    };
    res.statusCode = 200;
    res.setHeader = jest.fn();
    return res;
  }

  it("sets and returns X-Request-ID", () => {
    const req = {
      method: "GET",
      originalUrl: "/api/products",
      header: jest.fn().mockReturnValue(undefined),
    } as unknown as import("express").Request;
    const res = createMockResponse();
    const next = jest.fn();

    middleware.use(req, res as unknown as import("express").Response, next);

    expect(req.requestId).toBeDefined();
    expect(res.setHeader).toHaveBeenCalledWith("X-Request-ID", req.requestId);
    expect(next).toHaveBeenCalled();
  });

  it("logs request completion with duration on finish", () => {
    jest.spyOn(Date, "now").mockReturnValueOnce(1000).mockReturnValueOnce(1142);

    const req = {
      method: "GET",
      originalUrl: "/api/products",
      header: jest.fn().mockReturnValue("550e8400-e29b-41d4-a716-446655440000"),
    } as unknown as import("express").Request;
    const res = createMockResponse();
    const next = jest.fn();

    middleware.use(req, res as unknown as import("express").Response, next);
    res.emit("finish");

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "request completed GET /api/products 200 142ms requestId=550e8400-e29b-41d4-a716-446655440000",
      ),
    );
  });

  it("logs slow requests at warning level", () => {
    process.env.SLOW_REQUEST_MS = "100";
    jest.spyOn(Date, "now").mockReturnValueOnce(1000).mockReturnValueOnce(1200);

    const req = {
      method: "POST",
      originalUrl: "/api/orders",
      header: jest.fn().mockReturnValue(undefined),
    } as unknown as import("express").Request;
    const res = createMockResponse();
    const next = jest.fn();

    middleware.use(req, res as unknown as import("express").Response, next);
    res.emit("finish");

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("slow request POST /api/orders"),
    );
    expect(logSpy).not.toHaveBeenCalled();
  });
});
