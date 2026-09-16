'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Paperclip, Upload, X } from 'lucide-react';
import { storeApi } from '@/lib/store-api';
import { getOptimizedImageUrl } from '@/lib/image-url';
import { cn, getErrorMessage } from '@/lib/utils';

interface PaymentProofUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
  className?: string;
}

export function PaymentProofUpload({
  value,
  onChange,
  disabled,
  className,
}: PaymentProofUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار صورة');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const result = await storeApi.uploadPaymentProof(file);
      onChange(result.url);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Paperclip className="w-4 h-4 text-gray-500 shrink-0" aria-hidden />
        <h3 className="text-sm font-bold text-gray-900">إثبات الدفع</h3>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">
        ارفع صورة إثبات التحويل بعد إتمام عملية الدفع.
      </p>

      {value ? (
        <div className="rounded-xl border border-success-200 bg-success-50/50 p-3 space-y-3">
          <p className="text-sm font-medium text-success-700 flex items-center gap-1.5">
            <span aria-hidden>✓</span>
            تم رفع إثبات الدفع
          </p>
          <div className="relative w-full max-w-[200px] aspect-[4/3] rounded-lg overflow-hidden border border-gray-200 bg-white mx-auto">
            <Image
              src={getOptimizedImageUrl(value, 'detail')}
              alt="معاينة إثبات الدفع"
              fill
              className="object-contain"
              sizes="200px"
            />
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled || uploading}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 min-h-[44px] inline-flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg px-1"
          >
            <X className="w-3.5 h-3.5" aria-hidden />
            استبدال الصورة
          </button>
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={disabled || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className={cn(
              'w-full min-h-[48px] rounded-xl border-2 border-dashed border-gray-300',
              'bg-gray-50 hover:bg-gray-100 hover:border-primary-300',
              'flex items-center justify-center gap-2 text-sm font-medium text-gray-700',
              'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              (disabled || uploading) && 'opacity-50 cursor-not-allowed',
            )}
            aria-busy={uploading}
          >
            <Upload className="w-4 h-4 shrink-0" aria-hidden />
            {uploading ? 'جاري الرفع...' : 'رفع إثبات الدفع'}
          </button>
        </>
      )}

      {error && (
        <p className="text-xs text-error-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
