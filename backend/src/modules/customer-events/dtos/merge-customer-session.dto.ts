import { IsString, Matches, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class MergeCustomerSessionDto {
  @ApiProperty({ maxLength: 64 })
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: "sessionId must be alphanumeric",
  })
  sessionId: string;
}
