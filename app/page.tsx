import Link from "next/link";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://tatancorp.xyz/tatancorp-backend";

const features = [
    {
        icon: "✦",
        title: "Generate from scratch",
        desc: "Paste a short bio and target role. GPT-4o writes a complete, polished CV in under 30 seconds.",
    },
    {
        icon: "↑",
        title: "Improve existing CV",
        desc: "Have a rough draft? Paste it in and the AI rewrites every section with stronger language and structure.",
    },
    {
        icon: "⌖",
        title: "Tailor to any job",
        desc: "Paste a job description and get a targeted version of your CV that matches the required skills and keywords.",
    },
    {
        icon: "⤓",
        title: "Export to PDF",
        desc: "One click. Clean, print-ready A4 PDF — no watermarks, no subscriptions.",
    },
];

export default function LandingPage() {
    return (
        <div className="mx-auto max-w-6xl px-6 py-20 flex flex-col gap-24">

            {/* Hero */}
            <section className="flex flex-col items-center text-center gap-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400">
                    Powered by GPT-4o
                </div>
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight max-w-3xl">
                    Your CV, written by{" "}
                    <span className="text-emerald-400">AI</span>
                    {" "}in seconds
                </h1>
                <p className="text-lg text-zinc-400 max-w-xl">
                    Paste a short bio. Get a professional, structured resume ready to tailor and export as PDF.
                    No templates to fight, no formatting headaches.
                </p>
                <div className="flex items-center gap-4 pt-2">
                    <a
                        href={`${BACKEND}/auth/login?next=${encodeURIComponent("https://cvbuilder.tatancorp.xyz/dashboard")}`}
                        className="rounded-xl bg-emerald-500 px-7 py-3 text-base font-semibold text-black transition hover:bg-emerald-400"
                    >
                        Build my CV — free
                    </a>
                    <Link href="#features" className="text-sm text-zinc-400 hover:text-white transition">
                        See how it works →
                    </Link>
                </div>
            </section>

            {/* Mock preview */}
            <section className="relative rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden p-8">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
                <div className="grid md:grid-cols-2 gap-8 relative">
                    {/* Left: input */}
                    <div className="flex flex-col gap-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Your bio</p>
                        <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-4 text-sm text-zinc-300 leading-relaxed">
                            &quot;I&apos;m a software engineer with 4 years of experience building React frontends
                            and Node.js APIs. I&apos;ve led a team of 3 at a fintech startup, shipped a payments
                            product to 50k users, and love clean architecture. Looking for a senior role in a
                            product-led company.&quot;
                        </div>
                        <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-3 text-sm text-zinc-400">
                            Target role: <span className="text-white">Senior Software Engineer</span>
                        </div>
                        <button className="mt-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black w-fit">
                            Generate CV ✦
                        </button>
                    </div>
                    {/* Right: output preview */}
                    <div className="rounded-xl border border-zinc-700 bg-white p-5 text-zinc-900 text-xs leading-relaxed shadow-xl">
                        <p className="font-bold text-base">Alex Chen</p>
                        <p className="text-emerald-700 text-xs mb-3">Senior Software Engineer</p>
                        <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1 font-semibold">Summary</p>
                        <p className="mb-3">Results-driven engineer with 4 years of experience building scalable
                            React frontends and Node.js APIs. Led a team of 3 engineers shipping a payments product
                            to 50k+ users at a fintech startup.</p>
                        <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1 font-semibold">Experience</p>
                        <p className="font-semibold">Lead Frontend Engineer — FinPay</p>
                        <p className="text-zinc-500 text-[10px] mb-1">2022-06 – present</p>
                        <ul className="list-disc pl-4 space-y-0.5 text-zinc-700">
                            <li>Architected React component library used across 4 products</li>
                            <li>Reduced page load time by 40% through code-splitting and caching</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="flex flex-col gap-8">
                <h2 className="text-3xl font-bold text-center">Everything you need</h2>
                <div className="grid sm:grid-cols-2 gap-5">
                    {features.map((f) => (
                        <div key={f.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col gap-3">
                            <span className="text-2xl text-emerald-400">{f.icon}</span>
                            <p className="font-semibold text-white">{f.title}</p>
                            <p className="text-sm text-zinc-400">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="flex flex-col gap-8">
                <div className="text-center">
                    <h2 className="text-3xl font-bold">Simple pricing</h2>
                    <p className="text-zinc-400 text-sm mt-2">Start free. Unlock AI when you&apos;re ready — one payment, forever.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto w-full">
                    {/* Free */}
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col gap-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Free</p>
                        <p className="text-4xl font-bold text-white">$0</p>
                        <ul className="text-sm text-zinc-300 flex flex-col gap-2 mt-2">
                            <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Create &amp; edit CVs manually</li>
                            <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Export to PDF</li>
                            <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Unlimited CVs</li>
                            <li className="flex items-center gap-2"><span className="text-zinc-600">✗</span><span className="text-zinc-500">AI generation</span></li>
                            <li className="flex items-center gap-2"><span className="text-zinc-600">✗</span><span className="text-zinc-500">AI improve &amp; tailor</span></li>
                        </ul>
                        <a
                            href={`${BACKEND}/auth/login?next=${encodeURIComponent("https://cvbuilder.tatancorp.xyz/dashboard")}`}
                            className="mt-auto rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-white text-center transition hover:bg-zinc-800"
                        >
                            Get started
                        </a>
                    </div>
                    {/* Pro */}
                    <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-6 flex flex-col gap-4 relative">
                        <div className="absolute -top-3 right-5 rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-semibold text-black">
                            Best value
                        </div>
                        <p className="text-xs text-emerald-400 uppercase tracking-widest font-medium">Pro — Lifetime</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-white">$9</span>
                            <span className="text-sm text-zinc-500">one-time</span>
                        </div>
                        <ul className="text-sm text-zinc-300 flex flex-col gap-2 mt-2">
                            <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Everything in Free</li>
                            <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> AI-generated CVs from a bio</li>
                            <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> AI improve existing CVs</li>
                            <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Tailor to any job description</li>
                            <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Lifetime access — no subscription</li>
                        </ul>
                        <a
                            href={`${BACKEND}/auth/login?next=${encodeURIComponent("https://cvbuilder.tatancorp.xyz/dashboard?upgrade=1")}`}
                            className="mt-auto rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black text-center transition hover:bg-emerald-400"
                        >
                            Unlock AI — $9
                        </a>
                    </div>
                </div>
            </section>

            {/* CTA footer */}
            <section className="flex flex-col items-center gap-5 text-center py-8">
                <h2 className="text-3xl font-bold">Ready? It takes 30 seconds.</h2>
                <a
                    href={`${BACKEND}/auth/login?next=${encodeURIComponent("https://cvbuilder.tatancorp.xyz/dashboard")}`}
                    className="rounded-xl bg-emerald-500 px-8 py-3 text-base font-semibold text-black transition hover:bg-emerald-400"
                >
                    Get started for free
                </a>
            </section>

        </div>
    );
}
