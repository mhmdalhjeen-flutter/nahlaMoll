const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const orders = await prisma.order.findMany({
      select: { orderNumber: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    const allNumeric = await prisma.$queryRaw`
      SELECT MAX(CAST("orderNumber" AS BIGINT)) AS max_num
      FROM "Order"
      WHERE "orderNumber" ~ '^[0-9]+$'
    `;
    const count = await prisma.order.count();
    console.log(JSON.stringify({ count, recent: orders.map((o) => o.orderNumber), maxNumeric: allNumeric[0]?.max_num ?? null }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
