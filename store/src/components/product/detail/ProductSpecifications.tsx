import type { Product } from '@/lib/types';
import { parseProductSpecifications, parseProductTags } from '@/lib/product-meta';

interface ProductSpecificationsProps {
  product: Product;
}

export function ProductSpecifications({ product }: ProductSpecificationsProps) {
  const tagSpecs = parseProductSpecifications(product.tags ?? []);
  const { unit } = parseProductTags(product.tags ?? []);

  const rows: Array<{ label: string; value: string }> = [...tagSpecs];

  if (product.category?.name) {
    rows.push({ label: 'التصنيف', value: product.category.name });
  }
  if (product.condition === 'USED') {
    rows.push({ label: 'الحالة', value: 'مستعمل' });
  }
  if (unit && unit !== 'قطعة') {
    rows.push({ label: 'الوحدة', value: unit });
  }

  if (rows.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-gray-900">المواصفات</h2>
      <dl className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white overflow-hidden">
        {rows.map((row) => (
          <div key={`${row.label}-${row.value}`} className="grid grid-cols-2 gap-3 px-4 py-3 text-sm">
            <dt className="text-gray-500 font-medium">{row.label}</dt>
            <dd className="text-gray-900 text-left rtl:text-right">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
