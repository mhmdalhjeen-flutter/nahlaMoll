'use client';

import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { storeApi } from '@/lib/store-api';
import { getOptimizedImageUrl } from '@/lib/image-url';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Megaphone } from 'lucide-react';

export default function AnnouncementsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: storeApi.getAnnouncements,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  const items = data ?? [];

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">الإعلانات</h1>
      {items.length === 0 ? (
        <EmptyState title="لا توجد إعلانات حالياً" />
      ) : (
        <div className="space-y-4">
          {items.map((a) => (
            <article key={a.id} className="card overflow-hidden p-0">
              {a.image && (
                <div className="relative w-full aspect-[16/9] bg-gray-50">
                  <Image src={getOptimizedImageUrl(a.image, 'banner')} alt={a.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 672px" />
                </div>
              )}
              <div className="p-4">
                <div className="flex gap-3 items-start">
                  {!a.image && <Megaphone className="w-5 h-5 text-primary-600 shrink-0 mt-1" />}
                  <div>
                    <h2 className="font-bold">{a.title}</h2>
                    <p className="text-sm text-gray-500 mb-2">
                      {new Date(a.startDate).toLocaleDateString('ar-EG')}
                    </p>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{a.content}</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
