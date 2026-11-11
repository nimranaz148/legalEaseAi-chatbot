"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, PenTool, Scale } from "lucide-react";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { MiosNavbar } from "@/components/MiosNavbar";
import { SummarizeView } from "@/components/SummarizeView";
import { DraftView } from "@/components/DraftView";
import { getHealth, getLaws } from "@/lib/api";
import { Law } from "@/types/api";

export default function ToolsPage() {
  const [laws, setLaws] = useState<Law[]>([]);
  const [selectedLawIds, setSelectedLawIds] = useState<string[]>([]);
  const [toolsTab, setToolsTab] = useState<"summarize" | "draft">("summarize");

  useEffect(() => {
    getLaws().then((res) => {
      setLaws(res);
      setSelectedLawIds(res.map((l) => l.law_id));
    }).catch(() => {});
  }, []);

  const handleToggleLaw = (lawId: string) => {
    setSelectedLawIds((prev) =>
      prev.includes(lawId) ? prev.filter((id) => id !== lawId) : [...prev, lawId]
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080718] text-slate-100 font-sans selection:bg-[#D4FF58] selection:text-black relative overflow-x-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-purple-900/20 via-indigo-950/15 to-transparent blur-[140px] pointer-events-none -z-10" />

      {/* Top Disclaimer Banner */}
      <DisclaimerBanner />

      {/* Navbar */}
      <MiosNavbar
        laws={laws}
        selectedLawIds={selectedLawIds}
        onToggleLaw={handleToggleLaw}
      />

      {/* Tools Content Stage */}
      <main className="flex-1 pt-20 pb-16 px-4 sm:px-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Back link */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-white/20"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Overview</span>
          </Link>

          <Link
            href="/chat"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#D4FF58] text-black font-semibold text-xs shadow-[0_0_15px_rgba(212,255,88,0.3)] hover:bg-[#bceb42] transition-all"
          >
            <Scale className="h-3.5 w-3.5" />
            <span>Open Chat Workspace →</span>
          </Link>
        </div>

        {/* Tools Header Switcher */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-[#100d2b]/80 border border-white/10 backdrop-blur-xl">
          <div>
            <span className="text-xs uppercase tracking-wider text-[#D4FF58] font-bold">
              Document Intelligence
            </span>
            <h1 className="text-2xl font-black text-white">
              Legal Document Summariser & Drafter
            </h1>
          </div>

          <div className="flex items-center gap-2 p-1 rounded-2xl bg-white/5 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setToolsTab("summarize")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-semibold ${
                toolsTab === "summarize"
                  ? "bg-[#D4FF58] text-black shadow-[0_0_15px_rgba(212,255,88,0.3)]"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>PDF & Text Summariser</span>
            </button>
            <button
              type="button"
              onClick={() => setToolsTab("draft")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-semibold ${
                toolsTab === "draft"
                  ? "bg-[#D4FF58] text-black shadow-[0_0_15px_rgba(212,255,88,0.3)]"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <PenTool className="h-4 w-4" />
              <span>Legal Drafter</span>
            </button>
          </div>
        </div>

        {/* Active Tool View */}
        {toolsTab === "summarize" ? (
          <SummarizeView />
        ) : (
          <DraftView />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 px-4 text-center text-xs text-slate-500 bg-[#060515]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-slate-300">
            <Scale className="h-4 w-4 text-[#D4FF58]" />
            <span>LegalEase — Document Intelligence</span>
          </div>
          <p className="text-[11px] text-slate-500 max-w-md">
            Yeh nizam sirf maloomati aur qanooni tehqeeq k liye hai, qanooni mashwara nahi. Verbatim chunk citations strictly enforced.
          </p>
        </div>
      </footer>
    </div>
  );
}
