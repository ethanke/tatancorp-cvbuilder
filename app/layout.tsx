import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import NavAuth from "./components/NavAuth";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
    title: "CV Builder — TatanCorp",
    description: "Build a polished CV in seconds with AI. Generate, improve, and tailor your resume to any job.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
            <body className="min-h-full flex flex-col bg-[#09090b] text-zinc-100">
                <nav className="print:hidden sticky top-0 z-50 border-b border-zinc-800/60 bg-[#09090b]/80 backdrop-blur-md">
                    <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
                            <span className="text-white">CV</span>
                            <span className="text-emerald-400">Builder</span>
                            <span className="text-xs font-normal text-zinc-500 ml-1">by TatanCorp</span>
                        </Link>
                        <NavAuth />
                    </div>
                </nav>
                <main className="flex-1">{children}</main>
            </body>
        </html>
    );
}
