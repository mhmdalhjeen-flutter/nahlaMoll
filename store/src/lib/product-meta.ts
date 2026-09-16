const UNIT_PREFIX = 'unit:';
const ANIMATED_PREFIX = 'animatedImage:';
const OFFER_KIND_PREFIX = 'offerKind:';
const SPEC_PREFIX = 'spec:';

export function parseProductSpecifications(tags: string[] = []): Array<{ label: string; value: string }> {
  const specs: Array<{ label: string; value: string }> = [];
  for (const tag of tags) {
    if (!tag.startsWith(SPEC_PREFIX)) continue;
    const body = tag.slice(SPEC_PREFIX.length);
    const sep = body.indexOf('|');
    if (sep <= 0) continue;
    const label = body.slice(0, sep).trim();
    const value = body.slice(sep + 1).trim();
    if (label && value) specs.push({ label, value });
  }
  return specs;
}

export function parseProductTags(tags: string[] = []) {
  let unit = 'قطعة';
  let offerKind: string | null = null;
  let animatedImage: string | null = null;
  for (const tag of tags) {
    if (tag.startsWith(UNIT_PREFIX)) {
      unit = tag.slice(UNIT_PREFIX.length);
    } else if (tag.startsWith(OFFER_KIND_PREFIX)) {
      offerKind = tag.slice(OFFER_KIND_PREFIX.length);
    } else if (tag.startsWith(ANIMATED_PREFIX)) {
      animatedImage = tag.slice(ANIMATED_PREFIX.length);
    }
  }
  return { unit, offerKind, animatedImage };
}

export type ProductPricingInput = {
  price: string | number;
  hasOffer?: boolean;
  offerType?: string | null;
  offerValue?: string | number | null;
  offerStartDate?: string | null;
  offerEndDate?: string | null;
  tags?: string[];
};

export type ProductPriceResult = {
  unitPrice: number;
  originalUnitPrice: number;
  hasDiscount: boolean;
  discountLabel: string | null;
  isOfferActive: boolean;
};

export function isOfferActive(product: {
  hasOffer?: boolean;
  offerType?: string | null;
  offerValue?: string | number | null;
  offerStartDate?: string | null;
  offerEndDate?: string | null;
}): boolean {
  if (!product.hasOffer || product.offerType == null || product.offerValue == null) {
    return false;
  }
  const now = Date.now();
  if (product.offerStartDate && new Date(product.offerStartDate).getTime() > now) {
    return false;
  }
  if (product.offerEndDate && new Date(product.offerEndDate).getTime() < now) {
    return false;
  }
  return true;
}

export function calculateUnitPrice(
  product: ProductPricingInput,
  variantAdjustment = 0,
): ProductPriceResult {
  const basePrice = parseFloat(String(product.price));
  const adjustment = parseFloat(String(variantAdjustment)) || 0;
  const originalUnitPrice = roundMoney(basePrice + adjustment);
  const offerActive = isOfferActive(product);

  if (!offerActive) {
    return {
      unitPrice: originalUnitPrice,
      originalUnitPrice,
      hasDiscount: false,
      discountLabel: null,
      isOfferActive: false,
    };
  }

  const offerValue = parseFloat(String(product.offerValue));
  const { offerKind } = parseProductTags(product.tags ?? []);
  let discountedBase = basePrice;
  let discountLabel: string | null = null;

  if (product.offerType === 'PERCENTAGE') {
    discountedBase = Math.max(0, basePrice * (1 - offerValue / 100));
    discountLabel = `خصم ${formatOfferNumber(offerValue)}%`;
  } else if (product.offerType === 'FIXED_AMOUNT') {
    if (offerKind === 'SPECIAL_PRICE' || offerKind == null) {
      discountedBase = Math.max(0, offerValue);
      discountLabel = 'سعر خاص';
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
    isOfferActive: true,
  };
}

/** @deprecated Use calculateUnitPrice */
export function getDisplayPrice(product: ProductPricingInput): {
  price: number;
  originalPrice?: number;
  hasDiscount: boolean;
} {
  const result = calculateUnitPrice(product);
  return {
    price: result.unitPrice,
    originalPrice: result.hasDiscount ? result.originalUnitPrice : undefined,
    hasDiscount: result.hasDiscount,
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatOfferNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}
