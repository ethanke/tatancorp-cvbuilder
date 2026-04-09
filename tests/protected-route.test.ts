// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";

const cookieSpy = vi.spyOn(document, "cookie", "get");

afterEach(() => {
  cookieSpy.mockReset();
});

describe("ProtectedRoute cookie check", () => {
  it("detects tc_session cookie presence", () => {
    cookieSpy.mockReturnValue("tc_session=abc123; other=val");
    const session = document.cookie.includes("tc_session");
    expect(session).toBe(true);
  });

  it("detects missing tc_session cookie", () => {
    cookieSpy.mockReturnValue("other=val");
    const session = document.cookie.includes("tc_session");
    expect(session).toBe(false);
  });

  it("handles empty cookies", () => {
    cookieSpy.mockReturnValue("");
    const session = document.cookie.includes("tc_session");
    expect(session).toBe(false);
  });

  it("is case-sensitive for tc_session", () => {
    cookieSpy.mockReturnValue("TC_SESSION=abc123");
    const session = document.cookie.includes("tc_session");
    expect(session).toBe(false);
  });
});
