import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../app/api/cv/generate/route";
import { NextRequest } from "next/server";

// Mock OpenAI
vi.mock("openai", () => {
  const mockCreate = vi.fn().mockResolvedValue({
    choices: [{ message: { content: '{"name":"Test User","tagline":"Engineer","contact":{"email":"","phone":"","location":"","linkedin":""},"summary":"A summary.","experience":[],"education":[],"skills":[],"projects":[]}' } }],
  });
  return {
    default: class MockOpenAI {
      chat = { completions: { create: mockCreate } };
    },
  };
});

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeRequest(options: {
  body?: object;
  cookie?: string;
  ip?: string;
  realIp?: string;
} = {}) {
  const { body = { bio: "I am a developer" }, cookie = "", ip, realIp } = options;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (cookie) headers["cookie"] = cookie;
  if (ip) headers["x-forwarded-for"] = ip;
  if (realIp) headers["x-real-ip"] = realIp;
  return new NextRequest("http://localhost/api/cv/generate", {
    method: "POST",
    body: JSON.stringify(body),
    headers,
  });
}

beforeEach(() => {
  mockFetch.mockReset();
  // Use fake timers and set to a large initial value so new user IDs aren't immediately rate limited
  // (rateLimitMap defaults to 0 for unknown keys, so now - 0 must be >= RATE_LIMIT_MS=10000)
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
});

describe("POST /api/cv/generate", () => {
  describe("authenticated user", () => {
    it("returns 403 if plan is free", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ user: { id: "u1" } }) }) // auth/me
        .mockResolvedValueOnce({ ok: true, json: async () => ({ plan: "free" }) }); // payments/status
      const res = await POST(makeRequest({ cookie: "tc_session=abc" }));
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe("PLAN_REQUIRED");
    });

    it("allows monthly plan users", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ user: { id: "u2" } }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ plan: "monthly" }) });
      const res = await POST(makeRequest({ cookie: "tc_session=abc" }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.cv).toBeDefined();
    });

    it("allows annual plan users", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ user: { id: "u3" } }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ plan: "annual" }) });
      const res = await POST(makeRequest({ cookie: "tc_session=abc" }));
      expect(res.status).toBe(200);
    });

    it("returns 429 if rate limited", async () => {
      const userId = "u-rl";
      // First request succeeds
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ user: { id: userId } }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ plan: "annual" }) });
      vi.setSystemTime(2_000_000);
      await POST(makeRequest({ cookie: "tc_session=abc" }));

      // Second request within 10s is rate limited
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ user: { id: userId } }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ plan: "annual" }) });
      vi.setSystemTime(2_005_000);
      const res2 = await POST(makeRequest({ cookie: "tc_session=abc" }));
      expect(res2.status).toBe(429);
    });
  });

  describe("guest (unauthenticated) user", () => {
    it("allows guest access without a session", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) }); // auth/me fails
      const res = await POST(makeRequest({ ip: "1.2.3.100" }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.cv).toBeDefined();
    });

    it("rate limits guest by IP", async () => {
      const ip = "10.0.0.99";
      // First guest request
      mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
      vi.setSystemTime(3_000_000);
      await POST(makeRequest({ ip }));

      // Second guest request within 10s — should be rate limited
      mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
      vi.setSystemTime(3_005_000);
      const res2 = await POST(makeRequest({ ip }));
      expect(res2.status).toBe(429);
    });

    it("rate limits guest by x-real-ip when x-forwarded-for is absent", async () => {
      const realIp = "192.168.1.77";
      // First request
      mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
      vi.setSystemTime(4_000_000);
      await POST(makeRequest({ realIp }));

      // Second request within 10s
      mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
      vi.setSystemTime(4_005_000);
      const res2 = await POST(makeRequest({ realIp }));
      expect(res2.status).toBe(429);
    });

    it("uses first IP from x-forwarded-for chain", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
      const res = await POST(makeRequest({ ip: "203.0.113.1, 10.0.0.1, 10.0.0.2" }));
      expect(res.status).toBe(200);
    });

    it("returns 400 if bio is missing", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
      const res = await POST(makeRequest({ body: {}, ip: "1.2.3.200" }));
      expect(res.status).toBe(400);
    });

    it("does not apply plan check for guests", async () => {
      // auth/me returns no user — no payments/status call should occur
      mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
      await POST(makeRequest({ ip: "1.2.3.201" }));
      // Only 1 fetch call (auth/me), not 2
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
