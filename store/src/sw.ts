/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const API_HOST = (() => {
  try {
    const raw = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
    return new URL(raw).host;
  } catch {
    return "localhost:3001";
  }
})();

/** Backend and transactional routes must never be cached by the service worker. */
function isAuthoritativeCommerceRequest(url: URL): boolean {
  if (url.host === API_HOST) return true;

  const path = url.pathname;
  return (
    path.startsWith("/api/auth") ||
    path.startsWith("/api/cart") ||
    path.startsWith("/api/orders") ||
    path.startsWith("/api/payment") ||
    path.startsWith("/api/users") ||
    path.startsWith("/api/notifications") ||
    path.startsWith("/api/delivery") ||
    path.startsWith("/api/favorites") ||
    path.startsWith("/api/assistant")
  );
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) => isAuthoritativeCommerceRequest(url),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ request, url }) =>
        url.origin === self.location.origin &&
        (request.destination === "script" ||
          request.destination === "style" ||
          url.pathname.startsWith("/_next/static/")),
      handler: new CacheFirst({ cacheName: "static-js-css" }),
    },
    {
      matcher: ({ request }) => request.destination === "font",
      handler: new CacheFirst({ cacheName: "static-fonts" }),
    },
    {
      matcher: ({ request, url }) =>
        request.destination === "image" && url.origin === self.location.origin,
      handler: new StaleWhileRevalidate({
        cacheName: "static-images",
      }),
    },
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "pages",
        networkTimeoutSeconds: 5,
        plugins: [
          {
            handlerDidError: async () =>
              (await caches.match("/offline")) ?? Response.error(),
          },
        ],
      }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
