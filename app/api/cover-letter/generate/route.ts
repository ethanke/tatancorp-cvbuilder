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
  const cv_id = String(body.cv_id ?? "").trim();
  const job_description = String(body.job_description ?? "").slice(0, 4000).trim();
  const company_name = String(body.company_name ?? "").slice(0, 200).trim();

  if (!cv_id) return NextResponse.json({ error: "cv_id is required" }, { status: 400 });
  if (!job_description) return NextResponse.json({ error: "job_description is required" }, { status: 400 });
  if (!company_name) return NextResponse.json({ error: "company_name is required" }, { status: 400 });

  // Load the CV from the backend
  const cvRes = await fetch(`${BACKEND}/cv/${cv_id}`, { headers: { cookie }, cache: "no-store" });
  if (!cvRes.ok) return NextResponse.json({ error: "CV not found" }, { status: 404 });
  const { cv } = await cvRes.json();

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a professional cover letter writer. Generate a compelling, tailored cover letter.
Return ONLY valid JSON with no markdown or explanation, following this exact schema:
{"greeting": "string", "paragraphs": ["string", "string", "string"], "closing": "string"}
The cover letter should be 3-4 paragraphs, highlight relevant experience, and match the job requirements.`,
        },
        {
          role: "user",
          content: `Write a professional cover letter for ${company_name} based on this CV and job description.

CV:
${JSON.stringify(cv.content, null, 2)}

Job Description:
${job_description}`,
        },
      ],
      max_tokens: 1500,
    });
    const coverLetter = extractJson(completion.choices[0].message.content ?? "{}");
    return NextResponse.json({ coverLetter });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "OpenAI error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
