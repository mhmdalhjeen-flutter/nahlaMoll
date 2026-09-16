'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { ProductForm } from '@/components/products/ProductForm';

export default function NewProductPage() {
  return (
    <div className="pb-8">
      <PageHeader title="منتج جديد" />
      <ProductForm mode="create" />
    </div>
  );
}
