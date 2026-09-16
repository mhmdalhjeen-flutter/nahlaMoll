# Stage 5 — Resilience & Observability

## Objective

Improve operability and safe failure handling without changing business behavior, API contracts, caching, or database schema.

## Implemented

- **Request ID** — `X-Request-ID` middleware assigns or reuses a valid UUID; returned on every response.
- **Request duration** — middleware logs method, route, status, duration, and request ID on response finish.
- **Slow request logging** — configurable via `SLOW_REQUEST_MS` (default 1000ms); slow requests log at `warn`, normal at `log`.
- **Health** — `/health` remains process liveness only (no DB query).
- **Database health** — `/health/db` probes with `SELECT 1`; returns `503` + `{ status: "unhealthy", database: "unavailable" }` on failure without exposing internals.
- **Readiness** — new `/health/ready`; returns `200` when DB is reachable, `503` when not.
- **Database failure handling** — global exception filter classifies Prisma connectivity errors as `DATABASE_UNAVAILABLE` (503) with safe client message; logs request ID + classification server-side.
- **HTTP timeout** — not implemented (backend has no outbound Axios/HTTP client usage).

## Configuration

| Variable | Default | Purpose |
|---|---:|---|
| `SLOW_REQUEST_MS` | `1000` | Warning threshold for slow request logs |

## Security / Privacy

- Request logs exclude bodies, Authorization headers, tokens, OTP, and credentials.
- Database/health failures do not expose `DATABASE_URL`, hostnames, stack traces to clients, or Prisma internals in API responses.
- Invalid or oversized client request IDs are ignored; server generates a UUID instead.

## Tests

| Area | File |
|---|---|
| Request ID utility | `common/utils/request-id.util.spec.ts` |
| Request duration / slow logging | `common/middleware/request-context.middleware.spec.ts` |
| Database error classification | `common/utils/database-error.util.spec.ts` |
| Exception filter + request ID | `common/filters/http-exception.filter.spec.ts` |
| Health / readiness | `modules/health/health.service.spec.ts`, `health.controller.spec.ts` |

Backend baseline after Stage 5: run `npm run test` in `backend/`.

## Files Changed

- `backend/src/config/observability.config.ts` (new)
- `backend/src/common/utils/request-id.util.ts` (new)
- `backend/src/common/utils/database-error.util.ts` (new)
- `backend/src/common/middleware/request-context.middleware.ts` (new)
- `backend/src/common/types/express.d.ts` (new)
- `backend/src/common/filters/http-exception.filter.ts`
- `backend/src/modules/health/health.service.ts`
- `backend/src/modules/health/health.controller.ts`
- `backend/src/app.module.ts`
- `backend/src/main.ts`
- `backend/.env.example`
- Test files listed above

## Database Changes

**None** — 0 schema changes, 0 migrations, 0 indexes, 0 data modifications.

## Known Limitations

- No distributed tracing or external APM integration.
- No automatic database query retries (by design — especially for writes).
- No HTTP client timeout added — backend does not use Axios/fetch for outbound API calls today.
- `/health/db` and `/health/ready` bypass the global response transform interceptor to return direct diagnostic JSON on failure.
- Store frontend tests unchanged (no frontend modifications required).

## Stage 5 Status

**COMPLETE**
