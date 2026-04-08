import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { CV } from "@/lib/types";
import CvPreview from "@/app/components/CvPreview";
import Link from "next/link";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cvbuilder.tatancorp.xyz";
const BACKEND = process.env.BACKEND_URL ?? "https://tatancorp.xyz/tatancorp-backend";

async function getPublicCv(id: string): Promise<CV | null> {
  const res = await fetch(`${BACKEND}/cv/${id}/public`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return (data.cv ?? null) as CV | null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const cv = await getPublicCv(id);

  if (!cv) {
    return { title: "CV not found — CV Builder" };
  }

  const name = cv.content.name || "Anonymous";
  const role = cv.content.tagline || cv.target_role || "Professional";
  const title = `${name}'s CV — ${role}`;
  const description = "Professional CV built with AI";
  const url = `${SITE}/cv/${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "CV Builder — TatanCorp",
      type: "profile",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function PublicCvPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cv = await getPublicCv(id);

  if (!cv) notFound();

  return (
    <div className="min-h-screen bg-zinc-950 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <CvPreview cv={cv.content} />
        <footer className="mt-8 text-center text-xs text-zinc-500">
          Built with{" "}
          <Link
            href={SITE}
            className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            CV Builder
          </Link>
          {" "}by TatanCorp
        </footer>
      </div>
    </div>
  );
}
