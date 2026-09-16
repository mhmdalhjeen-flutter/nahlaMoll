/**
 * Safe diagnostic: admin login + one product-image upload.
 * Does NOT modify any product/category records.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const BASE = 'http://localhost:3001';

function loadEnv() {
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

function uploadMultipart(token, fileBuffer, filename) {
  const boundary = `----diag${Date.now()}`;
  const parts = [
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`,
    'Content-Type: image/jpeg\r\n\r\n',
    fileBuffer,
    `\r\n--${boundary}--\r\n`,
  ];
  const body = Buffer.concat(
    parts.map((p) => (Buffer.isBuffer(p) ? p : Buffer.from(p, 'utf8'))),
  );

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/api/admin/upload/product-image',
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

// Minimal valid 1x1 JPEG
const MINI_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Af//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Af//Z',
  'base64',
);

async function main() {
  const env = loadEnv();

  console.log('=== Backend env (safe) ===');
  console.log('STORAGE_PROVIDER:', env.STORAGE_PROVIDER || '(default: local)');
  console.log('CLOUDINARY_URL configured:', Boolean(env.CLOUDINARY_URL?.trim()));
  console.log('CLOUDINARY_FOLDER:', env.CLOUDINARY_FOLDER || '(default: jaka)');

  const email = env.SEED_ADMIN_EMAIL;
  const password = env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD required in backend/.env');
  }

  const login = await requestJson('POST', '/api/auth/admin/login', {
    body: { email, password },
  });
  if (login.status !== 200 || !login.body?.data?.accessToken) {
    console.error('Login failed:', login.status, login.body);
    process.exit(1);
  }
  console.log('Admin login: OK');

  const token = login.body.data.accessToken;
  const upload = await uploadMultipart(token, MINI_JPEG, 'diag-test.jpg');

  console.log('\n=== Upload response ===');
  console.log('HTTP status:', upload.status);

  const data = upload.body?.data ?? upload.body;
  const url = data?.url;
  const key = data?.key;

  if (url) console.log('Returned URL:', url);
  if (key) console.log('Returned key (public_id):', key);

  const isCloudinary = typeof url === 'string' && url.includes('res.cloudinary.com');
  const isLocal = typeof url === 'string' && url.includes('/uploads/');

  console.log('\n=== Verdict ===');
  if (isCloudinary) {
    console.log('PASS: New upload uses Cloudinary');
  } else if (isLocal) {
    console.log('FAIL: New upload still uses local storage');
  } else {
    console.log('FAIL: Upload did not return expected URL');
    console.log(JSON.stringify(upload.body, null, 2));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
