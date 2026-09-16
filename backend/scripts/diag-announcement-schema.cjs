const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Announcement'
    ORDER BY ordinal_position
  `;

  const migrations = await prisma.$queryRaw`
    SELECT migration_name, finished_at, applied_steps_count
    FROM "_prisma_migrations"
    ORDER BY finished_at
  `;

  const count = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count FROM "Announcement"
  `;

  let findManyOk = false;
  let findManyError = null;
  try {
    await prisma.announcement.findMany({ take: 1 });
    findManyOk = true;
  } catch (e) {
    findManyError = e.message;
  }

  console.log(
    JSON.stringify(
      {
        announcementColumns: columns,
        hasImageColumn: columns.some((c) => c.column_name === 'image'),
        announcementCount: count[0]?.count ?? 0,
        prismaFindManyOk: findManyOk,
        prismaFindManyError: findManyError,
        appliedMigrations: migrations.map((m) => m.migration_name),
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
