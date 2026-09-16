'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { adminApi } from '@/lib/admin-api';
import type { Category, Product } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState } from '@/components/ui/StateViews';
import { ProductForm } from '@/components/products/ProductForm';
import {
  productToAnimatedImage,
  productToFormState,
  productToImages,
  productToOfferState,
  productToVariantGroups,
} from '@/lib/product-form-utils';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    Promise.all([adminApi.getProduct(id), adminApi.getCategories()])
      .then(([p, cats]) => {
        setProduct(p);
        setCategories(cats);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="pb-8 space-y-6 max-w-3xl">
        <div className="skeleton h-10 w-48" />
        <div className="card skeleton h-48" />
        <div className="card skeleton h-64" />
        <div className="card skeleton h-40" />
      </div>
    );
  }

  if (error || !product) {
    return <ErrorState message={error ?? 'لم يتم العثور على المنتج'} />;
  }

  return (
    <div className="pb-8">
      <PageHeader title="تعديل المنتج" />
      <ProductForm
        key={product.id}
        mode="edit"
        productId={id}
        categories={categories}
        initialForm={productToFormState(product)}
        initialImages={productToImages(product)}
        initialAnimatedImage={productToAnimatedImage(product)}
        initialOffer={productToOfferState(product)}
        initialVariantGroups={productToVariantGroups(product)}
      />
    </div>
  );
}
