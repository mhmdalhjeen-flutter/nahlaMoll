import { PrismaClient, Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD environment variables must be set before running the seed.',
    );
  }

  if (adminPassword.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters.');
  }

  console.log('Starting database seed...');

  const adminPasswordHash = await bcrypt.hash(
    adminPassword,
    parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  );

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      isPhoneVerified: true,
    },
    create: {
      phoneNumber: process.env.SEED_ADMIN_PHONE || '0590000000',
      email: adminEmail,
      name: process.env.SEED_ADMIN_NAME || 'مدير النظام',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      isPhoneVerified: true,
    },
  });

  const existingSettings = await prisma.settings.findFirst();
  await prisma.settings.upsert({
    where: { id: existingSettings?.id ?? 'default' },
    update: {},
    create: {
      id: 'default',
      storeName: 'متجر إلكتروني',
      storeNameEn: 'Online Store',
      isStoreOpen: true,
      freeDeliveryTarget: new Prisma.Decimal(100),
      partialFreeDeliveryEnabled: false,
      partialFreeDeliveryThreshold: new Prisma.Decimal(0),
      partialFreeDeliveryDiscount: 0,
      paymentInstructions: 'يرجى التحويل إلى الحساب التالي وإرسال صورة الإيصال',
      paymentAccountDetails: 'يرجى تحديث تفاصيل الحساب من لوحة الإدارة',
    },
  });

  const deliveryAreas = [
    {
      name: 'رفديا',
      deliveryFee: 15,
      eligibleForFreeDelivery: true,
      region: 'GAZA' as const,
    },
    {
      name: 'المنطقة الجنوبية',
      deliveryFee: 20,
      eligibleForFreeDelivery: true,
      region: 'SOUTH' as const,
    },
    {
      name: 'المنطقة الشمالية',
      deliveryFee: 10,
      eligibleForFreeDelivery: true,
      region: 'NORTH' as const,
    },
    {
      name: 'منطقة بعيدة',
      deliveryFee: 25,
      eligibleForFreeDelivery: false,
      region: null,
    },
  ];

  for (const area of deliveryAreas) {
    const id = `area-${area.name}`;
    await prisma.deliveryArea.upsert({
      where: { id },
      update: { region: area.region },
      create: {
        id,
        name: area.name,
        deliveryFee: new Prisma.Decimal(area.deliveryFee),
        eligibleForFreeDelivery: area.eligibleForFreeDelivery,
        isActive: true,
        region: area.region,
      },
    });
  }

  const categories = [
    { name: 'إلكترونيات', slug: 'electronics', description: 'منتجات إلكترونية' },
    { name: 'ملابس', slug: 'clothing', description: 'ملابس رجالية ونسائية' },
    { name: 'منزل', slug: 'home', description: 'منتجات منزلية' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: {
        name: category.name,
        nameEn: category.name,
        slug: category.slug,
        description: category.description,
        isActive: true,
      },
    });
  }

  console.log('Database seed completed successfully');
}

main()
  .catch((error) => {
    console.error('Database seed failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
