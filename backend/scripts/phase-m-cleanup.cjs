/**
 * Phase M + manual test data cleanup and seed baseline restoration.
 * Does NOT modify schema, migrations, admin password, or secrets.
 * Usage: node backend/scripts/phase-m-cleanup.cjs
 */
const { PrismaClient, Prisma, UserRole } = require("@prisma/client");
const path = require("path");
const fs = require("fs");

function loadEnv() {
  const envPath = path.join(__dirname, "../.env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
}

loadEnv();

const prisma = new PrismaClient();

const ADMIN_EMAIL = "mhmdadmin0023@admin.com";
const ADMIN_PHONE = "0590000000";

const SEED_CATEGORY_SLUGS = ["electronics", "clothing", "home"];
const SEED_DELIVERY_AREAS = [
  { id: "area-رفديا", name: "رفديا", deliveryFee: 15, eligibleForFreeDelivery: true },
  {
    id: "area-المنطقة الجنوبية",
    name: "المنطقة الجنوبية",
    deliveryFee: 20,
    eligibleForFreeDelivery: true,
  },
  {
    id: "area-المنطقة الشمالية",
    name: "المنطقة الشمالية",
    deliveryFee: 10,
    eligibleForFreeDelivery: true,
  },
  {
    id: "area-منطقة بعيدة",
    name: "منطقة بعيدة",
    deliveryFee: 25,
    eligibleForFreeDelivery: false,
  },
];

const SEED_CATEGORIES = [
  { name: "إلكترونيات", slug: "electronics", description: "منتجات إلكترونية" },
  { name: "ملابس", slug: "clothing", description: "ملابس رجالية ونسائية" },
  { name: "منزل", slug: "home", description: "منتجات منزلية" },
];

const PHASE_M_MARKERS = [
  "Phase M",
  "phase-m",
  "PM-TEST-REF-001",
  "رفح - شارع الاختبار - Phase M",
  "اختبار محلي",
  "اختبار Phase M",
];

const deleted = {};
const restored = {};

function inc(table, n) {
  deleted[table] = (deleted[table] || 0) + n;
}

async function warmConnection() {
  for (let i = 0; i < 5; i++) {
    try {
      await prisma.$queryRaw`SELECT 1 as ok`;
      return;
    } catch (e) {
      if (i === 4) throw e;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

async function inventory(label) {
  const [
    users,
    products,
    variants,
    orders,
    orderItems,
    reviews,
    favorites,
    cartItems,
    support,
    otps,
    categories,
    deliveryAreas,
    announcements,
    settings,
  ] = await Promise.all([
    prisma.user.findMany({ select: { id: true, email: true, phoneNumber: true, role: true } }),
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.review.count(),
    prisma.favorite.count(),
    prisma.cartItem.count(),
    prisma.supportMessage.count(),
    prisma.otpRecord.count(),
    prisma.category.findMany({ select: { id: true, slug: true, name: true, isActive: true } }),
    prisma.deliveryArea.findMany({ select: { id: true, name: true, isActive: true } }),
    prisma.announcement.count(),
    prisma.settings.findFirst(),
  ]);

  console.log(`\n=== ${label} ===`);
  console.log("users:", users.length, users.map((u) => `${u.role}:${u.phoneNumber}`).join(", "));
  console.log("products:", products, "variants:", variants);
  console.log("orders:", orders, "orderItems:", orderItems);
  console.log("reviews:", reviews, "favorites:", favorites, "cartItems:", cartItems);
  console.log("support:", support, "otps:", otps, "announcements:", announcements);
  console.log("categories:", categories);
  console.log("deliveryAreas:", deliveryAreas);
  console.log("settings:", settings ? { storeName: settings.storeName, storeNameEn: settings.storeNameEn } : null);

  return { users, categories, deliveryAreas, settings };
}

async function identifyTestData() {
  const admin = await prisma.user.findFirst({
    where: { email: ADMIN_EMAIL, role: UserRole.ADMIN },
  });
  if (!admin) throw new Error(`Admin account ${ADMIN_EMAIL} not found — aborting.`);

  const testProducts = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: "Phase M", mode: "insensitive" } },
        { tags: { has: "phase-m" } },
        { description: { contains: "اختبار" } },
        { name: "سمبوسك" },
        { nameEn: { contains: "Phase M", mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true },
  });
  const testProductIds = testProducts.map((p) => p.id);

  const testCustomers = await prisma.user.findMany({
    where: {
      role: UserRole.CUSTOMER,
      phoneNumber: { not: ADMIN_PHONE },
    },
    select: { id: true, phoneNumber: true },
  });
  const testCustomerIds = testCustomers.map((u) => u.id);
  const testPhones = testCustomers.map((u) => u.phoneNumber);

  const testOrders = await prisma.order.findMany({
    where: {
      OR: [
        { paymentReference: "PM-TEST-REF-001" },
        { deliveryAddress: { contains: "Phase M" } },
        { notes: { contains: "اختبار" } },
        { orderNumber: "ORD-20260830181556-D37270" },
        ...(testCustomerIds.length ? [{ customerId: { in: testCustomerIds } }] : []),
      ],
    },
    select: { id: true, orderNumber: true },
  });
  const testOrderIds = testOrders.map((o) => o.id);

  const testCategories = await prisma.category.findMany({
    where: { slug: { notIn: SEED_CATEGORY_SLUGS } },
    select: { id: true, slug: true, name: true },
  });
  const testCategoryIds = testCategories.map((c) => c.id);

  const seedDeliveryIds = SEED_DELIVERY_AREAS.map((a) => a.id);
  const testDeliveryAreas = await prisma.deliveryArea.findMany({
    where: { id: { notIn: seedDeliveryIds } },
    select: { id: true, name: true },
  });
  const testDeliveryAreaIds = testDeliveryAreas.map((a) => a.id);

  return {
    admin,
    testProductIds,
    testProducts,
    testCustomerIds,
    testCustomers,
    testPhones,
    testOrderIds,
    testOrders,
    testCategoryIds,
    testCategories,
    testDeliveryAreaIds,
    testDeliveryAreas,
  };
}

async function runCleanup() {
  const ids = await identifyTestData();

  console.log("\n--- Identified for deletion ---");
  console.log("test products:", ids.testProducts.length, ids.testProducts.map((p) => p.name).slice(0, 5).join(", "), "...");
  console.log("test orders:", ids.testOrders.length, ids.testOrders.map((o) => o.orderNumber).join(", "));
  console.log("test customers:", ids.testCustomers.length, ids.testPhones.join(", "));
  console.log("test categories:", ids.testCategories.map((c) => `${c.name}/${c.slug}`).join(", ") || "(none)");
  console.log(
    "test delivery areas:",
    ids.testDeliveryAreas.map((a) => a.name).join(", ") || "(none)",
  );

  await prisma.$transaction(async (tx) => {
    // 1. Orders (cascades OrderItems)
    if (ids.testOrderIds.length) {
      const r = await tx.order.deleteMany({ where: { id: { in: ids.testOrderIds } } });
      inc("Order", r.count);
    }

    // 2. Reviews on test products or test users
    const rReviews = await tx.review.deleteMany({
      where: {
        OR: [
          ...(ids.testProductIds.length ? [{ productId: { in: ids.testProductIds } }] : []),
          ...(ids.testCustomerIds.length ? [{ userId: { in: ids.testCustomerIds } }] : []),
          { comment: { contains: "اختبار Phase M" } },
        ],
      },
    });
    inc("Review", rReviews.count);

    // 3. Favorites
    const rFav = await tx.favorite.deleteMany({
      where: {
        OR: [
          ...(ids.testProductIds.length ? [{ productId: { in: ids.testProductIds } }] : []),
          ...(ids.testCustomerIds.length ? [{ userId: { in: ids.testCustomerIds } }] : []),
        ],
      },
    });
    inc("Favorite", rFav.count);

    // 4. CartItems
    const rCart = await tx.cartItem.deleteMany({
      where: {
        OR: [
          ...(ids.testProductIds.length ? [{ productId: { in: ids.testProductIds } }] : []),
          ...(ids.testCustomerIds.length ? [{ userId: { in: ids.testCustomerIds } }] : []),
        ],
      },
    });
    inc("CartItem", rCart.count);

    // 5. Support messages
    const rSupport = await tx.supportMessage.deleteMany({
      where: {
        OR: [
          ...(ids.testCustomerIds.length ? [{ userId: { in: ids.testCustomerIds } }] : []),
          { subject: { contains: "اختبار Phase M" } },
          { message: { contains: "اختبار Phase M" } },
        ],
      },
    });
    inc("SupportMessage", rSupport.count);

    // 6. Announcements (if any Phase M markers)
    const rAnn = await tx.announcement.deleteMany({
      where: {
        OR: PHASE_M_MARKERS.flatMap((m) => [
          { title: { contains: m } },
          { content: { contains: m } },
        ]),
      },
    });
    inc("Announcement", rAnn.count);

    // 7. ProductVariants on test products
    if (ids.testProductIds.length) {
      const rVar = await tx.productVariant.deleteMany({
        where: { productId: { in: ids.testProductIds } },
      });
      inc("ProductVariant", rVar.count);
    }

    // 8. Products
    if (ids.testProductIds.length) {
      const rProd = await tx.product.deleteMany({ where: { id: { in: ids.testProductIds } } });
      inc("Product", rProd.count);
    }

    // 9. Test categories (non-seed)
    if (ids.testCategoryIds.length) {
      const rCat = await tx.category.deleteMany({ where: { id: { in: ids.testCategoryIds } } });
      inc("Category", rCat.count);
    }

    // 10. Test delivery areas (non-seed)
    if (ids.testDeliveryAreaIds.length) {
      const rArea = await tx.deliveryArea.deleteMany({
        where: { id: { in: ids.testDeliveryAreaIds } },
      });
      inc("DeliveryArea", rArea.count);
    }

    // 11. OTP records (all non-admin test OTP pollution)
    const rOtp = await tx.otpRecord.deleteMany({
      where: { phoneNumber: { not: ADMIN_PHONE } },
    });
    inc("OtpRecord", rOtp.count);

    // 12. Test customer users (addresses cascade)
    if (ids.testCustomerIds.length) {
      const rUsers = await tx.user.deleteMany({
        where: { id: { in: ids.testCustomerIds }, role: UserRole.CUSTOMER },
      });
      inc("User", rUsers.count);
    }

    // 13. Settings — restore seed display names only
    const settings = await tx.settings.findFirst();
    if (settings) {
      await tx.settings.update({
        where: { id: settings.id },
        data: { storeName: "متجر إلكتروني", storeNameEn: "Online Store" },
      });
      restored["Settings"] = 1;
    }
  }, { timeout: 120000 });

  // Restore seed baseline (upsert + activate) — separate transaction
  await prisma.$transaction(async (tx) => {
    for (const area of SEED_DELIVERY_AREAS) {
      await tx.deliveryArea.upsert({
        where: { id: area.id },
        update: {
          name: area.name,
          deliveryFee: new Prisma.Decimal(area.deliveryFee),
          eligibleForFreeDelivery: area.eligibleForFreeDelivery,
          isActive: true,
        },
        create: {
          id: area.id,
          name: area.name,
          deliveryFee: new Prisma.Decimal(area.deliveryFee),
          eligibleForFreeDelivery: area.eligibleForFreeDelivery,
          isActive: true,
        },
      });
      restored["DeliveryArea"] = (restored["DeliveryArea"] || 0) + 1;
    }

    for (const category of SEED_CATEGORIES) {
      await tx.category.upsert({
        where: { slug: category.slug },
        update: {
          name: category.name,
          nameEn: category.name,
          description: category.description,
          isActive: true,
        },
        create: {
          name: category.name,
          nameEn: category.name,
          slug: category.slug,
          description: category.description,
          isActive: true,
        },
      });
      restored["Category"] = (restored["Category"] || 0) + 1;
    }
  }, { timeout: 60000 });
}

async function verify() {
  const issues = [];

  const admin = await prisma.user.findFirst({
    where: { email: ADMIN_EMAIL, role: UserRole.ADMIN },
  });
  if (!admin) issues.push("Admin missing");
  else if (admin.phoneNumber !== ADMIN_PHONE) issues.push("Admin phone unexpected");

  const categories = await prisma.category.findMany({
    where: { slug: { in: SEED_CATEGORY_SLUGS } },
  });
  if (categories.length !== 3) issues.push(`Expected 3 seed categories, got ${categories.length}`);
  for (const c of categories) {
    if (!c.isActive) issues.push(`Category ${c.slug} not active`);
  }

  const areas = await prisma.deliveryArea.findMany({
    where: { id: { in: SEED_DELIVERY_AREAS.map((a) => a.id) } },
  });
  if (areas.length !== 4) issues.push(`Expected 4 seed delivery areas, got ${areas.length}`);
  for (const a of areas) {
    if (!a.isActive) issues.push(`Delivery area ${a.id} not active`);
  }

  const settings = await prisma.settings.findFirst();
  if (!settings) issues.push("Settings row missing");
  else {
    if (settings.storeName !== "متجر إلكتروني") issues.push("storeName not restored");
    if (settings.storeNameEn !== "Online Store") issues.push("storeNameEn not restored");
  }

  for (const marker of PHASE_M_MARKERS) {
    const [p, o, r, s] = await Promise.all([
      prisma.product.count({
        where: {
          OR: [
            { name: { contains: marker } },
            { description: { contains: marker } },
            { tags: { has: marker } },
          ],
        },
      }),
      prisma.order.count({
        where: {
          OR: [
            { paymentReference: { contains: marker } },
            { deliveryAddress: { contains: marker } },
            { notes: { contains: marker } },
          ],
        },
      }),
      prisma.review.count({ where: { comment: { contains: marker } } }),
      prisma.supportMessage.count({
        where: {
          OR: [{ subject: { contains: marker } }, { message: { contains: marker } }],
        },
      }),
    ]);
    if (p + o + r + s > 0) issues.push(`Phase M marker "${marker}" still found (${p + o + r + s} rows)`);
  }

  const remainingCustomers = await prisma.user.count({ where: { role: UserRole.CUSTOMER } });
  if (remainingCustomers > 0) issues.push(`${remainingCustomers} customer(s) remain`);

  const counts = {
    users: await prisma.user.count(),
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    orders: await prisma.order.count(),
    orderItems: await prisma.orderItem.count(),
    reviews: await prisma.review.count(),
    favorites: await prisma.favorite.count(),
    cartItems: await prisma.cartItem.count(),
    support: await prisma.supportMessage.count(),
    otps: await prisma.otpRecord.count(),
    categories: await prisma.category.count(),
    deliveryAreas: await prisma.deliveryArea.count(),
    announcements: await prisma.announcement.count(),
  };

  return { issues, counts, admin, categories, areas, settings };
}

async function main() {
  console.log("Phase M cleanup — starting");
  await warmConnection();
  await inventory("PRE-CLEANUP INVENTORY");

  await runCleanup();

  console.log("\n=== DELETED COUNTS ===");
  for (const [table, count] of Object.entries(deleted).sort()) {
    console.log(`  ${table}: ${count}`);
  }

  console.log("\n=== RESTORED (upsert/activate) ===");
  for (const [table, count] of Object.entries(restored).sort()) {
    console.log(`  ${table}: ${count}`);
  }

  await inventory("POST-CLEANUP INVENTORY");

  const { issues, counts, admin, categories, areas, settings } = await verify();

  console.log("\n=== FINAL COUNTS ===");
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);

  console.log("\n=== VERIFICATION ===");
  console.log("admin:", admin ? `${admin.email} / ${admin.phoneNumber}` : "MISSING");
  console.log(
    "seed categories:",
    categories.map((c) => `${c.slug}(active=${c.isActive})`).join(", "),
  );
  console.log(
    "seed delivery areas:",
    areas.map((a) => `${a.id}(active=${a.isActive})`).join(", "),
  );
  console.log("settings:", settings ? { storeName: settings.storeName, storeNameEn: settings.storeNameEn } : null);

  if (issues.length) {
    console.error("\nVERIFICATION ISSUES:");
    issues.forEach((i) => console.error("  -", i));
    process.exit(1);
  }
  console.log("\nAll verification checks passed.");
}

main()
  .catch((e) => {
    console.error("Cleanup failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
