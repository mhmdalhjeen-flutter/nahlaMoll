import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { getSlowRequestThresholdMs } from "../../config/observability.config";
import { REQUEST_ID_HEADER, resolveRequestId } from "../utils/request-id.util";

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestContextMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = resolveRequestId(req.header(REQUEST_ID_HEADER));
    req.requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);

    const startedAt = Date.now();
    const slowThresholdMs = getSlowRequestThresholdMs();

    res.on("finish", () => {
      const durationMs = Date.now() - startedAt;
      const route = req.originalUrl || req.url;
      const summary = `${req.method} ${route} ${res.statusCode} ${durationMs}ms requestId=${requestId}`;

      if (durationMs >= slowThresholdMs) {
        this.logger.warn(`slow request ${summary}`);
        return;
      }

      this.logger.log(`request completed ${summary}`);
    });

    next();
  }
}
