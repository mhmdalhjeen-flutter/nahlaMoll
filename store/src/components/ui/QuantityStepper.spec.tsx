import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QuantityStepper } from './QuantityStepper';

describe('QuantityStepper', () => {
  it('disables minus at minimum when min is 1', () => {
    const html = renderToStaticMarkup(
      <QuantityStepper quantity={1} onDecrease={vi.fn()} onIncrease={vi.fn()} min={1} max={5} />,
    );
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('تقليل الكمية');
  });

  it('keeps minus enabled at quantity 1 when min is 0', () => {
    const html = renderToStaticMarkup(
      <QuantityStepper quantity={1} onDecrease={vi.fn()} onIncrease={vi.fn()} min={0} max={5} />,
    );
    expect(html).not.toContain('aria-disabled="true"');
  });

  it('disables plus at max stock', () => {
    const html = renderToStaticMarkup(
      <QuantityStepper quantity={5} onDecrease={vi.fn()} onIncrease={vi.fn()} min={1} max={5} />,
    );
    expect(html.match(/aria-disabled="true"/g)?.length).toBeGreaterThanOrEqual(1);
    expect(html).toContain('زيادة الكمية');
  });

  it('enables both controls between min and max', () => {
    const html = renderToStaticMarkup(
      <QuantityStepper quantity={2} onDecrease={vi.fn()} onIncrease={vi.fn()} min={1} max={5} />,
    );
    expect(html).not.toContain('aria-disabled="true"');
  });
});
