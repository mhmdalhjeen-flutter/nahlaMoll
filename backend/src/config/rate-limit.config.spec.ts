describe("rate-limit.config", () => {
  const env = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...env };
  });

  afterAll(() => {
    process.env = env;
  });

  it("uses RATE_LIMIT_MAX in normal development", async () => {
    process.env.NODE_ENV = "development";
    process.env.RATE_LIMIT_MAX = "100";
    delete process.env.LOAD_TEST_MODE;

    const { resolveRateLimitMax } = await import("./rate-limit.config");
    expect(resolveRateLimitMax()).toBe(100);
  });

  it("uses LOAD_TEST_RATE_LIMIT_MAX when LOAD_TEST_MODE is true in development", async () => {
    process.env.NODE_ENV = "development";
    process.env.LOAD_TEST_MODE = "true";
    process.env.LOAD_TEST_RATE_LIMIT_MAX = "5000";
    process.env.RATE_LIMIT_MAX = "100";

    const { resolveRateLimitMax } = await import("./rate-limit.config");
    expect(resolveRateLimitMax()).toBe(5000);
  });

  it("rejects LOAD_TEST_MODE in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.LOAD_TEST_MODE = "true";

    const { resolveRateLimitMax } = await import("./rate-limit.config");
    expect(() => resolveRateLimitMax()).toThrow(/not allowed.*production/i);
  });

  it("reads RATE_LIMIT_TTL in milliseconds", async () => {
    process.env.RATE_LIMIT_TTL = "60000";

    const { resolveRateLimitTtl } = await import("./rate-limit.config");
    expect(resolveRateLimitTtl()).toBe(60000);
  });
});
