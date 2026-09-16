const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const needle = process.argv[2] || '6ca1a6f0-8ddb-4c8a-95c3-22f95481c060';

  const products = await prisma.product.findMany({
    select: { id: true, name: true, images: true, updatedAt: true, createdAt: true },
  });

  const hits = products.filter((row) =>
    (row.images || []).some((url) => url.includes(needle)),
  );

  console.log(JSON.stringify({ needle, matchCount: hits.length, hits }, null, 2));

  const cloudinaryCount = products.filter((row) =>
    (row.images || []).some((url) => url.includes('res.cloudinary.com')),
  ).length;

  const localCount = products.filter((row) =>
    (row.images || []).some((url) => url.includes('/uploads/')),
  ).length;

  console.log(
    JSON.stringify(
      {
        summary: {
          totalProducts: products.length,
          withCloudinaryImages: cloudinaryCount,
          withLocalUploadImages: localCount,
        },
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
