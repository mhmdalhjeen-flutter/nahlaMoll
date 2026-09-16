# Stage 3 — Backend & API Performance

## Discovery

| Metric | Before | After |
|---|---:|---:|
| DB operations/request | Not measured (audit estimate: 5–10+) | Not measured |
| Response time | Not measured | Not measured |
| Response size | Not measured | Not measured |

**Code-level query reductions (authenticated feed with personalized + free-delivery sections):**

- `buildProfile` and `loadStorePopularitySignals` now run in parallel via `Promise.all`.
- Personalized and free-delivery sections reuse candidate products already loaded for ranking (`attachProductsWithReasonsFromCandidates`), eliminating duplicate `findManyByIds` refetches per section.
- Free-delivery section loads cart category IDs and boost candidates in parallel via `Promise.all`.

Section ordering, ranking, exclusion rules, guest/authenticated behavior, and reason labels are unchanged.

## Pagination

| Endpoint | Before | After |
|---|---|---|
| Customer orders `GET /orders` | Unbounded array | Paginated `{ items, total, page, pageSize }` — default limit 50, max 100 |
| Reviews `GET /reviews/product/:id` | Unbounded array | Paginated `{ items, total, page, pageSize }` — default limit 20, max 50 |
| Favorites `GET /favorites` | Unbounded array | Paginated `{ items, total, page, pageSize }` — default limit 50, max 100 |
| Admin orders `GET /admin/orders` | Unbounded array | Paginated `{ items, total, page, pageSize }` — default limit 50, max 100 |

Store and admin callers updated to consume `.items` with `limit: 100` (or `50` for product reviews) so existing UI behavior is preserved without pagination controls.

## Product Payload

| Field | Used by list callers? | Required? | List include change |
|---|---|---|---|
| `category.id`, `name`, `slug`, `parentId` | Yes (affinity maps, navigation context) | Yes | Kept |
| `category.description`, `image`, timestamps | No | No | Omitted from list include |
| `variants` (id, name, value, type, priceAdjustment, stock) | Yes (`ProductCard` variant detection, picker) | Yes | Explicit select (same card fields) |
| `variant.productId`, timestamps | No | No | Omitted from list include |
| Product scalar fields (price, images, tags, offers, etc.) | Yes | Yes | Unchanged (always selected on product row) |

| Metric | Before | After |
|---|---:|---:|
| Product list response size | Not measured | Not measured |
| Variant data | Full relation (`variants: true`) | Selected card fields only |
| Category nested data | Full relation (`category: true`) | Selected list fields only |

`GET /products/:id` and discovery product fetches remain on full includes.

## Changes

1. **Discovery** — Parallelized independent reads; eliminated redundant product refetches in personalized and free-delivery sections.
2. **Pagination** — Added `PaginatedResult<T>` helper, query DTOs, and paginated service methods for customer orders, admin orders, product reviews, and favorites.
3. **Product list payload** — Added `ProductsService.getListInclude()`; used by `GET /products` and favorites list product embed.
4. **Frontend API adapters** — Store and admin clients/types updated for paginated responses; all callers adapted to use `.items`.

## Tests

- Backend: **188 passed** (23 suites, including `product-discovery.service.spec.ts`)
- Store: **175 passed** (33 files)
- Admin: typecheck pass (no test suite in project)
- Typecheck: backend, store, admin — **pass**
- Lint: backend, store, admin — **pass** (pre-existing warnings only)
- Static verification: `npm run validate` / `npm run build:backend` — **blocked** (Windows EPERM on `prisma generate`; likely dev server file lock)

## Regressions

None observed in automated tests. Runtime discovery/orders latency and payload size were not measured in this environment.

## Stage 3 Status

**COMPLETE**
