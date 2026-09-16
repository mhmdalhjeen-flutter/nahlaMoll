import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  CHECKOUT_PAYMENT_DETAILS_ID,
  scrollToPaymentDetails,
} from './scroll-payment-details';

describe('scrollToPaymentDetails', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('scrolls the payment details element when present', () => {
    const scrollIntoView = vi.fn();
    vi.stubGlobal('document', {
      getElementById: vi.fn((id: string) =>
        id === CHECKOUT_PAYMENT_DETAILS_ID ? { scrollIntoView } : null,
      ),
    });

    scrollToPaymentDetails();

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('uses auto scroll when reduced motion is preferred', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    const scrollIntoView = vi.fn();
    vi.stubGlobal('document', {
      getElementById: vi.fn((id: string) =>
        id === CHECKOUT_PAYMENT_DETAILS_ID ? { scrollIntoView } : null,
      ),
    });

    scrollToPaymentDetails();

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'start',
    });
  });

  it('does nothing when the target element is missing', () => {
    vi.stubGlobal('document', {
      getElementById: vi.fn(() => null),
    });

    expect(() => scrollToPaymentDetails()).not.toThrow();
  });
});
