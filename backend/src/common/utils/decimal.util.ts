import { Prisma } from "@prisma/client";
import { ValidationException } from "../exceptions/business.exception";

/** Convert a required numeric input to Prisma.Decimal. Rejects null/undefined. */
export function toRequiredDecimal(
  value: number | string | Prisma.Decimal | null | undefined,
  fieldName: string,
): Prisma.Decimal {
  if (value === null || value === undefined || value === "") {
    throw new ValidationException(`${fieldName} is required`);
  }
  return new Prisma.Decimal(value);
}

/**
 * Convert an optional numeric input to Prisma.Decimal, null, or undefined.
 * - undefined: field omitted from update payload
 * - null: explicitly clear nullable DB column
 */
export function toOptionalDecimal(
  value: number | string | Prisma.Decimal | null | undefined,
): Prisma.Decimal | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value === "") return null;
  return new Prisma.Decimal(value);
}
