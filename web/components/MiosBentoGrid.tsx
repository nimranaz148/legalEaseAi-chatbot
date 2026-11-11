"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ArrowUp,
  CheckCircle2,
  Bot,
  Scale,
  ShieldCheck,
  Languages,
  BookOpen,
  FileCheck,
  FileText,
  Bookmark,
} from "lucide-react";

export function MiosBentoGrid() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  return (
    <section className="w-full max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* ================= TOP ROW: 3 COMPACT BENTO CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Multi-Language Legal Counsel */}
        <div className="group rounded-3xl p-6 sm:p-7 bg-[#0f0c29]/90 border border-white/10 hover:border-white/20 transition-all duration-300 shadow-xl backdrop-blur-xl flex flex-col justify-between min-h-[220px] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Floating Language Badges */}
          <div className="flex items-center gap-2 mb-6">
            <div className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-purple-300 flex items-center gap-1.5 shadow-sm">
              <Languages className="h-3.5 w-3.5 text-purple-400" />
              <span>English</span>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-emerald-300 shadow-sm font-urdu">
              اردو
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-amber-300 shadow-sm">
              Roman Urdu
            </div>
            <span className="text-[10px] text-slate-400 font-mono ml-auto">RTL Ready</span>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white tracking-tight">
              Multi-Language Counsel
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Native statutory assistance in English, Roman Urdu, and Urdu script with bidirectional layout.
            </p>
          </div>
        </div>

        {/* 2. Context-Grounded Legal LLM */}
        <div className="group rounded-3xl p-6 sm:p-7 bg-[#0f0c29]/90 border border-white/10 hover:border-white/20 transition-all duration-300 shadow-xl backdrop-blur-xl flex flex-col justify-between min-h-[220px] relative overflow-hidden">
          {/* Floating 'Research a legal issue ↑' Pill */}
          <div className="flex justify-center mb-6">
            <div className="px-4 py-1.5 rounded-full bg-white/10 border border-white/15 flex items-center gap-2 text-xs text-white shadow-inner group-hover:border-[#D4FF58]/50 transition-colors">
              <span className="text-slate-300">Research a legal issue</span>
              <div className="h-4 w-4 rounded-full bg-white text-black flex items-center justify-center">
                <ArrowUp className="h-2.5 w-2.5" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white tracking-tight">
              Context-Grounded LLM
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Strict context-only reasoning over statutory sections — zero hallucination, zero fabricated statutes.
            </p>
          </div>
        </div>

        {/* 3. Statutory Knowledge Base */}
        <div className="group rounded-3xl p-6 sm:p-7 bg-[#0f0c29]/90 border border-white/10 hover:border-white/20 transition-all duration-300 shadow-xl backdrop-blur-xl flex flex-col justify-between min-h-[220px] relative overflow-hidden">
          {/* Floating 'Verbatim Citation' Pill */}
          <div className="flex justify-center mb-6">
            <div className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-900/80 to-purple-800/80 border border-purple-500/40 flex items-center gap-2 text-xs text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
              <FileCheck className="h-3.5 w-3.5 text-purple-300" />
              <span className="font-medium">Verbatim Citation</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-[#D4FF58]" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white tracking-tight">
              Statutory Knowledge Base
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Direct indexing from official statutory gazettes. AI retrieves verified sections with character fidelity.
            </p>
          </div>
        </div>
      </div>

      {/* ================= BOTTOM ROW: 2 EXPANDED FEATURE CARDS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ================= CARD 4: LEGAL WORKFLOW AUTOMATION (Col 6) ================= */}
        <div className="lg:col-span-6 rounded-3xl p-6 sm:p-8 bg-[#0d0a26]/95 border border-white/10 shadow-2xl backdrop-blur-2xl flex flex-col justify-between space-y-6 relative overflow-hidden">
          {/* Animated Flowchart Container */}
          <div className="p-4 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center relative">
            {/* Ambient Flowchart glow */}
            <div className="absolute inset-0 bg-radial-gradient from-purple-900/10 to-transparent pointer-events-none" />

            {/* NODE 1: Confidence Check (Top) */}
            <div
              onMouseEnter={() => setHoveredNode("confidence")}
              onMouseLeave={() => setHoveredNode(null)}
              className="px-4 py-2 rounded-2xl bg-[#1d1746] border border-purple-400/40 shadow-lg flex flex-col items-center gap-0.5 z-10 cursor-pointer hover:border-[#D4FF58] transition-all"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                <span>Statutory Confidence Check</span>
              </div>
              <span className="text-[10px] text-slate-300 font-mono">
                98% Relevance score
              </span>
            </div>

            {/* Flowchart Splitting SVG Connectors */}
            <svg
              className="w-full max-w-[340px] h-14 my-1 text-purple-400/30"
              viewBox="0 0 340 56"
              fill="none"
            >
              <line x1="170" y1="0" x2="170" y2="18" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
              <path
                d="M170 18 C170 38, 85 24, 85 56"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M170 18 C170 38, 255 24, 255 56"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>

            {/* NODE 2: Branching Options */}
            <div className="w-full max-w-[380px] grid grid-cols-2 gap-4 z-10">
              {/* Node 2A: Direct Section Shortcut */}
              <div
                onMouseEnter={() => setHoveredNode("reply")}
                onMouseLeave={() => setHoveredNode(null)}
                className="px-3 py-2 rounded-2xl bg-[#1a153f] border border-white/10 shadow flex flex-col items-center gap-0.5 cursor-pointer hover:border-cyan-400 transition-all text-center"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Bookmark className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Section Shortcut</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Exact Match 2.3ms
                </span>
              </div>

              {/* Node 2B: Hybrid Vector Search */}
              <div
                onMouseEnter={() => setHoveredNode("human")}
                onMouseLeave={() => setHoveredNode(null)}
                className="px-3 py-2 rounded-2xl bg-[#1a153f] border border-white/10 shadow flex flex-col items-center gap-0.5 cursor-pointer hover:border-pink-400 transition-all text-center"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Bot className="h-3.5 w-3.5 text-pink-400" />
                  <span>Hybrid Vector</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Cosine Search 12ms
                </span>
              </div>
            </div>

            {/* Converging SVG Connectors */}
            <svg
              className="w-full max-w-[340px] h-14 my-1 text-purple-400/30"
              viewBox="0 0 340 56"
              fill="none"
            >
              <path
                d="M85 0 C85 32, 170 18, 170 38"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M255 0 C255 32, 170 18, 170 38"
                stroke="currentColor"
                strokeWidth="2"
              />
              <line x1="170" y1="38" x2="170" y2="56" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
            </svg>

            {/* NODE 3: Citation Verified (Bottom) */}
            <div
              onMouseEnter={() => setHoveredNode("resolved")}
              onMouseLeave={() => setHoveredNode(null)}
              className="px-4 py-2 rounded-2xl bg-[#18133b] border border-[#D4FF58]/40 shadow-lg flex flex-col items-center gap-0.5 z-10 cursor-pointer hover:scale-105 transition-all"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#D4FF58]" />
                <span>Citation Verified</span>
              </div>
              <span className="text-[10px] text-[#D4FF58] font-mono">
                100% Verbatim Accuracy Enforced
              </span>
            </div>
          </div>

          {/* Footer Text */}
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white tracking-tight">
              Legal Workflow Automation
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              From statutory clause matching to draft validation — automated legal intelligence
              with post-generation citation validation.
            </p>
          </div>
        </div>

        {/* ================= CARD 5: STATUTE ANALYTICS & INSIGHTS (Col 6) ================= */}
        <div className="lg:col-span-6 rounded-3xl p-6 sm:p-8 bg-[#0d0a26]/95 border border-white/10 shadow-2xl backdrop-blur-2xl flex flex-col justify-between space-y-6 relative overflow-hidden">
          {/* Mini Window with Traffic Dots */}
          <div className="rounded-2xl bg-[#120e33] border border-white/10 p-5 shadow-inner">
            {/* Top Window Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                Statutory Accuracy & Resolution
              </span>
            </div>

            {/* 3 KPI Stats in Row */}
            <div className="grid grid-cols-3 gap-2 pb-4">
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white">
                  94%
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  Resolution Rate
                </span>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white">
                  69+
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  Indexed Clauses
                </span>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white">
                  100%
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  Verbatim Grounding
                </span>
              </div>
            </div>

            {/* SVG Glowing Rising Line / Area Chart (30% to 90%) */}
            <div className="relative h-36 w-full pt-2">
              {/* Background Horizontal Percentage Gridlines */}
              <div className="absolute inset-0 flex flex-col justify-between text-[9px] font-mono text-slate-600 pointer-events-none">
                <div className="border-b border-white/5 pb-0.5">90%</div>
                <div className="border-b border-white/5 pb-0.5">80%</div>
                <div className="border-b border-white/5 pb-0.5">70%</div>
                <div className="border-b border-white/5 pb-0.5">60%</div>
                <div className="border-b border-white/5 pb-0.5">50%</div>
                <div className="border-b border-white/5 pb-0.5">40%</div>
                <div>30%</div>
              </div>

              {/* Chart SVG */}
              <svg
                className="w-full h-full overflow-visible"
                viewBox="0 0 500 130"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Filled Area */}
                <path
                  d="M 20 115 
                     C 60 110, 80 95, 110 70 
                     C 140 45, 170 50, 200 40 
                     C 230 30, 250 60, 280 45 
                     C 310 30, 340 55, 370 45 
                     C 400 35, 430 40, 460 30 
                     C 480 25, 495 20, 500 20 
                     L 500 130 L 20 130 Z"
                  fill="url(#chartGradient)"
                />

                {/* Stroke Line */}
                <path
                  d="M 20 115 
                     C 60 110, 80 95, 110 70 
                     C 140 45, 170 50, 200 40 
                     C 230 30, 250 60, 280 45 
                     C 310 30, 340 55, 370 45 
                     C 400 35, 430 40, 460 30 
                     C 480 25, 495 20, 500 20"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                />

                {/* End Point Dot with pulse */}
                <circle cx="500" cy="20" r="4" fill="#38bdf8" />
              </svg>
            </div>
          </div>

          {/* Footer Text */}
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white tracking-tight">
              Statutory Analytics & Insights
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Deep visibility into every query resolution, similarity score, and statutory validation
              across legal consultations.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
