export const REQUEST_ID_HEADER = "X-Request-ID";

const DEFAULT_SLOW_REQUEST_MS = 1000;

export function getSlowRequestThresholdMs(): number {
  const raw = process.env.SLOW_REQUEST_MS;
  if (!raw) return DEFAULT_SLOW_REQUEST_MS;
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_SLOW_REQUEST_MS;
  }
  return parsed;
}
