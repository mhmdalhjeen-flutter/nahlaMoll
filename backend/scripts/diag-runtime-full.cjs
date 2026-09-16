const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

function loadEnvFile() {
  const envPath = path.join(__dirname, '../.env');
  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[m[1]] = val;
  }
  return env;
}

function safeDbHost(url) {
  try {
    const u = new URL(url);
    return { host: u.hostname, database: u.pathname.replace(/^\//, ''), user: u.username };
  } catch {
    return { host: 'invalid', database: '', user: '' };
  }
}

async function main() {
  const env = loadEnvFile();
  const prisma = new PrismaClient();

  const dbTarget = safeDbHost(env.DATABASE_URL || '');

  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Announcement'
    ORDER BY ordinal_position
  `;

  const migrationRows = await prisma.$queryRaw`
    SELECT migration_name, finished_at, rolled_back_at, applied_steps_count
    FROM "_prisma_migrations"
    WHERE migration_name LIKE '%announcement%'
    ORDER BY finished_at
  `;

  const allMigrations = await prisma.$queryRaw`
    SELECT migration_name, finished_at
    FROM "_prisma_migrations"
    ORDER BY finished_at
  `;

  let findManyOk = false;
  let findManyError = null;
  try {
    await prisma.announcement.findMany({ take: 1 });
    findManyOk = true;
  } catch (e) {
    findManyError = e.message;
  }

  const announcements = await prisma.announcement.findMany({
    select: { id: true, title: true, image: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(
    JSON.stringify(
      {
        backendEnvFile: path.join(__dirname, '../.env'),
        databaseConnection: dbTarget,
        cloudinaryEnv: {
          STORAGE_PROVIDER: env.STORAGE_PROVIDER || null,
          CLOUDINARY_URL_set: Boolean(env.CLOUDINARY_URL?.trim()),
          CLOUDINARY_URL_cloud_from_url: env.CLOUDINARY_URL
            ? (env.CLOUDINARY_URL.match(/@([^/?]+)/) || [])[1] || null
            : null,
          CLOUDINARY_CLOUD_NAME_set: Boolean(env.CLOUDINARY_CLOUD_NAME?.trim()),
          CLOUDINARY_CLOUD_NAME: env.CLOUDINARY_CLOUD_NAME || null,
          CLOUDINARY_API_KEY_set: Boolean(env.CLOUDINARY_API_KEY?.trim()),
          CLOUDINARY_API_SECRET_set: Boolean(env.CLOUDINARY_API_SECRET?.trim()),
          CLOUDINARY_FOLDER: env.CLOUDINARY_FOLDER || null,
        },
        announcementColumns: columns,
        hasImageColumn: columns.some((c) => c.column_name === 'image'),
        imageColumnNullable:
          columns.find((c) => c.column_name === 'image')?.is_nullable === 'YES',
        announcementMigrationRecords: migrationRows,
        allAppliedMigrations: allMigrations.map((m) => m.migration_name),
        prismaFindManyOk: findManyOk,
        prismaFindManyError: findManyError,
        existingAnnouncements: announcements,
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
