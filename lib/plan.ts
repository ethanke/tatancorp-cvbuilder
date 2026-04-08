const BACKEND = process.env.BACKEND_URL ?? "https://tatancorp.xyz/tatancorp-backend";

/**
 * Check if user has the "pro" plan (paid one-time for AI access).
 * Returns "pro" | "free".
 */
export async function getUserPlan(cookie: string): Promise<"pro" | "free"> {
  try {
    const res = await fetch(`${BACKEND}/payments/status`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return "free";
    const data = await res.json();
    return data.plan === "pro" ? "pro" : "free";
  } catch {
    return "free";
  }
}

/**
 * Get remaining AI credits for free users.
 * Returns { remaining, total } — pro users have unlimited (remaining = -1).
 */
export async function getUserAiCredits(cookie: string): Promise<{ remaining: number; total: number }> {
  try {
    const res = await fetch(`${BACKEND}/payments/ai/credits`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return { remaining: 0, total: 3 };
    const data = await res.json();
    return {
      remaining: typeof data.remaining === "number" ? data.remaining : 0,
      total: typeof data.total === "number" ? data.total : 3,
    };
  } catch {
    return { remaining: 0, total: 3 };
  }
}
