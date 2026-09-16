/**
 * Read-only audit: find legacy local image URLs in the database.
 * Does NOT modify any records.
 */
const { PrismaClient } = require('@prisma/client');

const LEGACY_CHECKS = [
  { name: 'contains /uploads/', test: (u) => u.includes('/uploads/') },
  { name: 'localhost:3001', test: (u) => u.toLowerCase().includes('localhost:3001') },
  { name: 'localhost:3002', test: (u) => u.toLowerCase().includes('localhost:3002') },
  { name: '127.0.0.1', test: (u) => u.includes('127.0.0.1') },
  { name: 'relative uploads/', test: (u) => u.startsWith('uploads/') },
];

function classify(url) {
  if (!url || !String(url).trim()) return 'empty';
  const u = String(url).trim();
  if (u.includes('res.cloudinary.com')) return 'cloudinary';
  const legacy = LEGACY_CHECKS.filter((p) => p.test(u)).map((p) => p.name);
  if (legacy.length) return `legacy:${legacy.join('|')}`;
  if (/^https?:\/\//i.test(u)) return 'other-http';
  return 'other';
}

function extractAnimatedImageUrls(tags) {
  const urls = [];
  for (const tag of tags || []) {
    if (tag.startsWith('animatedImage:')) {
      urls.push(tag.slice('animatedImage:'.length));
    }
  }
  return urls;
}

async function main() {
  const prisma = new PrismaClient();
  const report = {
    scannedAt: new Date().toISOString(),
    tables: {},
    legacyByTable: [],
    allNonCloudinaryUrls: [],
    summary: {},
  };

  const categories = await prisma.category.findMany({
    select: { id: true, name: true, image: true, isActive: true },
  });
  const categoryLegacy = categories.filter(
    (row) => row.image && classify(row.image).startsWith('legacy'),
  );
  report.tables.Category = {
    field: 'image',
    totalRows: categories.length,
    rowsWithImage: categories.filter((row) => row.image).length,
    cloudinaryCount: categories.filter((row) => row.image && classify(row.image) === 'cloudinary')
      .length,
    legacyCount: categoryLegacy.length,
    legacyRecords: categoryLegacy.map((row) => ({
      id: row.id,
      name: row.name,
      isActive: row.isActive,
      image: row.image,
      classification: classify(row.image),
    })),
  };

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      images: true,
      tags: true,
      isActive: true,
      isAvailable: true,
    },
  });
  const productLegacy = [];
  for (const product of products) {
    for (const url of product.images || []) {
      const classification = classify(url);
      if (classification.startsWith('legacy')) {
        productLegacy.push({
          id: product.id,
          name: product.name,
          field: 'images',
          isActive: product.isActive,
          isAvailable: product.isAvailable,
          url,
          classification,
        });
      }
    }
    for (const url of extractAnimatedImageUrls(product.tags)) {
      const classification = classify(url);
      if (classification.startsWith('legacy')) {
        productLegacy.push({
          id: product.id,
          name: product.name,
          field: 'tags.animatedImage',
          isActive: product.isActive,
          isAvailable: product.isAvailable,
          url,
          classification,
        });
      }
    }
  }
  report.tables.Product = {
    fields: ['images[]', 'tags[] (animatedImage:)'],
    totalRows: products.length,
    rowsWithImages: products.filter((row) => (row.images || []).length > 0).length,
    totalImageUrls: products.reduce((sum, row) => sum + (row.images || []).length, 0),
    cloudinaryImageUrls: products
      .flatMap((row) => row.images || [])
      .filter((url) => classify(url) === 'cloudinary').length,
    cloudinaryAnimatedUrls: products
      .flatMap((row) => extractAnimatedImageUrls(row.tags))
      .filter((url) => classify(url) === 'cloudinary').length,
    legacyCount: productLegacy.length,
    legacyRecords: productLegacy,
  };

  const announcements = await prisma.announcement.findMany({
    select: { id: true, title: true, image: true, isActive: true, startDate: true, endDate: true },
  });
  const announcementLegacy = announcements.filter(
    (row) => row.image && classify(row.image).startsWith('legacy'),
  );
  report.tables.Announcement = {
    field: 'image',
    totalRows: announcements.length,
    rowsWithImage: announcements.filter((row) => row.image).length,
    cloudinaryCount: announcements.filter(
      (row) => row.image && classify(row.image) === 'cloudinary',
    ).length,
    legacyCount: announcementLegacy.length,
    legacyRecords: announcementLegacy.map((row) => ({
      id: row.id,
      title: row.title,
      isActive: row.isActive,
      startDate: row.startDate,
      endDate: row.endDate,
      image: row.image,
      classification: classify(row.image),
    })),
  };

  const paymentAccounts = await prisma.paymentAccount.findMany({
    select: {
      id: true,
      method: true,
      accountName: true,
      qrImageUrl: true,
      isActive: true,
    },
  });
  const paymentAccountLegacy = paymentAccounts.filter(
    (row) => row.qrImageUrl && classify(row.qrImageUrl).startsWith('legacy'),
  );
  report.tables.PaymentAccount = {
    field: 'qrImageUrl',
    totalRows: paymentAccounts.length,
    rowsWithQr: paymentAccounts.filter((row) => row.qrImageUrl).length,
    cloudinaryCount: paymentAccounts.filter(
      (row) => row.qrImageUrl && classify(row.qrImageUrl) === 'cloudinary',
    ).length,
    legacyCount: paymentAccountLegacy.length,
    legacyRecords: paymentAccountLegacy.map((row) => ({
      id: row.id,
      method: row.method,
      accountName: row.accountName,
      isActive: row.isActive,
      qrImageUrl: row.qrImageUrl,
      classification: classify(row.qrImageUrl),
    })),
  };

  const settingsRows = await prisma.settings.findMany({
    select: { id: true, paymentQrImage: true },
  });
  const settingsLegacy = settingsRows.filter(
    (row) => row.paymentQrImage && classify(row.paymentQrImage).startsWith('legacy'),
  );
  report.tables.Settings = {
    field: 'paymentQrImage',
    totalRows: settingsRows.length,
    rowsWithImage: settingsRows.filter((row) => row.paymentQrImage).length,
    cloudinaryCount: settingsRows.filter(
      (row) => row.paymentQrImage && classify(row.paymentQrImage) === 'cloudinary',
    ).length,
    legacyCount: settingsLegacy.length,
    legacyRecords: settingsLegacy.map((row) => ({
      id: row.id,
      paymentQrImage: row.paymentQrImage,
      classification: classify(row.paymentQrImage),
    })),
  };

  const orders = await prisma.order.findMany({
    select: {
      id: true,
      orderNumber: true,
      paymentProof: true,
      status: true,
      paymentStatus: true,
      createdAt: true,
    },
  });
  const orderLegacy = orders.filter(
    (row) => row.paymentProof && classify(row.paymentProof).startsWith('legacy'),
  );
  const orderOther = orders.filter((row) => {
    if (!row.paymentProof) return false;
    const c = classify(row.paymentProof);
    return c !== 'cloudinary' && !c.startsWith('legacy');
  });
  report.tables.Order = {
    field: 'paymentProof',
    totalRows: orders.length,
    rowsWithProof: orders.filter((row) => row.paymentProof).length,
    cloudinaryCount: orders.filter(
      (row) => row.paymentProof && classify(row.paymentProof) === 'cloudinary',
    ).length,
    legacyCount: orderLegacy.length,
    otherNonCloudinaryCount: orderOther.length,
    legacyRecords: orderLegacy.map((row) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      status: row.status,
      paymentStatus: row.paymentStatus,
      createdAt: row.createdAt,
      paymentProof: row.paymentProof,
      classification: classify(row.paymentProof),
    })),
    otherRecords: orderOther.map((row) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      paymentProof: row.paymentProof,
      classification: classify(row.paymentProof),
    })),
  };

  for (const [tableName, tableReport] of Object.entries(report.tables)) {
    if (tableReport.legacyCount > 0) {
      report.legacyByTable.push({
        table: tableName,
        field: tableReport.field || tableReport.fields?.join(', '),
        legacyCount: tableReport.legacyCount,
      });
    }
  }

  const pushNonCloudinary = (table, id, url, meta = {}) => {
    const classification = classify(url);
    if (classification === 'cloudinary' || classification === 'empty') return;
    report.allNonCloudinaryUrls.push({ table, id, url, classification, ...meta });
  };

  for (const row of categories) {
    if (row.image) pushNonCloudinary('Category', row.id, row.image, { isActive: row.isActive });
  }
  for (const row of products) {
    for (const url of row.images || []) {
      pushNonCloudinary('Product.images', row.id, url, {
        isActive: row.isActive,
        isAvailable: row.isAvailable,
      });
    }
    for (const url of extractAnimatedImageUrls(row.tags)) {
      pushNonCloudinary('Product.tags.animatedImage', row.id, url, {
        isActive: row.isActive,
        isAvailable: row.isAvailable,
      });
    }
  }
  for (const row of announcements) {
    if (row.image) pushNonCloudinary('Announcement', row.id, row.image, { isActive: row.isActive });
  }
  for (const row of paymentAccounts) {
    if (row.qrImageUrl) {
      pushNonCloudinary('PaymentAccount', row.id, row.qrImageUrl, { isActive: row.isActive });
    }
  }
  for (const row of settingsRows) {
    if (row.paymentQrImage) pushNonCloudinary('Settings', row.id, row.paymentQrImage);
  }
  for (const row of orders) {
    if (row.paymentProof) {
      pushNonCloudinary('Order', row.id, row.paymentProof, { orderNumber: row.orderNumber });
    }
  }

  const totalLegacy = report.allNonCloudinaryUrls.filter((row) =>
    row.classification.startsWith('legacy'),
  ).length;

  report.summary = {
    totalLegacyImageReferences: totalLegacy,
    totalNonCloudinaryReferences: report.allNonCloudinaryUrls.length,
    allStoredImagesAreCloudinary: report.allNonCloudinaryUrls.length === 0,
    tablesWithLegacyUrls: report.legacyByTable,
  };

  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
