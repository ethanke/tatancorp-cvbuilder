"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CVContent } from "@/lib/types";
import { EMPTY_CV_CONTENT } from "@/lib/types";
import CvPreview from "@/app/components/CvPreview";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://tatancorp.xyz/tatancorp-backend";

const GUEST_CV_KEY = "guest_cv";
const GUEST_GENERATED_KEY = "guest_cv_generated";

type Mode = "generate" | "improve" | "blank";

export default function NewCV() {
    const router = useRouter();
    const [mode, setMode] = useState<Mode>("generate");
    const [bio, setBio] = useState("");
    const [existingText, setExistingText] = useState("");
    const [targetRole, setTargetRole] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [plan, setPlan] = useState<"free" | "pro" | null>(null);
    const [upgrading, setUpgrading] = useState(false);
    const [isGuest, setIsGuest] = useState(false);
    const [guestAlreadyUsed, setGuestAlreadyUsed] = useState(false);
    const [guestCv, setGuestCv] = useState<CVContent | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const [showSignupModal, setShowSignupModal] = useState(false);

    useEffect(() => {
        fetch(`${BACKEND}/auth/me`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data?.user) {
                    setIsGuest(false);
                    return fetch(`${BACKEND}/payments/status`, { credentials: "include" })
                        .then((r) => (r.ok ? r.json() : Promise.reject()))
                        .then((d) => setPlan(d.plan ?? "free"))
                        .catch(() => setPlan("free"));
                } else {
                    setIsGuest(true);
                    setMode("generate");
                    const used = localStorage.getItem(GUEST_GENERATED_KEY) === "true";
                    setGuestAlreadyUsed(used);
                    try {
                        const stored = localStorage.getItem(GUEST_CV_KEY);
                        if (stored) {
                            const parsed = JSON.parse(stored);
                            setGuestCv(parsed.content ?? null);
                        }
                    } catch {
                        // ignore malformed storage
                    }
                }
            })
            .catch(() => {
                setIsGuest(true);
                setMode("generate");
                setGuestAlreadyUsed(localStorage.getItem(GUEST_GENERATED_KEY) === "true");
            })
            .finally(() => setAuthReady(true));
    }, []);

    const handleUpgrade = async () => {
        setUpgrading(true);
        try {
            const res = await fetch("/api/checkout", { method: "POST" });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
        } catch { /* ignore */ }
        setUpgrading(false);
    };

    const handleBlankCreate = async () => {
        setLoading(true);
        setError("");
        try {
            const saveRes = await fetch(`${BACKEND}/cv`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    title: targetRole ? `${targetRole} — CV` : "My CV",
                    target_role: targetRole,
                    content: EMPTY_CV_CONTENT,
                }),
            });
            if (!saveRes.ok) throw new Error("Failed to save CV");
            const { id } = await saveRes.json();
            router.push(`/builder/${id}`);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong");
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (mode === "blank") {
            return handleBlankCreate();
        }
        setError("");
        const text = mode === "generate" ? bio : existingText;
        if (!text.trim()) {
            setError(mode === "generate" ? "Please describe yourself." : "Please paste your existing CV text.");
            return;
        }
        setLoading(true);
        try {
            // 1. Call AI route
            const aiRes = await fetch(mode === "generate" ? "/api/cv/generate" : "/api/cv/improve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                    mode === "generate"
                        ? { bio: text, targetRole }
                        : { text, targetRole }
                ),
            });
            if (!aiRes.ok) {
                const d = await aiRes.json();
                if (d.code === "PLAN_REQUIRED") {
                    setError("AI features require Pro. Upgrade below for a one-time $9 payment.");
                    setLoading(false);
                    return;
                }
                throw new Error(d.error || "AI generation failed");
            }
            const { cv }: { cv: CVContent } = await aiRes.json();

            // Guest mode: store in localStorage, show preview inline
            if (isGuest) {
                const title = cv.name ? `${cv.name} — ${targetRole || "CV"}` : (targetRole || "My CV");
                localStorage.setItem(GUEST_CV_KEY, JSON.stringify({ title, target_role: targetRole, content: cv }));
                localStorage.setItem(GUEST_GENERATED_KEY, "true");
                setGuestCv(cv);
                setGuestAlreadyUsed(true);
                setLoading(false);
                return;
            }

            // 2. Save to backend (authenticated users)
            const saveRes = await fetch(`${BACKEND}/cv`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    title: cv.name ? `${cv.name} — ${targetRole || "CV"}` : (targetRole || "My CV"),
                    target_role: targetRole,
                    content: cv,
                }),
            });
            if (!saveRes.ok) throw new Error("Failed to save CV");
            const { id } = await saveRes.json();
            router.push(`/builder/${id}`);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong");
            setLoading(false);
        }
    };

    const loginUrl = `${BACKEND}/auth/login?next=${encodeURIComponent(
        (typeof window !== "undefined" ? window.location.origin : "https://cvbuilder.tatancorp.xyz") + "/callback"
    )}`;

    if (!authReady) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex items-center gap-2 text-zinc-500">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Loading…
                </div>
            </div>
        );
    }

    // If guest already generated a CV and it's not loaded in state, show sign-up prompt
    if (isGuest && guestAlreadyUsed && !guestCv) {
        return (
            <div className="mx-auto max-w-3xl px-6 py-16 text-center flex flex-col items-center gap-6">
                <h1 className="text-3xl font-bold">You&apos;ve already generated a free CV</h1>
                <p className="text-zinc-400 text-sm">
                    Sign up to generate more CVs, save your work, and download as PDF.
                </p>
                <a
                    href={loginUrl}
                    className="rounded-xl bg-emerald-500 px-7 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400"
                >
                    Sign up for free
                </a>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl px-6 py-16">
            {/* Guest CV preview with blurred PDF download gate */}
            {isGuest && guestCv ? (
                <div className="flex flex-col gap-6">
                    <div>
                        <h1 className="text-3xl font-bold">Your CV is ready!</h1>
                        <p className="text-zinc-400 text-sm mt-1">
                            Sign up to save it to your account and download as PDF.
                        </p>
                    </div>

                    {/* Download button with signup gate overlay */}
                    <div className="relative inline-flex w-fit">
                        <button
                            disabled
                            aria-hidden="true"
                            className="rounded-xl bg-emerald-500 px-7 py-3 text-sm font-semibold text-black opacity-40 blur-[1px] cursor-not-allowed select-none"
                        >
                            ⤓ Download PDF
                        </button>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <button
                                onClick={() => setShowSignupModal(true)}
                                className="rounded-xl bg-emerald-500 px-7 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 whitespace-nowrap shadow-lg"
                            >
                                🔒 Sign up to download
                            </button>
                        </div>
                    </div>

                    <p className="text-xs text-zinc-500 -mt-3">
                        Free account — no credit card required
                    </p>

                    <CvPreview cv={guestCv} />
                </div>
            ) : (
                <>
                    <div className="mb-10">
                        <h1 className="text-3xl font-bold">Create a new CV</h1>
                        <p className="text-zinc-400 text-sm mt-1">
                            {isGuest
                                ? "Generate a free CV preview — sign up to save and download."
                                : "AI will generate a complete, structured resume for you."}
                        </p>
                    </div>

                    {/* Mode toggle — guests only see "generate" */}
                    {!isGuest && (
                        <div className="flex gap-2 mb-8 p-1 rounded-xl bg-zinc-900 border border-zinc-800 w-fit">
                            <button
                                onClick={() => setMode("blank")}
                                className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                                    mode === "blank" ? "bg-emerald-500 text-black" : "text-zinc-400 hover:text-white"
                                }`}
                            >
                                📝 Blank CV
                            </button>
                            {(["generate", "improve"] as Mode[]).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={`px-5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                                        mode === m ? "bg-emerald-500 text-black" : "text-zinc-400 hover:text-white"
                                    }`}
                                >
                                    {m === "generate" ? "✦ Generate from scratch" : "↑ Improve existing"}
                                    {plan === "free" && <span className="text-[10px] opacity-60">(Pro)</span>}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Free user upgrade prompt for AI modes (authenticated only) */}
                    {!isGuest && plan === "free" && mode !== "blank" && (
                        <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                            <div>
                                <p className="text-sm font-medium text-white">AI features require Pro</p>
                                <p className="text-xs text-zinc-400 mt-0.5">One-time $9 payment — unlocks AI generation, improvement, and job tailoring forever.</p>
                            </div>
                            <button
                                onClick={handleUpgrade}
                                disabled={upgrading}
                                className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-50 whitespace-nowrap"
                            >
                                {upgrading ? "Redirecting…" : "Upgrade to Pro — $9"}
                            </button>
                        </div>
                    )}

                    <div className="flex flex-col gap-5">
                        {mode === "blank" ? (
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-zinc-300">
                                    CV title{" "}
                                    <span className="text-zinc-500 font-normal">(you&apos;ll fill in the details in the editor)</span>
                                </label>
                                <p className="text-sm text-zinc-400">
                                    Creates an empty CV template. You&apos;ll edit each section manually — name, experience, education, skills, etc.
                                </p>
                            </div>
                        ) : mode === "generate" ? (
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-zinc-300">
                                    Tell us about yourself{" "}
                                    <span className="text-zinc-500 font-normal">(2–3 sentences is enough)</span>
                                </label>
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    maxLength={2000}
                                    rows={6}
                                    placeholder="e.g. I'm a software engineer with 4 years of experience building React frontends. I led a team at a fintech startup, shipped products to 50k users, and am looking for a senior role..."
                                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 resize-none"
                                />
                                <p className="text-xs text-zinc-600 text-right">{bio.length}/2000</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-zinc-300">
                                    Paste your existing CV text
                                </label>
                                <textarea
                                    value={existingText}
                                    onChange={(e) => setExistingText(e.target.value)}
                                    maxLength={4000}
                                    rows={10}
                                    placeholder="Paste your current resume text here — any format is fine..."
                                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 resize-none"
                                />
                                <p className="text-xs text-zinc-600 text-right">{existingText.length}/4000</p>
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-zinc-300">
                                Target role{" "}
                                <span className="text-zinc-500 font-normal">(optional but recommended)</span>
                            </label>
                            <input
                                value={targetRole}
                                onChange={(e) => setTargetRole(e.target.value)}
                                maxLength={200}
                                placeholder="e.g. Senior Software Engineer, Product Manager, UX Designer…"
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                                {error}
                            </p>
                        )}

                        <button
                            onClick={handleSubmit}
                            disabled={loading || (!isGuest && plan === "free" && mode !== "blank")}
                            className="rounded-xl bg-emerald-500 px-7 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed w-fit"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-3.5 w-3.5 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                                    {mode === "blank" ? "Creating…" : "Generating with AI…"}
                                </span>
                            ) : (
                                mode === "blank" ? "Create blank CV" : mode === "generate" ? "Generate my CV ✦" : "Improve my CV ↑"
                            )}
                        </button>

                        {isGuest && (
                            <p className="text-xs text-zinc-500">
                                Already have an account?{" "}
                                <a href={loginUrl} className="text-emerald-400 hover:text-emerald-300 underline">Sign in</a>
                            </p>
                        )}
                    </div>
                </>
            )}

            {/* Signup modal */}
            {showSignupModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 flex flex-col gap-5">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-white text-lg">Download your CV</h2>
                            <button onClick={() => setShowSignupModal(false)} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
                        </div>
                        <p className="text-sm text-zinc-400">
                            Create a free account to save your CV and download it as a PDF.
                            It only takes seconds — no credit card required.
                        </p>
                        <a
                            href={loginUrl}
                            className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black text-center transition hover:bg-emerald-400"
                        >
                            Sign up &amp; download — free
                        </a>
                        <button
                            onClick={() => setShowSignupModal(false)}
                            className="text-sm text-zinc-500 hover:text-zinc-300 text-center transition"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
