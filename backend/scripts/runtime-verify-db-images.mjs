import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const backendRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const prisma = new PrismaClient();

const all = await prisma.product.findMany({
  select: { id: true, name: true, images: true, isActive: true },
});
const uploads = [];
for (const p of all) {
  for (const u of p.images || []) {
    if (u.includes('/uploads/')) uploads.push({ id: p.id, name: p.name, url: u, isActive: p.isActive });
  }
}

const root = path.join(backendRoot, 'uploads');
const files = [];
if (fs.existsSync(root)) {
  const walk = (d) => {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) walk(p);
      else files.push(p);
    }
  };
  walk(root);
}

console.log(JSON.stringify({ allProducts: all.length, uploadUrls: uploads, uploadFiles: files }, null, 2));
await prisma.$disconnect();
