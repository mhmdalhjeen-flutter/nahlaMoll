'use client';

import { FormField } from '@/components/ui/FormField';
import { Switch } from '@/components/ui/Switch';
import { OFFER_KIND_OPTIONS, type OfferKind } from '@/lib/product-meta';

export interface OfferFormState {
  hasOffer: boolean;
  offerKind: OfferKind;
  discountPercent: string;
  specialPrice: string;
  minQuantity: string;
  offerStartDate: string;
  offerEndDate: string;
  offerDetails: string;
}

interface OfferFieldsProps {
  value: OfferFormState;
  onChange: (value: OfferFormState) => void;
}

export function OfferFields({ value, onChange }: OfferFieldsProps) {
  const set = <K extends keyof OfferFormState>(key: K, val: OfferFormState[K]) => {
    onChange({ ...value, [key]: val });
  };

  return (
    <div className="rounded-2xl border border-gray-200 p-4 sm:p-5 space-y-4 bg-white">
      <Switch
        label="هل المنتج ضمن عرض؟"
        checked={value.hasOffer}
        onChange={(checked) => set('hasOffer', checked)}
      />

      {value.hasOffer && (
        <div className="space-y-4 pt-2 border-t border-gray-100">
          <FormField label="نوع العرض">
            <select
              className="input"
              value={value.offerKind}
              onChange={(e) => set('offerKind', e.target.value as OfferKind)}
            >
              {OFFER_KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormField>

          {value.offerKind === 'PERCENTAGE' && (
            <FormField label="نسبة الخصم (%)" hint="أدخل النسبة المئوية للخصم">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className="input ltr-input"
                dir="ltr"
                value={value.discountPercent}
                onChange={(e) => set('discountPercent', e.target.value)}
              />
            </FormField>
          )}

          {value.offerKind === 'SPECIAL_PRICE' && (
            <FormField label="سعر العرض (₪)">
              <input
                type="number"
                min="0"
                step="0.01"
                className="input ltr-input"
                dir="ltr"
                value={value.specialPrice}
                onChange={(e) => set('specialPrice', e.target.value)}
              />
            </FormField>
          )}

          {value.offerKind === 'BOGO' && (
            <FormField label="تفاصيل العرض" hint="مثال: اشترِ واحدة واحصل على الثانية مجاناً">
              <textarea
                className="input min-h-[80px]"
                value={value.offerDetails}
                onChange={(e) => set('offerDetails', e.target.value)}
                placeholder="اشرح تفاصيل العرض للعميل..."
              />
            </FormField>
          )}

          {value.offerKind === 'BULK_DISCOUNT' && (
            <>
              <FormField label="الحد الأدنى للكمية">
                <input
                  type="number"
                  min="1"
                  className="input ltr-input"
                  dir="ltr"
                  value={value.minQuantity}
                  onChange={(e) => set('minQuantity', e.target.value)}
                />
              </FormField>
              <FormField label="تفاصيل الخصم">
                <textarea
                  className="input min-h-[80px]"
                  value={value.offerDetails}
                  onChange={(e) => set('offerDetails', e.target.value)}
                  placeholder="مثال: خصم 10% عند شراء 3 قطع أو أكثر"
                />
              </FormField>
            </>
          )}

          {value.offerKind === 'LIMITED_TIME' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="تاريخ البداية">
                  <input
                    type="datetime-local"
                    className="input ltr-input"
                    dir="ltr"
                    value={value.offerStartDate}
                    onChange={(e) => set('offerStartDate', e.target.value)}
                  />
                </FormField>
                <FormField label="تاريخ النهاية">
                  <input
                    type="datetime-local"
                    className="input ltr-input"
                    dir="ltr"
                    value={value.offerEndDate}
                    onChange={(e) => set('offerEndDate', e.target.value)}
                  />
                </FormField>
              </div>
              <FormField label="تفاصيل العرض">
                <textarea
                  className="input min-h-[80px]"
                  value={value.offerDetails}
                  onChange={(e) => set('offerDetails', e.target.value)}
                />
              </FormField>
            </>
          )}

          {value.offerKind === 'MIN_PURCHASE' && (
            <>
              <FormField label="الحد الأدنى للشراء (كمية)">
                <input
                  type="number"
                  min="1"
                  className="input ltr-input"
                  dir="ltr"
                  value={value.minQuantity}
                  onChange={(e) => set('minQuantity', e.target.value)}
                />
              </FormField>
              <FormField label="تفاصيل العرض">
                <textarea
                  className="input min-h-[80px]"
                  value={value.offerDetails}
                  onChange={(e) => set('offerDetails', e.target.value)}
                />
              </FormField>
            </>
          )}

          {value.offerKind === 'CUSTOM' && (
            <FormField label="تفاصيل العرض المخصص">
              <textarea
                className="input min-h-[100px]"
                value={value.offerDetails}
                onChange={(e) => set('offerDetails', e.target.value)}
                placeholder="اكتب تفاصيل العرض..."
              />
            </FormField>
          )}
        </div>
      )}
    </div>
  );
}

export const defaultOfferState: OfferFormState = {
  hasOffer: false,
  offerKind: 'PERCENTAGE',
  discountPercent: '',
  specialPrice: '',
  minQuantity: '',
  offerStartDate: '',
  offerEndDate: '',
  offerDetails: '',
};
