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
