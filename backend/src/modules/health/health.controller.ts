import { Controller, Get, Res } from "@nestjs/common";
import { Response } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  getHealth() {
    return this.healthService.getHealth();
  }

  @Public()
  @Get("db")
  async getDatabaseHealth(@Res() res: Response) {
    const connected = await this.healthService.isDatabaseConnected();
    if (!connected) {
      return res
        .status(503)
        .json(this.healthService.getDatabaseHealthFailure());
    }
    return res.status(200).json(this.healthService.getDatabaseHealthSuccess());
  }

  @Public()
  @Get("ready")
  async getReadiness(@Res() res: Response) {
    const connected = await this.healthService.isDatabaseConnected();
    if (!connected) {
      return res.status(503).json(this.healthService.getReadinessFailure());
    }
    return res.status(200).json(this.healthService.getReadinessSuccess());
  }
}
