/**
 * Read-only audit for free-delivery migration readiness.
 * Does NOT modify any records. Safe to run against staging/production before migrate deploy.
 *
 * Usage: node scripts/audit-free-delivery-migration.cjs
 */
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('=== Free Delivery Migration Read-Only Audit ===');
    console.log('scannedAt:', new Date().toISOString());
    console.log('');

    const settings = await prisma.$queryRaw`
      SELECT
        id,
        "freeDeliveryTarget",
        "partialFreeDeliveryEnabled",
        "createdAt"
      FROM "Settings"
      ORDER BY "createdAt" ASC
    `;
    console.log('--- Settings rows ---');
    console.table(settings);

    const distinctTargets = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT "freeDeliveryTarget") AS distinct_target_count
      FROM "Settings"
    `;
    console.log('distinct freeDeliveryTarget count:', distinctTargets[0]?.distinct_target_count);

    const productSummary = await prisma.$queryRaw`
      SELECT
        MIN("freeDeliveryValue") AS min_value,
        MAX("freeDeliveryValue") AS max_value,
        COUNT(*) FILTER (WHERE "freeDeliveryValue" > 0) AS positive_product_count,
        COUNT(*) FILTER (WHERE "freeDeliveryValue" < 0) AS negative_product_count,
        COUNT(*) FILTER (WHERE "freeDeliveryValue" = 0) AS zero_product_count
      FROM "Product"
    `;
    console.log('');
    console.log('--- Product freeDeliveryValue summary ---');
    console.table(productSummary);

    const valueDistribution = await prisma.$queryRaw`
      SELECT
        "freeDeliveryValue",
        COUNT(*) AS product_count
      FROM "Product"
      WHERE "freeDeliveryValue" > 0
      GROUP BY "freeDeliveryValue"
      ORDER BY "freeDeliveryValue"
      LIMIT 50
    `;
    console.log('');
    console.log('--- Top positive freeDeliveryValue distribution (max 50) ---');
    console.table(valueDistribution);

    const suspicious = await prisma.$queryRaw`
      SELECT id, name, "freeDeliveryValue"
      FROM "Product"
      WHERE "freeDeliveryValue" > 100
      ORDER BY "freeDeliveryValue" DESC
      LIMIT 20
    `;
    if (suspicious.length > 0) {
      console.log('');
      console.log('--- Products with freeDeliveryValue > 100 (review before migrate) ---');
      console.table(suspicious);
    }

    const canonicalTarget = settings[0]?.freeDeliveryTarget ?? null;
    const positiveCount = Number(productSummary[0]?.positive_product_count ?? 0);
    const negativeCount = Number(productSummary[0]?.negative_product_count ?? 0);
    const distinctCount = Number(distinctTargets[0]?.distinct_target_count ?? 0);

    console.log('');
    console.log('--- Migration readiness hints (informational only) ---');
    if (settings.length === 0) {
      console.log('BLOCK: no Settings row');
    } else if (distinctCount > 1) {
      console.log('BLOCK: conflicting Settings.freeDeliveryTarget values');
    } else if (negativeCount > 0) {
      console.log('BLOCK: negative product freeDeliveryValue values present');
    } else if (Number(canonicalTarget) === 100 && positiveCount > 0) {
      console.log('BLOCK (ambiguous): target=100 with positive product values — manual review required');
    } else if (Number(canonicalTarget) === 100 && positiveCount === 0) {
      console.log('LIKELY OK: target=100, no positive product contributions (settings-only migration)');
    } else {
      console.log('LIKELY OK: legacy target', String(canonicalTarget), '— product conversion expected');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
