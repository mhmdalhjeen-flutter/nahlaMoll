import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CANCELLED = ['CANCELLED'];

async function guestFeed() {
  const res = await fetch('http://localhost:3001/api/products/discovery');
  if (!res.ok) throw new Error(`Guest discovery ${res.status}`);
  return res.json();
}

async function authedFeed(token, query = '') {
  const res = await fetch(`http://localhost:3001/api/products/discovery${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Authed discovery ${res.status}`);
  return res.json();
}

const orderAgg = await prisma.orderItem.groupBy({
  by: ['productId'],
  _sum: { quantity: true },
  where: {
    productId: { not: null },
    order: { status: { notIn: CANCELLED } },
    product: { isActive: true, isAvailable: true },
  },
  orderBy: { _sum: { quantity: 'desc' } },
  take: 10,
});

const favAgg = await prisma.favorite.groupBy({
  by: ['productId'],
  _count: { productId: true },
  where: { product: { isActive: true, isAvailable: true } },
  orderBy: { _count: { productId: 'desc' } },
  take: 10,
});

const usersWithBehavior = await prisma.user.findMany({
  where: { role: 'CUSTOMER' },
  select: {
    id: true,
    _count: {
      select: {
        favorites: true,
        cartItems: true,
        orders: true,
      },
    },
  },
  take: 10,
});

const activeProducts = await prisma.product.count({
  where: { isActive: true, isAvailable: true },
});

let guest = null;
let guestError = null;
try {
  guest = await guestFeed();
} catch (e) {
  guestError = String(e.message || e);
}

console.log(JSON.stringify({
  activeProductCount: activeProducts,
  orderAggTop: orderAgg,
  favAggTop: favAgg,
  usersWithBehavior,
  guestError,
  guestSections: guest?.data?.sections?.map((s) => ({
    type: s.sectionType,
    title: s.title,
    productIds: s.products?.map((p) => p.id),
  })) ?? guest?.sections?.map((s) => ({
    type: s.sectionType,
    title: s.title,
    productIds: s.products?.map((p) => p.id),
  })),
}, null, 2));

await prisma.$disconnect();
