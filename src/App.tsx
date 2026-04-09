import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Link } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import NavAuth from "./components/NavAuth";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import NewCV from "./pages/NewCV";
import EditCV from "./pages/EditCV";
import CoverLetter from "./pages/CoverLetter";
import Callback from "./pages/Callback";
import PublicCV from "./pages/PublicCV";

function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-full flex flex-col bg-[#09090b] text-zinc-100">
            <nav className="print:hidden sticky top-0 z-50 border-b border-zinc-800/60 bg-[#09090b]/80 backdrop-blur-md">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                    <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
                        <span className="text-white">CV</span>
                        <span className="text-emerald-400">Builder</span>
                        <span className="text-xs font-normal text-zinc-500 ml-1">by TatanCorp</span>
                    </Link>
                    <NavAuth />
                </div>
            </nav>
            <main className="flex-1">{children}</main>
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout><Landing /></Layout>} />
                <Route path="/dashboard" element={<Layout><ProtectedRoute><Dashboard /></ProtectedRoute></Layout>} />
                <Route path="/builder/new" element={<Layout><NewCV /></Layout>} />
                <Route path="/builder/:id" element={<Layout><ProtectedRoute><EditCV /></ProtectedRoute></Layout>} />
                <Route path="/builder/:id/cover-letter" element={<Layout><ProtectedRoute><CoverLetter /></ProtectedRoute></Layout>} />
                <Route path="/callback" element={<Callback />} />
                <Route path="/cv/:id" element={<Layout><PublicCV /></Layout>} />
            </Routes>
        </BrowserRouter>
    );
}
