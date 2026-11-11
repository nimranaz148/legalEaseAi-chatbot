"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Scale,
  Sparkles,
  ArrowRight,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  TrendingUp,
  BookOpen,
  MessageSquare,
  Bot,
  ExternalLink,
} from "lucide-react";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { MiosNavbar } from "@/components/MiosNavbar";
import { MiosMetrics } from "@/components/MiosMetrics";
import { MiosBentoGrid } from "@/components/MiosBentoGrid";
import { getHealth, getLaws } from "@/lib/api";
import { Law } from "@/types/api";

export default function HomePage() {
  const [laws, setLaws] = useState<Law[]>([]);
  const [selectedLawIds, setSelectedLawIds] = useState<string[]>([]);

  useEffect(() => {
    getLaws()
      .then((res) => {
        setLaws(res);
        setSelectedLawIds(res.map((l) => l.law_id));
      })
      .catch(() => {});
  }, []);

  const handleToggleLaw = (lawId: string) => {
    setSelectedLawIds((prev) =>
      prev.includes(lawId) ? prev.filter((id) => id !== lawId) : [...prev, lawId]
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080718] text-slate-100 font-sans selection:bg-[#D4FF58] selection:text-black relative overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-purple-900/25 via-indigo-950/20 to-transparent blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-[600px] right-0 w-[500px] h-[500px] bg-[#D4FF58]/5 blur-[160px] pointer-events-none -z-10" />
      <div className="absolute top-[1300px] left-0 w-[500px] h-[500px] bg-purple-600/10 blur-[160px] pointer-events-none -z-10" />

      {/* 1. Permanent Top Disclaimer Banner (Repo constraint) */}
      <DisclaimerBanner />

      {/* 2. Floating Navbar */}
      <MiosNavbar
        laws={laws}
        selectedLawIds={selectedLawIds}
        onToggleLaw={handleToggleLaw}
      />

      {/* Main Page Content */}
      <main className="flex-1 pt-24 sm:pt-28 pb-20 space-y-20 sm:space-y-28">
        {/* ================= HERO SECTION ================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Subtle Category Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-purple-300 shadow-inner">
            <Sparkles className="h-3.5 w-3.5 text-[#D4FF58]" />
            <span className="font-semibold tracking-wide">
              Autonomous Statutory Intelligence & RAG
            </span>
          </div>

          {/* Signature Editorial Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.12] text-white max-w-5xl mx-auto">
            <span className="font-serif italic font-normal text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-pink-200 to-indigo-200 block mb-2">
              Statutory Ground Truth
            </span>
            <span>AI Legal Assistant For </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
              Research & Citations
            </span>
          </h1>

          {/* Subtitle Description */}
          <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Ask complex legal queries across verified statutory corpora with
            verbatim character-by-character citations. Upload contracts and agreements
            for instant executive legal briefs.
          </p>

          {/* ================= PROMINENT CTA BUTTONS ================= */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Primary CTA: Enter Chat Workspace */}
            <Link
              href="/chat"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#D4FF58] hover:bg-[#bceb42] text-black font-extrabold text-base sm:text-lg flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(212,255,88,0.4)] hover:shadow-[0_0_45px_rgba(212,255,88,0.6)] hover:scale-105 transition-all group"
            >
              <Scale className="h-5 w-5 stroke-[2.5]" />
              <span>Open Legal Workspace</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            {/* Secondary CTA: Summarize Document */}
            <Link
              href="/tools"
              className="w-full sm:w-auto px-7 py-4 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-sm sm:text-base border border-white/15 hover:border-white/25 flex items-center justify-center gap-2.5 transition-all shadow-sm"
            >
              <FileText className="h-4 w-4 text-purple-400" />
              <span>Summarize Legal Document</span>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#D4FF58]" />
              <span>100% Verbatim Citation Grounding</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-400" />
              <span>Strict Hallucination Gate (Score ≥ 0.45)</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span>English, Roman Urdu & اردو Support</span>
            </div>
          </div>

          {/* Interactive Workspace Preview Hero Card */}
          <div className="pt-8">
            <Link
              href="/chat"
              className="block group relative max-w-5xl mx-auto rounded-3xl border border-white/15 bg-gradient-to-b from-[#130f33]/90 to-[#0c0924]/90 p-3 sm:p-5 shadow-[0_25px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl hover:border-[#D4FF58]/40 transition-all overflow-hidden"
            >
              {/* Overlay hover prompt */}
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-30">
                <div className="px-6 py-3 rounded-full bg-[#D4FF58] text-black font-extrabold text-sm flex items-center gap-2 shadow-[0_0_30px_rgba(212,255,88,0.5)] transform translate-y-2 group-hover:translate-y-0 transition-transform">
                  <Scale className="h-4 w-4 stroke-[2.5]" />
                  <span>Click to Enter Full Legal Workspace →</span>
                </div>
              </div>

              {/* Preview Window Header */}
              <div className="flex items-center justify-between pb-3 px-2 border-b border-white/10 text-xs text-slate-400 mb-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="ml-2 font-mono text-[11px] text-slate-400">
                    Legal Workspace Preview — /chat
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Engine Online</span>
                </div>
              </div>

              {/* Teaser Preview Body */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-left">
                {/* Left Mini Sidebar */}
                <div className="hidden md:block md:col-span-3 rounded-2xl bg-[#09071a] p-3 border border-white/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded bg-[#D4FF58] flex items-center justify-center text-black font-bold text-[10px]">
                      ⚖️
                    </div>
                    <span className="text-xs font-bold text-white">Legal.AI</span>
                  </div>
                  <div className="space-y-1">
                    <div className="px-2 py-1.5 rounded-lg bg-white/10 text-[11px] font-semibold text-white flex items-center justify-between">
                      <span>Legal Inquiries</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#D4FF58] text-black font-bold">
                        3
                      </span>
                    </div>
                    <div className="px-2 py-1 text-[11px] text-slate-400">Advocates & Team</div>
                    <div className="px-2 py-1 text-[11px] text-slate-400">Statute Corpus</div>
                    <div className="px-2 py-1 text-[11px] text-slate-400">Citation Validator</div>
                  </div>
                </div>

                {/* Right Chat Preview Box */}
                <div className="md:col-span-9 rounded-2xl bg-[#0d0a27] p-4 border border-white/5 space-y-3">
                  {/* Chat bubbles */}
                  <div className="flex justify-start">
                    <div className="bg-[#D4FF58] text-black font-semibold rounded-2xl rounded-tl-none px-4 py-2.5 text-xs max-w-md shadow-sm">
                      Assalam-o-Alaikum! Breach of contract aur notice period k mutalliq statutory shiq kya hai?
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <div className="bg-[#1b173e] border border-white/10 rounded-2xl rounded-tr-none p-3.5 text-xs max-w-lg space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-[9px] font-bold">
                          Legal.AI Assistant
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Verified Statutory Answer
                        </span>
                      </div>
                      <p className="text-slate-200 leading-relaxed font-urdu" dir="auto">
                        Walaikum Assalam! Muahiday ki khilaf-warzi (breach of contract) ki soorat me qanooni shiq k mutabiq mutasira fareeq nuqsanat ka daawa daair karnay ka majaz hai...
                      </p>
                      <div className="flex items-center gap-2 pt-1 border-t border-white/10 text-[10px] text-[#D4FF58]">
                        <BookOpen className="h-3 w-3" />
                        <span>Verbatim Citation: Section 73 — Compensation for loss or damage</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* ================= METRICS SECTION (Screenshot 2) ================= */}
        <div id="section-metrics" className="pt-8 border-t border-white/5">
          <MiosMetrics />
        </div>

        {/* ================= BENTO GRID SECTION (Screenshot 3) ================= */}
        <div id="section-bento" className="pt-8 border-t border-white/5">
          <div className="text-center max-w-xl mx-auto mb-4 px-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#D4FF58]">
              Statutory Intelligence Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-1">
              Engineered For Judicial Accuracy & Grounded Citations
            </h2>
          </div>
          <MiosBentoGrid />
        </div>

        {/* ================= DOCUMENT INTELLIGENCE HIGHLIGHT ================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl p-8 sm:p-12 bg-gradient-to-r from-[#140f38] via-[#100d2b] to-[#16123a] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4FF58]/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-xs font-semibold text-purple-300">
                <FileText className="h-3.5 w-3.5 text-[#D4FF58]" />
                <span>PDF & Text Intelligence Studio</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Upload Any Contract Or Agreement For Instant Executive Summary
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                PyMuPDF aur Gemini Flash extract and dissect contracts into Executive Summaries,
                Obligations, Key Risks, and Actionable Steps in seconds.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
              <Link
                href="/tools"
                className="px-6 py-3.5 rounded-2xl bg-[#D4FF58] hover:bg-[#bceb42] text-black font-extrabold text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(212,255,88,0.35)] transition-all"
              >
                <FileText className="h-4 w-4" />
                <span>Open Document Studio</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/chat"
                className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/10 transition-colors"
              >
                <span>Live Chat</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10 px-4 text-center text-xs text-slate-500 bg-[#060515]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5 font-bold text-slate-300 text-sm">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-purple-600 to-[#D4FF58] flex items-center justify-center text-black">
              <Scale className="h-3.5 w-3.5 stroke-[2.5]" />
            </div>
            <span>LegalEase</span>
          </div>

          <p className="text-[11px] text-slate-500 max-w-md">
            Yeh nizam sirf maloomati aur qanooni tehqeeq k liye hai, qanooni mashwara nahi. Verbatim chunk citations strictly enforced.
          </p>

          <div className="flex items-center gap-4 text-slate-400 text-xs">
            <Link href="/chat" className="hover:text-white transition-colors">
              Chat Workspace
            </Link>
            <Link href="/tools" className="hover:text-white transition-colors">
              Doc Summariser
            </Link>
            <Link href="/#section-metrics" className="hover:text-white transition-colors">
              Metrics
            </Link>
            <Link href="/#section-bento" className="hover:text-white transition-colors">
              Workflow
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
