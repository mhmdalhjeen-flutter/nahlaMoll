# Stage 6 — Load Testing & Performance Validation

## Environment

- **Backend:** NestJS dev server on `http://localhost:3001` (single Node process, Windows host)
- **Frontend:** Not in test path (API-only load against backend origin)
- **Database:** Neon PostgreSQL (`neondb`, eu-central-1) — shared project with real data (~4 products, ~13 orders)
- **Load generator:** k6 v2.2.0 on the same Windows machine as the backend
- **Target URL:** `http://localhost:3001` (`BASE_URL` in `load-tests/lib/config.js`)
- **Production data touched:** **Yes** (read-only SELECT queries via API)

## Safety

- **Write operations performed:** **No**
- **Production data modified:** **No**
- **Authenticated read testing:** **Deferred** (no disposable staging test account configured)

### Workload distribution (synthetic mixed read)

| Share | Endpoint |
|------:|---|
| 5% | `GET /health` |
| 10% | `GET /api/categories` |
| 30% | `GET /api/products?page=1&limit=12&sortBy=createdAt&sortOrder=desc` |
| 20% | `GET /api/products/discovery?limit=8` |
| 15% | `GET /api/products/search?q=…` |
| 10% | `GET /api/products/:id` |
| 10% | `GET /api/reviews/product/:id?limit=20` |

Search terms rotated: `شاحن`, `هاتف`, `خضار`, `ملابس`, `الكترونيات`.  
Product ID (setup): `cmtr7yq3s0001y0u8fe0irggs`.

---

## Smoke Test

| Endpoint | Status | Response Time |
|---|---:|---:|
| Health | 200 | 148 ms |
| Categories | 200 | 967 ms |
| Products (list) | 200 | 966 ms |
| Discovery | 200 | 231 ms |
| Search (`شاحن`) | 200 | 191 ms |
| Product detail | 200 | 239 ms |
| Reviews | 200 | 87 ms |

All endpoints returned 2xx. `X-Request-ID` present on every response.

Raw: `docs/performance/stage-6/smoke/summary.json`

---

## Load Profiles

| Test | VUs | Duration | Status |
|---|---:|---:|---|
| Smoke | 1 | 1 iter | **Pass** — 7/7 endpoints 2xx |
| Baseline | 2 | 2m | **Pass** — 0.00% errors |
| Normal | 10 | 5m | **Fail** — 98.52% errors (HTTP 429) |
| Moderate | 25 | 5m | **Not run** — stop condition after Normal |
| High | 50 | 5m | **Not run** |
| Stress | 75 / 100 | 5m | **Not run** |
| Endpoint benchmark | 1 | 30s | **Pass** — 0.00% errors (sequential chain) |

**Stop condition triggered:** error rate > 5% at Normal load (98.52%).

---

## Results

### Aggregate mixed workload

| Test | VUs | RPS | p50 | p90 | p95 | p99 | Max | Error rate |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline | 2 | 2.57 | 268 ms | 1,054 ms | 1,427 ms | 3,972 ms | 4,782 ms | 0.00% |
| Normal | 10 | 30.46 | 2.3 ms | 2.8 ms | 3.1 ms | 4.2 ms | 27 ms | **98.52%** |

Normal-load latency percentiles reflect fast **HTTP 429** rejections, not successful application responses.  
Successful-only subset at Normal (135 requests): p95 **2.4 ms** (sample too small for meaningful tail analysis).

### Per-endpoint — Baseline (2 VU, successful requests)

k6 summary JSON does not export tagged submetrics; endpoint **request counts** from check passes:

| Endpoint | Requests | Errors |
|---|---:|---:|
| Products (list) | 94 | 0 |
| Discovery | 68 | 0 |
| Search | 41 | 0 |
| Product detail | 36 | 0 |
| Reviews | 32 | 0 |
| Categories | 30 | 0 |
| Health | 13 | 0 |

Aggregate p95 for mixed baseline: **1,427 ms** (applies to all endpoints combined).

### Per-endpoint — Normal (10 VU)

| Endpoint | Requests | Error rate |
|---|---:|---:|
| Products (list) | 3,450 | 100% |
| Discovery | 2,291 | 100% |
| Search | 1,706 | 100% |
| Categories | 1,138 | 100% |
| Health | 564 | 76% (429 after limit exhausted) |
| Product detail | 0 | — (setup returned empty productId under throttle pressure) |
| Reviews | 0 | — |

### Per-endpoint — Low concurrency reference (1 VU benchmark, 30s)

Sequential 7-endpoint chain; aggregate only (no tagged p95 in export):

| Metric | Value |
|---|---:|
| RPS | 1.92 |
| p50 | 251 ms |
| p90 | 940 ms |
| p95 | 1,320 ms |
| p99 | 3,120 ms |
| Max | 4,710 ms |
| Error rate | 0.00% |

Raw: `docs/performance/stage-6/endpoint-benchmark/summary.json`

### HTTP status distribution

| Test | 2xx | 4xx (429) | 5xx |
|---|---:|---:|---:|
| Baseline | 315 (100%) | 0 | 0 |
| Normal | 135 (1.5%) | ~9,015 (98.5%) | 0 |

No 5xx observed. No `DATABASE_UNAVAILABLE` responses.

---

## Stage 5 Observability

| Feature | Status |
|---|---|
| `X-Request-ID` response header | **Present** (including on 429 responses) |
| Duration logging | **Working** |
| Slow-request warnings | **Observed** during Baseline (discovery/search tails) |
| `DATABASE_UNAVAILABLE` classification | **Not triggered** |
| `/health` | **200** |
| `/health/db` | **200** — `{"status":"ok","database":"connected"}` |
| Rate-limit headers | **Present** — `X-RateLimit-Limit: 100`, `Remaining`, `Reset` |

---

## Database Observations

- No Prisma connection failures during any test
- No pool exhaustion or `DATABASE_UNAVAILABLE` in responses or logs
- Neon handled all successful reads without error at Baseline rates
- `/health/db` confirmed connectivity after load tests
- Cannot assess query amplification at production catalog scale (4 products in DB)
- Write-path / pool saturation **not measured** (read-only scope)

---

## Bottlenecks

### 1. Global IP rate limit — **Critical at ≥10 VU**

- **Evidence:** Normal load 98.52% failures; response headers show `X-RateLimit-Limit: 100` per 60s window; config `RATE_LIMIT_MAX=100` / `RATE_LIMIT_TTL=60000` in `backend/src/app.module.ts`
- **Severity:** Critical for load-test validity above ~2 VU from a single IP
- **Next investigation:** Re-run on staging with test-IP exemption or elevated limit

### 2. Neon network latency — **Warning**

- **Evidence:** Single-request smoke: categories/products ~967 ms; discovery ~231 ms from local Windows host to eu-central-1
- **Severity:** Warning (environmental, not application bug)
- **Next investigation:** Measure from deployment region co-located with Neon

### 3. Heavy endpoint tail latency — **Warning**

- **Evidence:** Baseline p99 3,972 ms; endpoint benchmark max 4,710 ms; Stage 5 slow-request warnings on discovery/search under concurrency
- **Severity:** Warning at 2 VU (within stop rules, but above 1 s p95 diagnostic for heavy APIs)
- **Next investigation:** Per-endpoint tagged metrics on staging with rate-limit exemption

**Not observed:** application crashes, 5xx errors, database connectivity loss.

---

## Stable Areas

- All read endpoints functional (smoke 7/7 pass)
- **0% error rate** at 2 VU Baseline for full 2-minute window
- Discovery endpoint serves successfully under Baseline concurrency (Stage 3 optimizations hold at low load)
- Health/readiness probes stable throughout
- Stage 5 observability (request IDs, rate-limit headers) working under load

---

## Capacity Interpretation

At **2 concurrent virtual users** under the tested mixed read-heavy workload (5% health / 10% categories / 30% products / 20% discovery / 15% search / 10% detail / 10% reviews), the system sustained **~2.6 requests/sec** with **p95 latency of 1,427 ms** and **0% errors**.

At **10 concurrent virtual users**, the system attempted **~30 requests/sec** but **98.5% were rejected with HTTP 429** by `@nestjs/throttler` before reaching application logic. This measures **rate-limiter capacity**, not application or database saturation.

**Do not translate VUs into human user counts.** This test used one client IP, local co-located load generator, and a 4-product catalog.

---

## Recommendations

### Evidence-based

1. **Re-run Stages 6+ on isolated staging** with rate limits disabled or whitelisted for the load-generator IP — current 100 req/min/IP cap prevents Moderate/High/Stress profiles.
2. **Treat 2 VU / ~2.6 RPS mixed read** as the only clean multi-endpoint baseline obtained in this environment.
3. **Keep Stage 5 observability** — `X-Request-ID` and rate-limit headers were essential for diagnosing 429 saturation.

### Requires further measurement

1. Per-endpoint p90/p95/p99 under concurrent load (needs k6 tagged submetric export or staging exemption)
2. Discovery/search stability at 25–50 VU without rate limiting
3. Authenticated read paths (orders, favorites, cart)
4. Production deployment topology (CDN, multi-origin, `start:prod`)
5. Write-path load on disposable environment

### No action needed (based on this test)

- Stage 4B indexes — no DB errors at measured rates
- Redis/caching — not indicated at 2 VU baseline
- Application stability — no crashes observed

---

## Limitations

- No dedicated staging deployment or Neon branch
- Real Neon data (read-only, not isolated)
- Backend dev mode + k6 on same Windows host (CPU contention possible)
- Normal and above **invalidated by rate limit** — not application capacity
- k6 `handleSummary` JSON lacks per-tag `http_req_duration{name:…}` submetrics
- Store frontend and CDN not tested
- Authenticated reads deferred

---

## Artifacts

| Path | Description |
|---|---|
| `load-tests/smoke.js` | Test 0 — one pass per endpoint |
| `load-tests/profiles/baseline.js` | 2 VU / 2m |
| `load-tests/profiles/normal.js` | 10 VU / 5m |
| `load-tests/profiles/moderate.js` | 25 VU / 5m (not executed) |
| `load-tests/profiles/higher.js` | 50 VU / 5m (not executed) |
| `load-tests/profiles/stress-75.js` | 75 VU / 5m (not executed) |
| `load-tests/profiles/stress-100.js` | 100 VU / 5m (not executed) |
| `load-tests/scenarios/endpoint-benchmark.js` | 1 VU sequential chain |
| `docs/performance/stage-6/smoke/summary.json` | Smoke raw results |
| `docs/performance/stage-6/baseline/summary.json` | Baseline raw results |
| `docs/performance/stage-6/normal/summary.json` | Normal raw results |
| `docs/performance/stage-6/endpoint-benchmark/summary.json` | Endpoint benchmark raw results |

---

## Stage 6 Status

**COMPLETE** (measurement-only; higher load profiles stopped per >5% error-rate rule due to rate-limit saturation)
