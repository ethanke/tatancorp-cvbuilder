"use client";
import { useState } from "react";

interface UpgradeModalProps {
    onClose: () => void;
}

export default function UpgradeModal({ onClose }: UpgradeModalProps) {
    const [upgrading, setUpgrading] = useState<"monthly" | "annual" | null>(null);

    const handleUpgrade = async (plan: "monthly" | "annual") => {
        setUpgrading(plan);
        try {
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan }),
            });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
        } catch { /* ignore */ }
        setUpgrading(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 flex flex-col gap-5">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-white text-lg">You&apos;ve used all 3 free AI credits</h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
                </div>
                <p className="text-sm text-zinc-400">
                    Upgrade to Pro to get unlimited AI CV generation, improvement, and job tailoring.
                </p>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => handleUpgrade("monthly")}
                        disabled={upgrading !== null}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 transition text-left flex items-center justify-between"
                    >
                        <span>Pro Monthly</span>
                        <span className="text-emerald-400 font-semibold">$5 / month</span>
                    </button>
                    <button
                        onClick={() => handleUpgrade("annual")}
                        disabled={upgrading !== null}
                        className="w-full rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition flex items-center justify-between"
                    >
                        <span className="flex items-center gap-2">
                            Pro Annual
                            <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px]">Save 18%</span>
                        </span>
                        <span>$49 / year</span>
                    </button>
                </div>
                {upgrading && (
                    <p className="text-xs text-zinc-500 text-center">Redirecting to checkout…</p>
                )}
            </div>
        </div>
    );
}
