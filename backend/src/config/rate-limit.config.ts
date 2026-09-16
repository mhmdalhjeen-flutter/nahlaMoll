/**
 * Resolves global @nestjs/throttler limits from environment.
 *
 * Default: RATE_LIMIT_MAX (100) / RATE_LIMIT_TTL (60s) per client IP per route.
 * Auth OTP routes use stricter @Throttle() overrides on AuthController.
 *
 * LOAD_TEST_MODE is allowed only outside production and raises the global
 * per-route ceiling for local k6 measurement without changing production defaults.
 */
export function resolveRateLimitTtl(): number {
  return parseInt(process.env.RATE_LIMIT_TTL || "60000", 10);
}

export function resolveRateLimitMax(): number {
  const isProduction = process.env.NODE_ENV === "production";
  const loadTestMode = process.env.LOAD_TEST_MODE === "true";

  if (loadTestMode) {
    if (isProduction) {
      throw new Error(
        "LOAD_TEST_MODE=true is not allowed when NODE_ENV=production",
      );
    }
    return parseInt(process.env.LOAD_TEST_RATE_LIMIT_MAX || "5000", 10);
  }

  return parseInt(process.env.RATE_LIMIT_MAX || "100", 10);
}
