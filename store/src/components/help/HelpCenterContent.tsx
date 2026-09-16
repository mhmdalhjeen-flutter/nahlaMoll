'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowRight, MessageCircle } from 'lucide-react';
import { storeApi } from '@/lib/store-api';
import { filterFaqItems } from '@/lib/help-faq-search';
import { resolveFaqAnswer } from '@/lib/help-faq';
import { FaqAccordionGroup, FaqAccordionItem } from '@/components/help/FaqAccordion';
import { Button } from '@/components/ui/Button';
import { useShellUi } from '@/components/layout/ShellUiContext';
import { cn } from '@/lib/utils';

export function HelpCenterContent() {
  const router = useRouter();
  const { setChatbotOpen } = useShellUi();
  const [query, setQuery] = useState('');

  const { data: paymentConfig } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: storeApi.getPaymentSettings,
    staleTime: 5 * 60 * 1000,
  });

  const ctx = useMemo(() => ({ paymentConfig }), [paymentConfig]);

  const { results, hasQuery } = useMemo(
    () => filterFaqItems(query, ctx),
    [query, ctx],
  );

  const noResults = hasQuery && results.length === 0;

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/settings');
  };

  return (
    <div className="container mx-auto px-4 py-5 pb-24 max-w-2xl">
      <header className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={handleBack}
          className={cn(
            'shrink-0 min-w-11 min-h-11 inline-flex items-center justify-center rounded-xl',
            'text-primary-700 hover:bg-primary-50 transition-colors touch-manipulation',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          )}
          aria-label="رجوع"
        >
          <ArrowRight className="w-5 h-5" aria-hidden />
        </button>
        <h1 className="text-xl font-bold text-gray-900">كيف بنقدر نساعدك؟</h1>
      </header>

      <div className="relative mb-6">
        <Search
          className="absolute right-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-primary-400 pointer-events-none"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن سؤالك"
          aria-label="ابحث عن سؤالك"
          className={cn(
            'w-full min-h-[48px] rounded-xl border border-gray-200 bg-white shadow-sm',
            'pr-10 pl-4 text-sm text-gray-900 placeholder:text-gray-400',
            'transition-all duration-200',
            'hover:border-primary-200',
            'focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500',
          )}
        />
      </div>

      {noResults ? (
        <div className="text-center py-10 space-y-2 mb-8">
          <p className="text-3xl" aria-hidden>
            🔍
          </p>
          <p className="font-semibold text-gray-900">ما لقينا جواب لسؤالك</p>
          <p className="text-sm text-gray-500">جرب كلمات ثانية</p>
        </div>
      ) : (
        <div className="space-y-6 mb-8">
          {results.map(({ category, items }) => (
            <FaqAccordionGroup key={category.id} title={category.title} emoji={category.emoji}>
              {items.map((item) => (
                <FaqAccordionItem
                  key={item.id}
                  question={item.question}
                  answer={resolveFaqAnswer(item, ctx)}
                />
              ))}
            </FaqAccordionGroup>
          ))}
        </div>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white p-5 text-center space-y-3">
        <h2 className="text-base font-bold text-gray-900">ما لقيت اللي بدك إياه؟</h2>
        <Button
          type="button"
          className="w-full min-h-[48px] bg-primary-600 hover:bg-primary-700 text-white border-0"
          onClick={() => setChatbotOpen(true)}
        >
          <MessageCircle className="w-4 h-4 ml-2" aria-hidden />
          💬 اسأل نحلة مول
        </Button>
      </section>
    </div>
  );
}
