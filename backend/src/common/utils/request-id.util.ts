import { randomUUID } from "crypto";
import { validate as validateUuid } from "uuid";
import { REQUEST_ID_HEADER } from "../../config/observability.config";

export { REQUEST_ID_HEADER };

const MAX_REQUEST_ID_LENGTH = 64;

/**
 * Reuse a client-supplied UUID request ID when valid; otherwise generate one.
 */
export function resolveRequestId(
  headerValue: string | string[] | undefined,
): string {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const trimmed = raw?.trim();

  if (
    trimmed &&
    trimmed.length <= MAX_REQUEST_ID_LENGTH &&
    validateUuid(trimmed)
  ) {
    return trimmed;
  }

  return randomUUID();
}
