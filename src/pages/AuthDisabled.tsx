import { Home, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AuthDisabled() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-900/95 p-10 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="mb-8 flex items-center gap-3 text-cyan-300">
          <Home className="h-10 w-10" />
          <div>
            <h1 className="text-3xl font-bold">Authentication Disabled</h1>
            <p className="text-slate-400">Login and signup are temporarily switched off so you can test other features.</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-700/80 bg-slate-950/90 p-6 text-slate-300">
          <p className="mb-4">The login portal is currently unavailable. Please use the home page, resources page, or come back later when authentication is re-enabled.</p>
          <ul className="space-y-3 text-sm text-slate-400">
            <li>• Browse educational resources</li>
            <li>• Download documents and guides</li>
            <li>• Return to the main home page</li>
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center justify-center gap-2 rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
          <button
            type="button"
            onClick={() => navigate("/documents")}
            className="inline-flex items-center justify-center rounded-3xl border border-slate-700/80 bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:border-cyan-500/80 hover:text-cyan-300"
          >
            Browse Resources
          </button>
        </div>
      </div>
    </div>
  );
}
