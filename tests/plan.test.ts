import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserPlan, getUserAiCredits } from "../src/lib/plan";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("getUserPlan", () => {
  it("returns 'monthly' when backend says monthly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plan: "monthly" }),
    });
    const plan = await getUserPlan("tc_session=abc123");
    expect(plan).toBe("monthly");
    expect(mockFetch).toHaveBeenCalledOnce();
    // Verify cookie was forwarded
    const call = mockFetch.mock.calls[0];
    expect(call[1].headers.cookie).toBe("tc_session=abc123");
  });

  it("returns 'annual' when backend says annual", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plan: "annual" }),
    });
    const plan = await getUserPlan("tc_session=abc123");
    expect(plan).toBe("annual");
  });

  it("returns 'free' when backend says free", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plan: "free" }),
    });
    const plan = await getUserPlan("tc_session=abc123");
    expect(plan).toBe("free");
  });

  it("returns 'free' when backend returns non-ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "not authenticated" }),
    });
    const plan = await getUserPlan("");
    expect(plan).toBe("free");
  });

  it("returns 'free' when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network error"));
    const plan = await getUserPlan("tc_session=abc123");
    expect(plan).toBe("free");
  });

  it("returns 'free' for unknown plan values", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plan: "enterprise" }),
    });
    const plan = await getUserPlan("tc_session=abc123");
    expect(plan).toBe("free");
  });

  it("calls correct backend URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plan: "free" }),
    });
    await getUserPlan("tc_session=test");
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("/payments/status");
  });
});

describe("getUserAiCredits", () => {
  it("returns credits from backend", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ remaining: 2, total: 3, used: 1 }),
    });
    const credits = await getUserAiCredits("tc_session=abc123");
    expect(credits).toEqual({ remaining: 2, total: 3, used: 1 });
    const call = mockFetch.mock.calls[0];
    expect(call[0]).toContain("/payments/ai/credits");
    expect(call[1].headers.cookie).toBe("tc_session=abc123");
  });

  it("returns fallback when backend returns non-ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "not authenticated" }),
    });
    const credits = await getUserAiCredits("");
    expect(credits).toEqual({ remaining: 0, total: 3, used: 3 });
  });

  it("returns fallback when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network error"));
    const credits = await getUserAiCredits("tc_session=abc123");
    expect(credits).toEqual({ remaining: 0, total: 3, used: 3 });
  });

  it("returns zero remaining when credits exhausted", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ remaining: 0, total: 3, used: 3 }),
    });
    const credits = await getUserAiCredits("tc_session=abc123");
    expect(credits.remaining).toBe(0);
  });
});
