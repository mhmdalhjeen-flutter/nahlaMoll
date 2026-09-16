import { IsBoolean } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdatePaymentMethodEnabledDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
}
