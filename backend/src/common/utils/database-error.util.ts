import { HttpStatus } from "@nestjs/common";
import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
  PrismaClientRustPanicError,
} from "@prisma/client/runtime/library";

export const DATABASE_UNAVAILABLE_CODE = "DATABASE_UNAVAILABLE";

const CONNECTIVITY_ERROR_CODES = new Set([
  "P1001", // Can't reach database server
  "P1002", // Database server timed out
  "P1008", // Operations timed out
  "P1017", // Server closed the connection
]);

export type ClassifiedDatabaseError = {
  httpStatus: number;
  errorCode: typeof DATABASE_UNAVAILABLE_CODE | "DATABASE_ERROR";
  clientMessage: string;
  logClassification: string;
};

export function classifyDatabaseError(
  error: unknown,
): ClassifiedDatabaseError | null {
  if (
    error instanceof PrismaClientInitializationError ||
    error instanceof PrismaClientRustPanicError
  ) {
    return connectivityFailure();
  }

  if (error instanceof PrismaClientKnownRequestError) {
    if (CONNECTIVITY_ERROR_CODES.has(error.code)) {
      return connectivityFailure();
    }
    return {
      httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: "DATABASE_ERROR",
      clientMessage: "Internal server error",
      logClassification: `DATABASE_ERROR:${error.code}`,
    };
  }

  return null;
}

function connectivityFailure(): ClassifiedDatabaseError {
  return {
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    errorCode: DATABASE_UNAVAILABLE_CODE,
    clientMessage: "Service temporarily unavailable",
    logClassification: DATABASE_UNAVAILABLE_CODE,
  };
}
