"use client";

interface CreditsDisplayProps {
    remaining: number;
    total: number;
}

export default function CreditsDisplay({ remaining, total }: CreditsDisplayProps) {
    const isEmpty = remaining <= 0;
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                isEmpty
                    ? "bg-red-500/10 text-red-400 border-red-500/30"
                    : "bg-zinc-800 text-zinc-300 border-zinc-700"
            }`}
        >
            ✦ {remaining}/{total} AI credits
        </span>
    );
}
