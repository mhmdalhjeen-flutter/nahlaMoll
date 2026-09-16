'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/admin-api';
import type { Category, ProductAvailability } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';
import { FormField } from '@/components/ui/FormField';
import { Switch } from '@/components/ui/Switch';
import { AnimatedImageUpload, MultiImageUpload } from '@/components/ui/MultiImageUpload';
import { VariantEditor, variantGroupsToApi, type VariantGroup } from '@/components/products/VariantEditor';
import { OfferFields, defaultOfferState, type OfferFormState } from '@/components/products/OfferFields';
import {
  UNIT_OPTIONS,
  buildProductTags,
  mapOfferToApi,
  type UnitOption,
} from '@/lib/product-meta';
import {
  buildOfferDetails,
  buildProductImagesPayload,
  createEmptyFormState,
  resolvePrimaryImageUrl,
  type ProductFormState,
  validateProductForm,
} from '@/lib/product-form-utils';
import { useToast } from '@/stores/toast-store';

interface ProductFormProps {
  mode: 'create' | 'edit';
  productId?: string;
  initialForm?: ProductFormState;
  initialImages?: string[];
  initialAnimatedImage?: string | null;
  initialOffer?: OfferFormState;
  initialVariantGroups?: VariantGroup[];
  categories?: Category[];
}

export function ProductForm({
  mode,
  productId,
  initialForm,
  initialImages,
  initialAnimatedImage,
  initialOffer,
  initialVariantGroups,
  categories: categoriesProp,
}: ProductFormProps) {
  const router = useRouter();
  const toast = useToast((s) => s.show);
  const [categories, setCategories] = useState<Category[]>(categoriesProp ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>(() => initialImages ?? []);
  const [primaryImageUrl, setPrimaryImageUrl] = useState<string | null>(() =>
    resolvePrimaryImageUrl(initialImages ?? [], initialAnimatedImage ?? null),
  );
  const [animatedImage, setAnimatedImage] = useState<string | null>(
    () => initialAnimatedImage ?? null,
  );
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>(
    () => initialVariantGroups ?? [],
  );
  const [offer, setOffer] = useState<OfferFormState>(() => initialOffer ?? defaultOfferState);
  const [form, setForm] = useState<ProductFormState>(
    () => initialForm ?? createEmptyFormState(),
  );

  useEffect(() => {
    if (categoriesProp) {
      setCategories(categoriesProp);
      return;
    }
    adminApi.getCategories().then(setCategories).catch(() => {});
  }, [categoriesProp]);

  const set = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const uploadImage = async (file: File) => {
    const res = await adminApi.uploadProductImage(file);
    toast('تم رفع الصورة', 'success');
    return res.url;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateProductForm(form, offer);
    if (validationError) {
      toast(validationError, 'error');
      return;
    }

    const unit = form.unit === 'أخرى' ? form.customUnit.trim() : form.unit;

    const offerApi = mapOfferToApi({
      hasOffer: offer.hasOffer,
      offerKind: offer.offerKind,
      discountPercent: offer.discountPercent,
      specialPrice: offer.specialPrice,
      minQuantity: offer.minQuantity,
      offerStartDate: offer.offerStartDate ? new Date(offer.offerStartDate).toISOString() : undefined,
      offerEndDate: offer.offerEndDate ? new Date(offer.offerEndDate).toISOString() : undefined,
      offerDetails: buildOfferDetails(offer),
    });

    setSubmitting(true);
    try {
      const price = Number(form.price);
      const availability: ProductAvailability = form.stockType === 'LIMITED' ? 'LIMITED' : 'UNLIMITED';
      const stock =
        availability === 'LIMITED'
          ? Number.parseInt(form.stock, 10)
          : 0;
      const freeDeliveryValue = form.freeDelivery
        ? Number(form.freeDeliveryContributionMain)
        : 0;
      const freeDeliveryValueSubNear = form.freeDelivery
        ? Number(form.freeDeliveryContributionSubNear)
        : 0;
      const freeDeliveryValueSubFar = form.freeDelivery
        ? Number(form.freeDeliveryContributionSubFar)
        : 0;

      const finalImages = buildProductImagesPayload(images, primaryImageUrl, animatedImage);

      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.name.trim(),
        categoryId: form.categoryId,
        price,
        freeDeliveryValue,
        freeDeliveryValueSubNear,
        freeDeliveryValueSubFar,
        availability,
        stock,
        condition: form.condition,
        isAvailable: mode === 'create' ? true : form.isAvailable,
        isRecommended: form.isRecommended,
        hasOffer: offerApi.hasOffer,
        images: finalImages,
        tags: buildProductTags({
          unit,
          animatedImage,
          offerKind: offerApi.offerKind,
          offerDetails: offerApi.offerDetails,
        }),
        variants: variantGroupsToApi(variantGroups),
      };

      if (offerApi.hasOffer) {
        payload.offerType = offerApi.offerType;
        payload.offerValue = offerApi.offerValue;
        payload.offerStartDate = offerApi.offerStartDate;
        payload.offerEndDate = offerApi.offerEndDate;
      }

      if (mode === 'create') {
        await adminApi.createProduct(payload);
        toast('تم إنشاء المنتج بنجاح', 'success');
      } else if (productId) {
        await adminApi.updateProduct(productId, payload);
        toast('تم تحديث المنتج بنجاح', 'success');
      }

      router.push('/products');
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-6">
      <section className="card space-y-5">
        <MultiImageUpload
          images={images}
          primaryUrl={primaryImageUrl}
          onPrimaryChange={setPrimaryImageUrl}
          onChange={setImages}
          onUpload={uploadImage}
        />
        <AnimatedImageUpload
          value={animatedImage}
          isPrimary={!!animatedImage && primaryImageUrl === animatedImage}
          onPrimaryChange={(checked) => {
            if (checked && animatedImage) setPrimaryImageUrl(animatedImage);
            else if (!checked && primaryImageUrl === animatedImage) setPrimaryImageUrl(images[0] ?? null);
          }}
          onChange={setAnimatedImage}
          onUpload={uploadImage}
        />
      </section>

      <section className="card space-y-5">
        <h2 className="font-bold text-gray-900">معلومات المنتج</h2>

        <FormField label="اسم المنتج" required>
          <input
            className="input"
            required
            placeholder="أدخل اسم المنتج"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </FormField>

        <FormField label="التصنيف" required>
          <select
            className="input"
            required
            value={form.categoryId}
            onChange={(e) => set('categoryId', e.target.value)}
          >
            <option value="">اختر تصنيفاً</option>
            {(mode === 'edit' ? categories : categories.filter((c) => c.isActive)).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="وحدة القياس" required>
          <select className="input" value={form.unit} onChange={(e) => set('unit', e.target.value)}>
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </FormField>

        {form.unit === 'أخرى' && (
          <FormField label="وحدة مخصصة" required>
            <input
              className="input"
              placeholder="أدخل الوحدة"
              required
              value={form.customUnit}
              onChange={(e) => set('customUnit', e.target.value)}
            />
          </FormField>
        )}
      </section>

      <section className="card space-y-5">
        <h2 className="font-bold text-gray-900">السعر والتوصيل</h2>

        <FormField label="سعر المنتج (₪)" required>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input ltr-input"
            dir="ltr"
            required
            placeholder="0.00"
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
          />
        </FormField>

        <div className="rounded-xl bg-gray-50 p-4 space-y-4">
          <Switch
            label="مساهمة في التوصيل المجاني"
            description="نسبة مساهمة المنتج في التوصيل المجاني — ميزة من المتجر وليست رسوماً على العميل"
            checked={form.freeDelivery}
            onChange={(checked) => set('freeDelivery', checked)}
          />
          {form.freeDelivery && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="نسبة المساهمة — المنطقة الرئيسية (%)" required>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input ltr-input"
                  dir="ltr"
                  required
                  placeholder="10"
                  value={form.freeDeliveryContributionMain}
                  onChange={(e) => set('freeDeliveryContributionMain', e.target.value)}
                />
              </FormField>
              <FormField label="نسبة المساهمة — المنطقة الفرعية القريبة (%)" required>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input ltr-input"
                  dir="ltr"
                  required
                  placeholder="15"
                  value={form.freeDeliveryContributionSubNear}
                  onChange={(e) => set('freeDeliveryContributionSubNear', e.target.value)}
                />
              </FormField>
              <FormField label="نسبة المساهمة — المنطقة الفرعية البعيدة (%)" required>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input ltr-input"
                  dir="ltr"
                  required
                  placeholder="20"
                  value={form.freeDeliveryContributionSubFar}
                  onChange={(e) => set('freeDeliveryContributionSubFar', e.target.value)}
                />
              </FormField>
            </div>
          )}
        </div>
      </section>

      <section className="card space-y-5">
        <h2 className="font-bold text-gray-900">حالة المنتج</h2>
        <FormField label="النوع">
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'NEW' as const, label: 'جديد' },
              { value: 'USED' as const, label: 'مستعمل' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('condition', opt.value)}
                className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all min-h-[44px] ${
                  form.condition === opt.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FormField>

        <FormField label="نوع التوفر">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { value: 'LIMITED' as const, label: 'كمية محددة' },
              { value: 'UNLIMITED' as const, label: 'كمية غير محددة' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('stockType', opt.value)}
                className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all min-h-[44px] ${
                  form.stockType === opt.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FormField>

        {form.stockType === 'LIMITED' && (
          <FormField label="الكمية المتاحة" required>
            <input
              type="number"
              min="0"
              className="input ltr-input"
              dir="ltr"
              required
              value={form.stock}
              onChange={(e) => set('stock', e.target.value)}
            />
          </FormField>
        )}
      </section>

      <section className="card space-y-4">
        <Switch
          label="موصى به"
          description="يظهر المنتج في قسم المنتجات الموصى بها"
          checked={form.isRecommended}
          onChange={(checked) => set('isRecommended', checked)}
        />
        {mode === 'edit' && (
          <Switch
            label="متوفر في المتجر"
            description="يتحكم في ظهور المنتج للعملاء"
            checked={form.isAvailable}
            onChange={(checked) => set('isAvailable', checked)}
          />
        )}
      </section>

      <OfferFields value={offer} onChange={setOffer} />

      <VariantEditor groups={variantGroups} onChange={setVariantGroups} />

      <div className="flex flex-col-reverse sm:flex-row gap-3 sticky bottom-4 bg-gray-50/90 backdrop-blur p-4 rounded-2xl border border-gray-200">
        <button
          type="button"
          className="btn-secondary flex-1 min-h-[48px]"
          onClick={() => router.push('/products')}
        >
          إلغاء
        </button>
        <button type="submit" className="btn-primary flex-1 min-h-[48px]" disabled={submitting}>
          {submitting
            ? 'جاري الحفظ...'
            : mode === 'create'
              ? 'إضافة المنتج'
              : 'حفظ التعديلات'}
        </button>
      </div>
    </form>
  );
}
