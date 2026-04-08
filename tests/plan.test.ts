import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserPlan, isPro } from "../lib/plan";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("isPro", () => {
  it("returns true for 'pro'", () => {
    expect(isPro("pro")).toBe(true);
  });

  it("returns true for 'monthly'", () => {
    expect(isPro("monthly")).toBe(true);
  });

  it("returns true for 'annual'", () => {
    expect(isPro("annual")).toBe(true);
  });

  it("returns false for 'free'", () => {
    expect(isPro("free")).toBe(false);
  });
});

describe("getUserPlan", () => {
  it("returns 'pro' when backend says pro", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plan: "pro" }),
    });
    const plan = await getUserPlan("tc_session=abc123");
    expect(plan).toBe("pro");
    expect(mockFetch).toHaveBeenCalledOnce();
    // Verify cookie was forwarded
    const call = mockFetch.mock.calls[0];
    expect(call[1].headers.cookie).toBe("tc_session=abc123");
  });

  it("returns 'monthly' when backend says monthly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plan: "monthly" }),
    });
    const plan = await getUserPlan("tc_session=abc123");
    expect(plan).toBe("monthly");
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
