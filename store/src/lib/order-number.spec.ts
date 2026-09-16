import { describe, expect, it } from 'vitest';
import { formatCustomerOrderNumber } from './order-number';

describe('formatCustomerOrderNumber', () => {
  it('prefixes plain numeric order numbers with #', () => {
    expect(formatCustomerOrderNumber('58231')).toBe('#58231');
  });

  it('preserves values that already include #', () => {
    expect(formatCustomerOrderNumber('#58231')).toBe('#58231');
  });

  it('preserves legacy ORD-* references unchanged', () => {
    expect(formatCustomerOrderNumber('ORD-20260830181556-D37270')).toBe(
      'ORD-20260830181556-D37270',
    );
  });
});
