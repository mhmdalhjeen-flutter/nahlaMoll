import { normalizePhoneForWhatsApp } from './whatsapp';

/** Build a tel: link from the configured public store phone. */
export function buildTelUrl(raw: string | null | undefined): string | null {
  const normalized = normalizePhoneForWhatsApp(raw);
  if (normalized) return `tel:+${normalized}`;

  const digits = raw?.replace(/\D/g, '');
  if (!digits || digits.length < 7) return null;

  return `tel:+${digits}`;
}
