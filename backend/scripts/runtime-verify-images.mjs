import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, '..');

function resolveUploadsRoot() {
  const configured = process.env.UPLOAD_DIR?.trim() || 'uploads';
  if (configured.startsWith('/') || /^[A-Za-z]:[\\/]/.test(configured)) {
    return configured;
  }
  const cwdUploads = path.join(backendRoot, configured);
  if (fs.existsSync(cwdUploads)) return cwdUploads;
  const nested = path.join(process.cwd(), 'backend', configured);
  if (fs.existsSync(nested)) return nested;
  return cwdUploads;
}

const prisma = new PrismaClient();
const uploadsRoot = resolveUploadsRoot();

const products = await prisma.product.findMany({
  where: { isActive: true },
  select: { id: true, name: true, images: true },
});

const local = [];
const cloud = [];
const png = [];
const jpeg = [];

for (const p of products) {
  const urls = (p.images || []).filter(Boolean);
  for (const u of urls) {
    if (/cloudinary/i.test(u)) {
      cloud.push({ id: p.id, name: p.name, url: u });
      continue;
    }
    if (u.includes('/uploads/')) {
      const rel = u.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '');
      const key = rel.replace(/^uploads\//, '');
      const filePath = path.join(uploadsRoot, key);
      const exists = fs.existsSync(filePath);
      const entry = { id: p.id, name: p.name, url: u, filePath, exists };
      local.push(entry);
      if (/\.png$/i.test(u)) png.push(entry);
      if (/\.jpe?g$/i.test(u)) jpeg.push(entry);
    }
  }
}

const present = local.filter((e) => e.exists);
const missing = local.filter((e) => !e.exists);

console.log(JSON.stringify({
  uploadsRoot,
  uploadsRootExists: fs.existsSync(uploadsRoot),
  productCount: products.length,
  localCount: local.length,
  presentCount: present.length,
  missingCount: missing.length,
  cloudCount: cloud.length,
  presentPng: present.filter((e) => /\.png$/i.test(e.url)),
  presentJpeg: present.filter((e) => /\.jpe?g$/i.test(e.url)),
  missingSample: missing.slice(0, 5),
  cloudSample: cloud.slice(0, 3),
}, null, 2));

await prisma.$disconnect();
