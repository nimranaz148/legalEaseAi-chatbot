"use client";

import React from "react";
import { BookOpen, Layers, Cpu, Activity, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { Law, Health } from "@/types/api";
import { STRINGS } from "@/config/strings";

interface CorpusTabProps {
  laws: Law[];
  health: Health | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function CorpusTab({ laws, health, isLoading, onRefresh }: CorpusTabProps) {
  const isOnline = health?.status === "ok" && health.collection_exists;
  const totalChunks = health?.total_chunks ?? laws.reduce((sum, l) => sum + (l.chunk_count || 0), 0);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#24204c]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {STRINGS.analytics.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {STRINGS.analytics.subtitle}
          </p>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#2e2866] bg-[#161338] hover:bg-[#201b4d] text-xs font-medium text-slate-200 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh Metrics</span>
          </button>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Indexed Statutes */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[#24204c] bg-[#0e0c24] shadow-sm flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">
              {STRINGS.analytics.totalLaws}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-white mt-2 font-mono">
              {laws.length}
            </p>
            <span className="text-[11px] text-purple-400 font-medium mt-1 inline-block">
              Parsed from laws.yaml
            </span>
          </div>
          <div className="p-3 rounded-xl bg-purple-600/10 text-purple-400 border border-purple-500/20">
            <BookOpen className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 2: Total Active Chunks */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[#24204c] bg-[#0e0c24] shadow-sm flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">
              {STRINGS.analytics.totalChunks}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-white mt-2 font-mono">
              {totalChunks}
            </p>
            <span className="text-[11px] text-blue-400 font-medium mt-1 inline-block">
              Qdrant vector collection
            </span>
          </div>
          <div className="p-3 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
            <Layers className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 3: Vector Dimension */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[#24204c] bg-[#0e0c24] shadow-sm flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">
              {STRINGS.analytics.vectorDim}
            </p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-2 font-mono truncate">
              {STRINGS.analytics.vectorDimVal}
            </p>
            <span className="text-[11px] text-emerald-400 font-medium mt-1 inline-block">
              gemini-embedding-001
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20">
            <Cpu className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 4: Backend Health */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[#24204c] bg-[#0e0c24] shadow-sm flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">
              {STRINGS.analytics.backendStatus}
            </p>
            <div className="mt-2 flex items-center gap-2">
              {isOnline ? (
                <span className="inline-flex items-center gap-1.5 text-base sm:text-lg font-bold text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  ONLINE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-base sm:text-lg font-bold text-rose-400">
                  <AlertCircle className="h-5 w-5" />
                  OFFLINE
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 inline-block font-mono">
              Port 8000 (FastAPI)
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#1a1640] text-slate-400">
            <Activity className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Registered Statutes Table */}
      <div className="rounded-2xl border border-[#24204c] bg-[#0e0c24] shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#24204c] flex items-center justify-between">
          <h3 className="font-semibold text-sm sm:text-base text-white">
            {STRINGS.analytics.statutesTableTitle}
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {laws.length} registered
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#12102e] text-slate-400 font-medium border-b border-[#24204c]">
              <tr>
                <th className="py-3 px-4">{STRINGS.analytics.colLawId}</th>
                <th className="py-3 px-4">{STRINGS.analytics.colTitle}</th>
                <th className="py-3 px-4">{STRINGS.analytics.colYear}</th>
                <th className="py-3 px-4">{STRINGS.analytics.colChunks}</th>
                <th className="py-3 px-4">Unit Label</th>
                <th className="py-3 px-4">{STRINGS.analytics.colStatus}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1b3d] font-mono">
              {laws.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans text-xs">
                    No registered statutes available in backend corpus.
                  </td>
                </tr>
              ) : (
                laws.map((law) => (
                  <tr
                    key={law.law_id}
                    className="hover:bg-[#161338] transition-colors"
                  >
                    <td className="py-3 px-4 text-purple-400 font-semibold">
                      {law.law_id}
                    </td>
                    <td className="py-3 px-4 font-sans font-medium text-white">
                      {law.name}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {law.year}
                    </td>
                    <td className="py-3 px-4 text-white font-bold">
                      {law.chunk_count}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-400">
                      {law.unit_label || "Section"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-sans font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {STRINGS.analytics.statusActive}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
