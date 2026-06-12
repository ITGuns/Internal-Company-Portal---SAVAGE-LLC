"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Shield, Mail, User as UserIcon, Check, ChevronRight } from "lucide-react";
import { fetchWorkspaceConfig } from "@/lib/workspace-config";

export default function OAuthSandboxPage() {
  const searchParams = useSearchParams();
  const provider = searchParams.get("provider") || "google";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("Deskii");
  const isGoogle = provider === "google";

  useEffect(() => {
    fetchWorkspaceConfig().then((config) => {
      if (config) {
        setWorkspaceName(config.name);
      }
    });
  }, []);

  const handleSandboxLogin = (selectedEmail: string, selectedName: string) => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
    const query = new URLSearchParams({
      provider,
      email: selectedEmail,
      name: selectedName,
    });
    window.location.href = `${backendUrl}/backend-auth/sandbox?${query.toString()}`;
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    const fallbackName = name || email.split("@")[0].replace(/[._-]+/g, " ");
    handleSandboxLogin(email, fallbackName);
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[#090b10] text-slate-100 p-6 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400 mb-4 animate-pulse">
            <Shield className="w-3.5 h-3.5" />
            Developer Sandbox Mode
          </div>
          
          <h1 className="text-2xl font-bold tracking-tight">
            Sign in with {isGoogle ? "Google" : "Apple"}
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Mock OAuth consent screen for testing in local environment.
          </p>
        </div>

        {/* Quick Profiles */}
        <div className="space-y-3 mb-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Quick Sign-In Accounts
          </div>
          
          <button
            onClick={() => handleSandboxLogin("ops-manager@example.com", "Operations Manager")}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-bold text-blue-400">
                OM
              </div>
              <div>
                <div className="font-semibold text-sm">Operations Manager</div>
                <div className="text-xs text-slate-400">ops-manager@example.com</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => handleSandboxLogin("employee@example.com", "Jane Doe")}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-400">
                JD
              </div>
              <div>
                <div className="font-semibold text-sm">Jane Doe</div>
                <div className="text-xs text-slate-400">employee@example.com</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="flex items-center gap-3 my-6">
          <div className="h-px bg-slate-800 flex-1" />
          <span className="text-xs text-slate-500 uppercase tracking-wider">Or custom identity</span>
          <div className="h-px bg-slate-800 flex-1" />
        </div>

        {/* Custom form */}
        <form onSubmit={handleCustomSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Full Name (Optional)
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="e.g. John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-colors mt-6"
          >
            <Check className="w-4 h-4" />
            Grant Consent &amp; Sign In
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-500">
          This login will register under workspace <strong className="text-slate-400">{workspaceName}</strong>
        </div>
      </div>
    </main>
  );
}
