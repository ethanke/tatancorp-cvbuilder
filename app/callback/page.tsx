"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://tatancorp.xyz/tatancorp-backend";

export default function CallbackPage() {
    const router = useRouter();

    useEffect(() => {
        let storedCv: string | null = null;
        try {
            storedCv = localStorage.getItem("guest_cv");
        } catch {
            // ignore localStorage errors
        }

        if (!storedCv) {
            router.replace("/dashboard");
            return;
        }

        let cv: unknown;
        try {
            cv = JSON.parse(storedCv);
        } catch {
            // Corrupt data — clear and redirect
            try {
                localStorage.removeItem("guest_cv");
                localStorage.removeItem("guest_cv_generated");
            } catch { /* ignore */ }
            router.replace("/dashboard");
            return;
        }

        fetch(`${BACKEND}/cv`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                title: (cv as { name?: string }).name
                    ? `${(cv as { name: string }).name} — CV`
                    : "My CV",
                target_role: "",
                content: cv,
            }),
        })
            .then((r) => (r.ok ? r.json() : Promise.reject(r)))
            .then(({ id }: { id: string }) => {
                try {
                    localStorage.removeItem("guest_cv");
                    localStorage.removeItem("guest_cv_generated");
                } catch { /* ignore */ }
                router.replace(`/builder/${id}`);
            })
            .catch(() => {
                router.replace("/dashboard");
            });
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex items-center gap-3 text-zinc-400">
                <span className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
                Setting up your account…
            </div>
        </div>
    );
}
