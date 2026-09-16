'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { BasketSuggestion } from '@/lib/assistant/basket-builder';
import { formatPrice } from '@/lib/utils';
import { storeApi } from '@/lib/store-api';
import { useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/stores/toast-store';
import { recordAssistantInteraction } from '@/lib/assistant/interactions';
import { isProductPurchasable } from '@/lib/free-delivery';

interface AssistantBasketListProps {
  baskets: BasketSuggestion[];
  disabled?: boolean;
}

export function AssistantBasketList({ baskets, disabled }: AssistantBasketListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const toast = useToastStore((s) => s.show);
  const qc = useQueryClient();

  const handleAccept = async (basket: BasketSuggestion) => {
    if (disabled || loadingId) return;
    setLoadingId(basket.id);

    try {
      const added: Array<{ productId: string; quantity: number }> = [];

      for (const line of basket.lines) {
        if (!isProductPurchasable(line.product)) {
          toast(`${line.product.name} غير متوفر حاليًا`, 'error');
          continue;
        }
        await storeApi.addToCart(line.productId, line.quantity, line.variantId);
        added.push({ productId: line.productId, quantity: line.quantity });
      }

      if (added.length === 0) {
        toast('تعذّر إضافة السلة — المنتجات غير متوفرة', 'error');
        return;
      }

      recordAssistantInteraction({
        type: 'CHAT_BASKET_ACCEPTED',
        intent: 'basket_builder',
        metadata: {
          basketId: basket.id,
          total: basket.total,
          products: added,
        },
      });

      await qc.invalidateQueries({ queryKey: ['cart'] });
      toast('تمت إضافة السلة إلى سلتك 🛒', 'success');
    } catch {
      toast('تعذّر إضافة السلة — حاول مرة ثانية', 'error');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="mt-3 space-y-3">
      {baskets.map((basket) => (
        <div
          key={basket.id}
          className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 text-sm"
        >
          <p className="font-semibold text-gray-900 mb-2">
            {basket.emoji} {basket.title}
          </p>
          <ul className="space-y-1 text-gray-700 mb-2">
            {basket.lines.map((line) => (
              <li key={`${basket.id}-${line.productId}-${line.variantId ?? 'base'}`}>
                {line.product.name} ×{line.quantity}
              </li>
            ))}
          </ul>
          <p className="font-bold text-gray-900 tabular-nums mb-2">
            المجموع: {formatPrice(basket.total)} ₪
          </p>
          {basket.note && (
            <p className="text-xs text-primary-700 mb-2">{basket.note}</p>
          )}
          <button
            type="button"
            disabled={disabled || loadingId === basket.id}
            onClick={() => void handleAccept(basket)}
            className="w-full min-h-[44px] rounded-xl bg-primary-500 text-gray-900 text-sm font-semibold hover:bg-primary-600 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {loadingId === basket.id ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                جارٍ الإضافة...
              </>
            ) : (
              'أضف السلة للسلة'
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
