# Nahla Mall — PWA Implementation

## 1. PWA Architecture

The customer storefront (`store/`) is a **Next.js 14 App Router** client-heavy application. PWA support was added without changing backend APIs, business logic, or UI design.

| Layer | Implementation |
|---|---|
| Manifest | `store/src/app/manifest.ts` → served at `/manifest.webmanifest` |
| Service worker | `store/src/sw.ts` → built to `public/sw.js` via `@serwist/next` |
| Registration | `store/src/components/pwa/PwaProvider.tsx` (production only) |
| Offline UX | `/offline` page + `NetworkStatusBanner` |
| Install UX | `InstallPrompt` (`beforeinstallprompt`, dismissible) |
| Icons | Generated from `store/assets/images/logBeeIcon.png` → `public/icons/` |

**Dependencies added:** `@serwist/next`, `serwist` (single PWA stack; no overlapping libraries).

**Not changed:** backend, database, cart/checkout/order/payment/auth logic, free-delivery rules, TanStack Query defaults, Zustand stores.

---

## 2. Manifest

**File:** `store/src/app/manifest.ts`

| Field | Value |
|---|---|
| `name` / `short_name` | `نحلة مول` |
| `description` | From `BRAND.description` |
| `lang` | `ar` |
| `dir` | `rtl` |
| `start_url` | `/` |
| `scope` | `/` |
| `display` | `standalone` |
| `theme_color` | `#002040` (navy) |
| `background_color` | `#F0F0F0` |

**Validation (production server, local):**

- `GET /manifest.webmanifest` → **200**
- `display=standalone`, **3 icons** referenced

Root layout also exports `viewport.themeColor` and Apple web-app metadata.

---

## 3. Icons

**Source:** `store/assets/images/logBeeIcon.png` (2230×1920, existing brand asset — no redesign).

**Generator:** `store/scripts/generate-pwa-icons.py` (PIL; run manually if logo changes).

| File | Size | Purpose |
|---|---:|---|
| `public/icons/icon-192.png` | 192×192 | PWA any |
| `public/icons/icon-512.png` | 512×512 | PWA any / splash |
| `public/icons/icon-maskable-512.png` | 512×512 | Maskable (safe-zone padding) |
| `public/icons/apple-touch-icon.png` | 180×180 | iOS home screen |

Favicon/metadata in `layout.tsx` point to these public icons.

**Note:** The bundled `logBeeIcon.png` import remains for in-app UI (`BrandLockup`). Serwist does **not** precache the 6.2 MB bundled PNG (exceeds default precache size limit).

---

## 4. Service Worker

**Source:** `store/src/sw.ts`  
**Built output:** `public/sw.js` (~38 KB, generated at `npm run build`)  
**Build integration:** `store/next.config.js` wraps config with `@serwist/next`

| Setting | Value |
|---|---|
| Disabled in development | Yes |
| Scope | `/` |
| `skipWaiting` / `clientsClaim` | Yes |
| `cacheOnNavigation` | **false** (no Next.js link prefetch caching) |
| Precache | Next static assets + `/offline` + `public/icons/**` only |

Registration runs once on mount in production via `PwaProvider`.

---

## 5. Caching Strategy

Conservative, commerce-safe rules in `src/sw.ts`:

| Request type | Strategy | Notes |
|---|---|---|
| Backend API host (`NEXT_PUBLIC_API_URL`) | **NetworkOnly** | Cart, auth, orders, payment, OTP, delivery, etc. |
| Same-origin `/_next/static/*`, JS, CSS | **CacheFirst** | Hashed build assets |
| Fonts | **CacheFirst** | Tajawal / static fonts |
| Same-origin images (`public/icons`, etc.) | **StaleWhileRevalidate** | Static branding only |
| Document navigations | **NetworkFirst** (5s timeout) | Falls back to `/offline` |
| Cross-origin product/CDN images | **Not explicitly cached** | Pass-through to network |

**Never cached as authoritative:**

- Authentication / OTP
- Cart mutations
- Orders / checkout / payment
- Delivery / free-delivery calculations
- Customer account data

The backend remains the source of truth.

---

## 6. Offline Behavior

| Scenario | Behavior |
|---|---|
| No network, cached shell available | Previously visited public pages may render from cache |
| No network, no cache | `/offline` page: **«لا يوجد اتصال بالإنترنت حاليًا»** + retry |
| Any offline state | `NetworkStatusBanner` at top with retry |
| Catalog refresh | Requires network (TanStack Query has no offline persistence) |
| Cart / checkout / orders | Existing app error handling; **no fake success** |

No offline order queue, no fake products, no background sync for commerce.

---

## 7. Authentication Behavior

**Unchanged:**

- JWT in `localStorage` (`accessToken`, `refreshToken`)
- Zustand `store-auth` partial persist
- `AuthProvider` profile validation on load
- OTP / auth API calls are **NetworkOnly** in the service worker

PWA install does not alter login/logout or token storage.

---

## 8. Cart Behavior

**Unchanged:**

- Zustand + TanStack Query cart architecture
- Server-authoritative cart mutations via existing API client
- Offline cart updates follow normal axios failure paths (no silent success)

No second PWA cart or service-worker cart cache.

---

## 9. Checkout / Order / Payment Behavior

**Unchanged and online-only:**

- Checkout, payment proof upload, order creation remain backend-authoritative
- Service worker does not cache mutation responses
- Users see existing error/toast behavior when requests fail offline

---

## 10. Free-Delivery Behavior

**Unchanged:**

- Free-delivery progress, eligibility, and floating indicator logic remain in existing React/backend code
- Service worker caches static UI assets only
- No free-delivery rules duplicated in the service worker

---

## 11. Browser Compatibility

| Platform | Expected behavior |
|---|---|
| Chrome / Edge (desktop & Android) | Install prompt when `beforeinstallprompt` fires; SW + manifest |
| Safari iOS | Add to Home Screen via Share menu; `appleWebApp` + `apple-touch-icon` configured |
| Safari macOS | Limited PWA features vs Chromium |
| Firefox | Manifest + SW; install UX varies |

Features degrade gracefully; no fake install button when the browser does not support installation.

---

## 12. Installation Testing

**Validated locally (production build + `next start`):**

| Check | Result |
|---|---|
| Manifest served | ✅ 200 |
| Service worker served | ✅ 200 (`/sw.js`) |
| Icons served | ✅ `/icons/*` |
| Install prompt component | ✅ Renders only on `beforeinstallprompt` |
| Offline page | ✅ `/offline` prerendered |

**Manual tests recommended before production:**

1. Chrome DevTools → Application → Manifest / Service Workers
2. Lighthouse PWA category (requires HTTPS in real deployment; localhost OK for local)
3. Android Chrome → Install app
4. iOS Safari → Add to Home Screen → verify standalone + RTL

---

## 13. Security Considerations

- Service worker does **not** read or store tokens
- Service worker does **not** modify `Authorization` headers
- API host requests use **NetworkOnly**
- OTP / payment / order responses are not cached
- Backend authorization remains authoritative

---

## 14. Build & Test Results

| Check | Result |
|---|---|
| Store tests | **175 passed** |
| Store TypeScript | **Pass** |
| Store lint | **Pass** (pre-existing hook warnings only) |
| Production build | **SUCCESS** — 28 static routes, First Load JS shared **88.5 kB** |
| Backend | **No changes** |

**Build notes:**

- Serwist bundles `sw.js` during `next build`
- `public/sw.js` is gitignored (generated artifact)
- `@serwist/next/react` `SerwistProvider` was **not** used (React 18 incompatibility with React compiler runtime); manual registration used instead

**Lighthouse:** Not completed in this environment (CLI install blocked by local npm cache permissions). Run manually against HTTPS staging/production.

---

## 15. Known Limitations

1. **HTTPS required** for installability in production (localhost exempt for dev testing).
2. **iOS** has no `beforeinstallprompt`; users add via Safari Share sheet.
3. **Catalog data is not offline-first** — only static shells/assets may cache.
4. **Cloudflare Pages** deployment should serve `/sw.js` from site root; verify after `pages:build`.
5. **Large in-app logo import** (6.2 MB) is intentionally excluded from precache.
6. **Service worker disabled in `next dev`** — test PWA with production build + `next start`.

---

## Files Changed / Added

| Path | Purpose |
|---|---|
| `store/src/app/manifest.ts` | Web app manifest |
| `store/src/sw.ts` | Service worker source |
| `store/src/app/offline/page.tsx` | Offline fallback page |
| `store/src/components/pwa/PwaProvider.tsx` | SW registration |
| `store/src/components/pwa/NetworkStatusBanner.tsx` | Offline banner |
| `store/src/components/pwa/InstallPrompt.tsx` | Install prompt |
| `store/src/hooks/useNetworkStatus.ts` | Online/offline hook |
| `store/src/app/layout.tsx` | PWA metadata + viewport |
| `store/src/components/providers/AppProviders.tsx` | Wire PWA components |
| `store/next.config.js` | Serwist build integration |
| `store/tsconfig.json` | Exclude `src/sw.ts` from app tsc |
| `store/scripts/generate-pwa-icons.py` | Icon generator |
| `store/public/icons/*` | PWA icon PNGs |
| `store/package.json` | `@serwist/next`, `serwist` |
| `.gitignore` | Ignore generated `sw.js` |
| `docs/pwa/pwa-implementation.md` | This document |
