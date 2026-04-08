"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://tatancorp.xyz/tatancorp-backend";

export default function Callback() {
    const router = useRouter();

    useEffect(() => {
        const raw = localStorage.getItem("guest_cv");
        if (!raw) {
            router.replace("/dashboard");
            return;
        }

        let cv: unknown;
        try {
            cv = JSON.parse(raw);
        } catch {
            router.replace("/dashboard");
            return;
        }

        fetch(`${BACKEND}/cv`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                title: (cv as { name?: string }).name
                    ? `${(cv as { name?: string }).name} — CV`
                    : "My CV",
                target_role: "",
                content: cv,
            }),
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to save CV");
                return res.json();
            })
            .then(({ id }: { id: string }) => {
                localStorage.removeItem("guest_cv");
                localStorage.removeItem("guest_cv_generated");
                router.replace(`/builder/${id}`);
            })
            .catch(() => {
                router.replace("/dashboard");
            });
    }, [router]);

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="flex items-center gap-3 text-zinc-400">
                <span className="h-5 w-5 rounded-full border-2 border-zinc-600 border-t-emerald-400 animate-spin" />
                <span>Setting up your account…</span>
            </div>
        </div>
    );
}
