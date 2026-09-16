/**
 * Shared helpers for Next.js production / Cloudflare Pages builds.
 */

function parseApiUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;
  try {
    return new URL(apiUrl);
  } catch {
    return null;
  }
}

/** Fail fast when building for production without API URL configured. */
function assertProductionApiUrl() {
  if (process.env.CF_PAGES === '1' || process.env.NODE_ENV === 'production') {
    if (!process.env.NEXT_PUBLIC_API_URL) {
      throw new Error(
        'NEXT_PUBLIC_API_URL is required for production / Cloudflare Pages builds.',
      );
    }
  }
}

/** Image remote patterns for next/image — includes backend API host from env. */
function getImageRemotePatterns() {
  const patterns = [];

  if (process.env.NODE_ENV !== 'production') {
    patterns.push(
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/**',
      },
    );
  }

  const api = parseApiUrl();
  if (api) {
    patterns.push({
      protocol: api.protocol.replace(':', ''),
      hostname: api.hostname,
      ...(api.port ? { port: api.port } : {}),
      pathname: '/**',
    });
  }

  const imagesHost = process.env.NEXT_PUBLIC_IMAGES_HOST;
  if (imagesHost) {
    patterns.push({
      protocol: 'https',
      hostname: imagesHost,
      pathname: '/**',
    });
  }

  patterns.push({
    protocol: 'https',
    hostname: 'res.cloudinary.com',
    pathname: '/**',
  });

  return patterns;
}

module.exports = {
  assertProductionApiUrl,
  getImageRemotePatterns,
};
