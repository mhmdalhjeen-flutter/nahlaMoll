import { Prisma } from "@prisma/client";
import { ValidationException } from "../exceptions/business.exception";
import { toOptionalDecimal, toRequiredDecimal } from "./decimal.util";

describe("decimal.util", () => {
  describe("toRequiredDecimal", () => {
    it("converts numbers", () => {
      expect(toRequiredDecimal(10, "price")).toEqual(new Prisma.Decimal(10));
    });

    it("rejects null", () => {
      expect(() => toRequiredDecimal(null, "price")).toThrow(
        ValidationException,
      );
    });
  });

  describe("toOptionalDecimal", () => {
    it("returns null for null input", () => {
      expect(toOptionalDecimal(null)).toBeNull();
    });

    it("returns undefined for undefined input", () => {
      expect(toOptionalDecimal(undefined)).toBeUndefined();
    });

    it("converts numbers", () => {
      expect(toOptionalDecimal(7)).toEqual(new Prisma.Decimal(7));
    });
  });
});
