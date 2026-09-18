import { getVapidConfig, isWebPushConfigured } from "./vapid.config";

describe("vapid.config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("reports push unsupported when VAPID env is missing", () => {
    expect(isWebPushConfigured()).toBe(false);
    expect(getVapidConfig()).toBeNull();
  });

  it("reports push supported when all VAPID env vars exist", () => {
    process.env.VAPID_PUBLIC_KEY = "public-key";
    process.env.VAPID_PRIVATE_KEY = "private-key";
    process.env.VAPID_SUBJECT = "mailto:support@example.com";

    expect(isWebPushConfigured()).toBe(true);
    expect(getVapidConfig()).toEqual({
      publicKey: "public-key",
      privateKey: "private-key",
      subject: "mailto:support@example.com",
    });
  });
});
