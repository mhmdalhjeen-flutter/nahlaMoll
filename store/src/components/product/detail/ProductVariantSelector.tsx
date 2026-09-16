'use client';

import type { Product, ProductVariant } from '@/lib/types';
import { cn } from '@/lib/utils';
import { isProductPurchasable } from '@/lib/free-delivery';
import { groupVariantsByType, getVariantLabel } from '@/lib/product-variants';

interface ProductVariantSelectorProps {
  product: Product;
  selected: ProductVariant | null;
  onSelect: (variant: ProductVariant | null) => void;
}

export function ProductVariantSelector({
  product,
  selected,
  onSelect,
}: ProductVariantSelectorProps) {
  const variants = product.variants ?? [];
  if (variants.length === 0) return null;

  const groups = groupVariantsByType(variants);

  return (
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([type, typeVariants]) => (
        <div key={type} className="space-y-2">
          <p className="text-sm font-medium text-gray-900">{type}</p>
          <div
            className="flex flex-wrap gap-2"
            role="listbox"
            aria-label={type}
          >
            {typeVariants.map((v) => {
              const inStock = isProductPurchasable(product, v);
              const isSelected = selected?.id === v.id;
              const label = getVariantLabel(v);

              return (
                <button
                  key={v.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={!inStock}
                  onClick={() => inStock && onSelect(v)}
                  className={cn(
                    'min-h-11 px-4 rounded-xl border text-sm font-medium transition-colors touch-manipulation',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                    !inStock &&
                      'opacity-50 cursor-not-allowed line-through border-gray-200 text-gray-400 bg-gray-50',
                    inStock &&
                      isSelected &&
                      'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-100',
                    inStock &&
                      !isSelected &&
                      'border-gray-200 text-gray-800 bg-white hover:border-primary-200 hover:bg-primary-50/50',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
