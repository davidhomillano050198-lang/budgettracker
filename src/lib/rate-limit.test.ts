import { describe, it, expect } from "vitest";
import { rateLimit, resetRateLimit, clientIp } from "./rate-limit";

// No KV env in the test runner, so these exercise the in-memory fallback path.
describe("rateLimit (in-memory fallback)", () => {
  it("allows up to max hits then limits the next one", async () => {
    const key = `test-a:${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      expect((await rateLimit(key, 5, 60)).limited).toBe(false);
    }
    expect((await rateLimit(key, 5, 60)).limited).toBe(true);
  });

  it("resetRateLimit clears the counter", async () => {
    const key = `test-b:${Date.now()}`;
    for (let i = 0; i < 5; i++) await rateLimit(key, 5, 60);
    expect((await rateLimit(key, 5, 60)).limited).toBe(true);
    await resetRateLimit(key);
    expect((await rateLimit(key, 5, 60)).limited).toBe(false);
  });

  it("reports the in-memory backend when KV is not configured", async () => {
    const result = await rateLimit(`test-c:${Date.now()}`, 5, 60);
    expect(result.backend).toBe("memory");
  });
});

describe("clientIp", () => {
  it("takes the first x-forwarded-for entry", () => {
    const req = new Request("https://x", { headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" } });
    expect(clientIp(req)).toBe("203.0.113.5");
  });

  it("falls back to 'local' with no proxy headers", () => {
    expect(clientIp(new Request("https://x"))).toBe("local");
  });
});
