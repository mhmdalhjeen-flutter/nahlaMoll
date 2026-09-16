import { validate as validateUuid } from "uuid";
import { resolveRequestId } from "./request-id.util";

describe("resolveRequestId", () => {
  it("generates a UUID when header is missing", () => {
    const id = resolveRequestId(undefined);
    expect(validateUuid(id)).toBe(true);
  });

  it("reuses a valid client-supplied UUID", () => {
    const clientId = "550e8400-e29b-41d4-a716-446655440000";
    expect(resolveRequestId(clientId)).toBe(clientId);
  });

  it("generates a new UUID for malformed IDs", () => {
    const id = resolveRequestId("not-a-valid-uuid");
    expect(id).not.toBe("not-a-valid-uuid");
    expect(validateUuid(id)).toBe(true);
  });

  it("generates a new UUID for oversized IDs", () => {
    const oversized = `${"a".repeat(100)}-550e8400-e29b-41d4-a716-446655440000`;
    const id = resolveRequestId(oversized);
    expect(validateUuid(id)).toBe(true);
    expect(id).not.toBe(oversized);
  });

  it("uses the first value when header is an array", () => {
    const clientId = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    expect(resolveRequestId([clientId, "ignored"])).toBe(clientId);
  });
});
