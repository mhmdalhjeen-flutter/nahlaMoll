const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const areas = await prisma.deliveryArea.findMany({
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        deliveryFee: true,
        eligibleForFreeDelivery: true,
        areaType: true,
        parentId: true,
        region: true,
        isActive: true,
      },
    });
    console.log(JSON.stringify({ count: areas.length, areas }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
