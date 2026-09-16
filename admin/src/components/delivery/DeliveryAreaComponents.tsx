'use client';



import { useEffect, useState } from 'react';

import { ChevronDown, ChevronUp, Pencil, Trash2, Truck } from 'lucide-react';

import type { DeliveryArea } from '@/lib/types';

import { formatPrice } from '@/lib/utils';

import { Switch } from '@/components/ui/Switch';

import { Modal } from '@/components/ui/Modal';

import {

  adminAreaTypeBadgeClass,

  adminAreaTypeLabel,

  getMainAreas,

  groupDeliveryAreasForAdmin,

  type DeliveryAreaType,

} from '@/lib/delivery-areas';



import type { DeliveryRegion } from '@/lib/types';
import { DELIVERY_REGIONS } from '@/lib/delivery-regions';
import { deliveryRegionLabel } from '@/lib/delivery-regions';

export interface DeliveryAreaFormState {

  name: string;

  deliveryFee: string;

  isActive: boolean;

  areaType: DeliveryAreaType;

  parentId: string;

  region: DeliveryRegion | '';

}



interface DeliveryAreaCardProps {

  area: DeliveryArea;

  toggling?: boolean;

  onEdit: () => void;

  onDelete: () => void;

  onToggleActive: (active: boolean) => void;

  nested?: boolean;

}



export function DeliveryAreaCard({

  area,

  toggling,

  onEdit,

  onDelete,

  onToggleActive,

  nested,

}: DeliveryAreaCardProps) {

  return (

    <article className={`card p-0 overflow-hidden hover:shadow-lg transition-shadow duration-200 ${nested ? 'mr-4 sm:mr-6 border-r-4 border-primary-100' : ''}`}>

      <div className="bg-gradient-to-l from-primary-50 to-white px-4 py-3 border-b border-gray-100 flex items-center gap-3">

        <div className="w-10 h-10 rounded-xl bg-white border border-primary-100 flex items-center justify-center text-primary-600 shrink-0">

          <Truck className="w-5 h-5" />

        </div>

        <div className="flex-1 min-w-0">

          <div className="flex flex-wrap items-center gap-2">

            <h3 className="font-bold text-gray-900 truncate">{area.name}</h3>

            <span className={`badge shrink-0 ${adminAreaTypeBadgeClass(area.areaType)}`}>

              {adminAreaTypeLabel(area.areaType)}

            </span>

          </div>

          <p className="text-sm text-primary-700 font-semibold mt-0.5">

            {formatPrice(area.deliveryFee)} ₪

          </p>

          {(area.areaType ?? 'MAIN') === 'MAIN' && area.region && (
            <p className="text-xs text-gray-500 mt-0.5">
              النطاق: {deliveryRegionLabel(area.region)}
            </p>
          )}

        </div>

        <span className={`badge shrink-0 ${area.isActive ? 'badge-success' : 'badge-error'}`}>

          {area.isActive ? 'نشطة' : 'غير نشطة'}

        </span>

      </div>



      <div className="p-4 space-y-4">

        <Switch

          label={area.isActive ? 'المنطقة نشطة' : 'المنطقة غير نشطة'}

          checked={area.isActive}

          disabled={toggling}

          onChange={onToggleActive}

        />



        <div className="flex flex-col sm:flex-row gap-2">

          <button type="button" onClick={onEdit} className="btn-secondary flex-1 min-h-[44px]">

            <Pencil className="w-4 h-4 ml-1.5" />

            تعديل

          </button>

          <button type="button" onClick={onDelete} className="btn-danger flex-1 min-h-[44px]">

            <Trash2 className="w-4 h-4 ml-1.5" />

            حذف

          </button>

        </div>

      </div>

    </article>

  );

}



interface DeliveryAreaGroupViewProps {

  main: DeliveryArea;

  subAreas: DeliveryArea[];

  togglingId: string | null;

  onEdit: (area: DeliveryArea) => void;

  onDelete: (id: string) => void;

  onToggleActive: (area: DeliveryArea, active: boolean) => void;

}



export function DeliveryAreaGroupView({

  main,

  subAreas,

  togglingId,

  onEdit,

  onDelete,

  onToggleActive,

}: DeliveryAreaGroupViewProps) {

  const [expanded, setExpanded] = useState(true);



  return (

    <div className="space-y-3">

      <div className="flex items-center gap-2">

        <button

          type="button"

          className="p-1 rounded-lg hover:bg-gray-100 text-gray-600"

          onClick={() => setExpanded((v) => !v)}

          aria-label={expanded ? 'طي' : 'توسيع'}

        >

          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}

        </button>

        <h2 className="text-lg font-bold text-gray-900">{main.name}</h2>

      </div>



      {expanded && (

        <div className="space-y-3">

          <DeliveryAreaCard

            area={main}

            toggling={togglingId === main.id}

            onEdit={() => onEdit(main)}

            onDelete={() => onDelete(main.id)}

            onToggleActive={(active) => onToggleActive(main, active)}

          />

          {subAreas.map((child) => (

            <DeliveryAreaCard

              key={child.id}

              area={child}

              nested

              toggling={togglingId === child.id}

              onEdit={() => onEdit(child)}

              onDelete={() => onDelete(child.id)}

              onToggleActive={(active) => onToggleActive(child, active)}

            />

          ))}

        </div>

      )}

    </div>

  );

}



interface DeliveryAreaModalProps {

  open: boolean;

  editArea?: DeliveryArea | null;

  mainAreas: DeliveryArea[];

  submitting?: boolean;

  onClose: () => void;

  onSubmit: (data: DeliveryAreaFormState) => Promise<void>;

}



export function DeliveryAreaModal({

  open,

  editArea,

  mainAreas,

  submitting,

  onClose,

  onSubmit,

}: DeliveryAreaModalProps) {

  const [form, setForm] = useState<DeliveryAreaFormState>({

    name: '',

    deliveryFee: '',

    isActive: true,

    areaType: 'MAIN',

    parentId: '',

    region: '',

  });

  const [errors, setErrors] = useState<Record<string, string>>({});



  useEffect(() => {

    if (!open) return;

    if (editArea) {

      setForm({

        name: editArea.name,

        deliveryFee: String(editArea.deliveryFee),

        isActive: editArea.isActive,

        areaType: editArea.areaType ?? 'MAIN',

        parentId: editArea.parentId ?? '',

        region: editArea.region ?? '',

      });

    } else {

      setForm({ name: '', deliveryFee: '', isActive: true, areaType: 'MAIN', parentId: '', region: '' });

    }

    setErrors({});

  }, [open, editArea]);



  const validate = () => {

    const next: Record<string, string> = {};

    if (!form.name.trim()) next.name = 'اسم المنطقة مطلوب';

    const fee = parseFloat(form.deliveryFee);

    if (!form.deliveryFee.trim() || Number.isNaN(fee) || fee < 0) {

      next.deliveryFee = 'يرجى إدخال سعر توصيل صالح';

    }

    if (form.areaType !== 'MAIN' && !form.parentId) {

      next.parentId = 'يرجى اختيار المنطقة الرئيسية';

    }

    if (form.areaType === 'MAIN' && !form.region) {

      next.region = 'يرجى اختيار النطاق الجغرافي';

    }

    setErrors(next);

    return Object.keys(next).length === 0;

  };



  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!validate()) return;

    await onSubmit(form);

  };



  const isSubArea = form.areaType !== 'MAIN';



  return (

    <Modal

      open={open}

      onClose={onClose}

      title={editArea ? 'تعديل المنطقة' : 'إضافة منطقة'}

      subtitle={editArea ? 'عدّل بيانات منطقة التوصيل' : 'أضف منطقة توصيل جديدة للمتجر'}

      size="sm"

    >

      <form onSubmit={handleSubmit} className="space-y-5">

        <div>

          <label className="block text-sm font-semibold text-gray-800 mb-2">نوع المنطقة</label>

          <select

            className="input min-h-[48px]"

            value={form.areaType}

            onChange={(e) =>

              setForm((f) => ({

                ...f,

                areaType: e.target.value as DeliveryAreaType,

                parentId: e.target.value === 'MAIN' ? '' : f.parentId,

                region: e.target.value === 'MAIN' ? f.region : '',

              }))

            }

          >

            <option value="MAIN">رئيسية</option>

            <option value="SUB_NEAR">فرعية قريبة</option>

            <option value="SUB_FAR">فرعية بعيدة</option>

          </select>

        </div>



        {isSubArea && (

          <div>

            <label className="block text-sm font-semibold text-gray-800 mb-2">المنطقة الرئيسية</label>

            <select

              className={`input min-h-[48px] ${errors.parentId ? 'border-error-500' : ''}`}

              value={form.parentId}

              onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}

            >

              <option value="">اختر المنطقة الرئيسية</option>

              {mainAreas.map((m) => (

                <option key={m.id} value={m.id}>

                  {m.name}

                </option>

              ))}

            </select>

            {errors.parentId && <p className="text-xs text-error-600 mt-1">{errors.parentId}</p>}

          </div>

        )}



        {!isSubArea && (

          <div>

            <label className="block text-sm font-semibold text-gray-800 mb-2">النطاق الجغرافي</label>

            <select

              className={`input min-h-[48px] ${errors.region ? 'border-error-500' : ''}`}

              value={form.region}

              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value as DeliveryRegion | '' }))}

            >

              <option value="">اختر النطاق</option>

              {DELIVERY_REGIONS.map((r) => (

                <option key={r.id} value={r.id}>{r.label}</option>

              ))}

            </select>

            {errors.region && <p className="text-xs text-error-600 mt-1">{errors.region}</p>}

          </div>

        )}



        <div>

          <label className="block text-sm font-semibold text-gray-800 mb-2">اسم المنطقة</label>

          <input

            className={`input min-h-[48px] ${errors.name ? 'border-error-500' : ''}`}

            placeholder="مثال: رفيديا"

            value={form.name}

            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}

          />

          {errors.name && <p className="text-xs text-error-600 mt-1">{errors.name}</p>}

        </div>



        <div>

          <label className="block text-sm font-semibold text-gray-800 mb-2">سعر التوصيل (₪)</label>

          <input

            type="number"

            step="0.01"

            min="0"

            dir="ltr"

            className={`input ltr-input min-h-[48px] ${errors.deliveryFee ? 'border-error-500' : ''}`}

            placeholder="0.00"

            value={form.deliveryFee}

            onChange={(e) => setForm((f) => ({ ...f, deliveryFee: e.target.value }))}

          />

          {errors.deliveryFee && <p className="text-xs text-error-600 mt-1">{errors.deliveryFee}</p>}

        </div>



        <div className="rounded-xl bg-gray-50 p-4">

          <Switch

            label={form.isActive ? 'نشطة' : 'غير نشطة'}

            description="المناطق غير النشطة لن تظهر للعملاء"

            checked={form.isActive}

            onChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}

          />

        </div>



        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">

          <button type="button" className="btn-secondary flex-1 min-h-[48px]" onClick={onClose}>

            إلغاء

          </button>

          <button type="submit" className="btn-primary flex-1 min-h-[48px]" disabled={submitting}>

            {submitting ? 'جاري الحفظ...' : editArea ? 'حفظ التعديلات' : 'إضافة المنطقة'}

          </button>

        </div>

      </form>

    </Modal>

  );

}



export { groupDeliveryAreasForAdmin, getMainAreas };


