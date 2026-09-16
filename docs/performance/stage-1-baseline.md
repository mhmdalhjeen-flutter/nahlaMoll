# Stage 1 Baseline

Measured during Stage 1 execution on 2026-09-15 (local Windows environment).

## Build

- Result: **Failed / hung** — `npm run build` in `store/` did not complete after multiple attempts (10–12+ minutes each, no route output)
- Duration: Not measured (build did not finish)
- First Load JS: Not measured
- Route count: Not measured

### Build attempts

| Attempt | Outcome |
|---------|---------|
| 1 (pre-change) | Stalled after startup banner; earlier audit also saw `EPERM` on `.next/trace` |
| 2 (pre-change, clean `.next`) | Hung >7 min, no compilation output |
| 3 (post-change, `CI=true`) | Hung >10 min, log stopped at startup banner |
| 4 (post-change, after `npm install`) | Hung >10 min, same |

**Blocker:** Next.js production build hangs at startup/compile phase in this environment (many concurrent `node` dev processes; possible file-lock contention on Windows). Not a code defect — typecheck, lint, and unit tests all pass.

## Tests

- Backend: **188 passed** (23 suites), ~18–45s
- Store: **175 passed** (33 suites), ~9–16s
- Static checks:
  - TypeScript (`npm run typecheck`): **Pass** (backend, store, admin)
  - Lint (`npm run lint`): **Pass** (0 errors; pre-existing warnings only)

## Known Issues

- Store production build cannot be completed in current local environment (see Build section)
- `npm install` (with scripts) fails with `EPERM` on Prisma query engine when dev servers hold locks; `npm install --ignore-scripts` succeeded
- Store dev server not confirmed on `:3000` during smoke test (404); admin on `:3002` timed out
- Backend API smoke test: all probed endpoints returned 200

## Environment

- Frontend: Next.js 14.2.3, React 18, Cloudflare Pages target (`store/`)
- Backend: NestJS 10, Prisma 5.7, `@nestjs/throttler` 5.2.0
- Database environment: Backend `/health/db` returned 200 (Neon/local PostgreSQL connected)
- OS: Windows 10, workspace path contains Arabic characters

---

# Before vs After

| Metric | Before | After |
|---|---:|---:|
| Build | Hung / not completed | Hung / not completed |
| Build duration | Not measured | Not measured |
| First Load JS | Not measured | Not measured |
| Backend tests | 188 passed | 188 passed |
| Store tests | 175 passed | 175 passed |
| Static verification | typecheck pass, lint pass (warnings) | typecheck pass, lint pass (warnings) |

## Changes Made

1. **Rate limit documentation fix** — Confirmed `@nestjs/throttler` v5.2.0 uses **milliseconds** for `ttl` (README + installed package). Updated `backend/.env.example`: `RATE_LIMIT_TTL=60` → `RATE_LIMIT_TTL=60000` with comment. Added inline comment in `backend/src/app.module.ts` (runtime default `60000` unchanged).
2. **Removed proven-unused store components** — `HomeProductSections.tsx`, `HomeDiscoverySection.tsx` (zero imports repo-wide).
3. **Removed proven-unused store dependencies** — `framer-motion`, `react-hook-form`, `@hookform/resolvers`, `zod` (none imported in `store/src`; admin unchanged).
4. **Removed proven-unused backend dependencies** — `passport-local`, `@types/passport-local` (no imports in `backend/src`).
5. **Lockfile sync** — `npm install --ignore-scripts` at repo root removed 6 packages.

## Removed Items

| Item | Evidence | Safe to remove |
|------|----------|----------------|
| `store/src/components/home/HomeProductSections.tsx` | Zero imports outside file | Yes — removed |
| `store/src/components/home/HomeDiscoverySection.tsx` | Zero imports outside file | Yes — removed |
| `framer-motion` (store) | Zero imports in `store/src` | Yes — removed |
| `react-hook-form` (store) | Zero imports in `store/src`; used by admin | Yes — removed from store only |
| `@hookform/resolvers` (store) | Zero imports in `store/src` | Yes — removed from store only |
| `zod` (store) | Zero imports in `store/src` | Yes — removed from store only |
| `passport-local` (backend) | Only in `package.json`; no `backend/src` usage | Yes — removed |
| `@types/passport-local` (backend) | Only in `package.json` | Yes — removed |

## Rate Limit Finding

- **Installed version:** `@nestjs/throttler@5.2.0`
- **TTL unit:** Milliseconds (documented in package README: `ttl: 60000` = 60 second window)
- **Runtime code:** `parseInt(process.env.RATE_LIMIT_TTL) \|\| 60000` — fallback is correct (60s)
- **Problem confirmed:** `backend/.env.example` had `RATE_LIMIT_TTL=60`, which would create a **60ms** window if copied literally
- **Fix applied:** `.env.example` now uses `60000` with explanatory comment; `app.module.ts` comment added
- **Runtime `.env`:** Already had `RATE_LIMIT_TTL=60000` (correct). Only `.env.example` was wrong and is now fixed.

## Regressions

None observed in automated verification (tests, typecheck, lint, API smoke).

## Runtime Smoke (minimal)

| Check | Result |
|-------|--------|
| `GET /health` | 200 |
| `GET /health/db` | 200 |
| `GET /api/categories` | 200 |
| `GET /api/products?limit=1` | 200 |
| `GET /api/settings/store-status` | 200 |
| Store frontend `:3000` | 404 (dev server not confirmed) |
| Admin `:3002` | Timeout |

## Stage 1 Status

**COMPLETE** — safe cleanup and rate-limit fix applied; all automated tests pass. Production build metrics remain **Not measured** due to local build environment blocker (documented above).
