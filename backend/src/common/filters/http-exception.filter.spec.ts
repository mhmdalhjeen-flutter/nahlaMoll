import { ArgumentsHost, HttpStatus } from "@nestjs/common";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { HttpExceptionFilter } from "./http-exception.filter";
import { DATABASE_UNAVAILABLE_CODE } from "../utils/database-error.util";

describe("HttpExceptionFilter", () => {
  const filter = new HttpExceptionFilter();
  let json: jest.Mock;
  let status: jest.Mock;
  let loggerError: jest.SpyInstance;

  beforeEach(() => {
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    loggerError = jest.spyOn(filter["logger"], "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createHost(request: {
    requestId?: string;
    method: string;
    url: string;
  }) {
    return {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;
  }

  it("includes requestId in server-side logs for database failures", () => {
    const error = new PrismaClientKnownRequestError("timeout", {
      code: "P1002",
      clientVersion: "5.22.0",
    });

    filter.catch(
      error,
      createHost({
        requestId: "550e8400-e29b-41d4-a716-446655440000",
        method: "GET",
        url: "/api/products",
      }),
    );

    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining("requestId=550e8400-e29b-41d4-a716-446655440000"),
      expect.any(String),
    );
    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining(`classification=${DATABASE_UNAVAILABLE_CODE}`),
      expect.any(String),
    );
  });

  it("does not expose database internals in the client response", () => {
    const error = new PrismaClientKnownRequestError(
      "Can't reach database server at secret-host",
      { code: "P1001", clientVersion: "5.22.0" },
    );

    filter.catch(error, createHost({ method: "GET", url: "/api/products" }));

    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: "Service temporarily unavailable",
        error: DATABASE_UNAVAILABLE_CODE,
      }),
    );
    expect(JSON.stringify(json.mock.calls[0][0])).not.toContain("secret-host");
  });
});
