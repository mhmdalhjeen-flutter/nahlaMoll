/**
 * Stage 4A — read-only EXPLAIN (NOT ANALYZE) for high-value queries.
 * Safe on production: EXPLAIN does not execute queries.
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function explain(label, sql, params = []) {
  const rows = await prisma.$queryRawUnsafe(
    `EXPLAIN (FORMAT JSON) ${sql}`,
    ...params,
  );
  const plan = rows[0]["QUERY PLAN"][0];
  const root = plan.Plan;
  return {
    label,
    planNodeType: root["Node Type"],
    totalCost: plan["Total Cost"],
    planRows: root["Plan Rows"],
    indexName: root["Index Name"] ?? findFirstIndex(root),
    scanDetail: summarizePlan(root),
  };
}

function findFirstIndex(node) {
  if (node["Index Name"]) return node["Index Name"];
  for (const child of node.Plans ?? []) {
    const found = findFirstIndex(child);
    if (found) return found;
  }
  return null;
}

function summarizePlan(node, depth = 0) {
  const parts = [];
  const indent = "  ".repeat(depth);
  parts.push(
    `${indent}${node["Node Type"]}${node["Index Name"] ? ` on ${node["Index Name"]}` : ""}${node["Relation Name"] ? ` (${node["Relation Name"]})` : ""} cost=${node["Total Cost"]?.toFixed?.(2) ?? node["Total Cost"]} rows=${node["Plan Rows"]}`,
  );
  for (const child of node.Plans ?? []) {
    parts.push(summarizePlan(child, depth + 1));
  }
  return parts.join("\n");
}

async function tableStats() {
  const rows = await prisma.$queryRaw`
    SELECT relname AS table_name, n_live_tup::bigint AS live_rows
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND relname IN (
        'Product', 'Order', 'OrderItem', 'Favorite', 'Review',
        'CustomerInteraction', 'Category', 'CartItem'
      )
    ORDER BY n_live_tup DESC
  `;
  return rows;
}

async function listIndexes(tables) {
  const rows = await prisma.$queryRaw`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = ANY(${tables}::text[])
    ORDER BY tablename, indexname
  `;
  return rows;
}

function jsonSafe(value) {
  return JSON.parse(
    JSON.stringify(value, (_, v) =>
      typeof v === "bigint" ? v.toString() : v,
    ),
  );
}

async function main() {
  const stats = await tableStats();
  console.log("=== TABLE STATS (pg_stat_user_tables) ===");
  console.log(JSON.stringify(jsonSafe(stats), null, 2));

  const indexes = await listIndexes([
    "Product",
    "Order",
    "OrderItem",
    "Favorite",
    "Review",
    "CustomerInteraction",
    "Category",
  ]);
  console.log("\n=== INDEXES ===");
  console.log(JSON.stringify(jsonSafe(indexes), null, 2));

  const sampleUserId = await prisma.user.findFirst({
    where: { role: "CUSTOMER" },
    select: { id: true },
  });
  const sampleProductId = await prisma.product.findFirst({
    where: { isActive: true },
    select: { id: true, categoryId: true },
  });
  const sampleCategoryId = sampleProductId?.categoryId ?? null;

  const since = new Date();
  since.setDate(since.getDate() - 365);

  const explains = [];

  if (sampleUserId) {
    explains.push(
      await explain(
        "customer_intelligence_events",
        `SELECT ci.*
         FROM "CustomerInteraction" ci
         WHERE ci."userId" = $1
           AND ci."createdAt" >= $2
         ORDER BY ci."createdAt" DESC
         LIMIT 500`,
        [sampleUserId.id, since],
      ),
    );

    explains.push(
      await explain(
        "customer_orders_list",
        `SELECT o.*
         FROM "Order" o
         WHERE o."customerId" = $1
         ORDER BY o."createdAt" DESC
         LIMIT 50`,
        [sampleUserId.id],
      ),
    );
  }

  if (sampleProductId) {
    explains.push(
      await explain(
        "reviews_by_product",
        `SELECT r.*
         FROM "Review" r
         WHERE r."productId" = $1
         ORDER BY r."createdAt" DESC
         LIMIT 20`,
        [sampleProductId.id],
      ),
    );

    explains.push(
      await explain(
        "product_list_category",
        `SELECT p.*
         FROM "Product" p
         WHERE p."isActive" = true
           AND p."isAvailable" = true
           AND p.availability <> 'UNAVAILABLE'
           AND p."categoryId" = $1
         ORDER BY p."createdAt" DESC
         LIMIT 10`,
        [sampleCategoryId],
      ),
    );

    explains.push(
      await explain(
        "product_list_count",
        `SELECT COUNT(*)::bigint
         FROM "Product" p
         WHERE p."isActive" = true
           AND p."isAvailable" = true
           AND p.availability <> 'UNAVAILABLE'`,
      ),
    );
  }

  explains.push(
    await explain(
      "discovery_order_popularity",
      `SELECT oi."productId", SUM(oi.quantity)::bigint AS qty
       FROM "OrderItem" oi
       INNER JOIN "Order" o ON o.id = oi."orderId"
       INNER JOIN "Product" p ON p.id = oi."productId"
       WHERE oi."productId" IS NOT NULL
         AND o.status <> 'CANCELLED'
         AND p."isActive" = true
         AND p."isAvailable" = true
         AND p.availability <> 'UNAVAILABLE'
       GROUP BY oi."productId"
       ORDER BY qty DESC
       LIMIT 40`,
    ),
  );

  explains.push(
    await explain(
      "discovery_favorite_popularity",
      `SELECT f."productId", COUNT(*)::bigint AS cnt
       FROM "Favorite" f
       INNER JOIN "Product" p ON p.id = f."productId"
       WHERE p."isActive" = true
         AND p."isAvailable" = true
         AND p.availability <> 'UNAVAILABLE'
       GROUP BY f."productId"
       ORDER BY cnt DESC
       LIMIT 40`,
    ),
  );

  explains.push(
    await explain(
      "search_ilike_name",
      `SELECT p.*
       FROM "Product" p
       WHERE p."isActive" = true
         AND p."isAvailable" = true
         AND p.availability <> 'UNAVAILABLE'
         AND (
           p.name ILIKE '%' || $1 || '%'
           OR p."nameEn" ILIKE '%' || $1 || '%'
           OR p.description ILIKE '%' || $1 || '%'
         )
       ORDER BY p."isRecommended" DESC, p."createdAt" DESC
       LIMIT 120`,
      ["شاحن"],
    ),
  );

  explains.push(
    await explain(
      "admin_orders_list",
      `SELECT o.*
       FROM "Order" o
       ORDER BY o."createdAt" DESC
       LIMIT 50`,
    ),
  );

  console.log("\n=== EXPLAIN (FORMAT JSON) — NOT ANALYZE ===");
  console.log(JSON.stringify(jsonSafe(explains), null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
