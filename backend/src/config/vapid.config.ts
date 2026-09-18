export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export function isWebPushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim() &&
      process.env.VAPID_SUBJECT?.trim(),
  );
}

export function getVapidConfig(): VapidConfig | null {
  if (!isWebPushConfigured()) {
    return null;
  }

  return {
    publicKey: process.env.VAPID_PUBLIC_KEY!.trim(),
    privateKey: process.env.VAPID_PRIVATE_KEY!.trim(),
    subject: process.env.VAPID_SUBJECT!.trim(),
  };
}
