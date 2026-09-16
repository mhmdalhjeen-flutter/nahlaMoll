# Stage 2 — Frontend Performance

Measured during Stage 2 execution on 2026-09-15 (local Windows environment).

## Baseline

| Metric | Before |
|---|---:|
| LCP | Not measured (store dev server not available for Lighthouse) |
| INP | Not measured |
| CLS | Not measured |
| TTFB | Not measured |
| Initial requests (homepage, code analysis) | ~7–9 API calls when authenticated (profile, delivery-areas, cart, categories, favorites, store-status, announcements, discovery, products page 1) |
| Discovery hook instances (homepage) | 2 (`HomeDiscoveryFeed` + `SmartProductFeed`) |
| Categories query subscriptions (slug page) | 6 (duplicate categories/favorites/orders in shell + actions) |
| External font requests | 3 (`preconnect` ×2 + Google Fonts CSS with 6 weights) |
| Build | Failed / hung (same Windows local-process blocker as Stage 1) |
| First Load JS | Not measured |

### Build attempt (Step 1)

- Command: `npm run build` in `store/`
- Result: Hung at startup banner (>90s), no route/First Load JS output
- Blocker: Same local environment issue as Stage 1 (not addressed in this stage per instructions)

### Runtime / browser

- Store on `:3000` returned 404 during audit window; Lighthouse/browser Core Web Vitals not captured
- Backend API on `:3001` responded 200 for health and catalog endpoints

---

## Changes

1. **Font loading (`next/font`)** — Replaced external Google Fonts `<link>` tags in `layout.tsx` with self-hosted `Tajawal` via `store/src/lib/fonts.ts`. Weights reduced from six external files (300–800) to three used weights (400, 500, 700). Removes render-blocking third-party stylesheet and two preconnect requests.
2. **Discovery hook consolidation** — `HomeDiscoveryFeed` now owns a single `useStableDiscoveryFeed` instance and passes `discoverySnapshot` to `SmartProductFeed`, which skips its internal hook when a snapshot is provided. Same data, ordering, caching, and error behavior preserved.
3. **Categories query consolidation** — `CategoriesShell` owns shared category/favorites/orders data via context; `useCategoriesPageActions` reuses context when inside the shell instead of mounting duplicate query subscriptions. Standalone pages (e.g. `/categories/all`) still use fallback fetching.

### Not changed (inspected, kept as-is)

- **Global cart/delivery queries** — `useCartMap` and `useValidatedDeliveryArea` remain on all authenticated pages; required for cart badge, free-delivery progress, and checkout correctness.
- **Image system** — `OptimizedImage`, Cloudinary transforms, and LCP `priority` on homepage logo already correct; no changes.
- **Broad RSC/SSR migration** — Not performed (out of stage scope).

---

## After

| Metric | Before | After | Change |
|---|---:|---:|---|
| LCP | Not measured | Not measured | — |
| INP | Not measured | Not measured | — |
| CLS | Not measured | Not measured | — |
| TTFB | Not measured | Not measured | — |
| Initial requests (homepage API) | ~7–9 | ~7–9 | No API contract change |
| Discovery hook instances (homepage) | 2 | 1 | −1 duplicate subscription |
| Categories query subscriptions (slug page) | 6 | 3 | −3 duplicate subscriptions |
| External font requests | 3 | 0 | −3 third-party requests |
| First Load JS | Not measured | Not measured | — |
| Build | Hung | Hung | Unchanged (environment blocker) |

---

## Tests

- Store tests: **175 passed** (33 suites)
- Typecheck: **Pass**
- Lint: **Pass** (0 errors; pre-existing warnings only)
- Static verification: Typecheck + lint pass; full monorepo `verify:static` not run (includes backend build blocked by same environment constraints)
- Build: **Blocked** (hung >90s, no output)

---

## Regression Check

| Area | Result |
|------|--------|
| Homepage | API smoke: categories, products, discovery endpoints 200 |
| Search | Not browser-tested (dev server unavailable) |
| Categories | Context consolidation; typecheck + unit tests pass |
| Product | No product page code changed |
| Cart | No cart logic changed |
| Free delivery | No free-delivery logic changed |
| Checkout | No checkout code changed |

Manual browser smoke limited by store dev server not serving on `:3000` during this session. Automated tests and API probes show no regressions.

---

## Stage 2 Status

**COMPLETE** — High-confidence frontend optimizations applied and verified by tests/typecheck/lint. Core Web Vitals and First Load JS remain **Not measured** due to local build/dev-server blockers.
