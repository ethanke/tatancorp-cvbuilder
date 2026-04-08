import { describe, it, expect, vi, beforeEach } from "vitest";

// We test the guest-mode logic of the generate route directly
// by simulating authenticated vs unauthenticated calls.

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Minimal mock of the route's getUser helper behaviour
async function simulateGetUser(cookie: string) {
  if (!cookie) return null;
  const res = await fetch("https://tatancorp.xyz/tatancorp-backend/auth/me", {
    headers: { cookie },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user ?? null;
}

describe("generate route guest mode logic", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("getUser returns null for empty cookie (guest)", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    const user = await simulateGetUser("");
    expect(user).toBeNull();
  });

  it("getUser returns user for valid session cookie", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: "u1", email: "a@b.com" } }),
    });
    const user = await simulateGetUser("tc_session=abc");
    expect(user).not.toBeNull();
    expect(user?.id).toBe("u1");
  });

  it("guest (null user) should bypass plan check — only auth users need pro", () => {
    // Simulates the conditional logic in the updated route:
    // if (user) { check plan } else { allow }
    const planRequired = (user: unknown, plan: string) => {
      if (!user) return false; // guest — allowed
      return plan !== "pro";   // authenticated free user — blocked
    };

    expect(planRequired(null, "free")).toBe(false);   // guest allowed
    expect(planRequired(null, "pro")).toBe(false);    // guest allowed
    expect(planRequired({ id: "u1" }, "free")).toBe(true);  // auth free → blocked
    expect(planRequired({ id: "u1" }, "pro")).toBe(false);  // auth pro → allowed
  });

  it("rate limit key is user.id for authenticated users", () => {
    const getRateLimitKey = (
      user: { id: string } | null,
      xForwardedFor: string | null,
      xRealIp: string | null
    ) => {
      if (user) return user.id;
      return xForwardedFor?.split(",")[0].trim() ?? xRealIp ?? "guest";
    };

    expect(getRateLimitKey({ id: "u1" }, "1.2.3.4", null)).toBe("u1");
    expect(getRateLimitKey(null, "1.2.3.4, 5.6.7.8", null)).toBe("1.2.3.4");
    expect(getRateLimitKey(null, null, "9.9.9.9")).toBe("9.9.9.9");
    expect(getRateLimitKey(null, null, null)).toBe("guest");
  });
});

describe("middleware guest mode logic", () => {
  it("allows /builder/new for unauthenticated users", () => {
    const shouldRedirect = (pathname: string, hasSession: boolean) => {
      if (!hasSession && (
        pathname.startsWith("/dashboard") ||
        (pathname.startsWith("/builder") && pathname !== "/builder/new")
      )) {
        return true;
      }
      return false;
    };

    // Unauthenticated
    expect(shouldRedirect("/builder/new", false)).toBe(false);   // allowed
    expect(shouldRedirect("/builder/abc123", false)).toBe(true); // blocked
    expect(shouldRedirect("/dashboard", false)).toBe(true);      // blocked
    expect(shouldRedirect("/", false)).toBe(false);              // allowed (landing)

    // Authenticated
    expect(shouldRedirect("/builder/new", true)).toBe(false);   // allowed
    expect(shouldRedirect("/builder/abc123", true)).toBe(false); // allowed
    expect(shouldRedirect("/dashboard", true)).toBe(false);     // allowed
  });
});
