import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { MulterError } from "multer";
import { classifyDatabaseError } from "../utils/database-error.util";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.requestId ?? "unknown";

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = "Internal server error";
    let error = "Internal Server Error";
    let logClassification: string | undefined;

    const databaseError = classifyDatabaseError(exception);
    if (databaseError) {
      status = databaseError.httpStatus;
      message = databaseError.clientMessage;
      error = databaseError.errorCode;
      logClassification = databaseError.logClassification;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === "object") {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message =
          (responseObj.message as string | string[]) || exception.message;
        error = (responseObj.error as string) || error;
      }
    } else if (!databaseError && exception instanceof MulterError) {
      status = HttpStatus.BAD_REQUEST;
      error = "Bad Request";
      if (exception.code === "LIMIT_FILE_SIZE") {
        message = "File size exceeds the maximum allowed size";
      } else if (exception.code === "LIMIT_FILE_COUNT") {
        message = "Too many files uploaded";
      } else {
        message = exception.message;
      }
    } else if (!databaseError && exception instanceof Error) {
      message = exception.message;
    }

    if (
      !databaseError &&
      process.env.NODE_ENV === "production" &&
      status === HttpStatus.INTERNAL_SERVER_ERROR
    ) {
      message = "Internal server error";
      error = "Internal Server Error";
    }

    const classificationSuffix = logClassification
      ? ` classification=${logClassification}`
      : "";
    this.logger.error(
      `request failed ${request.method} ${request.url} ${status} requestId=${requestId}${classificationSuffix}`,
      exception instanceof Error ? exception.stack : "",
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
