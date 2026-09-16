export type ImageVariant =
  | 'card'
  | 'detail'
  | 'thumbnail'
  | 'banner'
  | 'qr'
  | 'original';

const TRANSFORMS: Record<Exclude<ImageVariant, 'original'>, string> = {
  card: 'w_480,h_600,c_fill,f_auto,q_auto',
  detail: 'w_960,f_auto,q_auto',
  thumbnail: 'w_120,h_120,c_fill,f_auto,q_auto',
  banner: 'w_800,c_limit,f_auto,q_auto',
  qr: 'w_400,f_auto,q_auto',
};

/** Same sizing as above but without f_auto — preserves GIF animation. */
const ANIMATED_TRANSFORMS: Record<Exclude<ImageVariant, 'original'>, string> = {
  card: 'w_480,h_600,c_fill,q_auto',
  detail: 'w_960,q_auto',
  thumbnail: 'w_120,h_120,c_fill,q_auto',
  banner: 'w_800,c_limit,q_auto',
  qr: 'w_400,q_auto',
};

const CLOUDINARY_UPLOAD = '/upload/';

/** Backend origin without /api suffix — used for local /uploads paths. */
export function getBackendOrigin(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  try {
    const parsed = new URL(apiUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return 'http://localhost:3001';
  }
}

/**
 * Normalize product/media URLs from the API into browser-loadable absolute URLs.
 * - Cloudinary / full http(s) URLs pass through
 * - `/uploads/...` and `uploads/...` resolve against the backend origin
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url?.trim()) return '';
  const trimmed = url.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  const origin = getBackendOrigin();
  let path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  if (path.startsWith('/api/uploads/')) {
    path = path.replace(/^\/api/, '');
  }

  if (path.startsWith('/uploads/')) {
    return `${origin}${path}`;
  }

  return `${origin}${path}`;
}

/** Detect GIF URLs — Cloudinary f_auto converts these to static WebP/JPEG. */
export function isAnimatedImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  const lower = url.toLowerCase();
  return lower.includes('.gif') || lower.includes('/image/upload/f_gif/');
}

/** Apply Cloudinary delivery transforms; passthrough for non-Cloudinary URLs. */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  variant: ImageVariant = 'original',
): string {
  const resolved = resolveMediaUrl(url);
  if (!resolved) return '';
  if (variant === 'original') return resolved;
  if (!resolved.includes('res.cloudinary.com') || !resolved.includes(CLOUDINARY_UPLOAD)) {
    return resolved;
  }

  const transform = isAnimatedImageUrl(resolved)
    ? ANIMATED_TRANSFORMS[variant]
    : TRANSFORMS[variant];
  const [prefix, suffix] = resolved.split(CLOUDINARY_UPLOAD);
  if (!suffix) return resolved;

  if (/^(w_|h_|c_|f_|q_|g_)/.test(suffix)) return resolved;

  return `${prefix}${CLOUDINARY_UPLOAD}${transform}/${suffix}`;
}
