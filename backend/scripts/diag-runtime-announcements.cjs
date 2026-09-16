const fs = require('fs');
const path = require('path');
const http = require('http');
const { PrismaClient } = require('@prisma/client');

const BASE = 'http://localhost:3001';
const MINI_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Af//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Af//Z',
  'base64',
);

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

function requestJson(method, urlPath, { body, token } = {}) {
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

function uploadFile(token, endpoint, fileBuffer, filename) {
  const boundary = `----diag${Date.now()}`;
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: image/jpeg\r\n\r\n`),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3001,
        path: endpoint,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
      },
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
    req.write(body);
    req.end();
  });
}

async function main() {
  const env = loadEnv();
  const prisma = new PrismaClient();
  const before = await prisma.announcement.count();

  const login = await requestJson('POST', '/api/auth/admin/login', {
    body: { email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
  });
  const token = login.body.data.accessToken;

  const noImg = await requestJson('POST', '/api/admin/announcements', {
    token,
    body: {
      title: 'runtime-diag-no-image',
      content: 'test',
      isActive: false,
      priority: 0,
      startDate: new Date().toISOString(),
    },
  });
  console.log('create_without_image', noImg.status, noImg.body?.data?.image ?? null);

  const upload = await uploadFile(
    token,
    '/api/admin/upload/announcement-image',
    MINI_JPEG,
    'diag-announcement.jpg',
  );
  const uploadUrl = upload.body?.data?.url;
  const cloudFromUrl = uploadUrl ? (uploadUrl.match(/res\.cloudinary\.com\/([^/]+)/) || [])[1] : null;
  console.log('upload_announcement_image', upload.status);
  console.log('upload_url_host', uploadUrl ? new URL(uploadUrl).hostname : null);
  console.log('upload_cloud_name', cloudFromUrl);
  if (upload.status !== 201) console.log(JSON.stringify(upload.body, null, 2));

  let withImgStatus = null;
  let withImgRecord = null;
  if (uploadUrl) {
    const withImg = await requestJson('POST', '/api/admin/announcements', {
      token,
      body: {
        title: 'runtime-diag-with-image',
        content: 'test with cloudinary url',
        image: uploadUrl,
        isActive: false,
        priority: 0,
        startDate: new Date().toISOString(),
      },
    });
    withImgStatus = withImg.status;
    withImgRecord = withImg.body?.data;
    console.log('create_with_image', withImgStatus, withImgRecord?.image ?? null);
  }

  const after = await prisma.announcement.count();
  console.log('announcement_count_before', before, 'after', after);

  for (const id of [noImg.body?.data?.id, withImgRecord?.id].filter(Boolean)) {
    await prisma.announcement.delete({ where: { id } });
  }
  console.log('cleaned_temp_rows_only', true);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
