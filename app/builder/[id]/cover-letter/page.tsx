"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { CoverLetter } from "@/lib/types";

export default function CoverLetterPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const id = params.id;

    const [jobDescription, setJobDescription] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [coverLetter, setCoverLetter] = useState<CoverLetter | null>(null);
    const [copied, setCopied] = useState(false);
    const [copyError, setCopyError] = useState(false);

    const handleGenerate = async () => {
        if (!jobDescription.trim() || !companyName.trim()) return;
        setError("");
        setLoading(true);
        setCoverLetter(null);
        try {
            const res = await fetch("/api/cover-letter/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cv_id: id, job_description: jobDescription, company_name: companyName }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.code === "PLAN_REQUIRED") {
                    setError("AI features require Pro — upgrade from your dashboard.");
                    return;
                }
                throw new Error(data.error || "Generation failed");
            }
            setCoverLetter(data.coverLetter as CoverLetter);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const coverLetterText = coverLetter
        ? [
            coverLetter.greeting,
            "",
            ...coverLetter.paragraphs.flatMap((p) => [p, ""]),
            coverLetter.closing,
          ].join("\n")
        : "";

    const handleCopy = async () => {
        if (!coverLetterText) return;
        try {
            await navigator.clipboard.writeText(coverLetterText);
            setCopied(true);
            setCopyError(false);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopyError(true);
            setTimeout(() => setCopyError(false), 3000);
        }
    };

    const handleDownloadPdf = () => {
        window.print();
    };

    return (
        <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col gap-8">
            {/* Back button */}
            <button
                onClick={() => router.push(`/builder/${id}`)}
                className="self-start text-sm text-zinc-400 hover:text-white transition flex items-center gap-1"
            >
                ← Back to editor
            </button>

            <div>
                <h1 className="text-2xl font-bold text-white mb-1">AI Cover Letter</h1>
                <p className="text-sm text-zinc-400">
                    Generate a tailored cover letter based on your CV and a job description.
                </p>
            </div>

            {/* Form */}
            <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500">Company name</label>
                    <input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Acme Corp"
                        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500">Job description</label>
                    <textarea
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        maxLength={4000}
                        rows={8}
                        placeholder="Paste the full job description here…"
                        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                </div>
                {error && (
                    <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
                )}
                <button
                    onClick={handleGenerate}
                    disabled={loading || !jobDescription.trim() || !companyName.trim()}
                    className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-60 transition self-end"
                >
                    {loading ? "Generating…" : "Generate Cover Letter ✦"}
                </button>
            </div>

            {/* Loading state */}
            {loading && (
                <div className="flex items-center gap-3 text-zinc-400 text-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Writing your cover letter…
                </div>
            )}

            {/* Result */}
            {coverLetter && (
                <div className="flex flex-col gap-4">
                    {/* Action buttons */}
                    <div className="print:hidden flex gap-3">
                        <button
                            onClick={handleCopy}
                            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-medium hover:bg-zinc-800 transition"
                        >
                            {copied ? "✓ Copied!" : copyError ? "✗ Copy failed" : "⎘ Copy to Clipboard"}
                        </button>
                        <button
                            onClick={handleDownloadPdf}
                            className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-black hover:bg-emerald-400 transition"
                        >
                            ⤓ Download as PDF
                        </button>
                    </div>

                    {/* Cover letter content */}
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 flex flex-col gap-5 print:border-none print:bg-white print:p-0">
                        <p className="text-zinc-100 font-medium">{coverLetter.greeting}</p>
                        {coverLetter.paragraphs.map((p, i) => (
                            <p key={i} className="text-zinc-300 leading-relaxed">{p}</p>
                        ))}
                        <p className="text-zinc-100 font-medium">{coverLetter.closing}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
