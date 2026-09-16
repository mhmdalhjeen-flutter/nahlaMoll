# Nahla Mall — Load Tests (Stage 6 / 6B)

Read-only k6 workload against the backend API. **Do not run write scenarios against Neon production data.**

## Stage 6B — load-test rate-limit mode

The global throttler applies **per client IP per route** (default 100 req/min). Single-host k6 exceeds this above ~2 VU.

For local measurement only, enable in `backend/.env` (never in production):

```env
LOAD_TEST_MODE=true
LOAD_TEST_RATE_LIMIT_MAX=5000
```

Restart the backend, then verify:

```bash
node load-tests/scripts/verify-rate-limit.mjs
```

Auth OTP routes keep their own `@Throttle()` limits (5/min send-otp, 10/min verify-otp).

## Prerequisites

- [k6](https://k6.io/) installed locally
- Backend running (default `http://localhost:3001`)
- `BASE_URL` pointing at the target origin (not the Next.js store)

## Configuration

| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | `http://localhost:3001` | Backend origin |
| `API_PREFIX` | `api` | Global API prefix |
| `PRODUCT_ID` | _(discovered)_ | Optional fallback product ID |

## Workload mix

Approximate read distribution per iteration:

- 5% `GET /health`
- 10% `GET /api/categories`
- 30% `GET /api/products?page=1&limit=12`
- 20% `GET /api/products/discovery?limit=8`
- 15% `GET /api/products/search?q=…`
- 10% `GET /api/products/:id`
- 10% `GET /api/reviews/product/:id`

## Running

Warm up before each profile (excluded from profile measurement window):

```bash
k6 run load-tests/warmup.js
k6 run load-tests/profiles/baseline.js
```

Profiles: `baseline.js`, `normal.js`, `moderate.js`, `higher.js`, `stress.js`

Export summary JSON:

```bash
k6 run --summary-export=load-tests/results/baseline-summary.json load-tests/profiles/baseline.js
```

## Safety

- **No POST/PUT/PATCH/DELETE** in these scripts
- Authenticated flows deferred unless a disposable staging account exists
- Neon shared database: read-only tests only
