/**
 * Verify POST /api/orders succeeds after Order_number_seq migration.
 * Requires backend on http://localhost:3001
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const BASE = 'http://localhost:3001';

function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)="?(.*?)"?\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

function request(method, urlPath, { body, token } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlPath.startsWith('http') ? urlPath : BASE + urlPath);
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname + u.search,
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let parsed;
          try {
            parsed = raw ? JSON.parse(raw) : {};
          } catch {
            parsed = { raw };
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function extractOtp(logPath, phone) {
  const sources = [];
  if (fs.existsSync(logPath)) sources.push(fs.readFileSync(logPath, 'utf8'));
  const logsDir = path.join(__dirname, '../logs');
  if (fs.existsSync(logsDir)) {
    for (const name of fs.readdirSync(logsDir)) {
      if (name.endsWith('.log')) {
        sources.push(fs.readFileSync(path.join(logsDir, name), 'utf8'));
      }
    }
  }

  for (const content of sources) {
    const devMatches = [...content.matchAll(new RegExp(`\\[DEV OTP\\]\\s*${phone}:\\s*(\\d{4,6})`, 'g'))];
    if (devMatches.length) return devMatches[devMatches.length - 1][1];
  }
  return null;
}

function uniqueTestPhone() {
  return `059${String(Date.now()).slice(-7)}`;
}

async function sendOtpAndGetCode(phone, logPath) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const sendOtp = await request('POST', '/api/auth/send-otp', { body: { phoneNumber: phone } });
    if (sendOtp.status === 409) {
      await new Promise((r) => setTimeout(r, 61000));
      continue;
    }
    if (sendOtp.status !== 200) return { sendOtp, otp: null };
    let otp =
      sendOtp.body?.data?.devOtp ||
      sendOtp.body?.devOtp ||
      null;
    if (!otp) {
      await new Promise((r) => setTimeout(r, 500));
      otp = extractOtp(logPath, phone);
    }
    return { sendOtp, otp };
  }
  return { sendOtp: { status: 409 }, otp: null };
}

async function main() {
  const phone = uniqueTestPhone();
  const logPath = path.join(__dirname, '../logs/combined.log');

  const areas = await request('GET', '/api/delivery/areas');
  if (areas.status !== 200 || !areas.body?.data?.length) {
    throw new Error(`delivery areas failed: ${areas.status}`);
  }
  const deliveryAreaId = areas.body.data[0].id;

  const products = await request('GET', '/api/products?limit=1');
  const productId =
    products.body?.data?.products?.[0]?.id ||
    products.body?.data?.items?.[0]?.id ||
    products.body?.data?.[0]?.id;
  if (!productId) throw new Error('no product available for cart');

  const { sendOtp, otp } = await sendOtpAndGetCode(phone, logPath);
  if (sendOtp.status !== 200 || !otp) {
    throw new Error(`send-otp failed: ${sendOtp.status}, otp=${otp}`);
  }

  const verify = await request('POST', '/api/auth/verify-otp', {
    body: { phoneNumber: phone, code: otp },
  });
  if (verify.status !== 200) {
    throw new Error(`verify failed: ${verify.status} ${JSON.stringify(verify.body)}`);
  }
  const token = verify.body?.data?.accessToken || verify.body?.accessToken;
  if (!token) throw new Error('missing access token after verify');

  await request('DELETE', '/api/cart', { token });
  const add = await request('POST', '/api/cart/items', {
    token,
    body: { productId, quantity: 1 },
  });
  if (add.status !== 201 && add.status !== 200) {
    throw new Error(`add cart failed: ${add.status} ${JSON.stringify(add.body)}`);
  }

  const order = await request('POST', '/api/orders', {
    token,
    body: {
      deliveryAreaId,
      deliveryAddress: 'اختبار رقم الطلب — شارع التحقق',
      notes: 'order-number-seq verification',
    },
  });

  const orderNumber = order.body?.data?.orderNumber;
  console.log(
    JSON.stringify(
      {
        status: order.status,
        orderNumber,
        orderId: order.body?.data?.id,
        message: order.body?.message,
        error: order.body?.error,
      },
      null,
      2,
    ),
  );

  if (order.status !== 201 && order.status !== 200) {
    process.exit(1);
  }
  if (!/^[0-9]+$/.test(String(orderNumber || ''))) {
    console.error('Expected numeric customer-facing orderNumber');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
