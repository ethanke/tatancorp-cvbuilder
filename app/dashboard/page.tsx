"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { CV } from "@/lib/types";
import CreditsDisplay from "@/app/components/CreditsDisplay";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://tatancorp.xyz/tatancorp-backend";

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Dashboard() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [cvs, setCvs] = useState<CV[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [plan, setPlan] = useState<"free" | "pro" | null>(null);
    const [aiCredits, setAiCredits] = useState<number | null>(null);
    const [aiCreditsTotal, setAiCreditsTotal] = useState(3);
    const [upgrading, setUpgrading] = useState(false);
    const justUpgraded = searchParams.get("upgraded") === "1";

    useEffect(() => {
        fetch(`${BACKEND}/auth/me`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .catch(() => router.replace("/"));

        fetch(`${BACKEND}/cv`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((data) => setCvs(data.cvs ?? []))
            .catch(() => { })
            .finally(() => setLoading(false));

        fetch(`${BACKEND}/payments/status`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((data) => setPlan(data.plan ?? "free"))
            .catch(() => setPlan("free"));

        fetch("/api/credits", { credentials: "include" })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((data) => {
                setAiCredits(typeof data.remaining === "number" ? data.remaining : null);
                setAiCreditsTotal(typeof data.total === "number" ? data.total : 3);
            })
            .catch(() => {});

        // Auto-trigger checkout if redirected with ?upgrade=1
        if (searchParams.get("upgrade") === "1" && !justUpgraded) {
            handleUpgrade();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    const handleUpgrade = async () => {
        setUpgrading(true);
        try {
            const res = await fetch("/api/checkout", { method: "POST" });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else if (data.error === "already_pro") {
                setPlan("pro");
            }
        } catch { /* ignore */ }
        setUpgrading(false);
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
        setDeleting(id);
        await fetch(`${BACKEND}/cv/${id}`, { method: "DELETE", credentials: "include" });
        setCvs((prev) => prev.filter((c) => c.id !== id));
        setDeleting(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex items-center gap-2 text-zinc-500">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Loading your CVs…
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl px-6 py-16">
            {/* Upgrade success banner */}
            {justUpgraded && plan === "pro" && (
                <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm text-emerald-300 flex items-center gap-2">
                    <span className="text-lg">✦</span>
                    Welcome to Pro! AI features are now unlocked forever.
                </div>
            )}

            {/* Free tier upgrade prompt */}
            {plan === "free" && (
                <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <p className="text-sm font-medium text-white">Unlock AI-powered CV generation</p>
                        <p className="text-xs text-zinc-400 mt-0.5">Generate, improve, and tailor CVs with AI — one-time $9 payment, forever.</p>
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

            <div className="flex items-center justify-between mb-10">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold">Your CVs</h1>
                        {plan && (
                            <>
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                    plan === "pro"
                                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                        : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                                }`}>
                                    {plan === "pro" ? "✦ Pro" : "Free"}
                                </span>
                                <CreditsDisplay plan={plan} remaining={aiCredits} total={aiCreditsTotal} />
                            </>
                        )}
                    </div>
                    <p className="text-zinc-400 text-sm mt-1">{cvs.length} saved resume{cvs.length !== 1 ? "s" : ""}</p>
                </div>
                <Link
                    href="/builder/new"
                    className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400"
                >
                    + New CV
                </Link>
            </div>

            {cvs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 text-center border border-dashed border-zinc-800 rounded-2xl">
                    <span className="text-5xl">📄</span>
                    <p className="text-lg font-semibold text-white">No CVs yet</p>
                    <p className="text-zinc-400 text-sm max-w-xs">Create your first AI-generated CV in under 30 seconds.</p>
                    <Link
                        href="/builder/new"
                        className="mt-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400"
                    >
                        Build my CV
                    </Link>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {cvs.map((cv) => (
                        <div
                            key={cv.id}
                            className="group rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 flex flex-col gap-4 hover:border-zinc-700 transition"
                        >
                            <div className="flex-1">
                                <p className="font-semibold text-white text-base leading-snug">{cv.title}</p>
                                {cv.target_role && (
                                    <p className="text-xs text-emerald-400 mt-0.5">{cv.target_role}</p>
                                )}
                                <p className="text-xs text-zinc-500 mt-2">Updated {formatDate(cv.updated_at)}</p>
                            </div>
                            <div className="flex items-center gap-3 pt-2 border-t border-zinc-800">
                                <Link
                                    href={`/builder/${cv.id}`}
                                    className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-medium transition"
                                >
                                    Edit
                                </Link>
                                <Link
                                    href={`/builder/${cv.id}?tailor=1`}
                                    className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-medium transition"
                                >
                                    Tailor
                                </Link>
                                <button
                                    onClick={() => handleDelete(cv.id, cv.title)}
                                    disabled={deleting === cv.id}
                                    className="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
                                >
                                    {deleting === cv.id ? "Deleting…" : "Delete"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
