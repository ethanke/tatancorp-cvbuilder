import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "https://tatancorp.xyz/tatancorp-backend";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://cvbuilder.tatancorp.xyz";

export async function POST(req: NextRequest) {
  const cookie = req.headers.get("cookie") ?? "";

  // Check auth
  const meRes = await fetch(`${BACKEND}/auth/me`, {
    headers: { cookie },
    cache: "no-store",
  });
  if (!meRes.ok) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  // Check if already pro
  const statusRes = await fetch(`${BACKEND}/payments/status`, {
    headers: { cookie },
    cache: "no-store",
  });
  if (statusRes.ok) {
    const { plan } = await statusRes.json();
    if (plan === "pro") {
      return NextResponse.json({ error: "already_pro" }, { status: 400 });
    }
  }

  // Create Stripe checkout session via backend
  const checkoutRes = await fetch(`${BACKEND}/payments/create-checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({
      success_url: `${APP_URL}/dashboard?upgraded=1`,
      cancel_url: `${APP_URL}/dashboard`,
    }),
  });

  if (!checkoutRes.ok) {
    const err = await checkoutRes.json();
    return NextResponse.json(
      { error: err.error || "checkout failed" },
      { status: 500 }
    );
  }

  const { url } = await checkoutRes.json();
  return NextResponse.json({ url });
}
