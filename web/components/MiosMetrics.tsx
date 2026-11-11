"use client";

import React, { useState } from "react";
import { Clock, TrendingUp, Sparkles, CheckCircle2, Scale, ShieldCheck } from "lucide-react";

export function MiosMetrics() {
  const [activeCard, setActiveCard] = useState<number>(1);

  return (
    <section className="w-full max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-[#D4FF58]/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        {/* ================= LEFT COLUMN: EDITORIAL TYPOGRAPHY ================= */}
        <div className="lg:col-span-5 space-y-6">
          {/* Subtle Category Pill / Label */}
          <div className="inline-flex items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold tracking-wide text-[#D4FF58] uppercase">
              Judicial & Statutory Metrics
            </span>
          </div>

          {/* Signature Legal Headline */}
          <h2 className="text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.15] text-white">
            <span className="font-serif italic font-normal text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-pink-200 to-indigo-200 block mb-1">
              A Few Numbers
            </span>
            <span className="font-extrabold text-slate-100 block">
              Behind the Legal Insights
            </span>
            <span className="font-extrabold text-slate-100 block">
              We Deliver
            </span>
          </h2>

          {/* Subtitle Description */}
          <p className="text-sm sm:text-base text-slate-400 max-w-md leading-relaxed">
            Automate statutory research, resolve complex legal inquiries faster, and deliver
            character-for-character grounded citations with zero hallucination.
          </p>

          {/* Quick Stats Badges */}
          <div className="pt-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#D4FF58]" />
              <span>100% Verbatim Citation Guarantee</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
              <span>Strict No-Hallucination Gate (Score ≥ 0.45)</span>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: 3D STACKED GLASS CARDS ================= */}
        <div className="lg:col-span-7 flex justify-center lg:justify-end relative min-h-[460px] sm:min-h-[500px] items-center">
          {/* Card Stack Container */}
          <div className="relative w-full max-w-lg h-[420px]">
            {/* ---------------- CARD 3 (Back: Research Speed 10x) ---------------- */}
            <div
              onClick={() => setActiveCard(3)}
              className={`absolute top-0 right-0 sm:right-4 w-[280px] sm:w-[320px] rounded-3xl p-6 transition-all duration-500 cursor-pointer border ${
                activeCard === 3
                  ? "z-30 bg-[#161238]/95 border-[#D4FF58]/40 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(212,255,88,0.2)] scale-105"
                  : "z-10 bg-[#120f2e]/80 border-white/10 shadow-xl backdrop-blur-xl translate-x-4 -translate-y-4 hover:translate-y-[-20px] hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Research Velocity
                </span>
                <div className="h-9 w-9 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>

              <div className="space-y-1 mb-4">
                <div className="text-5xl sm:text-6xl font-black tracking-tight text-white">
                  10x
                </div>
                <p className="text-xs text-slate-400">
                  Faster statutory discovery, clause analysis, and draft preparation.
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                <span>Corpus Coverage</span>
                <span className="font-mono text-[#D4FF58]">100% In-Scope</span>
              </div>
            </div>

            {/* ---------------- CARD 2 (Middle: Retrieval Latency 12ms) ---------------- */}
            <div
              onClick={() => setActiveCard(2)}
              className={`absolute top-16 left-6 sm:left-12 w-[290px] sm:w-[340px] rounded-3xl p-6 transition-all duration-500 cursor-pointer border ${
                activeCard === 2
                  ? "z-30 bg-[#161238]/95 border-[#D4FF58]/40 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(212,255,88,0.2)] scale-105"
                  : "z-20 bg-[#141033]/85 border-white/10 shadow-xl backdrop-blur-xl translate-x-2 -translate-y-2 hover:translate-y-[-12px] hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Retrieval Latency
                </span>
                <div className="h-9 w-9 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shadow-inner">
                  <Clock className="h-5 w-5" />
                </div>
              </div>

              <div className="space-y-1 mb-4">
                <div className="text-5xl sm:text-6xl font-black tracking-tight text-white flex items-baseline gap-1">
                  12<span className="text-3xl text-slate-400 font-light">ms</span>
                </div>
                <p className="text-xs text-slate-400">
                  Sub-second hybrid statutory lookup with Qdrant vector engine.
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                <span>Vector cache hit rate</span>
                <span className="font-mono text-cyan-300">99.4%</span>
              </div>
            </div>

            {/* ---------------- CARD 1 (Front: Statutory Availability 24/7) ---------------- */}
            <div
              onClick={() => setActiveCard(1)}
              className={`absolute bottom-0 left-0 sm:left-4 w-[310px] sm:w-[360px] rounded-3xl p-6 transition-all duration-500 cursor-pointer border ${
                activeCard === 1
                  ? "z-30 bg-[#161238]/95 border-white/20 shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_40px_rgba(212,255,88,0.18)]"
                  : "z-10 bg-[#120f2e]/85 border-white/10 shadow-xl backdrop-blur-xl hover:translate-y-[-6px]"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1">
                    Statutory Availability
                  </span>
                  <div className="text-6xl sm:text-7xl font-extrabold tracking-tight text-white">
                    24/7
                  </div>
                </div>

                {/* Round Badge with Legal Scale + Lime 24 */}
                <div className="relative h-14 w-14 rounded-full bg-gradient-to-tr from-purple-900/60 to-purple-600/40 border border-purple-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                  <Scale className="h-6 w-6 text-purple-200 stroke-[2.2]" />
                  {/* Neon Lime badge overlay */}
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-[#D4FF58] text-black font-extrabold text-[9px] shadow-[0_0_8px_rgba(212,255,88,0.5)]">
                    24
                  </span>
                </div>
              </div>

              {/* Legal Caption */}
              <p className="text-xs sm:text-sm text-slate-300 font-medium pt-3 border-t border-white/10">
                Automated statutory availability, zero consultation downtime.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
