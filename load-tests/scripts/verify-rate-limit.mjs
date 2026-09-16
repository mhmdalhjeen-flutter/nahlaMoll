#!/usr/bin/env node
/**
 * Stage 6B — verify rate limiting behavior before load tests.
 */
const BASE = process.env.BASE_URL || "http://localhost:3001";

async function get(path) {
  const url = `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url);
  return {
    status: res.status,
    limit: res.headers.get("x-ratelimit-limit"),
    remaining: res.headers.get("x-ratelimit-remaining"),
  };
}

async function post(path, body) {
  const url = `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status };
}

async function main() {
  console.log("=== Rate limit verification ===\n");

  const normal = [];
  for (let i = 0; i < 5; i++) {
    normal.push(await get("/health"));
    await new Promise((r) => setTimeout(r, 50));
  }
  const normalOk = normal.every((r) => r.status === 200);
  console.log(
    `1. Normal traffic (5x GET /health): ${normalOk ? "PASS" : "FAIL"}`,
  );

  const sample = await get("/api/categories");
  const globalLimit = parseInt(sample.limit || "0", 10);
  console.log(
    `2. Global limit header: ${globalLimit} (${globalLimit >= 1000 ? "load-test mode likely active" : "production/default limit"})`,
  );

  const authBurst = [];
  for (let i = 0; i < 8; i++) {
    authBurst.push(
      await post("/api/auth/send-otp", { phoneNumber: "0590000099" }),
    );
  }
  const auth429 = authBurst.filter((r) => r.status === 429).length;
  const authOk = authBurst.filter((r) => r.status === 200).length;
  const authThrottleActive = auth429 > 0 && authOk > 0;
  console.log(
    `\n3. Auth OTP throttle (8x POST send-otp, limit 5/min): ${authThrottleActive ? "PASS" : "FAIL"}`,
  );
  console.log(`   200=${authOk} 429=${auth429}`);

  const db = await get("/health/db");
  console.log(
    `\n4. Database health: ${db.status === 200 ? "PASS" : "FAIL"} (${db.status})`,
  );

  const allPass = normalOk && authThrottleActive && db.status === 200;
  console.log(`\n=== Overall: ${allPass ? "PASS" : "FAIL"} ===`);
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
