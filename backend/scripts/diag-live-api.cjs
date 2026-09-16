const fs = require('fs');
const path = require('path');
const http = require('http');

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
  const login = await request('POST', '/api/auth/admin/login', {
    body: { email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
  });
  if (login.status !== 200) {
    console.log('LOGIN_FAIL', login.status, JSON.stringify(login.body));
    process.exit(1);
  }
  const token = login.body.data.accessToken;

  const list = await request('GET', '/api/admin/announcements', { token });
  console.log('GET /api/admin/announcements', list.status);
  if (list.status !== 200) {
    console.log(JSON.stringify(list.body, null, 2));
    process.exit(1);
  }
  console.log('announcement_count', (list.body.data || []).length);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
