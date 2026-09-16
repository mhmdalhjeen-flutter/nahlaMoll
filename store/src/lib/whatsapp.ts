/**
 * Normalize a phone number for WhatsApp wa.me links (digits only, no +).
 * Supports Palestinian local formats: 059xxxxxxx, 056xxxxxxx → 97059… / 97056…
 */
export function normalizePhoneForWhatsApp(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;

  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('970') && digits.length >= 12) {
    return digits;
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `970${digits.slice(1)}`;
  }

  if ((digits.startsWith('59') || digits.startsWith('56')) && digits.length === 9) {
    return `970${digits}`;
  }

  if (digits.startsWith('05') && digits.length === 10) {
    return `970${digits.slice(1)}`;
  }

  if (digits.length >= 10 && !digits.startsWith('0')) {
    return digits;
  }

  return null;
}

export function buildWhatsAppUrl(raw: string | null | undefined): string | null {
  const normalized = normalizePhoneForWhatsApp(raw);
  if (!normalized) return null;
  return `https://wa.me/${normalized}`;
}
