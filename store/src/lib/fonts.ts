import { Tajawal } from 'next/font/google';

/**
 * Weights used in the storefront: normal (400), medium (500), semibold (600→700), bold (700).
 * Tajawal via next/font does not expose 600; semibold renders with the 700 file.
 */
export const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});
