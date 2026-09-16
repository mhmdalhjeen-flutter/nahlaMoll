/**
 * Verify announcement CRUD after image column migration.
 * Does not delete existing announcements.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { PrismaClient } = require('@prisma/client');

const BASE = 'http://localhost:3001';

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync(path.join(__dirname, '../.env'), 'utf8').split('\n')) {
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

function request(method, urlPath, { body, token } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlPath, BASE);
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(
      { hostname: u.hostname, port: u.port, path: u.pathname, method, headers },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : {} });
          } catch {
            resolve({ status: res.statusCode, body: { raw } });
          }
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const env = loadEnv();
  const prisma = new PrismaClient();

  const before = await prisma.announcement.findMany({
    select: { id: true, title: true, image: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log('Existing announcements (unchanged ids):', JSON.stringify(before, null, 2));

  const login = await request('POST', '/api/auth/admin/login', {
    body: { email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
  });
  if (login.status !== 200) throw new Error(`Login failed: ${login.status}`);
  const token = login.body.data.accessToken;

  const list = await request('GET', '/api/admin/announcements', { token });
  console.log('\nGET /api/admin/announcements:', list.status);
  if (list.status !== 200) {
    console.log(JSON.stringify(list.body, null, 2));
    throw new Error('List failed');
  }

  const withoutImage = await request('POST', '/api/admin/announcements', {
    token,
    body: {
      title: 'diag-no-image',
      content: 'Test announcement without image',
      isActive: false,
      priority: 0,
      startDate: new Date().toISOString(),
    },
  });
  console.log('\nPOST announcement without image:', withoutImage.status);
  const noImgId = withoutImage.body?.data?.id;
  console.log('Created id:', noImgId, 'image:', withoutImage.body?.data?.image ?? null);

  const cloudUrl =
    'https://res.cloudinary.com/iwzft7vz/image/upload/v1788127280/jaka/products/diag-placeholder.jpg';
  const withImage = await request('POST', '/api/admin/announcements', {
    token,
    body: {
      title: 'diag-with-image',
      content: 'Test announcement with Cloudinary URL',
      image: cloudUrl,
      isActive: false,
      priority: 0,
      startDate: new Date().toISOString(),
    },
  });
  console.log('\nPOST announcement with image URL:', withImage.status);
  const imgId = withImage.body?.data?.id;
  console.log('Created id:', imgId, 'image:', withImage.body?.data?.image ?? null);

  const after = await prisma.announcement.findMany({
    select: { id: true, title: true, image: true },
    orderBy: { createdAt: 'asc' },
  });

  const originalStillThere = before.every((row) =>
    after.some((a) => a.id === row.id && a.title === row.title),
  );

  console.log('\nOriginal announcements preserved:', originalStillThere);
  console.log('Total before:', before.length, 'after:', after.length);

  // Cleanup only diag test rows we created
  for (const id of [noImgId, imgId].filter(Boolean)) {
    await prisma.announcement.delete({ where: { id } });
  }
  console.log('Removed temporary diag announcements only.');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err.message || err);
  process.exit(1);
});
