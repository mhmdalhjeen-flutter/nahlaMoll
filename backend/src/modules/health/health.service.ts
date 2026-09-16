import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getHealth() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "backend-api",
    };
  }

  async isDatabaseConnected(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  getDatabaseHealthSuccess() {
    return {
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    };
  }

  getDatabaseHealthFailure() {
    return {
      status: "unhealthy",
      database: "unavailable",
    };
  }

  getReadinessSuccess() {
    return {
      status: "ready",
      timestamp: new Date().toISOString(),
    };
  }

  getReadinessFailure() {
    return {
      status: "not_ready",
      database: "unavailable",
    };
  }
}
