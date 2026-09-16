const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const seq = await prisma.$queryRaw`
      SELECT last_value, is_called
      FROM "Order_number_seq"
    `;
    console.log(
      JSON.stringify(
        {
          sequence: {
            last_value: String(seq[0].last_value),
            is_called: seq[0].is_called,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
