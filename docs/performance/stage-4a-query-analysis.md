# Stage 4A — Database Query Analysis

## Environment

- **Database type:** PostgreSQL 16 (Neon serverless, eu-central-1)
- **Environment:** Shared Neon project (`neondb`) — used by local development via `backend/.env`; not a dedicated isolated staging clone
- **Production data involved:** **Yes** (live Neon database with real store data)
- **EXPLAIN ANALYZE allowed:** **No** — avoided on shared Neon; used **EXPLAIN (FORMAT JSON) only** (planning-only, does not execute queries)
- **Measurement caveat:** Current dataset is very small (4 products, 13 orders, 201 customer interactions). Planner favors sequential scans at this scale; findings below combine EXPLAIN plans, schema/index inventory, and query-pattern analysis. Timings are **Not measured**.

### Table sizes observed (`pg_stat_user_tables`, read-only)

| Table | Live rows |
|------:|----------:|
| CustomerInteraction | 201 |
| OrderItem | 17 |
| Order | 13 |
| Product | 4 |
| Favorite | 1 |
| Review | 0 |

---

## Queries Analyzed

| Query | Execution Time | Scan Type (EXPLAIN plan) | Main Finding |
|---|---:|---|---|
| Discovery — order popularity aggregate | Not measured | Seq Scan `OrderItem` → Hash Join `Order` + `Product` → Aggregate → Sort | Join + groupBy; `OrderItem_productId_idx` not chosen at current size |
| Discovery — favorite popularity aggregate | Not measured | Seq Scan `Favorite` → Hash Join `Product` → Aggregate → Sort | Same pattern; full favorite scan at tiny scale |
| Discovery — customer intelligence events | Not measured | **Seq Scan** `CustomerInteraction` → Sort → Limit | `(userId, createdAt)` index exists but unused while table ≈200 rows |
| Discovery — personalized candidates | Not measured | Not EXPLAIN'd separately (dynamic OR/tags) | Uses `product.findMany` with availability filters + `categoryId IN` / `tags hasSome` + sort |
| Discovery — free-delivery candidates | Not measured | Not EXPLAIN'd separately | Filters `freeDeliveryValue > 0` + availability; no index on `freeDeliveryValue` |
| Search — ILIKE candidate fetch | Not measured | **Seq Scan** `Product` + Sort | `%term%` ILIKE cannot use B-tree; expected |
| Search — popularity groupBy (per candidate set) | Not measured | Inferred: index lookups on `productId` | Scoped to ≤120 candidate IDs after text fetch |
| Product list — filtered + `createdAt DESC` | Not measured | Seq Scan `Product` + Sort | 4-row catalog; no composite index for filter+sort |
| Product list — count | Not measured | Seq Scan `Product` + Aggregate | Same filters as list query |
| Customer orders list | Not measured | Seq Scan `Order` + Sort | `customerId` filter + `createdAt DESC`; separate indexes, no composite |
| Admin orders list | Not measured | Seq Scan `Order` + Sort | Uses `Order_createdAt_idx` candidate but seq scan wins at 13 rows |
| Reviews by product | Not measured | **Bitmap Index Scan** `Review_productId_idx` + **Sort** | Index used for filter; sort on `createdAt` added (0 reviews in DB) |

Reproducible read-only script: `backend/scripts/stage-4a-explain.cjs`

---

## Existing Index Assessment

### Query → index mapping

| Query | Main WHERE | ORDER BY | JOIN/GROUP | Existing Index | Concern |
|---|---|---|---|---|---|
| Discovery popularity (orders) | `Order.status <> CANCELLED`, product availability | `SUM(qty) DESC` | `OrderItem` ⋈ `Order` ⋈ `Product`, GROUP BY `productId` | `OrderItem_productId_idx`, `Order_status_idx`, Product availability indexes | Full aggregate path; join filters not covered by single composite index |
| Discovery popularity (favorites) | product availability | `COUNT DESC` | `Favorite` ⋈ `Product`, GROUP BY `productId` | `Favorite_productId_idx`, Product indexes | Seq scan on favorites at small scale |
| Customer intelligence profile | `userId` + `createdAt >= since` (or `sessionId`) | `createdAt DESC` LIMIT 500 | — | `(userId, createdAt)`, `(sessionId, createdAt)` | **Indexes match access pattern**; planner skips them while table is tiny |
| Intelligence supplemental orders | `Order.customerId`, `status`, `createdAt >= since` | `Order.createdAt DESC` | `OrderItem` ⋈ `Order` ⋈ `Product` | `Order_customerId_idx`, `Order_createdAt_idx` (separate) | No composite `(customerId, createdAt)` — sort likely at scale |
| Personalized candidates | `isActive`, `isAvailable`, `availability`, `categoryId IN`, `tags hasSome`, `id NOT IN` | `isRecommended DESC`, `createdAt DESC` | include category | `Product_categoryId_idx`, boolean indexes | OR + array overlap; multiple single-column indexes don't compose |
| Free-delivery candidates | above + `freeDeliveryValue > 0` | — | include category | none on `freeDeliveryValue` | Filter not indexed |
| Search candidates | availability + many `ILIKE %term%` OR + `tags hasSome` + `categoryId` | `isRecommended DESC`, `createdAt DESC` | include category | none for text/array | **B-tree indexes cannot help ILIKE contains** |
| Product list | availability trinity + optional `categoryId`, `condition` | dynamic (`createdAt` default) | category + variants | `Product_categoryId_idx`, separate boolean indexes | Count + findMany duplicate filter evaluation |
| Customer orders | `customerId` | `createdAt DESC` | items + deliveryArea | `Order_customerId_idx`, `Order_createdAt_idx` | Sort after filter likely at scale |
| Admin orders | — | `createdAt DESC` | full include | `Order_createdAt_idx` | Paginated; seq scan OK now |
| Reviews by product | `productId` | `createdAt DESC` | user select | `Review_productId_idx` | **Sort step** after index filter (visible in EXPLAIN) |

---

## Search-Specific Analysis

**Current implementation (evidence from `product-search.service.ts`):**

- Prisma `contains` with `mode: "insensitive"` → PostgreSQL `ILIKE '%term%'`
- Multiple OR branches: name, nameEn, description, descriptionEn, tags (`hasSome`/`has`), category name/slug contains, categoryId IN
- Category matching partly application-side against preloaded active categories
- Ranking, personalization, and popularity scoring are **application-side** after fetching up to `SEARCH_FETCH_BUFFER` (120) candidates
- Final page uses `findManyByIds` on ranked IDs (PK lookup)

**EXPLAIN evidence:** `search_ilike_name` plan = Sequential Scan on `Product` with filter `ILIKE` — no index involvement.

**Recommendation:** **Evaluate `pg_trgm` later** (Stage 4B+ decision, not now). Conventional B-tree indexes will not improve `%term%` text search. At current catalog size (4 products), **keep current approach**. If catalog grows past low thousands, either trigram/GIN text indexes or dedicated search architecture will be needed; array tag queries may benefit separately from a **GIN index on `Product.tags`**.

---

## Recommended Indexes

| Priority | Table | Columns | Reason | Evidence |
|---|---|---|---|---|
| **Medium** | `Review` | `(productId, createdAt DESC)` | Every paginated review list filters by `productId` and sorts `createdAt DESC` | EXPLAIN shows `Review_productId_idx` + explicit **Sort** node; composite would enable index-ordered retrieval per product |
| **Medium** | `Order` | `(customerId, createdAt DESC)` | Customer order list always filters `customerId` + sorts `createdAt DESC` | EXPLAIN: seq scan + sort; separate `customerId` and `createdAt` indexes don't eliminate sort at scale |
| **Medium** | `Product` | GIN (`tags`) | Discovery personalized + search use `tags: { hasSome }` / `has` | Array operators require GIN; no array index today |
| **Medium** | `Product` | `(categoryId, createdAt DESC)` WHERE `isActive AND isAvailable AND availability <> 'UNAVAILABLE'` (partial) | Default product listing filters availability + optional category + sorts by `createdAt` | Listing runs filter + sort on every page; partial index matches public catalog shape |
| **Low** | `Product` | `(isRecommended DESC, createdAt DESC)` partial (active catalog) | Search/discovery candidate queries order by this pair | Secondary sort path; benefit depends on catalog growth |
| **Low** | `Product` | `(freeDeliveryValue)` partial WHERE `freeDeliveryValue > 0` AND active | Free-delivery discovery section | Narrow filter; low row count expected |
| **Low** | `OrderItem` | `(productId)` INCLUDE `(quantity, orderId)` | Discovery/search aggregate hot path | **Speculative** until production-scale EXPLAIN ANALYZE on staging; current row count (17) too small to justify alone |

**Not recommended now (with evidence):**

| Proposed | Why not now |
|---|---|
| Text B-tree on `Product.name` | Search uses leading-wildcard ILIKE — B-tree unusable |
| `pg_trgm` | Out of scope for 4A; evaluate when catalog/search latency measured |
| Broad composite on all Product boolean columns | Redundant with partial catalog index; high write overhead |

---

## Redundant / Possibly Redundant Indexes

Report only — **do not remove in Stage 4A.**

| Index | Notes |
|---|---|
| `Category_slug_idx` | Duplicates `Category_slug_key` (unique constraint already indexes `slug`) |
| `Order_orderNumber_idx` | Duplicates `Order_orderNumber_key` |
| `User_phoneNumber_idx`, `User_email_idx` | Duplicate `@unique` constraint indexes on same columns |
| `Favorite_userId_idx` | Likely redundant with `Favorite_userId_productId_key` (left-prefix usable for `userId`-only queries) |
| `CustomerNotificationPreferences_userId_idx` | Redundant with `@unique` on `userId` |
| `PaymentAccount_method_idx` | Possibly redundant with `(method, isActive)` composite (left-prefix) |
| Separate `Product_isActive_idx`, `Product_isAvailable_idx`, `Product_availability_idx` | Overlap; a partial catalog index may supersede at query time but these are not harmful at current scale |

Unused/redundant indexes still add write amplification on inserts/updates — track before cleanup in a later maintenance stage.

---

## CustomerInteraction

| Aspect | Finding |
|---|---|
| **Current indexes** | `(userId, createdAt)`, `(userId, type)`, `(sessionId, createdAt)`, `(productId)` |
| **Primary read** | `buildProfile`: `WHERE userId/sessionId + createdAt >= since ORDER BY createdAt DESC LIMIT 500` |
| **Index fit** | **Matches** authenticated and guest profile reads |
| **Other reads** | Event recording (inserts); no heavy admin analytics scan identified |
| **Growth** | 201 rows today; append-only event stream with 365-day lookback — unbounded long-term |
| **Classification** | **Monitor** now → **Future retention** when row count or profile-build latency rises; **Future partitioning** if table reaches millions of rows |

No immediate index changes required for `CustomerInteraction`. `(userId, type)` supports type-filtered analytics if added later; not on hot path today.

---

## No-Change Areas

These were inspected and **do not require index work at current evidence level:**

- **PK lookups** — `findManyByIds`, `findOne`, cart/favorite upserts (use PK or unique constraints)
- **Category slug lookup** — `Category_slug_key` unique index sufficient
- **Customer intelligence indexes** — schema already aligned; seq scans are size-driven, not missing-index driven
- **Favorite list by user** — `Favorite_userId_productId_key` / `userId` indexes adequate
- **Cart by user** — `CartItem_userId_idx`
- **OrderItem by order** — `OrderItem_orderId_idx` for order detail includes
- **Discovery most-ordered/most-favorited sections (post Stage 3)** — reuse precomputed popularity maps; only `findManyByIds` for final product load (PK)
- **Review summary groupBy** — scoped to small candidate sets in search/discovery

---

## Stage 4B Plan

Implement **only after review**, on a **staging branch/database**, with **EXPLAIN ANALYZE** before/after:

1. `Review(productId, createdAt DESC)` — highest confidence, narrow scope
2. `Order(customerId, createdAt DESC)` — customer order list
3. `Product` partial index for public catalog listing `(categoryId, createdAt DESC)` with active/available predicate
4. GIN index on `Product.tags` — if tag/search/discovery OR queries show sequential scans at staging scale
5. Defer: `pg_trgm`, popularity aggregate covering indexes, redundant index cleanup

---

## Stage 4A Status

**COMPLETE**
