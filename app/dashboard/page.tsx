"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CV } from "@/lib/types";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://tatancorp.xyz/tatancorp-backend";

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Dashboard() {
    const router = useRouter();
    const [cvs, setCvs] = useState<CV[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetch(`${BACKEND}/auth/me`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .catch(() => router.replace("/"));

        fetch(`${BACKEND}/cv`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((data) => setCvs(data.cvs ?? []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [router]);

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
            <div className="flex items-center justify-between mb-10">
                <div>
                    <h1 className="text-3xl font-bold">Your CVs</h1>
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
