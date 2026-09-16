import { IsOptional, IsBoolean, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateCodSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  codEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  codNote?: string;
}
