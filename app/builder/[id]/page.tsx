"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import type { CV, CVContent, CVExperience, CVEducation, CVProject } from "@/lib/types";
import CvPreview from "@/app/components/CvPreview";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://tatancorp.xyz/tatancorp-backend";

type SaveStatus = "saved" | "saving" | "unsaved";

// ── Helpers ─────────────────────────────────────────────────────────
function Input({ label, value, onChange, placeholder, className = "" }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; className?: string;
}) {
    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            <label className="text-xs text-zinc-500">{label}</label>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
        </div>
    );
}

function Textarea({ label, value, onChange, rows = 3 }: {
    label: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500">{label}</label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={rows}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 resize-none"
            />
        </div>
    );
}

// ── Main editor component ────────────────────────────────────────────
export default function BuilderEditor() {
    const params = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = params.id;

    const [cv, setCv] = useState<CV | null>(null);
    const [content, setContent] = useState<CVContent | null>(null);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
    const [tailorOpen, setTailorOpen] = useState(searchParams.get("tailor") === "1");
    const [jobDesc, setJobDesc] = useState("");
    const [tailoring, setTailoring] = useState(false);
    const [tailorError, setTailorError] = useState("");
    const [plan, setPlan] = useState<"free" | "pro" | null>(null);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        fetch(`${BACKEND}/cv/${id}`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((data: { cv: CV }) => { setCv(data.cv); setContent(data.cv.content); })
            .catch(() => router.replace("/dashboard"));

        fetch(`${BACKEND}/payments/status`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((data) => setPlan(data.plan ?? "free"))
            .catch(() => setPlan("free"));
    }, [id, router]);

    const doSave = useCallback((c: CVContent) => {
        setSaveStatus("saving");
        fetch(`${BACKEND}/cv/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ content: c }),
        })
            .then(() => setSaveStatus("saved"))
            .catch(() => setSaveStatus("unsaved"));
    }, [id]);

    const update = useCallback((patch: Partial<CVContent>) => {
        setContent((prev) => {
            if (!prev) return prev;
            const next = { ...prev, ...patch };
            setSaveStatus("unsaved");
            if (saveTimer.current) clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(() => doSave(next), 1000);
            return next;
        });
    }, [doSave]);

    const handleTailor = async () => {
        if (!content || !jobDesc.trim()) return;
        setTailorError("");
        setTailoring(true);
        try {
            const res = await fetch(`/api/cv/${id}/tailor`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobDescription: jobDesc, cvContent: content }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.code === "PLAN_REQUIRED") {
                    setTailorError("AI features require Pro — upgrade from your dashboard for $9.");
                    setTailoring(false);
                    return;
                }
                throw new Error(data.error || "Tailor failed");
            }
            if (data.newId) {
                router.push(`/builder/${data.newId}`);
            }
        } catch (e: unknown) {
            setTailorError(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setTailoring(false);
        }
    };

    if (!cv || !content) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex items-center gap-2 text-zinc-500">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Loading editor…
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-65px)]">
            {/* ── Top bar ───────────────────────────────────────────────── */}
            <div className="print:hidden flex items-center gap-4 px-6 py-3 border-b border-zinc-800 bg-[#09090b]/80 backdrop-blur-md shrink-0">
                <div className="flex-1 min-w-0">
                    <input
                        value={cv.title}
                        onChange={(e) => setCv({ ...cv, title: e.target.value })}
                        onBlur={() => {
                            fetch(`${BACKEND}/cv/${id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                credentials: "include",
                                body: JSON.stringify({ title: cv.title }),
                            });
                        }}
                        className="bg-transparent text-sm font-semibold text-white w-full focus:outline-none truncate"
                    />
                </div>
                <span className={`text-xs shrink-0 ${saveStatus === "saved" ? "text-emerald-500" :
                        saveStatus === "saving" ? "text-zinc-400" : "text-amber-400"
                    }`}>
                    {saveStatus === "saved" ? "✓ Saved" : saveStatus === "saving" ? "Saving…" : "Unsaved"}
                </span>
                <button
                    onClick={() => setTailorOpen(true)}
                    className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium hover:bg-zinc-800 transition"
                >
                    ⌖ Tailor to job {plan === "free" && <span className="text-zinc-500">(Pro)</span>}
                </button>
                <button
                    onClick={() => router.push(`/builder/${id}/cover-letter`)}
                    className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium hover:bg-zinc-800 transition"
                >
                    ✦ Cover Letter {plan === "free" && <span className="text-zinc-500">(Pro)</span>}
                </button>
                <button
                    onClick={() => window.print()}
                    className="shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400 transition"
                >
                    ⤓ Download PDF
                </button>
            </div>

            {/* ── Two-column layout ─────────────────────────────────────── */}
            <div className="flex-1 overflow-hidden flex">
                {/* Left: edit panel */}
                <div className="w-105 shrink-0 overflow-y-auto border-r border-zinc-800 p-6 flex flex-col gap-8">

                    {/* Identity */}
                    <section>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Identity</h3>
                        <div className="flex flex-col gap-3">
                            <Input label="Full name" value={content.name} onChange={(v) => update({ name: v })} />
                            <Input label="Tagline / headline" value={content.tagline} onChange={(v) => update({ tagline: v })} />
                        </div>
                    </section>

                    {/* Contact */}
                    <section>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Contact</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <Input label="Email" value={content.contact.email} onChange={(v) => update({ contact: { ...content.contact, email: v } })} />
                            <Input label="Phone" value={content.contact.phone} onChange={(v) => update({ contact: { ...content.contact, phone: v } })} />
                            <Input label="Location" value={content.contact.location} onChange={(v) => update({ contact: { ...content.contact, location: v } })} />
                            <Input label="LinkedIn" value={content.contact.linkedin} onChange={(v) => update({ contact: { ...content.contact, linkedin: v } })} />
                        </div>
                    </section>

                    {/* Summary */}
                    <section>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Summary</h3>
                        <Textarea label="" value={content.summary} onChange={(v) => update({ summary: v })} rows={4} />
                    </section>

                    {/* Experience */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Experience</h3>
                            <button
                                onClick={() => update({ experience: [...content.experience, { company: "", role: "", start: "", end: "present", bullets: [""] }] })}
                                className="text-xs text-emerald-400 hover:text-emerald-300"
                            >+ Add</button>
                        </div>
                        {content.experience.map((exp, i) => (
                            <ExperienceCard
                                key={i} exp={exp}
                                onChange={(e) => {
                                    const next = [...content.experience];
                                    next[i] = e;
                                    update({ experience: next });
                                }}
                                onRemove={() => update({ experience: content.experience.filter((_, j) => j !== i) })}
                            />
                        ))}
                    </section>

                    {/* Education */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Education</h3>
                            <button
                                onClick={() => update({ education: [...content.education, { school: "", degree: "", field: "", year: "" }] })}
                                className="text-xs text-emerald-400 hover:text-emerald-300"
                            >+ Add</button>
                        </div>
                        {content.education.map((edu, i) => (
                            <EducationCard
                                key={i} edu={edu}
                                onChange={(e) => {
                                    const next = [...content.education];
                                    next[i] = e;
                                    update({ education: next });
                                }}
                                onRemove={() => update({ education: content.education.filter((_, j) => j !== i) })}
                            />
                        ))}
                    </section>

                    {/* Skills */}
                    <section>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Skills</h3>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-zinc-500">Comma-separated</label>
                            <input
                                value={content.skills.join(", ")}
                                onChange={(e) => update({ skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                                placeholder="React, TypeScript, Node.js, SQL…"
                                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                    </section>

                    {/* Projects */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Projects</h3>
                            <button
                                onClick={() => update({ projects: [...content.projects, { name: "", description: "", url: null }] })}
                                className="text-xs text-emerald-400 hover:text-emerald-300"
                            >+ Add</button>
                        </div>
                        {content.projects.map((proj, i) => (
                            <ProjectCard
                                key={i} proj={proj}
                                onChange={(p) => {
                                    const next = [...content.projects];
                                    next[i] = p;
                                    update({ projects: next });
                                }}
                                onRemove={() => update({ projects: content.projects.filter((_, j) => j !== i) })}
                            />
                        ))}
                    </section>

                </div>

                {/* Right: live preview */}
                <div className="flex-1 overflow-y-auto bg-zinc-950 p-8 print:p-0 print:bg-white">
                    <div className="max-w-195 mx-auto print:max-w-none">
                        <CvPreview cv={content} />
                    </div>
                </div>
            </div>

            {/* ── Tailor modal ─────────────────────────────────────────── */}
            {tailorOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 flex flex-col gap-5">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-white">Tailor to a job description</h2>
                            <button onClick={() => setTailorOpen(false)} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
                        </div>
                        <p className="text-sm text-zinc-400">
                            Paste the job description below. The AI will create a <strong className="text-white">new tailored copy</strong> of your CV — your original is untouched.
                        </p>
                        <textarea
                            value={jobDesc}
                            onChange={(e) => setJobDesc(e.target.value)}
                            maxLength={4000}
                            rows={8}
                            placeholder="Paste the full job description here…"
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 resize-none"
                        />
                        {tailorError && (
                            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{tailorError}</p>
                        )}
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setTailorOpen(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition">
                                Cancel
                            </button>
                            <button
                                onClick={handleTailor}
                                disabled={tailoring || !jobDesc.trim()}
                                className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-60 transition"
                            >
                                {tailoring ? "Tailoring…" : "Tailor CV ⌖"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────
function ExperienceCard({ exp, onChange, onRemove }: { exp: CVExperience; onChange: (e: CVExperience) => void; onRemove: () => void }) {
    return (
        <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
                <Input label="Company" value={exp.company} onChange={(v) => onChange({ ...exp, company: v })} />
                <Input label="Role / Title" value={exp.role} onChange={(v) => onChange({ ...exp, role: v })} />
                <Input label="Start (YYYY-MM)" value={exp.start} onChange={(v) => onChange({ ...exp, start: v })} placeholder="2022-06" />
                <Input label="End" value={exp.end} onChange={(v) => onChange({ ...exp, end: v })} placeholder="present" />
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500">Bullets (one per line)</label>
                <textarea
                    value={exp.bullets.join("\n")}
                    onChange={(e) => onChange({ ...exp, bullets: e.target.value.split("\n") })}
                    rows={3}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 resize-none"
                />
            </div>
            <button onClick={onRemove} className="text-xs text-red-400 hover:text-red-300 self-end">Remove</button>
        </div>
    );
}

function EducationCard({ edu, onChange, onRemove }: { edu: CVEducation; onChange: (e: CVEducation) => void; onRemove: () => void }) {
    return (
        <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
                <Input label="School" value={edu.school} onChange={(v) => onChange({ ...edu, school: v })} />
                <Input label="Year" value={edu.year} onChange={(v) => onChange({ ...edu, year: v })} placeholder="2020" />
                <Input label="Degree" value={edu.degree} onChange={(v) => onChange({ ...edu, degree: v })} placeholder="B.Sc." />
                <Input label="Field" value={edu.field} onChange={(v) => onChange({ ...edu, field: v })} placeholder="Computer Science" />
            </div>
            <button onClick={onRemove} className="text-xs text-red-400 hover:text-red-300 self-end">Remove</button>
        </div>
    );
}

function ProjectCard({ proj, onChange, onRemove }: { proj: CVProject; onChange: (p: CVProject) => void; onRemove: () => void }) {
    return (
        <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-3">
            <Input label="Project name" value={proj.name} onChange={(v) => onChange({ ...proj, name: v })} />
            <Input label="URL (optional)" value={proj.url ?? ""} onChange={(v) => onChange({ ...proj, url: v || null })} placeholder="https://…" />
            <Textarea label="Description" value={proj.description} onChange={(v) => onChange({ ...proj, description: v })} rows={2} />
            <button onClick={onRemove} className="text-xs text-red-400 hover:text-red-300 self-end">Remove</button>
        </div>
    );
}
