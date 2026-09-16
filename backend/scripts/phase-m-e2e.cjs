/**
 * Phase M — Local E2E API verification against Neon PostgreSQL.
 * Run while backend is up on http://localhost:3001
 * Usage: node backend/scripts/phase-m-e2e.cjs [path-to-backend-terminal-log]
 */
const fs = require("fs");
const path = require("path");
const http = require("http");

const BASE = "http://localhost:3001";
const results = [];
let failed = 0;

function loadEnv() {
  const envPath = path.join(__dirname, "../.env");
  const content = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const m = line.match(/^([A-Z_]+)="?(.*?)"?\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

function request(method, urlPath, { body, token } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlPath.startsWith("http") ? urlPath : BASE + urlPath);
    const data = body ? JSON.stringify(body) : null;
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (data) headers["Content-Length"] = Buffer.byteLength(data);

    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname + u.search,
        method,
        headers,
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
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
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

function assert(name, cond, detail = "") {
  const ok = !!cond;
  results.push({ name, ok, detail });
  if (!ok) {
    failed++;
    console.error(`FAIL: ${name}${detail ? " — " + detail : ""}`);
  } else {
    console.log(`PASS: ${name}`);
  }
  return ok;
}

function extractOtpFromLog(logPath, phone) {
  const sources = [];
  if (logPath && fs.existsSync(logPath)) sources.push(fs.readFileSync(logPath, "utf8"));
  const combinedLog = path.join(__dirname, "../logs/combined.log");
  if (fs.existsSync(combinedLog)) sources.push(fs.readFileSync(combinedLog, "utf8"));

  for (const content of sources) {
    const lines = content.split("\n").reverse();
    for (const line of lines) {
      const stripped = line.replace(/\x1b\[[0-9;]*m/g, "");
      const m = stripped.match(new RegExp(`\\[DEV OTP\\] ${phone}: (\\d{6})`));
      if (m) return m[1];
    }
  }
  return null;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function uniqueTestPhone() {
  const suffix = String(Date.now()).slice(-7);
  return `059${suffix}`;
}

async function sendOtpAndGetCode(phone, logPath) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const sendOtp = await request("POST", "/api/auth/send-otp", {
      body: { phoneNumber: phone },
    });
    if (sendOtp.status === 409) {
      await sleep(61000);
      continue;
    }
    if (sendOtp.status !== 200) {
      return { sendOtp, otp: null };
    }
    let otp = sendOtp.body?.data?.devOtp;
    if (!otp) {
      await sleep(500);
      otp = extractOtpFromLog(logPath, phone);
    }
    return { sendOtp, otp };
  }
  return { sendOtp: { status: 409 }, otp: null };
}

async function main() {
  const env = loadEnv();
  const logPath = process.argv[2];
  const adminEmail = env.SEED_ADMIN_EMAIL;
  const adminPassword = env.SEED_ADMIN_PASSWORD;
  const testPhone = uniqueTestPhone();

  console.log("=== Phase M E2E (API) ===\n");

  // --- Infrastructure ---
  const health = await request("GET", "/health");
  assert("GET /health", health.status === 200 && health.body?.data?.status === "ok");

  const healthDb = await request("GET", "/health/db");
  assert(
    "GET /health/db",
    healthDb.status === 200 && healthDb.body?.data?.database === "connected",
  );

  // --- Public store APIs ---
  const storeStatus = await request("GET", "/api/settings/store-status");
  assert("GET /api/settings/store-status", storeStatus.status === 200);

  const categories = await request("GET", "/api/categories");
  assert("GET /api/categories", categories.status === 200 && Array.isArray(categories.body?.data));
  const categoryId = categories.body.data[0]?.id;

  const areas = await request("GET", "/api/delivery/areas");
  assert("GET /api/delivery/areas", areas.status === 200 && areas.body.data.length > 0);
  const deliveryAreaId = areas.body.data[0].id;

  const announcements = await request("GET", "/api/announcements");
  assert("GET /api/announcements", announcements.status === 200);

  const products = await request("GET", "/api/products?page=1&limit=10");
  assert("GET /api/products", products.status === 200);

  const offers = await request("GET", "/api/products/offers");
  assert("GET /api/products/offers", offers.status === 200);

  const recommended = await request("GET", "/api/products/recommended");
  assert("GET /api/products/recommended", recommended.status === 200);

  // --- Auth: unauthenticated protected ---
  const cartAnon = await request("GET", "/api/cart");
  assert("GET /api/cart unauthenticated → 401", cartAnon.status === 401);

  const adminAnon = await request("GET", "/api/admin/settings");
  assert("GET /api/admin/settings unauthenticated → 401", adminAnon.status === 401);

  // --- Admin login ---
  const adminLogin = await request("POST", "/api/auth/admin/login", {
    body: { email: adminEmail, password: adminPassword },
  });
  assert("POST /api/auth/admin/login", adminLogin.status === 200);
  const adminAccess = adminLogin.body?.data?.accessToken;
  const adminRefresh = adminLogin.body?.data?.refreshToken;
  assert("Admin access token received", !!adminAccess);
  assert("Admin refresh token received", !!adminRefresh);

  const adminRefreshRes = await request("POST", "/api/auth/refresh", {
    body: { refreshToken: adminRefresh },
  });
  assert("POST /api/auth/refresh (admin)", adminRefreshRes.status === 200);
  const adminAccess2 = adminRefreshRes.body?.data?.accessToken;

  const adminSettings = await request("GET", "/api/admin/settings", {
    token: adminAccess2 || adminAccess,
  });
  assert("GET /api/admin/settings (admin)", adminSettings.status === 200);

  const analytics = await request("GET", "/api/admin/analytics/overview", {
    token: adminAccess,
  });
  assert("GET /api/admin/analytics/overview", analytics.status === 200);

  // Customer cannot access admin
  // (will test after customer login)

  // --- Admin: create test products ---
  if (!categoryId) {
    assert("Category exists for product creation", false, "no categories");
  } else {
    const limitedProduct = await request("POST", "/api/admin/products", {
      token: adminAccess,
      body: {
        name: "منتج اختبار Phase M محدود",
        description: "منتج للاختبار المحلي",
        categoryId,
        price: 25,
        freeDeliveryValue: 50,
        availability: "LIMITED",
        stock: 3,
        isAvailable: true,
        isRecommended: true,
        hasOffer: true,
        offerType: "PERCENTAGE",
        offerValue: 10,
        images: [],
        tags: ["phase-m"],
      },
    });
    assert("POST /api/admin/products (LIMITED)", limitedProduct.status === 201 || limitedProduct.status === 200);
    const limitedProductId = limitedProduct.body?.data?.id;

    const unlimitedProduct = await request("POST", "/api/admin/products", {
      token: adminAccess,
      body: {
        name: "منتج اختبار Phase M غير محدود",
        description: "منتج غير محدود للاختبار",
        categoryId,
        price: 15,
        freeDeliveryValue: 45,
        availability: "UNLIMITED",
        isAvailable: true,
        images: [],
      },
    });
    assert("POST /api/admin/products (UNLIMITED)", unlimitedProduct.status === 201 || unlimitedProduct.status === 200);
    const unlimitedProductId = unlimitedProduct.body?.data?.id;

    // Variant product
    const variantProduct = await request("POST", "/api/admin/products", {
      token: adminAccess,
      body: {
        name: "منتج بمتغير Phase M",
        description: "اختبار المتغيرات",
        categoryId,
        price: 20,
        availability: "LIMITED",
        stock: 10,
        isAvailable: true,
        variants: [
          { name: "أحمر", value: "red", type: "color", priceAdjustment: 5, stock: 5 },
          { name: "أزرق", value: "blue", type: "color", priceAdjustment: 0, stock: 5 },
        ],
      },
    });
    assert("POST /api/admin/products (with variant)", variantProduct.status === 201 || variantProduct.status === 200);
    const variantProductId = variantProduct.body?.data?.id;
    const variantId = variantProduct.body?.data?.variants?.[0]?.id;

    // Public catalog reflects new products
    await sleep(500);
    const productsAfter = await request("GET", "/api/products?page=1&limit=20");
    const foundLimited = productsAfter.body?.data?.products?.some((p) => p.id === limitedProductId);
    assert("Store catalog shows admin-created product", foundLimited);

    const productDetail = await request("GET", `/api/products/${limitedProductId}`);
    assert("GET /api/products/:id", productDetail.status === 200);

    const search = await request("GET", "/api/products/search?q=Phase");
    assert("GET /api/products/search", search.status === 200);

    // --- Customer OTP auth ---
    const { sendOtp, otp: initialOtp } = await sendOtpAndGetCode(testPhone, logPath);
    assert("POST /api/auth/send-otp", sendOtp.status === 200);

    let otp = initialOtp;
    assert("OTP available for verification (devOtp or log)", !!otp);

    if (otp) {
      const verifyOtp = await request("POST", "/api/auth/verify-otp", {
        body: { phoneNumber: testPhone, code: otp },
      });
      assert("POST /api/auth/verify-otp", verifyOtp.status === 200);
      const customerAccess = verifyOtp.body?.data?.accessToken;
      const customerRefresh = verifyOtp.body?.data?.refreshToken;
      assert("Customer access token", !!customerAccess);

      const custRefresh = await request("POST", "/api/auth/refresh", {
        body: { refreshToken: customerRefresh },
      });
      assert("POST /api/auth/refresh (customer)", custRefresh.status === 200);

      const profile = await request("GET", "/api/users/profile", { token: customerAccess });
      assert("GET /api/users/profile", profile.status === 200);

      // Customer cannot access admin
      const custAdmin = await request("GET", "/api/admin/settings", { token: customerAccess });
      assert("Customer → admin endpoint → 403", custAdmin.status === 403);

      // Favorites
      const addFav = await request("POST", `/api/favorites/${limitedProductId}`, {
        token: customerAccess,
      });
      assert("POST /api/favorites/:productId", addFav.status === 201 || addFav.status === 200);

      const favs = await request("GET", "/api/favorites", { token: customerAccess });
      assert("GET /api/favorites", favs.status === 200);

      // Cart flow
      const addCart = await request("POST", "/api/cart/items", {
        token: customerAccess,
        body: { productId: limitedProductId, quantity: 2 },
      });
      assert(
        "POST /api/cart/items",
        addCart.status === 201 || addCart.status === 200,
        `status ${addCart.status} ${JSON.stringify(addCart.body?.message || addCart.body)}`,
      );

      if (variantId) {
        await request("POST", "/api/cart/items", {
          token: customerAccess,
          body: { productId: variantProductId, quantity: 1, variantId },
        });
      }

      const cart = await request("GET", `/api/cart?deliveryAreaId=${deliveryAreaId}`, {
        token: customerAccess,
      });
      assert("GET /api/cart with delivery area", cart.status === 200);
      const cartItemId = cart.body?.data?.items?.[0]?.id;
      const subtotal = cart.body?.data?.summary?.subtotal;
      assert("Cart subtotal calculated server-side", typeof subtotal === "number" && subtotal > 0);

      if (cartItemId) {
        const updateQty = await request("PUT", `/api/cart/items/${cartItemId}`, {
          token: customerAccess,
          body: { quantity: 1 },
        });
        assert("PUT /api/cart/items/:id", updateQty.status === 200);
      }

      // Stock overflow
      const overStock = await request("POST", "/api/cart/items", {
        token: customerAccess,
        body: { productId: limitedProductId, quantity: 999 },
      });
      assert(
        "Over-stock add rejected",
        overStock.status === 400 || overStock.status === 409 || overStock.status === 422,
        `status ${overStock.status}`,
      );

      // Reset cart to 1 for checkout
      await request("DELETE", "/api/cart", { token: customerAccess });
      await request("POST", "/api/cart/items", {
        token: customerAccess,
        body: { productId: limitedProductId, quantity: 1 },
      });

      // Create order
      const order = await request("POST", "/api/orders", {
        token: customerAccess,
        body: {
          deliveryAreaId,
          deliveryAddress: "رفح - شارع الاختبار - Phase M",
          notes: "اختبار محلي",
        },
      });
      assert(
        "POST /api/orders (checkout)",
        order.status === 201 || order.status === 200,
        `status ${order.status} ${JSON.stringify(order.body?.message || order.body)}`,
      );
      const orderId = order.body?.data?.id;
      const snapshotPrice = order.body?.data?.items?.[0]?.unitPrice;

      // Stock deducted
      const stockAfter = await request("GET", `/api/products/${limitedProductId}`);
      const stockVal = stockAfter.body?.data?.stock;
      assert("Stock deducted after order", stockVal === 2, `stock=${stockVal}`);

      // Payment submit
      if (orderId) {
        const payment = await request("POST", `/api/orders/${orderId}/payment`, {
          token: customerAccess,
          body: { paymentReference: "PM-TEST-REF-001", paymentNotes: "اختبار دفع" },
        });
        assert("POST /api/orders/:id/payment", payment.status === 200 || payment.status === 201);

        const adminOrder = await request("GET", `/api/admin/orders/${orderId}`, {
          token: adminAccess,
        });
        assert("GET /api/admin/orders/:id", adminOrder.status === 200);

        const verifyPay = await request("POST", `/api/admin/orders/${orderId}/payment/verify`, {
          token: adminAccess,
          body: { adminPaymentNotes: "تم التحقق - Phase M" },
        });
        assert(
          "POST admin payment verify",
          verifyPay.status === 200 || verifyPay.status === 201,
          `status ${verifyPay.status} ${JSON.stringify(verifyPay.body?.message || verifyPay.body)}`,
        );

        // Price snapshot integrity — change product price, order unchanged
        await request("PATCH", `/api/admin/products/${limitedProductId}`, {
          token: adminAccess,
          body: { price: 999 },
        });
        const orderAfterPriceChange = await request("GET", `/api/orders/${orderId}`, {
          token: customerAccess,
        });
        const snapAfter = orderAfterPriceChange.body?.data?.items?.[0]?.unitPrice;
        assert(
          "Order snapshot unchanged after price edit",
          String(snapAfter) === String(snapshotPrice),
          `was ${snapshotPrice} now ${snapAfter}`,
        );

        // Restore price
        await request("PATCH", `/api/admin/products/${limitedProductId}`, {
          token: adminAccess,
          body: { price: 25 },
        });
      }

      // Review
      const review = await request("POST", `/api/reviews/product/${limitedProductId}`, {
        token: customerAccess,
        body: { rating: 5, comment: "اختبار Phase M" },
      });
      assert("POST /api/reviews/product/:id", review.status === 201 || review.status === 200);

      const reviewSummary = await request("GET", `/api/reviews/product/${limitedProductId}/summary`);
      assert("GET /api/reviews/product/:id/summary", reviewSummary.status === 200);

      // Support
      const support = await request("POST", "/api/support/messages", {
        token: customerAccess,
        body: { subject: "اختبار Phase M", message: "رسالة اختبار Phase M" },
      });
      assert(
        "POST /api/support/messages",
        support.status === 201 || support.status === 200,
        `status ${support.status} ${JSON.stringify(support.body?.message || support.body)}`,
      );

      const supportMsgs = await request("GET", "/api/support/messages", { token: customerAccess });
      assert("GET /api/support/messages", supportMsgs.status === 200);
    }

    // --- Store closed test ---
    await request("PUT", "/api/admin/settings", {
      token: adminAccess,
      body: { isStoreOpen: false, storeClosedMessage: "المتجر مغلق للاختبار" },
    });
    await sleep(300);
    const closedStatus = await request("GET", "/api/settings/store-status");
    assert("Store closed status", closedStatus.body?.data?.isOpen === false);

    // Need customer token for checkout block — re-login if we had otp flow
    if (otp) {
      const verifyAgain = await request("POST", "/api/auth/verify-otp", {
        body: { phoneNumber: testPhone, code: otp },
      });
      // OTP may be used — send new otp
      if (verifyAgain.status !== 200) {
        const retry = await sendOtpAndGetCode(testPhone, logPath);
        otp = retry.otp;
        if (otp) {
          const v2 = await request("POST", "/api/auth/verify-otp", {
            body: { phoneNumber: testPhone, code: otp },
          });
          if (v2.status === 200) {
            await request("POST", "/api/cart/items", {
              token: v2.body.data.accessToken,
              body: { productId: unlimitedProductId, quantity: 1 },
            });
            const blockedOrder = await request("POST", "/api/orders", {
              token: v2.body.data.accessToken,
              body: {
                deliveryAreaId,
                deliveryAddress: "عنوان اختبار",
              },
            });
            assert(
              "Checkout blocked when store closed",
              blockedOrder.status === 403 ||
                blockedOrder.status === 400 ||
                blockedOrder.status === 503,
              `status ${blockedOrder.status}`,
            );
          }
        }
      }
    }

    // Reopen store
    await request("PUT", "/api/admin/settings", {
      token: adminAccess,
      body: { isStoreOpen: true, storeClosedMessage: null },
    });
    const reopened = await request("GET", "/api/settings/store-status");
    assert("Store reopened", reopened.body?.data?.isOpen === true);

    // Invalid payload validation
    const badProduct = await request("POST", "/api/admin/products", {
      token: adminAccess,
      body: { name: "" },
    });
    assert("Invalid product payload → 400", badProduct.status === 400);
  }

  // --- Store/Admin frontends reachable ---
  for (const [name, port] of [
    ["Store frontend", 3000],
    ["Admin frontend", 3002],
  ]) {
    try {
      const r = await request("GET", `http://localhost:${port}/`);
      assert(`${name} HTTP ${port}`, r.status === 200 || r.status === 307 || r.status === 304);
    } catch (e) {
      assert(`${name} HTTP ${port}`, false, e.message);
    }
  }

  console.log(`\n=== Summary: ${results.length - failed}/${results.length} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
