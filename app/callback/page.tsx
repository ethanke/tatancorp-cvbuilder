"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://tatancorp.xyz/tatancorp-backend";

const GUEST_CV_KEY = "guest_cv";
const GUEST_GENERATED_KEY = "guest_cv_generated";

export default function CallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState<"migrating" | "done" | "error">("migrating");

    useEffect(() => {
        async function migrateGuestCv() {
            try {
                const stored = localStorage.getItem(GUEST_CV_KEY);
                if (!stored) {
                    // No guest CV to migrate — go to dashboard
                    router.replace("/dashboard");
                    return;
                }

                const { title, target_role, content } = JSON.parse(stored);

                const res = await fetch(`${BACKEND}/cv`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ title, target_role, content }),
                });

                if (!res.ok) {
                    // Save failed (e.g. not yet authenticated) — go to dashboard anyway
                    router.replace("/dashboard");
                    return;
                }

                const { id } = await res.json();

                // Clear guest CV from localStorage
                localStorage.removeItem(GUEST_CV_KEY);
                localStorage.removeItem(GUEST_GENERATED_KEY);

                setStatus("done");
                router.replace(`/builder/${id}`);
            } catch {
                setStatus("error");
                router.replace("/dashboard");
            }
        }

        migrateGuestCv();
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4 text-center">
                {status === "migrating" && (
                    <>
                        <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
                        <p className="text-zinc-400 text-sm">Saving your CV to your account…</p>
                    </>
                )}
                {status === "error" && (
                    <p className="text-zinc-400 text-sm">Redirecting to your dashboard…</p>
                )}
            </div>
        </div>
    );
}
