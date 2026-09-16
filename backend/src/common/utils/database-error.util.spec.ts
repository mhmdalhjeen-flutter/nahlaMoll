import { HttpStatus } from "@nestjs/common";
import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
} from "@prisma/client/runtime/library";
import {
  classifyDatabaseError,
  DATABASE_UNAVAILABLE_CODE,
} from "./database-error.util";

describe("classifyDatabaseError", () => {
  it("classifies initialization errors as unavailable", () => {
    const error = new PrismaClientInitializationError(
      "Can't reach database server",
      "P1001",
    );
    const result = classifyDatabaseError(error);
    expect(result).toEqual({
      httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
      errorCode: DATABASE_UNAVAILABLE_CODE,
      clientMessage: "Service temporarily unavailable",
      logClassification: DATABASE_UNAVAILABLE_CODE,
    });
  });

  it("classifies connectivity known request errors as unavailable", () => {
    const error = new PrismaClientKnownRequestError("Timed out", {
      code: "P1002",
      clientVersion: "5.22.0",
    });
    const result = classifyDatabaseError(error);
    expect(result?.errorCode).toBe(DATABASE_UNAVAILABLE_CODE);
    expect(result?.httpStatus).toBe(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it("does not expose database details in client message", () => {
    const error = new PrismaClientKnownRequestError(
      "postgresql://secret-host/db",
      { code: "P1001", clientVersion: "5.22.0" },
    );
    const result = classifyDatabaseError(error);
    expect(result?.clientMessage).not.toContain("postgresql");
    expect(result?.clientMessage).not.toContain("secret-host");
  });

  it("returns null for non-database errors", () => {
    expect(classifyDatabaseError(new Error("validation failed"))).toBeNull();
  });

  it("classifies non-connectivity prisma errors as generic database errors", () => {
    const error = new PrismaClientKnownRequestError("Unique constraint", {
      code: "P2002",
      clientVersion: "5.22.0",
    });
    const result = classifyDatabaseError(error);
    expect(result?.errorCode).toBe("DATABASE_ERROR");
    expect(result?.httpStatus).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});
