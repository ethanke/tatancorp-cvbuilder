"use client";

interface CreditsDisplayProps {
    plan: "free" | "pro" | null;
    remaining: number | null;
    total: number;
}

export default function CreditsDisplay({ plan, remaining, total }: CreditsDisplayProps) {
    if (!plan) return null;

    if (plan === "pro") {
        return (
            <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                ✦ AI: Unlimited
            </span>
        );
    }

    if (remaining === null) return null;

    const isEmpty = remaining <= 0;
    return (
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
            isEmpty
                ? "bg-red-500/10 text-red-400 border-red-500/30"
                : "bg-zinc-800 text-zinc-300 border-zinc-700"
        }`}>
            AI Credits: {remaining}/{total} remaining
        </span>
    );
}
