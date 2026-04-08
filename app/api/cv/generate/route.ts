import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { extractJson } from "@/lib/extract-json";
import { getUserPlan } from "@/lib/plan";

const BACKEND = process.env.BACKEND_URL ?? "https://tatancorp.xyz/tatancorp-backend";
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://cvbuilder.tatancorp.xyz",
    "X-Title": "TatanCorp CV Builder",
  },
});
const MODEL = "google/gemma-4-31b-it:free";

// Simple per-user rate limit (in-memory, resets on server restart)
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 10_000;

async function getUser(cookie: string) {
  const res = await fetch(`${BACKEND}/auth/me`, { headers: { cookie }, cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user ?? null;
}

const CV_SCHEMA_PROMPT = `Return ONLY valid JSON with no markdown or explanation, following this exact schema:
{
  "name": "string",
  "tagline": "string — one-line professional headline",
  "contact": { "email": "string", "phone": "string", "location": "string", "linkedin": "string" },
  "summary": "string — 2-3 sentence professional summary",
  "experience": [
    { "company": "string", "role": "string", "start": "YYYY-MM", "end": "YYYY-MM or present", "bullets": ["string — achievement-focused bullet"] }
  ],
  "education": [
    { "school": "string", "degree": "string", "field": "string", "year": "YYYY" }
  ],
  "skills": ["string"],
  "projects": [
    { "name": "string", "description": "string", "url": "string or null" }
  ]
}
For unknown contact values, use empty string. Write strong, achievement-focused bullets.`;

export async function POST(req: NextRequest) {
  const cookie = req.headers.get("cookie") ?? "";
  const user = await getUser(cookie);
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const plan = await getUserPlan(cookie);
  if (plan !== "monthly" && plan !== "annual") {
    return NextResponse.json({ error: "AI features require a Pro subscription ($5/month or $49/year).", code: "PLAN_REQUIRED" }, { status: 403 });
  }

  const now = Date.now();
  const last = rateLimitMap.get(user.id) ?? 0;
  if (now - last < RATE_LIMIT_MS) {
    return NextResponse.json({ error: "Rate limited — please wait 10 seconds" }, { status: 429 });
  }
  rateLimitMap.set(user.id, now);

  const body = await req.json();
  const bio = String(body.bio ?? "").slice(0, 2000).trim();
  const targetRole = String(body.targetRole ?? "").slice(0, 200).trim();
  if (!bio) return NextResponse.json({ error: "bio is required" }, { status: 400 });

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert CV writer. Generate a complete, polished CV from the user's bio.
Target role: ${targetRole || "not specified"}.
${CV_SCHEMA_PROMPT}`,
        },
        { role: "user", content: bio },
      ],
      max_tokens: 2000,
    });
    const cv = extractJson(completion.choices[0].message.content ?? "{}");
    return NextResponse.json({ cv });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "OpenAI error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
