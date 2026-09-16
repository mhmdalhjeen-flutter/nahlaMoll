import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { BRAND, LOGO_META } from '@/lib/branding';
import { tajawal } from '@/lib/fonts';

export const metadata: Metadata = {
  title: BRAND.pageTitle,
  description: BRAND.description,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: BRAND.pageTitle,
    description: BRAND.description,
    siteName: BRAND.nameAr,
  },
  applicationName: BRAND.nameAr,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: BRAND.nameAr,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: LOGO_META.dominantNavy,
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${tajawal.className} font-arabic bg-gray-50 text-gray-900 antialiased min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
