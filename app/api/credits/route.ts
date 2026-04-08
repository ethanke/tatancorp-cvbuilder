import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "https://tatancorp.xyz/tatancorp-backend";

export async function GET(req: NextRequest) {
  const cookie = req.headers.get("cookie") ?? "";
  try {
    const res = await fetch(`${BACKEND}/payments/ai/credits`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ remaining: 0, total: 3 }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ remaining: 0, total: 3 }, { status: 500 });
  }
}
