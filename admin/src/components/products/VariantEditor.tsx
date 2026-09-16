'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { FormField } from '@/components/ui/FormField';

export interface VariantGroup {
  id: string;
  name: string;
  values: string[];
}

interface VariantEditorProps {
  groups: VariantGroup[];
  onChange: (groups: VariantGroup[]) => void;
}

function newGroup(): VariantGroup {
  return { id: crypto.randomUUID(), name: '', values: [] };
}

export function VariantEditor({ groups, onChange }: VariantEditorProps) {
  const [draftValue, setDraftValue] = useState<Record<string, string>>({});

  const addGroup = () => onChange([...groups, newGroup()]);

  const removeGroup = (id: string) => onChange(groups.filter((g) => g.id !== id));

  const updateGroupName = (id: string, name: string) => {
    onChange(groups.map((g) => (g.id === id ? { ...g, name } : g)));
  };

  const addValue = (groupId: string) => {
    const value = (draftValue[groupId] ?? '').trim();
    if (!value) return;
    onChange(
      groups.map((g) =>
        g.id === groupId && !g.values.includes(value) ? { ...g, values: [...g.values, value] } : g,
      ),
    );
    setDraftValue((d) => ({ ...d, [groupId]: '' }));
  };

  const removeValue = (groupId: string, value: string) => {
    onChange(
      groups.map((g) =>
        g.id === groupId ? { ...g, values: g.values.filter((v) => v !== value) } : g,
      ),
    );
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">متغيرات المنتج</h3>
          <p className="text-xs text-gray-500 mt-0.5">مثل اللون أو الحجم — أضف قيماً متعددة لكل متغير</p>
        </div>
        <button type="button" onClick={addGroup} className="btn-secondary text-sm shrink-0">
          <Plus className="w-4 h-4 ml-1.5" />
          إضافة متغير
        </button>
      </div>

      {groups.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-8 text-center text-sm text-gray-500">
          لا توجد متغيرات بعد. اضغط «إضافة متغير» لبدء الإضافة.
        </div>
      )}

      {groups.map((group) => (
        <div key={group.id} className="rounded-xl bg-white border border-gray-200 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <FormField label="اسم المتغير">
                <input
                  className="input"
                  placeholder="مثال: اللون"
                  value={group.name}
                  onChange={(e) => updateGroupName(group.id, e.target.value)}
                />
              </FormField>
            </div>
            <button
              type="button"
              onClick={() => removeGroup(group.id)}
              className="mt-8 p-2 rounded-xl text-error-600 hover:bg-error-50 transition-colors"
              aria-label="حذف المتغير"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">القيم</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {group.values.map((value) => (
                <span
                  key={value}
                  className="inline-flex items-center gap-1 rounded-full bg-primary-50 text-primary-700 border border-primary-200 px-3 py-1 text-sm"
                >
                  {value}
                  <button
                    type="button"
                    onClick={() => removeValue(group.id, value)}
                    className="p-0.5 rounded-full hover:bg-primary-100"
                    aria-label={`حذف ${value}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="أضف قيمة..."
                value={draftValue[group.id] ?? ''}
                onChange={(e) => setDraftValue((d) => ({ ...d, [group.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addValue(group.id);
                  }
                }}
              />
              <button type="button" onClick={() => addValue(group.id)} className="btn-secondary shrink-0">
                إضافة
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function variantGroupsToApi(groups: VariantGroup[]) {
  const variants: { name: string; value: string; type: string; stock: number; priceAdjustment: number }[] = [];

  for (const group of groups) {
    if (!group.name.trim()) continue;
    for (const value of group.values) {
      variants.push({
        name: value,
        value,
        type: group.name.trim(),
        stock: 0,
        priceAdjustment: 0,
      });
    }
  }

  return variants;
}

export function apiVariantsToGroups(
  variants: { name: string; value: string; type: string }[] = [],
): VariantGroup[] {
  const map = new Map<string, string[]>();

  for (const v of variants) {
    const type = v.type || 'عام';
    const val = v.value || v.name;
    if (!map.has(type)) map.set(type, []);
    const list = map.get(type)!;
    if (!list.includes(val)) list.push(val);
  }

  return Array.from(map.entries()).map(([name, values]) => ({
    id: crypto.randomUUID(),
    name,
    values,
  }));
}
