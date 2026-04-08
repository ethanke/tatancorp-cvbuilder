import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock OpenAI before importing the route
vi.mock("openai", () => {
  const mockCreate = vi.fn().mockResolvedValue({
    choices: [{ message: { content: '{"name":"Test","tagline":"Dev","contact":{"email":"","phone":"","location":"","linkedin":""},"summary":"","experience":[],"education":[],"skills":[],"projects":[]}' } }],
  });
  class OpenAI {
    chat = { completions: { create: mockCreate } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(_opts?: any) {}
  }
  return { default: OpenAI };
});

// Mock lib/plan
vi.mock("../lib/plan", () => ({
  getUserPlan: vi.fn(),
  getUserAiCredits: vi.fn(),
}));

// Mock lib/extract-json
vi.mock("../lib/extract-json", () => ({
  extractJson: vi.fn((s: string) => JSON.parse(s)),
}));

import { getUserPlan, getUserAiCredits } from "../lib/plan";

const mockGetUserPlan = getUserPlan as ReturnType<typeof vi.fn>;
const mockGetUserAiCredits = getUserAiCredits as ReturnType<typeof vi.fn>;

// We need to mock the backend /auth/me call
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Helper to build a minimal NextRequest-like object
function makeRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return {
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null,
    },
    json: async () => body,
  } as unknown as import("next/server").NextRequest;
}

// Import the route handler after mocks are set up
const { POST } = await import("../app/api/cv/generate/route");

describe("POST /api/cv/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the internal rate limit map between tests via module reload isn't easy,
    // so we rely on unique IPs / user IDs per test.
  });

  it("guest access is allowed — returns 200 with cv", async () => {
    // No session cookie → /auth/me returns 401 → user = null → guest path
    mockFetch.mockResolvedValueOnce({ ok: false });

    const req = makeRequest(
      { bio: "I am a software engineer with 5 years experience", targetRole: "Engineer" },
      { "x-forwarded-for": "1.2.3.100" }
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("cv");
  });

  it("guest IP rate limiting returns 429 on rapid second request", async () => {
    const ip = "1.2.3.200";
    // Both calls → /auth/me returns not-ok → guest
    mockFetch
      .mockResolvedValueOnce({ ok: false }) // first request auth
      .mockResolvedValueOnce({ ok: false }); // second request auth

    const makeReq = () =>
      makeRequest(
        { bio: "Software engineer with 5 years experience", targetRole: "Engineer" },
        { "x-forwarded-for": ip }
      );

    // First request — should succeed
    const res1 = await POST(makeReq());
    expect(res1.status).toBe(200);

    // Second request immediately — should be rate limited
    const res2 = await POST(makeReq());
    expect(res2.status).toBe(429);
  });

  it("authenticated free user with credits exhausted gets 402", async () => {
    // Auth succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: "user-auth-free-exhausted" } }),
    });
    mockGetUserPlan.mockResolvedValueOnce("free");
    mockGetUserAiCredits.mockResolvedValueOnce({ remaining: 0, total: 3, used: 3 });

    const req = makeRequest(
      { bio: "I am a developer", targetRole: "Dev" },
      { cookie: "tc_session=abc" }
    );
    const res = await POST(req);
    expect(res.status).toBe(402);
    const data = await res.json();
    expect(data.code).toBe("ai_credits_exhausted");
  });

  it("returns 400 when bio is missing", async () => {
    // Guest path (no session)
    mockFetch.mockResolvedValueOnce({ ok: false });

    const req = makeRequest(
      { targetRole: "Engineer" },
      { "x-forwarded-for": "9.9.9.9" }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/bio/i);
  });
});
