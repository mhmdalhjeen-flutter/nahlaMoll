# Stage 6B — Rate Limit & Load-Test Readiness

## Environment

| Item | Value |
|---|---|
| API URL | `http://localhost:3001` |
| OS | Windows 10 |
| NestJS mode | `NODE_ENV=development` (`nest start --watch`) |
| Database | Neon PostgreSQL `neondb` (eu-central-1, read-only load tests) |
| k6 version | v2.2.0 |
| Load-test mode | `LOAD_TEST_MODE=true`, `LOAD_TEST_RATE_LIMIT_MAX=5000` (local `.env` only) |

---

## Original Problem

Stage 6 load tests from a **single k6 host/IP** became **429-dominated above ~2 VU**:

| Stage 6 test | VUs | RPS | Error rate | Notes |
|---|---:|---:|---:|---|
| Baseline | 2 | 2.57 | 0.00% | Under per-route limit |
| Normal | 10 | 30.46 | **98.52%** | Almost all HTTP 429 |

### Root cause (inspected, not assumed)

- **`@nestjs/throttler` v5.1.1** with global `ThrottlerGuard` (`APP_GUARD`)
- Default policy: **`RATE_LIMIT_MAX=100` requests per `RATE_LIMIT_TTL=60000` ms**
- Limit applies **per client IP per route** (not one global bucket)
- Tracker: **`req.ip`** via default `getTracker()` — no `trust proxy` configured
- k6 sends all traffic from **one IP** (`127.0.0.1` / `::1`)
- At 10 VU mixed workload, hot routes (e.g. `/api/products`) exceed **100 req/min** quickly
- Auth routes have **separate stricter limits** via `@Throttle()` on `AuthController`:
  - `POST /api/auth/send-otp`: 5/min
  - `POST /api/auth/verify-otp`: 10/min
- **No** `SkipThrottle` on health or catalog routes
- **No** existing throttler unit tests before this stage
- **Option A rejected:** k6 `X-Forwarded-For` spoofing would require trusting client headers — unsafe without a real reverse proxy stripping them

429-dominated Stage 6 latency (~3 ms p95) is **not** application latency and must not be compared to successful-response metrics.

---

## Current Rate Limit (production default)

| Scope | Limit | TTL | Mechanism |
|---|---:|---:|---|
| Global read/write API routes | 100 req | 60 s | `ThrottlerModule` + `ThrottlerGuard` |
| `POST /api/auth/send-otp` | 5 req | 60 s | `@Throttle()` override |
| `POST /api/auth/verify-otp` | 10 req | 60 s | `@Throttle()` override |
| Tracker key | Client IP (`req.ip`) | — | No proxy trust configured |

Production `.env.example` unchanged at `RATE_LIMIT_MAX=100`.

---

## Changes Made

| File | Change |
|---|---|
| `backend/src/config/rate-limit.config.ts` | **New** — resolves TTL/max; `LOAD_TEST_MODE` raises limit only outside production |
| `backend/src/config/rate-limit.config.spec.ts` | **New** — unit tests for config resolution |
| `backend/src/app.module.ts` | Uses `resolveRateLimitMax()` / `resolveRateLimitTtl()` |
| `backend/src/config/env.validation.ts` | Blocks `LOAD_TEST_MODE` in production; caps `RATE_LIMIT_MAX` ≤ 200 in production |
| `backend/.env.example` | Documents `LOAD_TEST_MODE` / `LOAD_TEST_RATE_LIMIT_MAX` (commented) |
| `load-tests/scripts/verify-rate-limit.mjs` | **New** — pre-flight rate-limit verification |
| `load-tests/README.md` | Stage 6B instructions |

**Not changed:** auth `@Throttle()` limits, OTP settings, database, business logic, k6 workload scripts, proxy trust.

### Load-test mode behavior

When `LOAD_TEST_MODE=true` and `NODE_ENV !== production`:

- Global per-route limit → `LOAD_TEST_RATE_LIMIT_MAX` (default **5000**/60s)
- Throttling **remains active** (not disabled)
- Auth OTP limits **unchanged**
- Production startup **rejects** `LOAD_TEST_MODE=true`

Local `backend/.env` was set for this validation run only. **Do not deploy `LOAD_TEST_MODE` to production.**

---

## Security

| Control | Status |
|---|---|
| Global throttling enabled | Yes — always |
| Production limit | 100 req/min/route (default) |
| Production load-test bypass | **Blocked** at startup |
| Production max cap | `RATE_LIMIT_MAX` > 200 → startup error |
| Auth OTP throttling | Unchanged (5/10 per min) |
| Client IP header spoofing | Not enabled |
| Secret-header bypass | Not added |

---

## Validation

### Rate-limit verification script

```
node load-tests/scripts/verify-rate-limit.mjs
```

| Check | Result |
|---|---|
| Normal traffic (5× GET /health) | **PASS** |
| Global limit header | **5000** (load-test mode active) |
| Auth OTP throttle (8× send-otp) | **PASS** — 200=1, 429=3 |
| `/health/db` | **PASS** — connected |

### Load tests (read-only, with `LOAD_TEST_MODE=true`)

| Test | VUs | Duration | Result |
|---|---:|---:|---|
| Smoke | 1 | 1 iter | **PASS** — 7/7 endpoints 2xx |
| Baseline | 2 | 2m | **PASS** |
| Normal | 10 | 5m | **PASS** |
| Moderate | 25 | 5m | **PASS** |

---

## Results (Stage 6B vs Stage 6)

| Test | VUs | RPS | p95 | p99 | Error rate | 429 | 5xx |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Stage 6** Baseline | 2 | 2.57 | 1,427 ms | 3,972 ms | 0.00% | 0 | 0 |
| **Stage 6** Normal | 10 | 30.46 | 3 ms* | 4 ms* | **98.52%** | ~9,015 | 0 |
| **Stage 6B** Baseline | 2 | 2.49 | 1,696 ms | 3,842 ms | 0.33% | 0 | 0 |
| **Stage 6B** Normal | 10 | 15.74 | 1,071 ms | 2,770 ms | **0.00%** | 0 | 0 |
| **Stage 6B** Moderate | 25 | 28.64 | 2,148 ms | 6,734 ms | **0.18%** | 0 | 0 |

\*Stage 6 Normal p95/p99 reflect HTTP 429 rejections, not application response time.

Stage 6B failures at baseline/moderate (0.33% / 0.18%) were **request timeouts**, not 429 or 5xx. No rate-limit saturation observed at ≤25 VU.

### Status distribution (Stage 6B Normal, 10 VU)

- **2xx:** 4,735 (100%)
- **429:** 0
- **5xx:** 0

---

## Database

| Check | Result |
|---|---|
| Database healthy after tests | **Yes** — `/health/db` 200 |
| Connection failures | **None** |
| Pool exhaustion | **None observed** |
| Data modified | **No** — read-only workload |

---

## Tests Run

| Suite | Result |
|---|---|
| Backend unit tests | **215 passed** (includes 4 new rate-limit config tests) |
| TypeScript | **Pass** |
| ESLint | **Pass** (pre-existing warnings only, unrelated) |

---

## Decision

**READY_FOR_STAGE_7**

The Stage 6 measurement barrier (single-IP 100 req/min/route throttling) is removed **safely for local load testing** via explicit `LOAD_TEST_MODE`. Production security defaults remain intact. Stage 7 may proceed with higher VU profiles (50+) on the same local setup, or preferably on isolated staging with load-test mode enabled there only.

---

## Artifacts

```
docs/performance/stage-6b/smoke/summary.json
docs/performance/stage-6b/baseline/summary.json
docs/performance/stage-6b/normal/summary.json
docs/performance/stage-6b/moderate/summary.json
load-tests/scripts/verify-rate-limit.mjs
```
