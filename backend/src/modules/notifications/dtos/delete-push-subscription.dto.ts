import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUrl, MaxLength } from "class-validator";

export class DeletePushSubscriptionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_protocol: true }, { message: "endpoint must be a valid URL" })
  @MaxLength(2048)
  endpoint!: string;
}
