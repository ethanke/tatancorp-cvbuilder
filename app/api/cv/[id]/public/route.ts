import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "https://tatancorp.xyz/tatancorp-backend";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const res = await fetch(`${BACKEND}/cv/${id}/public`, { cache: "no-store" });

  if (res.status === 404) {
    return NextResponse.json({ error: "CV not found or not public" }, { status: 404 });
  }
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch CV" }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
