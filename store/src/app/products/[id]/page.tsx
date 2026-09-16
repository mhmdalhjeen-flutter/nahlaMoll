'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { storeApi } from '@/lib/store-api';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { useProtectedAction } from '@/hooks/useProtectedAction';
import { useAuthStore } from '@/stores/auth-store';
import { useToastStore } from '@/stores/toast-store';
import { getErrorMessage } from '@/lib/utils';
import { ProductPriceDisplay } from '@/components/product/ProductPriceDisplay';
import { isOfferActive, parseProductTags } from '@/lib/product-meta';
import { StoreClosedAlert } from '@/components/store/StoreStatus';
import { useCartMap } from '@/hooks/useCartMap';
import { useGuardedCartActions } from '@/hooks/useGuardedCartActions';
import type { ProductVariant } from '@/lib/types';
import { ProductDetailHeader } from '@/components/product/detail/ProductDetailHeader';
import { ProductImageGallery } from '@/components/product/detail/ProductImageGallery';
import { ProductFreeDeliveryCard } from '@/components/product/detail/ProductFreeDeliveryCard';
import { ProductVariantSelector } from '@/components/product/detail/ProductVariantSelector';
import { ProductPurchasePanel } from '@/components/product/detail/ProductPurchasePanel';
import { ProductDescription } from '@/components/product/detail/ProductDescription';
import { ProductSpecifications } from '@/components/product/detail/ProductSpecifications';
import { ProductHorizontalSection } from '@/components/product/detail/ProductHorizontalSection';
import { getDefaultProductVariant } from '@/lib/product-variants';
import { useStableDiscoveryFeed } from '@/hooks/useStableDiscoveryFeed';
import { recordCustomerEvent } from '@/lib/customer-events';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { requireAuth } = useProtectedAction();
  const toast = useToastStore((s) => s.show);
  const qc = useQueryClient();
  const { qtyMap, summary: cartSummary, data: cartData } = useCartMap();
  const { add, adjustQuantity } = useGuardedCartActions();

  const [variant, setVariant] = useState<ProductVariant | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => storeApi.getProduct(id),
    enabled: !!id,
  });

  useEffect(() => {
    setVariant(null);
  }, [id]);

  useEffect(() => {
    if (!product) return;
    setVariant((current) => current ?? getDefaultProductVariant(product));
  }, [product]);

  useEffect(() => {
    if (!product) return;
    recordCustomerEvent({
      type: 'PRODUCT_VIEWED',
      productId: product.id,
      categoryId: product.categoryId,
      source: 'product_detail',
    });
  }, [product?.id, product?.categoryId]);

  const { data: reviewsPage } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => storeApi.getProductReviews(id, { limit: 50 }),
    enabled: !!id,
  });
  const reviews = reviewsPage?.items;

  const { data: reviewSummary } = useQuery({
    queryKey: ['review-summary', id],
    queryFn: () => storeApi.getReviewSummary(id),
    enabled: !!id,
  });

  const { data: favStatus, refetch: refetchFav, isFetching: favLoading } = useQuery({
    queryKey: ['favorite', id],
    queryFn: () => storeApi.getFavoriteStatus(id),
    enabled: !!id && isAuthenticated,
  });

  const { sections: discoverySections, meta: discoveryMeta } = useStableDiscoveryFeed({
    categoryId: product?.categoryId ?? null,
    enabled: !!product && !!id,
  });

  const discoveryFeed = useMemo(
    () =>
      discoverySections.length > 0
        ? { sections: discoverySections, meta: discoveryMeta ?? { hasPersonalData: false, hasCartContext: false } }
        : undefined,
    [discoverySections, discoveryMeta],
  );

  const { data: similarData } = useQuery({
    queryKey: ['similar-products', id, product?.categoryId],
    queryFn: () =>
      storeApi.getProducts({ categoryId: product!.categoryId, limit: 12 }),
    enabled: !!product?.categoryId && !!id,
  });

  const toggleFav = async () => {
    requireAuth(
      {
        type: 'TOGGLE_FAVORITE',
        productId: id,
        addToFavorites: !favStatus?.isFavorite,
      },
      async () => {
        try {
          if (favStatus?.isFavorite) {
            await storeApi.removeFavorite(id);
            toast('تمت الإزالة من المفضلة', 'info');
          } else {
            await storeApi.addFavorite(id);
            toast('تمت الإضافة إلى المفضلة', 'success');
          }
          refetchFav();
        } catch (e) {
          toast(getErrorMessage(e), 'error');
        }
      },
    );
  };

  const submitReview = async () => {
    try {
      await storeApi.createReview(id, { rating, comment: comment || undefined });
      toast('شكراً على تقييمك', 'success');
      setComment('');
      qc.invalidateQueries({ queryKey: ['reviews', id] });
      qc.invalidateQueries({ queryKey: ['review-summary', id] });
    } catch (e) {
      toast(getErrorMessage(e), 'error');
    }
  };

  const handleAdd = (quantity: number) => {
    if (!product) return;
    add(product, variant?.id, quantity);
  };

  if (isLoading) {
    return (
      <>
        <ProductDetailHeader isFavorite={false} onToggleFavorite={() => {}} />
        <div className="container mx-auto px-4 py-6 space-y-4 max-w-6xl">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <ProductDetailHeader isFavorite={false} onToggleFavorite={() => router.back()} />
        <div className="container mx-auto px-4 py-10 text-center text-gray-500">المنتج غير موجود</div>
      </>
    );
  }

  const variantAdjustment = variant ? parseFloat(String(variant.priceAdjustment)) : 0;
  const animatedImage = parseProductTags(product.tags ?? []).animatedImage;
  const galleryImages = (() => {
    const base = product.images ?? [];
    if (animatedImage && !base.includes(animatedImage)) {
      return [...base, animatedImage];
    }
    return base;
  })();
  const hasActiveOffer = isOfferActive(product);

  const similarProducts = (similarData?.products ?? []).filter((p) => p.id !== id);

  const personalizedSection = discoveryFeed?.sections.find((s) => s.sectionType === 'personalized');
  const boostSection = discoveryFeed?.sections.find((s) => s.sectionType === 'free_delivery_boost');
  const mostOrderedSection = discoveryFeed?.sections.find((s) => s.sectionType === 'most_ordered');

  const inPersonalizedFeed = personalizedSection?.products.some((p) => p.id === id) ?? false;
  const personalizedMatch = personalizedSection?.products.find((p) => p.id === id);
  const showWhyRecommended =
    !!personalizedMatch?.recommendationReason ||
    (product.isRecommended &&
      discoveryFeed?.meta.hasPersonalData &&
      inPersonalizedFeed);

  const whyRecommendedText =
    personalizedMatch?.recommendationReason ??
    (product.category?.name
      ? `لأنك مهتم بـ${product.category.name}.`
      : 'لأنك تفاعلت مع منتجات مشابهة.');

  const usedDiscoveryIds = new Set<string>([id]);

  return (
    <>
      <ProductDetailHeader
        isFavorite={favStatus?.isFavorite}
        onToggleFavorite={toggleFav}
        favoriteLoading={favLoading}
      />

      <div className="container mx-auto px-4 py-4 md:py-6 max-w-6xl">
        <StoreClosedAlert />

        <div className="grid md:grid-cols-2 md:gap-8 lg:gap-10 md:items-start">
          <ProductImageGallery
            images={galleryImages}
            alt={product.name}
            isRecommended={product.isRecommended}
            hasActiveOffer={hasActiveOffer}
          />

          <div className="mt-4 md:mt-0 space-y-4 md:space-y-5">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug">{product.name}</h1>
              {reviewSummary && reviewSummary.reviewCount > 0 ? (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-600">
                  <Star className="w-4 h-4 fill-warning-500 text-warning-500 shrink-0" aria-hidden />
                  <span className="tabular-nums">{reviewSummary.averageRating.toFixed(1)}</span>
                  <span className="text-gray-400">·</span>
                  <span>{reviewSummary.reviewCount} تقييم</span>
                </p>
              ) : null}
            </div>

            <ProductPriceDisplay
              product={product}
              variantAdjustment={variantAdjustment}
              layout="detail"
              showRecommended={false}
              showUnit={false}
            />

            <ProductFreeDeliveryCard freeDeliveryValue={product.freeDeliveryValue} />

            <ProductVariantSelector product={product} selected={variant} onSelect={setVariant} />

            <ProductPurchasePanel
              product={product}
              variant={variant}
              qtyMap={qtyMap}
              cartSummary={cartSummary}
              onAdd={handleAdd}
              onQuantityAdjust={adjustQuantity}
            />
          </div>
        </div>

        <div className="mt-8 md:mt-10 space-y-8 md:space-y-10 max-w-3xl md:max-w-none">
          <ProductDescription description={product.description} />
          <ProductSpecifications product={product} />

          {showWhyRecommended && (
            <section className="rounded-xl border border-primary-100 bg-primary-50/50 p-4">
              <h2 className="text-base font-bold text-primary-800 mb-1">✨ ليش رشحناه إلك؟</h2>
              <p className="text-sm text-primary-700 leading-relaxed">{whyRecommendedText}</p>
            </section>
          )}

          <ProductHorizontalSection
            title="منتجات مشابهة"
            products={similarProducts}
            excludeProductId={id}
            qtyMap={qtyMap}
            onAddToCart={(p, v) => add(p, v)}
            onQuantityAdjust={adjustQuantity}
          />

          {boostSection && (() => {
            const cartProductIdSet = new Set((cartData?.items ?? []).map((i) => i.productId));
            const boostProducts = boostSection.products.filter(
              (p) => p.id !== id && !cartProductIdSet.has(p.id),
            );
            if (boostProducts.length < 2) return null;
            return (
              <ProductHorizontalSection
                title="🚚 ممكن يساعدك في التوصيل المجاني"
                products={boostProducts}
                excludeProductId={id}
                qtyMap={qtyMap}
                onAddToCart={(p, v) => add(p, v)}
                onQuantityAdjust={adjustQuantity}
              />
            );
          })()}

          {personalizedSection &&
            personalizedSection.products.filter((p) => p.id !== id && !usedDiscoveryIds.has(p.id)).length >= 2 && (
              <ProductHorizontalSection
                title={personalizedSection.title}
                products={personalizedSection.products}
                excludeProductId={id}
                qtyMap={qtyMap}
                onAddToCart={(p, v) => add(p, v)}
                onQuantityAdjust={adjustQuantity}
              />
            )}

          {mostOrderedSection &&
            mostOrderedSection.products.filter((p) => p.id !== id).length >= 2 && (
              <ProductHorizontalSection
                title={mostOrderedSection.title}
                products={mostOrderedSection.products}
                excludeProductId={id}
                qtyMap={qtyMap}
                onAddToCart={(p, v) => add(p, v)}
                onQuantityAdjust={adjustQuantity}
                viewAllHref={mostOrderedSection.viewAllHref}
              />
            )}

          <section>
            <h2 className="text-lg font-bold mb-4 text-gray-900">التقييمات</h2>
            {isAuthenticated && (
              <div className="card mb-4 space-y-3">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} نجوم`}>
                      <Star
                        className={`w-6 h-6 ${n <= rating ? 'text-warning-500 fill-warning-500' : 'text-gray-300'}`}
                      />
                    </button>
                  ))}
                </div>
                <Textarea placeholder="تعليقك (اختياري)" value={comment} onChange={(e) => setComment(e.target.value)} />
                <Button size="sm" onClick={submitReview}>إرسال التقييم</Button>
              </div>
            )}
            <div className="space-y-3">
              {(reviews ?? []).map((r) => (
                <div key={r.id} className="card text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{r.user?.name || 'عميل'}</span>
                    <span className="text-warning-500" aria-label={`${r.rating} نجوم`}>{'★'.repeat(r.rating)}</span>
                  </div>
                  {r.comment && <p className="text-gray-600">{r.comment}</p>}
                </div>
              ))}
              {!reviews?.length && (
                <p className="text-gray-500 text-sm">لا توجد تقييمات بعد</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
