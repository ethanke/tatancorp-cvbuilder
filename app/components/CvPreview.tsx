import type { CVContent } from "@/lib/types";

export default function CvPreview({ cv }: { cv: CVContent }) {
    return (
        <div
            id="cv-print-area"
            className="bg-white text-zinc-900 rounded-xl shadow-2xl p-10 text-[13px] leading-relaxed font-[system-ui,sans-serif] min-h-[29.7cm]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
            {/* Header */}
            <div className="border-b-2 border-zinc-800 pb-5 mb-6">
                <h1 className="text-3xl font-bold text-zinc-900">{cv.name || "Your Name"}</h1>
                {cv.tagline && (
                    <p className="text-base text-emerald-700 mt-0.5 font-medium">{cv.tagline}</p>
                )}
                {cv.contact && (
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-3 text-xs text-zinc-500">
                        {cv.contact.email && <span>{cv.contact.email}</span>}
                        {cv.contact.phone && <span>{cv.contact.phone}</span>}
                        {cv.contact.location && <span>{cv.contact.location}</span>}
                        {cv.contact.linkedin && <span>{cv.contact.linkedin}</span>}
                    </div>
                )}
            </div>

            {/* Summary */}
            {cv.summary && (
                <Section title="Summary">
                    <p className="text-zinc-700">{cv.summary}</p>
                </Section>
            )}

            {/* Experience */}
            {cv.experience?.length > 0 && (
                <Section title="Experience">
                    {cv.experience.map((exp, i) => (
                        <div key={i} className={i > 0 ? "mt-4" : ""}>
                            <div className="flex items-baseline justify-between">
                                <p className="font-semibold text-zinc-900">{exp.role}</p>
                                <p className="text-xs text-zinc-400 shrink-0 ml-4">
                                    {exp.start} – {exp.end}
                                </p>
                            </div>
                            <p className="text-zinc-500 text-xs mb-2">{exp.company}</p>
                            {exp.bullets?.length > 0 && (
                                <ul className="list-disc pl-5 space-y-0.5 text-zinc-700">
                                    {exp.bullets.map((b, j) => <li key={j}>{b}</li>)}
                                </ul>
                            )}
                        </div>
                    ))}
                </Section>
            )}

            {/* Education */}
            {cv.education?.length > 0 && (
                <Section title="Education">
                    {cv.education.map((edu, i) => (
                        <div key={i} className={i > 0 ? "mt-2" : ""}>
                            <div className="flex items-baseline justify-between">
                                <p className="font-semibold text-zinc-900">{edu.school}</p>
                                <p className="text-xs text-zinc-400">{edu.year}</p>
                            </div>
                            <p className="text-zinc-500 text-xs">{edu.degree}{edu.field ? `, ${edu.field}` : ""}</p>
                        </div>
                    ))}
                </Section>
            )}

            {/* Skills */}
            {cv.skills?.length > 0 && (
                <Section title="Skills">
                    <div className="flex flex-wrap gap-2">
                        {cv.skills.map((s, i) => (
                            <span key={i} className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs text-zinc-700">
                                {s}
                            </span>
                        ))}
                    </div>
                </Section>
            )}

            {/* Projects */}
            {cv.projects?.length > 0 && (
                <Section title="Projects">
                    {cv.projects.map((p, i) => (
                        <div key={i} className={i > 0 ? "mt-3" : ""}>
                            <div className="flex items-baseline gap-2">
                                <p className="font-semibold text-zinc-900">{p.name}</p>
                                {p.url && (
                                    <a href={p.url} className="text-xs text-emerald-700 hover:underline" target="_blank" rel="noreferrer">
                                        {p.url}
                                    </a>
                                )}
                            </div>
                            <p className="text-zinc-700 text-xs">{p.description}</p>
                        </div>
                    ))}
                </Section>
            )}
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 border-b border-zinc-200 pb-1">
                {title}
            </h2>
            {children}
        </div>
    );
}
