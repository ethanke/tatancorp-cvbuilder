"use client";

interface SignupModalProps {
    onClose: () => void;
    loginUrl: string;
}

export default function SignupModal({ onClose, loginUrl }: SignupModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 flex flex-col gap-5">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-white text-lg">Sign up to download your CV</h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
                </div>
                <p className="text-sm text-zinc-400">
                    Your CV is ready! Create a free account to download it as a PDF and save it to your dashboard.
                </p>
                <a
                    href={loginUrl}
                    className="w-full rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black hover:bg-emerald-400 transition text-center"
                >
                    Sign up / Sign in with Google
                </a>
                <p className="text-xs text-zinc-500 text-center">
                    Free account — no credit card required.
                </p>
            </div>
        </div>
    );
}
