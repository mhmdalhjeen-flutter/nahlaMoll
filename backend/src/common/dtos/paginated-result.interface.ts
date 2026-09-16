export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const DEFAULT_LIST_LIMIT = 50;
export const MAX_LIST_LIMIT = 100;
export const MAX_REVIEW_LIST_LIMIT = 50;

export function clampPageLimit(
  limit: number | undefined,
  fallback = DEFAULT_LIST_LIMIT,
  max = MAX_LIST_LIMIT,
): number {
  const raw = limit ?? fallback;
  return Math.min(Math.max(raw, 1), max);
}

export function paginateSkip(page: number, pageSize: number): number {
  return (Math.max(page, 1) - 1) * pageSize;
}
