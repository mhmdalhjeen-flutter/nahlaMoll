'use client';

import { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, X } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  onUpload: (file: File) => Promise<string>;
  label?: string;
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ImageUpload({
  value,
  onChange,
  onUpload,
  label,
  placeholder = 'إضافة صورة',
  className = '',
  size = 'lg',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-32 h-32',
    lg: 'w-full max-w-[200px] aspect-square',
  };

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const url = await onUpload(file);
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل رفع الصورة');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  };

  return (
    <div className={className}>
      {label && <p className="text-sm font-semibold text-gray-800 mb-2">{label}</p>}
      <div className={`relative ${sizeClasses[size]}`}>
        {value ? (
          <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-50 group">
            <OptimizedImage src={value} alt="" variant="thumbnail" fill className="object-cover" sizes="200px" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="p-2 rounded-xl bg-white/90 text-gray-800 hover:bg-white transition-colors"
                aria-label="تغيير الصورة"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="p-2 rounded-xl bg-white/90 text-error-600 hover:bg-white transition-colors"
                aria-label="حذف الصورة"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full h-full rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-primary-50/50 transition-all flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-primary-600 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                  <ImagePlus className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">+ {placeholder}</span>
              </>
            )}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-error-600 mt-1.5">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        onChange={onInputChange}
      />
    </div>
  );
}
