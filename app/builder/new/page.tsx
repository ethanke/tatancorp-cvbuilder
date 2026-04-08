"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CVContent } from "@/lib/types";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://tatancorp.xyz/tatancorp-backend";

type Mode = "generate" | "improve";

export default function NewCV() {
    const router = useRouter();
    const [mode, setMode] = useState<Mode>("generate");
    const [bio, setBio] = useState("");
    const [existingText, setExistingText] = useState("");
    const [targetRole, setTargetRole] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
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
                throw new Error(d.error || "AI generation failed");
            }
            const { cv }: { cv: CVContent } = await aiRes.json();

            // 2. Save to backend
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

    return (
        <div className="mx-auto max-w-3xl px-6 py-16">
            <div className="mb-10">
                <h1 className="text-3xl font-bold">Create a new CV</h1>
                <p className="text-zinc-400 text-sm mt-1">
                    AI will generate a complete, structured resume for you.
                </p>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-2 mb-8 p-1 rounded-xl bg-zinc-900 border border-zinc-800 w-fit">
                {(["generate", "improve"] as Mode[]).map((m) => (
                    <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition ${mode === m
                                ? "bg-emerald-500 text-black"
                                : "text-zinc-400 hover:text-white"
                            }`}
                    >
                        {m === "generate" ? "✦ Generate from scratch" : "↑ Improve existing"}
                    </button>
                ))}
            </div>

            <div className="flex flex-col gap-5">
                {mode === "generate" ? (
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
                    disabled={loading}
                    className="rounded-xl bg-emerald-500 px-7 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed w-fit"
                >
                    {loading ? (
                        <span className="flex items-center gap-2">
                            <span className="h-3.5 w-3.5 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                            Generating with AI…
                        </span>
                    ) : (
                        mode === "generate" ? "Generate my CV ✦" : "Improve my CV ↑"
                    )}
                </button>
            </div>
        </div>
    );
}
