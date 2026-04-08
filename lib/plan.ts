const BACKEND = process.env.BACKEND_URL ?? "https://tatancorp.xyz/tatancorp-backend";

export type PlanType = "free" | "monthly" | "annual";

export interface AiCredits {
  remaining: number;
  total: number;
  used: number;
}

/**
 * Check the user's subscription plan.
 * Returns "monthly" | "annual" | "free".
 */
export async function getUserPlan(cookie: string): Promise<PlanType> {
  try {
    const res = await fetch(`${BACKEND}/payments/status`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return "free";
    const data = await res.json();
    if (data.plan === "monthly") return "monthly";
    if (data.plan === "annual") return "annual";
    return "free";
  } catch {
    return "free";
  }
}

/**
 * Fetch remaining AI credits for the user (free tier).
 * Returns { remaining, total, used }.
 */
export async function getUserAiCredits(cookie: string): Promise<AiCredits> {
  try {
    const res = await fetch(`${BACKEND}/payments/ai/credits`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return { remaining: 0, total: 3, used: 3 };
    return await res.json();
  } catch {
    return { remaining: 0, total: 3, used: 3 };
  }
}
