import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FreeDeliveryBadge } from './FreeDeliveryBadge';

describe('FreeDeliveryBadge', () => {
  it('shows prominent contribution when value > 0', () => {
    const html = renderToStaticMarkup(<FreeDeliveryBadge freeDeliveryValue={40} />);
    expect(html).toContain('+40%');
    expect(html).toContain('للتوصيل المجاني');
    expect(html).not.toContain('+0%');
  });

  it('shows zero contribution copy when enabled', () => {
    const html = renderToStaticMarkup(
      <FreeDeliveryBadge freeDeliveryValue={0} showZeroContribution />,
    );
    expect(html).toContain('لا يساهم في التوصيل المجاني');
    expect(html).not.toContain('+0%');
  });

  it('hides zero contribution by default', () => {
    const html = renderToStaticMarkup(<FreeDeliveryBadge freeDeliveryValue={0} />);
    expect(html).toBe('');
  });
});
