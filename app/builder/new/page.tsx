"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CVContent } from "@/lib/types";
import { EMPTY_CV_CONTENT } from "@/lib/types";
import CvPreview from "@/app/components/CvPreview";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://tatancorp.xyz/tatancorp-backend";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cvbuilder.tatancorp.xyz";

type Mode = "generate" | "improve" | "blank";

function SignupModal({ onClose }: { onClose: () => void }) {
    const loginUrl = `${BACKEND}/auth/login?next=${encodeURIComponent(`${SITE}/callback`)}`;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-8 shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-zinc-500 hover:text-white text-xl leading-none"
                    aria-label="Close"
                >
                    ×
                </button>
                <div className="flex flex-col items-center gap-5 text-center">
                    <span className="text-4xl">⤓</span>
                    <h2 className="text-xl font-bold text-white">Sign up to download your CV</h2>
                    <p className="text-sm text-zinc-400">
                        Create a free account to download your CV as a PDF and save it to your dashboard.
                        Your generated CV will be automatically saved.
                    </p>
                    <a
                        href={loginUrl}
                        className="w-full rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-black text-center transition hover:bg-emerald-400"
                    >
                        Sign up free — keep my CV
                    </a>
                </div>
            </div>
        </div>
    );
}

export default function NewCV() {
    const router = useRouter();
    const [mode, setMode] = useState<Mode>("generate");
    const [bio, setBio] = useState("");
    const [existingText, setExistingText] = useState("");
    const [targetRole, setTargetRole] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [plan, setPlan] = useState<"free" | "monthly" | "annual" | null>(null);
    const [upgrading, setUpgrading] = useState(false);

    // Guest state
    const [isGuest, setIsGuest] = useState<boolean | null>(null);
    const [guestCv, setGuestCv] = useState<CVContent | null>(null);
    const [guestAlreadyGenerated, setGuestAlreadyGenerated] = useState(false);
    const [showSignupModal, setShowSignupModal] = useState(false);

    useEffect(() => {
        // Detect guest vs authenticated
        fetch(`${BACKEND}/auth/me`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data?.user) {
                    setIsGuest(false);
                    // Load plan for authenticated users
                    fetch(`${BACKEND}/payments/status`, { credentials: "include" })
                        .then((r) => (r.ok ? r.json() : Promise.reject()))
                        .then((d) => {
                            const p = d.plan;
                            if (p === "monthly" || p === "annual") {
                                setPlan(p);
                            } else {
                                setPlan("free");
                            }
                        })
                        .catch(() => setPlan("free"));
                } else {
                    setIsGuest(true);
                    // Load any previously generated guest CV from localStorage
                    try {
                        const stored = localStorage.getItem("guest_cv");
                        const generated = localStorage.getItem("guest_cv_generated");
                        if (stored) {
                            setGuestCv(JSON.parse(stored) as CVContent);
                        }
                        if (generated) {
                            setGuestAlreadyGenerated(true);
                        }
                    } catch {
                        // ignore localStorage errors
                    }
                }
            })
            .catch(() => {
                setIsGuest(true);
                try {
                    const stored = localStorage.getItem("guest_cv");
                    const generated = localStorage.getItem("guest_cv_generated");
                    if (stored) {
                        setGuestCv(JSON.parse(stored) as CVContent);
                    }
                    if (generated) {
                        setGuestAlreadyGenerated(true);
                    }
                } catch {
                    // ignore localStorage errors
                }
            });
    }, []);

    const handleUpgrade = async () => {
        setUpgrading(true);
        try {
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: "annual" }),
            });
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
                    setError("AI features require Pro. Upgrade below — $5/month or $49/year.");
                    setLoading(false);
                    return;
                }
                throw new Error(d.error || "AI generation failed");
            }
            const { cv }: { cv: CVContent } = await aiRes.json();

            if (isGuest) {
                // Guest: store in localStorage and show inline preview
                try {
                    localStorage.setItem("guest_cv", JSON.stringify(cv));
                    localStorage.setItem("guest_cv_generated", "1");
                } catch {
                    // ignore localStorage errors
                }
                setGuestCv(cv);
                setGuestAlreadyGenerated(true);
                setLoading(false);
                return;
            }

            // 2. Authenticated: save to backend
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

    // Loading state
    if (isGuest === null) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex items-center gap-2 text-zinc-500">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Loading…
                </div>
            </div>
        );
    }

    // Guest with a generated CV — show preview + signup CTA
    if (isGuest && guestCv) {
        const loginUrl = `${BACKEND}/auth/login?next=${encodeURIComponent(`${SITE}/callback`)}`;
        return (
            <div className="mx-auto max-w-4xl px-6 py-10">
                {showSignupModal && <SignupModal onClose={() => setShowSignupModal(false)} />}
                <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold">Your AI-generated CV</h1>
                        <p className="text-zinc-400 text-sm mt-1">Sign up to download as PDF and save to your account.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowSignupModal(true)}
                            className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400"
                        >
                            ⤓ Download PDF
                        </button>
                        <a
                            href={loginUrl}
                            className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                        >
                            Sign up free
                        </a>
                    </div>
                </div>
                <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <p className="text-sm font-medium text-white">Sign up to generate more CVs</p>
                        <p className="text-xs text-zinc-400 mt-0.5">Free account gives you 3 AI credits. Pro unlocks unlimited generations, improve &amp; tailor.</p>
                    </div>
                    <a
                        href={loginUrl}
                        className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 whitespace-nowrap"
                    >
                        Create free account
                    </a>
                </div>
                <CvPreview cv={guestCv} />
            </div>
        );
    }

    // Guest who already generated but no CV in state (e.g. cleared) — show sign up CTA
    if (isGuest && guestAlreadyGenerated) {
        const loginUrl = `${BACKEND}/auth/login?next=${encodeURIComponent(`${SITE}/callback`)}`;
        return (
            <div className="mx-auto max-w-3xl px-6 py-16 flex flex-col items-center gap-6 text-center">
                <span className="text-5xl">✦</span>
                <h1 className="text-3xl font-bold">You&apos;ve used your free generation</h1>
                <p className="text-zinc-400 max-w-md">
                    Sign up for free to generate more CVs, improve existing ones, and download as PDF.
                    Your previously generated CV will be saved to your account.
                </p>
                <a
                    href={loginUrl}
                    className="rounded-xl bg-emerald-500 px-8 py-3 text-base font-semibold text-black transition hover:bg-emerald-400"
                >
                    Sign up free — keep my CV
                </a>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl px-6 py-16">
            {showSignupModal && <SignupModal onClose={() => setShowSignupModal(false)} />}
            <div className="mb-10">
                <h1 className="text-3xl font-bold">Create a new CV</h1>
                <p className="text-zinc-400 text-sm mt-1">
                    {isGuest
                        ? "Try AI CV generation for free — no signup required."
                        : "AI will generate a complete, structured resume for you."}
                </p>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-2 mb-8 p-1 rounded-xl bg-zinc-900 border border-zinc-800 w-fit">
                {!isGuest && (
                    <button
                        onClick={() => setMode("blank")}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                            mode === "blank" ? "bg-emerald-500 text-black" : "text-zinc-400 hover:text-white"
                        }`}
                    >
                        📝 Blank CV
                    </button>
                )}
                {(["generate", "improve"] as Mode[]).map((m) => (
                    <button
                        key={m}
                        onClick={() => setMode(m)}
                        disabled={isGuest && m === "improve"}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                            mode === m ? "bg-emerald-500 text-black" : "text-zinc-400 hover:text-white"
                        } ${isGuest && m === "improve" ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                        {m === "generate" ? "✦ Generate from scratch" : "↑ Improve existing"}
                        {!isGuest && plan === "free" && <span className="text-[10px] opacity-60">(Pro)</span>}
                    </button>
                ))}
            </div>

            {/* Guest banner */}
            {isGuest && (
                <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
                    <p className="text-sm font-medium text-white">Try AI CV generation for free</p>
                    <p className="text-xs text-zinc-400 mt-0.5">Generate 1 CV without signing up. Sign up free to download as PDF and generate more.</p>
                </div>
            )}

            {/* Authenticated free user upgrade prompt for AI modes */}
            {!isGuest && plan === "free" && mode !== "blank" && (
                <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <p className="text-sm font-medium text-white">AI features require Pro</p>
                        <p className="text-xs text-zinc-400 mt-0.5">Subscribe to Pro to unlock AI generation, improvement, and job tailoring — $5/month or $49/year.</p>
                    </div>
                    <button
                        onClick={handleUpgrade}
                        disabled={upgrading}
                        className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-50 whitespace-nowrap"
                    >
                        {upgrading ? "Redirecting…" : "Upgrade to Pro — $49/yr"}
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
            </div>
        </div>
    );
}
