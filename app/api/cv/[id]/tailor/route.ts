import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { extractJson } from "@/lib/extract-json";
import type { CVContent } from "@/lib/types";
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

const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 10_000;

async function getUser(cookie: string) {
  const res = await fetch(`${BACKEND}/auth/me`, { headers: { cookie }, cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user ?? null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookie = req.headers.get("cookie") ?? "";
  const user = await getUser(cookie);
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const plan = await getUserPlan(cookie);
  if (plan !== "monthly" && plan !== "annual") {
    return NextResponse.json({ error: "AI features require Pro. Upgrade for a one-time fee.", code: "PLAN_REQUIRED" }, { status: 403 });
  }

  const now = Date.now();
  if ((now - (rateLimitMap.get(user.id) ?? 0)) < RATE_LIMIT_MS) {
    return NextResponse.json({ error: "Rate limited — please wait 10 seconds" }, { status: 429 });
  }
  rateLimitMap.set(user.id, now);

  const body = await req.json();
  const jobDescription = String(body.jobDescription ?? "").slice(0, 4000).trim();
  const cvContent = body.cvContent;
  if (!jobDescription) return NextResponse.json({ error: "jobDescription is required" }, { status: 400 });
  if (!cvContent) return NextResponse.json({ error: "cvContent is required" }, { status: 400 });

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert CV writer specializing in ATS optimization.
Given a candidate's CV and a job description, rewrite the CV to closely match the job requirements.
- Mirror keywords and skills from the job description
- Reorder and emphasize the most relevant experience
- Adjust the summary and tagline to target this specific role
- Keep only facts from the original CV — do not fabricate experience
Return ONLY valid JSON with the same schema as the input CV (name, tagline, contact, summary, experience, education, skills, projects).`,
        },
        {
          role: "user",
          content: `MY CV:\n${JSON.stringify(cvContent, null, 2)}\n\nJOB DESCRIPTION:\n${jobDescription}`,
        },
      ],
      max_tokens: 2500,
    });
    const tailoredCv = extractJson(completion.choices[0].message.content ?? "{}") as CVContent;

    // Save the tailored version as a new CV in the backend
    const saveRes = await fetch(`${BACKEND}/cv`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({
        title: `Tailored — ${tailoredCv.tagline || cvContent.name || "CV"}`,
        target_role: tailoredCv.tagline,
        content: tailoredCv,
      }),
    });
    if (!saveRes.ok) throw new Error("Failed to save tailored CV");
    const { id: newId } = await saveRes.json();
    return NextResponse.json({ cv: tailoredCv, newId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "OpenAI error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
