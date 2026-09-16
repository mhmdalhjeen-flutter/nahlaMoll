import type { Product } from '@/lib/types';
import type { OfferFormState } from '@/components/products/OfferFields';
import { defaultOfferState } from '@/components/products/OfferFields';
import { apiVariantsToGroups, type VariantGroup } from '@/components/products/VariantEditor';
import {
  UNIT_OPTIONS,
  type OfferKind,
  type UnitOption,
  parseProductTags,
} from '@/lib/product-meta';

export interface ProductFormState {
  name: string;
  categoryId: string;
  unit: UnitOption | string;
  customUnit: string;
  price: string;
  freeDelivery: boolean;
  freeDeliveryContributionMain: string;
  freeDeliveryContributionSubNear: string;
  freeDeliveryContributionSubFar: string;
  condition: 'NEW' | 'USED';
  stockType: 'LIMITED' | 'UNLIMITED';
  stock: string;
  isRecommended: boolean;
  isAvailable: boolean;
}

export function createEmptyFormState(): ProductFormState {
  return {
    name: '',
    categoryId: '',
    unit: 'قطعة',
    customUnit: '',
    price: '',
    freeDelivery: false,
    freeDeliveryContributionMain: '',
    freeDeliveryContributionSubNear: '',
    freeDeliveryContributionSubFar: '',
    condition: 'NEW',
    stockType: 'UNLIMITED',
    stock: '',
    isRecommended: false,
    isAvailable: true,
  };
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseMinQuantity(details: string): string {
  const match = details.match(/الحد الأدنى:\s*(\d+)/);
  return match?.[1] ?? '';
}

function stripMinQuantityFromDetails(details: string): string {
  return details.replace(/\s*\|\s*الحد الأدنى:\s*\d+/g, '').replace(/الحد الأدنى:\s*\d+\s*\|\s*/g, '').trim();
}

export function productToFormState(product: Product): ProductFormState {
  const meta = parseProductTags(product.tags ?? []);
  const freeDeliveryValue = parseFloat(String(product.freeDeliveryValue ?? 0));
  const subNear = parseFloat(String(product.freeDeliveryValueSubNear ?? 0));
  const subFar = parseFloat(String(product.freeDeliveryValueSubFar ?? 0));
  const hasContribution = freeDeliveryValue > 0 || subNear > 0 || subFar > 0;

  const isPresetUnit = UNIT_OPTIONS.slice(0, -1).includes(meta.unit as UnitOption);

  let stockType: 'LIMITED' | 'UNLIMITED' = product.availability === 'LIMITED' ? 'LIMITED' : 'UNLIMITED';

  return {
    name: product.name,
    categoryId: product.categoryId,
    unit: isPresetUnit ? meta.unit : 'أخرى',
    customUnit: isPresetUnit ? '' : meta.unit,
    price: formatDecimalField(product.price),
    freeDelivery: hasContribution,
    freeDeliveryContributionMain: hasContribution ? formatDecimalField(freeDeliveryValue) : '',
    freeDeliveryContributionSubNear:
      subNear > 0 ? formatDecimalField(subNear) : hasContribution ? formatDecimalField(freeDeliveryValue) : '',
    freeDeliveryContributionSubFar:
      subFar > 0 ? formatDecimalField(subFar) : hasContribution ? formatDecimalField(freeDeliveryValue) : '',
    condition: product.condition === 'USED' ? 'USED' : 'NEW',
    stockType,
    stock: String(product.stock ?? 0),
    isRecommended: product.isRecommended,
    isAvailable: product.isAvailable,
  };
}

/** Keep user-entered decimal values stable when loading the edit form. */
function formatDecimalField(value: string | number): string {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return String(value ?? '');
  return Number.isInteger(parsed) ? String(parsed) : String(parsed);
}

export function productToOfferState(product: Product): OfferFormState {
  const meta = parseProductTags(product.tags ?? []);

  if (!product.hasOffer) {
    return { ...defaultOfferState };
  }

  let offerKind: OfferKind = meta.offerKind ?? 'PERCENTAGE';
  if (!meta.offerKind) {
    if (product.offerType === 'FIXED_AMOUNT') offerKind = 'SPECIAL_PRICE';
    else if (product.offerType === 'PERCENTAGE') offerKind = 'PERCENTAGE';
  }

  const rawDetails = meta.offerDetails || '';
  const minQuantity = parseMinQuantity(rawDetails);
  const offerDetails = stripMinQuantityFromDetails(rawDetails);

  return {
    hasOffer: true,
    offerKind,
    discountPercent:
      offerKind === 'PERCENTAGE' && product.offerValue != null ? String(product.offerValue) : '',
    specialPrice:
      offerKind === 'SPECIAL_PRICE' && product.offerValue != null ? String(product.offerValue) : '',
    minQuantity,
    offerStartDate: toDatetimeLocal(product.offerStartDate),
    offerEndDate: toDatetimeLocal(product.offerEndDate),
    offerDetails,
  };
}

export function productToVariantGroups(product: Product): VariantGroup[] {
  return apiVariantsToGroups(product.variants ?? []);
}

export function productToImages(product: Product): string[] {
  return product.images ?? [];
}

export function resolvePrimaryImageUrl(images: string[], animatedImage: string | null): string | null {
  return images[0] ?? animatedImage ?? null;
}

/** Primary image is always stored at index 0. */
export function buildProductImagesPayload(
  images: string[],
  primaryUrl: string | null,
  animatedImage: string | null,
): string[] {
  const gallery = images.filter((url) => url !== animatedImage);
  const primary = primaryUrl ?? gallery[0] ?? null;
  if (!primary) return [];
  const rest = gallery.filter((url) => url !== primary);
  return [primary, ...rest];
}

export function productToAnimatedImage(product: Product): string | null {
  return parseProductTags(product.tags ?? []).animatedImage;
}

export function buildOfferDetails(offer: OfferFormState): string {
  const parts: string[] = [];
  if (offer.offerDetails.trim()) parts.push(offer.offerDetails.trim());
  if (offer.minQuantity.trim()) parts.push(`الحد الأدنى: ${offer.minQuantity}`);
  return parts.join(' | ');
}

export function validateProductForm(
  form: ProductFormState,
  offer: OfferFormState,
): string | null {
  if (!form.categoryId) return 'يرجى اختيار التصنيف';
  const unit = form.unit === 'أخرى' ? form.customUnit.trim() : form.unit;
  if (!unit) return 'يرجى تحديد وحدة القياس';

  const price = Number(form.price);
  if (!form.price.trim() || Number.isNaN(price) || price < 0) {
    return 'يرجى إدخال سعر صحيح';
  }

  if (form.stockType === 'LIMITED') {
    const stock = Number.parseInt(form.stock, 10);
    if (!form.stock.trim() || Number.isNaN(stock) || stock < 0) {
      return 'يرجى إدخال كمية مخزون صحيحة';
    }
  }

  if (form.freeDelivery) {
    const main = Number(form.freeDeliveryContributionMain);
    const near = Number(form.freeDeliveryContributionSubNear);
    const far = Number(form.freeDeliveryContributionSubFar);
    if (
      form.freeDeliveryContributionMain.trim() === '' ||
      Number.isNaN(main) ||
      main < 0 ||
      form.freeDeliveryContributionSubNear.trim() === '' ||
      Number.isNaN(near) ||
      near < 0 ||
      form.freeDeliveryContributionSubFar.trim() === '' ||
      Number.isNaN(far) ||
      far < 0
    ) {
      return 'يرجى إدخال نسب مساهمة صحيحة لجميع أنواع المناطق';
    }
  }

  if (offer.hasOffer && offer.offerKind === 'PERCENTAGE' && !offer.discountPercent) {
    return 'يرجى إدخال نسبة الخصم';
  }
  if (offer.hasOffer && offer.offerKind === 'SPECIAL_PRICE' && !offer.specialPrice) {
    return 'يرجى إدخال سعر العرض';
  }
  return null;
}
