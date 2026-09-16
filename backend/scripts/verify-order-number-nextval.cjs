const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw`
        SELECT nextval('"Order_number_seq"') AS nextval
      `;
      return String(rows[0].nextval);
    });
    console.log(JSON.stringify({ ok: true, nextOrderNumber: result }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
