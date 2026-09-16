'use client';

import { useRef, useState } from 'react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Camera, ImagePlus, Loader2, Star, X } from 'lucide-react';

interface MultiImageUploadProps {
  images: string[];
  primaryUrl: string | null;
  onPrimaryChange: (url: string | null) => void;
  onChange: (images: string[]) => void;
  onUpload: (file: File) => Promise<string>;
  maxImages?: number;
  label?: string;
  hint?: string;
}

export function MultiImageUpload({
  images,
  primaryUrl,
  onPrimaryChange,
  onChange,
  onUpload,
  maxImages = 3,
  label = 'صور المنتج',
  hint,
}: MultiImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAdd = images.length < maxImages;

  const handleFile = async (file: File) => {
    if (!canAdd) return;
    setError(null);
    setUploading(true);
    try {
      const url = await onUpload(file);
      onChange([...images, url]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل رفع الصورة');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    const url = images[index];
    const next = images.filter((_, i) => i !== index);
    onChange(next);
    if (primaryUrl === url) {
      onPrimaryChange(next[0] ?? null);
    }
  };

  return (
    <div>
      {label && (
        <div className="mb-3">
          <p className="text-sm font-semibold text-gray-800">{label}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {hint ?? `يمكنك إضافة حتى ${maxImages} صور. حدّد الصورة الرئيسية بوضوح.`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {images.map((url, index) => {
          const isPrimary = primaryUrl === url;
          return (
            <div key={`${url}-${index}`} className="space-y-2">
              <div
                className={`relative aspect-square rounded-2xl overflow-hidden border-2 bg-gray-50 group ${
                  isPrimary ? 'border-primary-500 ring-2 ring-primary-100' : 'border-gray-200'
                }`}
              >
                <OptimizedImage
                  src={url}
                  alt=""
                  variant="thumbnail"
                  fill
                  className="object-cover"
                  sizes="(max-width:640px) 50vw, 120px"
                />
                {isPrimary && (
                  <span className="absolute top-2 right-2 flex items-center gap-1 rounded-lg bg-primary-600 px-2 py-0.5 text-[10px] font-medium text-white shadow">
                    <Star className="w-3 h-3 fill-current" />
                    الصورة الرئيسية
                  </span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="p-1.5 rounded-lg bg-white/90 text-error-600 hover:bg-white"
                    aria-label="حذف الصورة"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={isPrimary}
                  onChange={(e) => onPrimaryChange(e.target.checked ? url : null)}
                />
                <span>جعلها الصورة الرئيسية</span>
              </label>
            </div>
          );
        })}

        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-primary-50/50 transition-all flex flex-col items-center justify-center gap-1.5 text-gray-500 hover:text-primary-600 disabled:opacity-50 p-2"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                  <ImagePlus className="w-4 h-4" />
                </div>
                <span className="text-[11px] sm:text-xs font-medium text-center leading-tight">
                  + إضافة صورة
                </span>
                <span className="text-[10px] text-gray-400">
                  {images.length}/{maxImages}
                </span>
              </>
            )}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-error-600 mt-2">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}

interface AnimatedImageUploadProps {
  value?: string | null;
  isPrimary?: boolean;
  onPrimaryChange?: (checked: boolean) => void;
  onChange: (url: string | null) => void;
  onUpload: (file: File) => Promise<string>;
}

export function AnimatedImageUpload({
  value,
  isPrimary = false,
  onPrimaryChange,
  onChange,
  onUpload,
}: AnimatedImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await onUpload(file);
      onChange(url);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <p className="text-sm font-semibold text-gray-800 mb-1">صورة متحركة (اختيارية)</p>
      <p className="text-xs text-gray-500 mb-3">يدعم GIF — لن تصبح رئيسية تلقائياً</p>

      {value ? (
        <div className="space-y-2 max-w-[200px]">
          <div
            className={`relative w-full aspect-square rounded-2xl overflow-hidden border-2 bg-gray-50 group ${
              isPrimary ? 'border-primary-500 ring-2 ring-primary-100' : 'border-gray-200'
            }`}
          >
            <OptimizedImage src={value} alt="" variant="detail" fill className="object-cover" sizes="200px" />
            {isPrimary && (
              <span className="absolute top-2 right-2 flex items-center gap-1 rounded-lg bg-primary-600 px-2 py-0.5 text-[10px] font-medium text-white shadow">
                <Star className="w-3 h-3 fill-current" />
                الصورة الرئيسية
              </span>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button type="button" onClick={() => inputRef.current?.click()} className="p-2 rounded-xl bg-white/90 text-gray-800">
                <Camera className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  if (isPrimary) onPrimaryChange?.(false);
                }}
                className="p-2 rounded-xl bg-white/90 text-error-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {onPrimaryChange && (
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                checked={isPrimary}
                onChange={(e) => onPrimaryChange(e.target.checked)}
              />
              <span>جعلها الصورة الرئيسية</span>
            </label>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full max-w-[200px] aspect-square rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-primary-50/50 transition-all flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-primary-600 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          ) : (
            <>
              <ImagePlus className="w-6 h-6" />
              <span className="text-sm font-medium">+ إضافة صورة متحركة</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
