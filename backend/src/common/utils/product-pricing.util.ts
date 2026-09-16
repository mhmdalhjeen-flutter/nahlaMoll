import { Prisma } from "@prisma/client";

export type ProductOfferInput = {
  price: Prisma.Decimal | number | string;
  hasOffer?: boolean;
  offerType?: string | null;
  offerValue?: Prisma.Decimal | number | string | null;
  offerStartDate?: Date | string | null;
  offerEndDate?: Date | string | null;
  tags?: string[];
};

export type UnitPriceResult = {
  unitPrice: number;
  originalUnitPrice: number;
  hasDiscount: boolean;
  discountLabel: string | null;
};

const OFFER_KIND_PREFIX = "offerKind:";

export function parseOfferKindFromTags(tags: string[] = []): string | null {
  for (const tag of tags) {
    if (tag.startsWith(OFFER_KIND_PREFIX)) {
      return tag.slice(OFFER_KIND_PREFIX.length);
    }
  }
  return null;
}

export function isProductOfferActive(product: ProductOfferInput): boolean {
  if (
    !product.hasOffer ||
    product.offerType == null ||
    product.offerValue == null
  ) {
    return false;
  }
  const now = Date.now();
  if (
    product.offerStartDate &&
    new Date(product.offerStartDate).getTime() > now
  ) {
    return false;
  }
  if (product.offerEndDate && new Date(product.offerEndDate).getTime() < now) {
    return false;
  }
  return true;
}

export function calculateProductUnitPrice(
  product: ProductOfferInput,
  variantAdjustment: Prisma.Decimal | number | string = 0,
): UnitPriceResult {
  const basePrice = toNumber(product.price);
  const adjustment = toNumber(variantAdjustment);
  const originalUnitPrice = roundMoney(basePrice + adjustment);

  if (!isProductOfferActive(product)) {
    return {
      unitPrice: originalUnitPrice,
      originalUnitPrice,
      hasDiscount: false,
      discountLabel: null,
    };
  }

  const offerValue = toNumber(product.offerValue);
  const offerKind = parseOfferKindFromTags(product.tags ?? []);
  let discountedBase = basePrice;
  let discountLabel: string | null = null;

  if (product.offerType === "PERCENTAGE") {
    discountedBase = Math.max(0, basePrice * (1 - offerValue / 100));
    discountLabel = `خصم ${formatOfferNumber(offerValue)}%`;
  } else if (product.offerType === "FIXED_AMOUNT") {
    if (offerKind === "SPECIAL_PRICE" || offerKind == null) {
      discountedBase = Math.max(0, offerValue);
      discountLabel = "سعر خاص";
    } else {
      discountedBase = Math.max(0, basePrice - offerValue);
      discountLabel = `خصم ${formatOfferNumber(offerValue)} ₪`;
    }
  }

  const unitPrice = roundMoney(discountedBase + adjustment);

  return {
    unitPrice,
    originalUnitPrice,
    hasDiscount: unitPrice < originalUnitPrice,
    discountLabel,
  };
}

function toNumber(value: Prisma.Decimal | number | string): number {
  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }
  return parseFloat(String(value));
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatOfferNumber(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, "");
}
