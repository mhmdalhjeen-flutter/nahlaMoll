'use client';

import { HOME_COPY, HOME_HOW_IT_WORKS } from '@/lib/branding';

/** Compact platform explanation — does not duplicate floating free-delivery progress UI. */
export function HomeHowItWorks() {
  return (
    <section
      className="container mx-auto px-4 py-2 max-w-6xl"
      aria-labelledby="home-how-it-works-title"
    >
      <div className="rounded-xl border border-gray-100 bg-white/90 px-3 py-3 sm:px-4 sm:py-4">
        <h2
          id="home-how-it-works-title"
          className="text-sm sm:text-base font-bold text-navy-900 mb-2.5 sm:mb-3 text-center"
        >
          {HOME_COPY.howItWorksTitle}
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {HOME_HOW_IT_WORKS.map((item) => (
            <div
              key={item.step}
              className="rounded-lg border border-gray-100 bg-slate-50/80 px-2.5 py-2 sm:px-3 sm:py-2.5 text-center"
            >
              <span className="block text-base sm:text-lg leading-none text-primary-600 mb-1" aria-hidden>
                {item.step}
              </span>
              <p className="text-[11px] sm:text-xs font-semibold text-navy-900 leading-snug">
                {item.title}
              </p>
              <p className="text-[10px] sm:text-[11px] text-gray-600 leading-snug mt-0.5 line-clamp-2">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
