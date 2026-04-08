const BACKEND = process.env.BACKEND_URL ?? "https://tatancorp.xyz/tatancorp-backend";

export type Plan = "pro" | "monthly" | "annual" | "free";

/**
 * Returns true if the given plan grants unlimited AI access.
 * Handles current ("pro") and upcoming ("monthly", "annual") paid plan values.
 */
export function isPro(plan: Plan): boolean {
  return plan === "pro" || plan === "monthly" || plan === "annual";
}

/**
 * Fetch the user's current plan from the backend.
 * Returns the raw plan string narrowed to the known Plan union.
 */
export async function getUserPlan(cookie: string): Promise<Plan> {
  try {
    const res = await fetch(`${BACKEND}/payments/status`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return "free";
    const data = await res.json();
    const plan = data.plan as string;
    if (plan === "pro" || plan === "monthly" || plan === "annual") return plan;
    return "free";
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
