/** Shared floating-action-button vertical offsets (mobile). */

/** Routes with a fixed CTA bar above the bottom navigation. */
export const STICKY_CTA_PATHS = new Set(['/cart', '/checkout']);

export function pageHasStickyCta(pathname: string): boolean {
  return STICKY_CTA_PATHS.has(pathname);
}

/** Mobile FAB bottom — above bottom nav only. */
export const MOBILE_FAB_BOTTOM =
  'max-md:bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px)+0.5rem)]';

/** Mobile FAB bottom — above bottom nav + sticky CTA (~52px + gap). */
export const MOBILE_FAB_BOTTOM_ABOVE_CTA =
  'max-md:bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px)+3.75rem)]';

export function mobileFabBottomClass(pathname: string): string {
  return pageHasStickyCta(pathname) ? MOBILE_FAB_BOTTOM_ABOVE_CTA : MOBILE_FAB_BOTTOM;
}

/** Desktop FAB anchor. */
export const DESKTOP_FAB_BOTTOM = 'md:bottom-6';
