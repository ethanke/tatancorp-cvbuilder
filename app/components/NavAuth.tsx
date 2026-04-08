"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://tatancorp.xyz/tatancorp-backend";

export default function NavAuth() {
    const [user, setUser] = useState<{ email: string; firstName?: string } | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        fetch(`${BACKEND}/auth/me`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => { if (data?.user) setUser(data.user); })
            .catch(() => { })
            .finally(() => setReady(true));
    }, []);

    if (!ready) return <div className="h-8 w-20 rounded-lg bg-zinc-800 animate-pulse" />;

    if (user) {
        return (
            <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-400">{user.firstName ?? user.email}</span>
                <Link
                    href="/dashboard"
                    className="rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-black transition hover:bg-emerald-400"
                >
                    Dashboard
                </Link>
            </div>
        );
    }

    return (
        <a
            href={`${BACKEND}/auth/login?next=${encodeURIComponent("https://cvbuilder.tatancorp.xyz/dashboard")}`}
            className="rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-black transition hover:bg-emerald-400"
        >
            Sign In
        </a>
    );
}
