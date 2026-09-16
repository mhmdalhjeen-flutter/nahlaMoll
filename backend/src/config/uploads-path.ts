import { existsSync } from "fs";
import { join } from "path";

/** Resolve the on-disk uploads root (same path for static serving and local storage). */
export function resolveUploadsRoot(): string {
  const configured = process.env.UPLOAD_DIR?.trim() || "uploads";
  if (configured.startsWith("/") || /^[A-Za-z]:[\\/]/.test(configured)) {
    return configured;
  }

  const cwdUploads = join(process.cwd(), configured);
  if (existsSync(cwdUploads)) {
    return cwdUploads;
  }

  const backendNested = join(process.cwd(), "backend", configured);
  if (existsSync(backendNested)) {
    return backendNested;
  }

  return cwdUploads;
}

export function getBackendPublicOrigin(): string {
  const raw =
    process.env.BACKEND_URL?.trim() ||
    `http://localhost:${process.env.PORT || process.env.BACKEND_PORT || 3001}`;
  return raw.replace(/\/+$/, "");
}
