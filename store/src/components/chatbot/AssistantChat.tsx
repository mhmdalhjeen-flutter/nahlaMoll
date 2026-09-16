'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { storeApi } from '@/lib/store-api';
import { useAuthStore } from '@/stores/auth-store';
import { useCartMap } from '@/hooks/useCartMap';
import { cn } from '@/lib/utils';
import { formatCustomerOrderNumber } from '@/lib/order-number';
import {
  buildWelcomeTurn,
  runContextualSuggestion,
  runProductSelection,
  runQuickAction,
  runUserMessage,
} from '@/lib/assistant/engine';
import { classifyAssistantQuery } from '@/lib/assistant/intents';
import { recordAssistantInteraction } from '@/lib/assistant/interactions';
import type {
  AssistantChatMessage,
  AssistantCompactItem,
  AssistantEngineContext,
  AssistantEngineDeps,
  AssistantQuickActionId,
  AssistantSessionState,
  AssistantSuggestion,
  AssistantTurn,
} from '@/lib/assistant/types';
import { AssistantProductList } from './AssistantProductList';
import { AssistantCompactPicker } from './AssistantCompactPicker';
import { AssistantBasketList } from './AssistantBasketList';

function turnToMessage(turn: AssistantTurn, id: string): AssistantChatMessage {
  return {
    id,
    role: 'assistant',
    text: turn.reply,
    products: turn.products,
    focusProduct: turn.focusProduct,
    similarSectionTitle: turn.similarSectionTitle,
    compactItems: turn.compactItems,
    baskets: turn.baskets,
    order: turn.order,
    showSupport: turn.showSupport,
    supportLabel: turn.supportLabel,
  };
}

function mergeSession(
  prev: AssistantSessionState,
  patch?: Partial<AssistantSessionState>,
): AssistantSessionState {
  return patch ? { ...prev, ...patch } : prev;
}

export function AssistantChat() {
  const { isAuthenticated } = useAuthStore();
  const { data: cartData } = useCartMap();
  const summary = cartData?.summary;
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<AssistantSuggestion[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<AssistantSessionState>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const bootedRef = useRef(false);

  const engineCtx: AssistantEngineContext = useMemo(
    () => ({
      isAuthenticated,
      cartProductIds: (cartData?.items ?? []).map((i) => i.productId).join(','),
      displayProgress: summary?.progressPercentage,
      remainingScore: summary?.remainingScore,
    }),
    [isAuthenticated, cartData?.items, summary?.progressPercentage, summary?.remainingScore],
  );

  const engineDeps: AssistantEngineDeps = useMemo(
    () => ({
      searchProducts: (q) => storeApi.searchProducts(q).then((result) => result.products),
      getDiscoveryFeed: (params) => storeApi.getDiscoveryFeed(params),
      getCategories: () => storeApi.getCategories(),
      getProducts: (params) => storeApi.getProducts(params),
      getProduct: (id) => storeApi.getProduct(id),
      addToCart: (productId, quantity, variantId) =>
        storeApi.addToCart(productId, quantity, variantId),
      getOrders: isAuthenticated
        ? () => storeApi.getOrders({ limit: 100 }).then((r) => r.items)
        : undefined,
    }),
    [isAuthenticated],
  );

  const appendAssistantTurn = useCallback((turn: AssistantTurn) => {
    const id = `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setMessages((prev) => [...prev, turnToMessage(turn, id)]);
    setSuggestions(turn.suggestions);
    if (turn.sessionPatch) {
      setSession((prev) => mergeSession(prev, turn.sessionPatch));
    }
    if (turn.categoryId) {
      recordAssistantInteraction({
        type: 'CHAT_CATEGORY_INTERACTION',
        categoryId: turn.categoryId,
        intent: turn.sessionPatch?.lastIntent ?? 'category_search',
      });
    }
  }, []);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    const welcome = buildWelcomeTurn();
    setMessages([turnToMessage(welcome, 'welcome')]);
    setSuggestions(welcome.suggestions);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, suggestions]);

  const recordIntentSignals = (text: string) => {
    const parsed = classifyAssistantQuery(text);

    if (
      (parsed.intent === 'product_search' || parsed.intent === 'category_search') &&
      parsed.searchTerm
    ) {
      recordAssistantInteraction({
        type: 'CHAT_SEARCH',
        searchTerm: parsed.searchTerm,
        intent: parsed.intent,
        context: parsed.context,
      });
    } else if (parsed.intent === 'basket_builder') {
      recordAssistantInteraction({
        type: 'CHAT_BASKET_REQUEST',
        intent: parsed.intent,
        context: parsed.basketGoal,
        metadata: {
          budget: parsed.budget,
          categoryKeywords: parsed.categoryKeywords,
          goal: parsed.basketGoal,
        },
      });
    } else if (parsed.intent !== 'unknown') {
      recordAssistantInteraction({
        type: 'CHAT_INTENT',
        intent: parsed.intent,
        context: parsed.context,
      });
    }
  };

  const handleSubmit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: trimmed },
    ]);
    setInput('');
    setLoading(true);
    recordIntentSignals(trimmed);

    try {
      const turn = await runUserMessage(trimmed, engineDeps, engineCtx, session);
      appendAssistantTurn(turn);
    } finally {
      setLoading(false);
    }
  };

  const handleCompactSelect = async (item: AssistantCompactItem) => {
    if (loading || !item.productId) return;

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: `${item.emoji} ${item.label}` },
    ]);
    setLoading(true);

    recordAssistantInteraction({
      type: 'CHAT_BASKET_PRODUCT_SELECTION',
      productId: item.productId,
      intent: session.lastIntent,
    });

    try {
      const turn = await runProductSelection(item.productId, engineDeps, engineCtx);
      appendAssistantTurn(turn);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = async (suggestion: AssistantSuggestion) => {
    if (loading) return;
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: suggestion.label },
    ]);
    setLoading(true);

    recordAssistantInteraction({
      type: 'CHAT_INTENT',
      intent: suggestion.id,
    });

    try {
      if (['discover_products', 'free_delivery', 'my_orders', 'popular', 'gift'].includes(suggestion.id)) {
        const turn = await runQuickAction(suggestion.id as AssistantQuickActionId, engineDeps, engineCtx);
        appendAssistantTurn(turn);
      } else {
        const turn = await runContextualSuggestion(suggestion.id, engineDeps, engineCtx, session);
        appendAssistantTurn(turn);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-gray-50/80">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn('flex', m.role === 'user' ? 'justify-start' : 'justify-end')}
          >
            <div
              className={cn(
                'max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                m.role === 'user'
                  ? 'bg-primary-50 text-gray-900 border border-primary-100'
                  : 'bg-white text-gray-800 border border-gray-100 shadow-sm',
              )}
            >
              {m.text}

              {m.compactItems && m.compactItems.length > 0 && (
                <AssistantCompactPicker
                  items={m.compactItems}
                  disabled={loading}
                  onSelect={(item) => void handleCompactSelect(item)}
                />
              )}

              {m.focusProduct && (
                <AssistantProductList products={[m.focusProduct]} />
              )}

              {m.products && m.products.length > 0 && (
                <>
                  {m.similarSectionTitle && (
                    <p className="mt-3 text-xs font-semibold text-gray-600">{m.similarSectionTitle}</p>
                  )}
                  <AssistantProductList products={m.products} />
                </>
              )}

              {m.baskets && m.baskets.length > 0 && (
                <AssistantBasketList baskets={m.baskets} disabled={loading} />
              )}

              {m.order && (
                <div className="mt-3 space-y-2">
                  <Link
                    href={`/orders/${m.order.orderId}`}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary-500 text-gray-900 text-sm font-semibold px-4 hover:bg-primary-600"
                  >
                    متابعة الطلب {formatCustomerOrderNumber(m.order.orderNumber)}
                  </Link>
                </div>
              )}
              {m.showSupport && (
                <Link
                  href="/contact"
                  className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-primary-200 bg-primary-50 text-primary-800 text-sm font-semibold px-4 hover:bg-primary-100"
                >
                  {m.supportLabel ?? '👨‍💻 تواصل مع محمد'}
                </Link>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-end">
            <div className="rounded-2xl bg-white border border-gray-100 px-3 py-2 text-sm text-gray-500 inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              جارٍ التفكير...
            </div>
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="shrink-0 px-3 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={loading}
              onClick={() => void handleSuggestion(s)}
              className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 hover:border-primary-200 hover:bg-primary-50/60 min-h-[40px] touch-manipulation"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <form
        className="shrink-0 border-t border-gray-100 bg-white p-3 safe-area-bottom"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit(input);
        }}
      >
        <div className="flex items-end gap-2">
          <label htmlFor="assistant-input" className="sr-only">
            رسالتك لمساعد نحلة مول
          </label>
          <textarea
            id="assistant-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب سؤالك..."
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm min-h-[44px] max-h-28 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="shrink-0 min-w-11 min-h-11 inline-flex items-center justify-center rounded-xl bg-primary-500 text-gray-900 hover:bg-primary-600 disabled:opacity-50"
            aria-label="إرسال"
          >
            <Send className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </form>
    </div>
  );
}
