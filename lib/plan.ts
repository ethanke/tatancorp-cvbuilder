const BACKEND = process.env.BACKEND_URL ?? "https://tatancorp.xyz/tatancorp-backend";

export type PlanType = "free" | "monthly" | "annual";

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
