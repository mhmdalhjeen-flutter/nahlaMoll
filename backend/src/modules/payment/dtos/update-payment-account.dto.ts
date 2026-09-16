import { PartialType, OmitType } from "@nestjs/swagger";
import { CreatePaymentAccountDto } from "./create-payment-account.dto";

export class UpdatePaymentAccountDto extends PartialType(
  OmitType(CreatePaymentAccountDto, ["method"] as const),
) {}
