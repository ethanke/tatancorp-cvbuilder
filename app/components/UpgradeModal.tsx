"use client";

interface UpgradeModalProps {
    open: boolean;
    onClose: () => void;
    onUpgrade: () => void;
    upgrading: boolean;
}

export default function UpgradeModal({ open, onClose, onUpgrade, upgrading }: UpgradeModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 flex flex-col gap-5">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-white text-lg">AI Credits Exhausted</h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
                </div>
                <div className="flex flex-col gap-2">
                    <p className="text-sm text-white font-medium">You&apos;ve used all 3 free AI credits.</p>
                    <p className="text-sm text-zinc-400">
                        Upgrade to Pro for unlimited AI generations — generate, improve, and tailor CVs as many times as you want with a one-time $9 payment.
                    </p>
                </div>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition"
                    >
                        Maybe later
                    </button>
                    <button
                        onClick={onUpgrade}
                        disabled={upgrading}
                        className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-50"
                    >
                        {upgrading ? "Redirecting…" : "Upgrade to Pro — $9"}
                    </button>
                </div>
            </div>
        </div>
    );
}
