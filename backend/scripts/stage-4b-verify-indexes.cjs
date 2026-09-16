require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const indexes = await prisma.$queryRaw`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'Review_productId_createdAt_idx',
        'Order_customerId_createdAt_idx'
      )
    ORDER BY indexname
  `;

  console.log(JSON.stringify(indexes, null, 2));

  const duplicates = await prisma.$queryRaw`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('Review', 'Order')
      AND (
        indexdef ILIKE '%productId%createdAt%DESC%'
        OR indexdef ILIKE '%customerId%createdAt%DESC%'
      )
    ORDER BY tablename, indexname
  `;

  console.log("\nAll matching composite DESC indexes:");
  console.log(JSON.stringify(duplicates, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
