import { describe, expect, it } from 'vitest';
import { buildTelUrl } from './contact';
import { buildWhatsAppUrl } from './whatsapp';

describe('contact links', () => {
  it('builds WhatsApp URL from configured store phone', () => {
    expect(buildWhatsAppUrl('0591234567')).toBe('https://wa.me/970591234567');
  });

  it('builds tel URL from configured store phone', () => {
    expect(buildTelUrl('0591234567')).toBe('tel:+970591234567');
  });

  it('returns null when phone is missing', () => {
    expect(buildWhatsAppUrl(null)).toBeNull();
    expect(buildTelUrl(undefined)).toBeNull();
  });

  it('does not invent a phone number', () => {
    expect(buildWhatsAppUrl('')).toBeNull();
    expect(buildTelUrl('abc')).toBeNull();
  });
});
