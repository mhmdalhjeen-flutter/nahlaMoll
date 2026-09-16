import type { MetadataRoute } from "next";
import { BRAND, LOGO_META } from "@/lib/branding";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "نحلة مول",
    short_name: "نحلة مول",
    description: BRAND.description,
    lang: "ar",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    theme_color: LOGO_META.dominantNavy,
    background_color: LOGO_META.background,
    categories: ["shopping", "food"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
