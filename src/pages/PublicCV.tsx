import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import type { CV } from "@/lib/types";
import CvPreview from "@/components/CvPreview";

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "https://tatancorp.xyz/tatancorp-backend";
const SITE = import.meta.env.VITE_APP_URL ?? "https://cvbuilder.tatancorp.xyz";

export default function PublicCV() {
    const { id } = useParams<{ id: string }>();
    const [cv, setCv] = useState<CV | null>(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!id) return;
        fetch(`${BACKEND}/cv/${id}/public`)
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((data) => { if (data.cv) setCv(data.cv); else setNotFound(true); })
            .catch(() => setNotFound(true));
    }, [id]);

    if (notFound) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <p className="text-zinc-400">CV not found.</p>
            </div>
        );
    }

    if (!cv) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex items-center gap-2 text-zinc-500">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Loading…
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 py-10 px-4">
            <div className="max-w-4xl mx-auto">
                <CvPreview cv={cv.content} />
                <footer className="mt-8 text-center text-xs text-zinc-500">
                    Built with{" "}
                    <Link to={SITE} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                        CV Builder
                    </Link>
                    {" "}by TatanCorp
                </footer>
            </div>
        </div>
    );
}
