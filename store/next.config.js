const { assertProductionApiUrl, getImageRemotePatterns } = require('./next.config.helpers');
const withSerwistInit = require('@serwist/next').default;

assertProductionApiUrl();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: getImageRemotePatterns(),
  },
};

if (process.env.NODE_ENV === 'development') {
  try {
    const { setupDevPlatform } = require('@cloudflare/next-on-pages/next-dev');
    setupDevPlatform();
  } catch {
    // Optional — local dev works without Cloudflare dev platform
  }
}

const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  additionalPrecacheEntries: [{ url: '/offline', revision: String(Date.now()) }],
  cacheOnNavigation: false,
  reloadOnOnline: true,
  globPublicPatterns: ['icons/**/*'],
});

module.exports = withSerwist(nextConfig);
