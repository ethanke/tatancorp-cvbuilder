import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { CVContent } from "@/lib/types";
import { EMPTY_CV_CONTENT } from "@/lib/types";
import CreditsDisplay from "@/components/CreditsDisplay";
import UpgradeModal from "@/components/UpgradeModal";
import SignupModal from "@/components/SignupModal";
import CvPreview from "@/components/CvPreview";

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "https://tatancorp.xyz/tatancorp-backend";
const SITE = import.meta.env.VITE_APP_URL ?? "https://cvbuilder.tatancorp.xyz";

type Mode = "generate" | "improve" | "blank";

export default function NewCV() {
    const navigate = useNavigate();
    const [mode, setMode] = useState<Mode>("generate");
    const [bio, setBio] = useState("");
    const [existingText, setExistingText] = useState("");
    const [targetRole, setTargetRole] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [plan, setPlan] = useState<"free" | "monthly" | "annual" | null>(null);
    const [credits, setCredits] = useState<{ remaining: number; total: number } | null>(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const [isGuest, setIsGuest] = useState(false);
    const [guestCv, setGuestCv] = useState<CVContent | null>(null);
    const [guestAlreadyGenerated, setGuestAlreadyGenerated] = useState(false);
    const [showSignupModal, setShowSignupModal] = useState(false);

    useEffect(() => {
        fetch(`${BACKEND}/auth/me`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data?.user) {
                    setIsGuest(false);
                    fetch(`${BACKEND}/payments/status`, { credentials: "include" })
                        .then((r) => (r.ok ? r.json() : Promise.reject()))
                        .then((d) => {
                            const p = d.plan;
                            if (p === "monthly" || p === "annual") { setPlan(p); } else { setPlan("free"); }
                        })
                        .catch(() => setPlan("free"));
                } else {
                    setIsGuest(true);
                    const stored = localStorage.getItem("guest_cv");
                    const alreadyGenerated = localStorage.getItem("guest_cv_generated") === "true";
                    if (stored) { try { setGuestCv(JSON.parse(stored) as CVContent); } catch { /* ignore */ } }
                    setGuestAlreadyGenerated(alreadyGenerated);
                }
            })
            .catch(() => { setIsGuest(true); });
    }, []);

    useEffect(() => {
        if (plan === "free") {
            fetch(`${BACKEND}/payments/ai/credits`, { credentials: "include" })
                .then((r) => (r.ok ? r.json() : Promise.reject()))
                .then((data) => setCredits({ remaining: data.remaining, total: data.total }))
                .catch(() => setCredits({ remaining: 0, total: 3 }));
        }
    }, [plan]);

    const handleBlankCreate = async () => {
        setLoading(true);
        setError("");
        try {
            const saveRes = await fetch(`${BACKEND}/cv`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ title: targetRole ? `${targetRole} — CV` : "My CV", target_role: targetRole, content: EMPTY_CV_CONTENT }),
            });
            if (!saveRes.ok) throw new Error("Failed to save CV");
            const { id } = await saveRes.json();
            navigate(`/builder/${id}`);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong");
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (mode === "blank") { return handleBlankCreate(); }
        setError("");
        const text = mode === "generate" ? bio : existingText;
        if (!text.trim()) {
            setError(mode === "generate" ? "Please describe yourself." : "Please paste your existing CV text.");
            return;
        }
        setLoading(true);
        try {
            const aiRes = await fetch(mode === "generate" ? `${BACKEND}/cv/generate` : `${BACKEND}/cv/improve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(mode === "generate" ? { bio: text, targetRole } : { text, targetRole }),
            });
            if (!aiRes.ok) {
                const d = await aiRes.json();
                if (d.code === "ai_credits_exhausted") { setShowUpgradeModal(true); setLoading(false); return; }
                if (d.code === "PLAN_REQUIRED") { setShowUpgradeModal(true); setLoading(false); return; }
                throw new Error(d.error || "AI generation failed");
            }
            const { cv }: { cv: CVContent } = await aiRes.json();

            if (isGuest) {
                localStorage.setItem("guest_cv", JSON.stringify(cv));
                localStorage.setItem("guest_cv_generated", "true");
                setGuestCv(cv);
                setGuestAlreadyGenerated(true);
                setLoading(false);
                return;
            }

            const saveRes = await fetch(`${BACKEND}/cv`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ title: cv.name ? `${cv.name} — ${targetRole || "CV"}` : (targetRole || "My CV"), target_role: targetRole, content: cv }),
            });
            if (!saveRes.ok) throw new Error("Failed to save CV");
            const { id } = await saveRes.json();
            navigate(`/builder/${id}`);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong");
            setLoading(false);
        }
    };

    const creditsExhausted = plan === "free" && credits !== null && credits.remaining <= 0;
    const loginUrl = `${BACKEND}/auth/login?next=${encodeURIComponent(`${SITE}/callback`)}`;

    return (
        <div className="mx-auto max-w-3xl px-6 py-16">
            {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}
            {showSignupModal && <SignupModal onClose={() => setShowSignupModal(false)} loginUrl={loginUrl} />}

            <div className="mb-10">
                <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-3xl font-bold">Create a new CV</h1>
                    {plan === "free" && credits !== null && <CreditsDisplay remaining={credits.remaining} total={credits.total} />}
                </div>
                <p className="text-zinc-400 text-sm mt-1">AI will generate a complete, structured resume for you.</p>
            </div>

            <div className="flex gap-2 mb-8 p-1 rounded-xl bg-zinc-900 border border-zinc-800 w-fit">
                {!isGuest && (
                    <button onClick={() => setMode("blank")} className={`px-5 py-2 rounded-lg text-sm font-medium transition ${mode === "blank" ? "bg-emerald-500 text-black" : "text-zinc-400 hover:text-white"}`}>
                        📝 Blank CV
                    </button>
                )}
                {(["generate", "improve"] as Mode[]).map((m) => (
                    <button key={m} onClick={() => (!isGuest || m === "generate") && setMode(m)} disabled={isGuest && m === "improve"}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${mode === m ? "bg-emerald-500 text-black" : "text-zinc-400 hover:text-white"} ${isGuest && m === "improve" ? "opacity-40 cursor-not-allowed" : ""}`}>
                        {m === "generate" ? "✦ Generate from scratch" : "↑ Improve existing"}
                        {creditsExhausted && <span className="text-[10px] opacity-60">(no credits)</span>}
                    </button>
                ))}
            </div>

            {creditsExhausted && mode !== "blank" && (
                <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <p className="text-sm font-medium text-white">You&apos;ve used all 3 free AI credits</p>
                        <p className="text-xs text-zinc-400 mt-0.5">Upgrade to Pro for unlimited AI generation, improvement, and job tailoring — $5/month or $49/year.</p>
                    </div>
                    <button onClick={() => setShowUpgradeModal(true)} className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 whitespace-nowrap">
                        Upgrade to Pro
                    </button>
                </div>
            )}

            {isGuest && guestCv && (
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-zinc-400">Your CV preview — sign up to download as PDF.</p>
                        <button onClick={() => setShowSignupModal(true)} className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400">
                            Download PDF ↓
                        </button>
                    </div>
                    <CvPreview cv={guestCv} />
                </div>
            )}

            {!(isGuest && guestAlreadyGenerated) && (
                <div className="flex flex-col gap-5">
                    {mode === "blank" ? (
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-zinc-300">CV title <span className="text-zinc-500 font-normal">(you&apos;ll fill in the details in the editor)</span></label>
                            <p className="text-sm text-zinc-400">Creates an empty CV template. You&apos;ll edit each section manually — name, experience, education, skills, etc.</p>
                        </div>
                    ) : mode === "generate" ? (
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-zinc-300">Tell us about yourself <span className="text-zinc-500 font-normal">(2–3 sentences is enough)</span></label>
                            <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={2000} rows={6}
                                placeholder="e.g. I'm a software engineer with 4 years of experience building React frontends. I led a team at a fintech startup, shipped products to 50k users, and am looking for a senior role..."
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 resize-none" />
                            <p className="text-xs text-zinc-600 text-right">{bio.length}/2000</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-zinc-300">Paste your existing CV text</label>
                            <textarea value={existingText} onChange={(e) => setExistingText(e.target.value)} maxLength={4000} rows={10}
                                placeholder="Paste your current resume text here — any format is fine..."
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 resize-none" />
                            <p className="text-xs text-zinc-600 text-right">{existingText.length}/4000</p>
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-zinc-300">Target role <span className="text-zinc-500 font-normal">(optional but recommended)</span></label>
                        <input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} maxLength={200}
                            placeholder="e.g. Senior Software Engineer, Product Manager, UX Designer…"
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500" />
                    </div>

                    {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}

                    <button onClick={handleSubmit} disabled={loading || (creditsExhausted && mode !== "blank")}
                        className="rounded-xl bg-emerald-500 px-7 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed w-fit">
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
            )}

            {isGuest && guestAlreadyGenerated && (
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-zinc-400">
                        Want a different result?{" "}
                        <button onClick={() => { localStorage.removeItem("guest_cv"); localStorage.removeItem("guest_cv_generated"); setGuestCv(null); setGuestAlreadyGenerated(false); setBio(""); }} className="text-emerald-400 hover:text-emerald-300 underline">
                            Start over
                        </button>
                    </p>
                    <button onClick={() => setShowSignupModal(true)} className="rounded-xl bg-emerald-500 px-7 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 w-fit">
                        Sign up to download PDF ↓
                    </button>
                </div>
            )}
        </div>
    );
}
