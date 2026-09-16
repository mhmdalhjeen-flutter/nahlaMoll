export const UNIT_OPTIONS = [
  'قطعة',
  'كيلو',
  'غرام',
  'لتر',
  'مل',
  'متر',
  'صندوق',
  'حبة',
  'عبوة',
  'أخرى',
] as const;

export type UnitOption = (typeof UNIT_OPTIONS)[number];

export const OFFER_KIND_OPTIONS = [
  { value: 'PERCENTAGE', label: 'نسبة خصم' },
  { value: 'SPECIAL_PRICE', label: 'سعر خاص' },
  { value: 'BOGO', label: 'اشترِ واحد واحصل على واحد' },
  { value: 'BULK_DISCOUNT', label: 'اشترِ أكثر واحصل على خصم' },
  { value: 'LIMITED_TIME', label: 'عرض لفترة محدودة' },
  { value: 'MIN_PURCHASE', label: 'حد أدنى للشراء' },
  { value: 'CUSTOM', label: 'عرض مخصص' },
] as const;

export type OfferKind = (typeof OFFER_KIND_OPTIONS)[number]['value'];

const UNIT_PREFIX = 'unit:';
const ANIMATED_PREFIX = 'animatedImage:';
const OFFER_KIND_PREFIX = 'offerKind:';
const OFFER_DETAILS_PREFIX = 'offerDetails:';

export interface ParsedProductMeta {
  unit: string;
  customUnit: boolean;
  animatedImage: string | null;
  offerKind: OfferKind | null;
  offerDetails: string;
  userTags: string[];
}

export function parseProductTags(tags: string[] = []): ParsedProductMeta {
  let unit = 'قطعة';
  let customUnit = false;
  let animatedImage: string | null = null;
  let offerKind: OfferKind | null = null;
  let offerDetails = '';
  const userTags: string[] = [];

  for (const tag of tags) {
    if (tag.startsWith(UNIT_PREFIX)) {
      unit = tag.slice(UNIT_PREFIX.length);
      customUnit = !UNIT_OPTIONS.slice(0, -1).includes(unit as UnitOption);
    } else if (tag.startsWith(ANIMATED_PREFIX)) {
      animatedImage = tag.slice(ANIMATED_PREFIX.length);
    } else if (tag.startsWith(OFFER_KIND_PREFIX)) {
      offerKind = tag.slice(OFFER_KIND_PREFIX.length) as OfferKind;
    } else if (tag.startsWith(OFFER_DETAILS_PREFIX)) {
      offerDetails = tag.slice(OFFER_DETAILS_PREFIX.length);
    } else {
      userTags.push(tag);
    }
  }

  return { unit, customUnit, animatedImage, offerKind, offerDetails, userTags };
}

export function buildProductTags(meta: {
  unit: string;
  animatedImage?: string | null;
  offerKind?: OfferKind | null;
  offerDetails?: string;
  userTags?: string[];
}): string[] {
  const tags: string[] = [...(meta.userTags ?? [])];

  if (meta.unit) tags.push(`${UNIT_PREFIX}${meta.unit}`);
  if (meta.animatedImage) tags.push(`${ANIMATED_PREFIX}${meta.animatedImage}`);
  if (meta.offerKind) tags.push(`${OFFER_KIND_PREFIX}${meta.offerKind}`);
  if (meta.offerDetails) tags.push(`${OFFER_DETAILS_PREFIX}${meta.offerDetails}`);

  return tags;
}

export function slugifyCategoryName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]/g, '')
    .slice(0, 60);

  return base || `category-${Date.now()}`;
}

export function mapOfferToApi(offer: {
  hasOffer: boolean;
  offerKind: OfferKind;
  discountPercent?: string;
  specialPrice?: string;
  minQuantity?: string;
  offerStartDate?: string;
  offerEndDate?: string;
  offerDetails?: string;
}): {
  hasOffer: boolean;
  offerType?: 'PERCENTAGE' | 'FIXED_AMOUNT';
  offerValue?: number;
  offerStartDate?: string;
  offerEndDate?: string;
  offerKind: OfferKind | null;
  offerDetails: string;
} {
  if (!offer.hasOffer) {
    return { hasOffer: false, offerKind: null, offerDetails: '' };
  }

  const details = offer.offerDetails?.trim() ?? '';
  let offerType: 'PERCENTAGE' | 'FIXED_AMOUNT' = 'PERCENTAGE';
  let offerValue = 0;

  switch (offer.offerKind) {
    case 'PERCENTAGE':
      offerType = 'PERCENTAGE';
      offerValue = parseFloat(offer.discountPercent ?? '0') || 0;
      break;
    case 'SPECIAL_PRICE':
      offerType = 'FIXED_AMOUNT';
      offerValue = parseFloat(offer.specialPrice ?? '0') || 0;
      break;
    case 'BOGO':
    case 'BULK_DISCOUNT':
    case 'MIN_PURCHASE':
    case 'LIMITED_TIME':
    case 'CUSTOM':
      offerType = 'FIXED_AMOUNT';
      offerValue = 0;
      break;
  }

  return {
    hasOffer: true,
    offerType,
    offerValue,
    offerStartDate: offer.offerStartDate || undefined,
    offerEndDate: offer.offerEndDate || undefined,
    offerKind: offer.offerKind,
    offerDetails: details,
  };
}

export function getOfferKindLabel(kind: OfferKind | null | undefined): string {
  if (!kind) return '—';
  return OFFER_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? kind;
}

export function getStockTypeLabel(availability: string): string {
  if (availability === 'LIMITED') return 'كمية محددة';
  if (availability === 'UNLIMITED') return 'كمية غير محددة';
  return 'غير متاح';
}
