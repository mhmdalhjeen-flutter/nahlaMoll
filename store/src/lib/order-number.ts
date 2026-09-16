/**
 * Customer-facing order number label.
 * New orders store plain digits (e.g. "58231"); legacy ORD-* values are shown unchanged.
 */
export function formatCustomerOrderNumber(orderNumber: string): string {
  const trimmed = orderNumber.trim();
  if (/^\d+$/.test(trimmed)) return `#${trimmed}`;
  if (trimmed.startsWith('#')) return trimmed;
  return trimmed;
}
