import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { extractJson } from "@/lib/extract-json";
import { getUserPlan, getUserAiCredits } from "@/lib/plan";

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
    { "company": "string", "role": "string", "start": "YYYY-MM", "end": "YYYY-MM or present", "bullets": ["string"] }
  ],
  "education": [{ "school": "string", "degree": "string", "field": "string", "year": "YYYY" }],
  "skills": ["string"],
  "projects": [{ "name": "string", "description": "string", "url": "string or null" }]
}`;

export async function POST(req: NextRequest) {
  const cookie = req.headers.get("cookie") ?? "";
  const user = await getUser(cookie);
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const plan = await getUserPlan(cookie);
  if (plan !== "monthly" && plan !== "annual") {
    const credits = await getUserAiCredits(cookie);
    if (credits.remaining <= 0) {
      return NextResponse.json(
        { error: "credits exhausted", code: "ai_credits_exhausted" },
        { status: 402 }
      );
    }
  }

  const now = Date.now();
  if ((now - (rateLimitMap.get(user.id) ?? 0)) < RATE_LIMIT_MS) {
    return NextResponse.json({ error: "Rate limited — please wait 10 seconds" }, { status: 429 });
  }
  rateLimitMap.set(user.id, now);

  const body = await req.json();
  const text = String(body.text ?? "").slice(0, 4000).trim();
  const targetRole = String(body.targetRole ?? "").slice(0, 200).trim();
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert CV editor. Rewrite and significantly improve the user's existing CV text.
Improve clarity, impact, and professionalism. Use strong action verbs and quantify achievements where possible.
Target role: ${targetRole || "not specified"}.
${CV_SCHEMA_PROMPT}`,
        },
        { role: "user", content: text },
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
