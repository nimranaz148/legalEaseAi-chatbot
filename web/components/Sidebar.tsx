"use client";

import React from "react";
import { Check, Bug, Activity, X, HelpCircle, Layers, Scale } from "lucide-react";
import { Law, Health } from "@/types/api";
import { STRINGS } from "@/config/strings";
import { FALLBACK_EXAMPLES } from "@/config/examples";

interface SidebarProps {
  laws: Law[];
  selectedLawIds: string[];
  onToggleLaw: (lawId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  showDebug: boolean;
  onToggleDebug: (val: boolean) => void;
  backendHealth: Health | null;
  isLoadingHealth?: boolean;
  onSelectExample?: (example: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  laws,
  selectedLawIds,
  onToggleLaw,
  onSelectAll,
  onDeselectAll,
  showDebug,
  onToggleDebug,
  backendHealth,
  isLoadingHealth,
  onSelectExample,
  isOpen,
  onClose,
}: SidebarProps) {
  const sampleQuestions = React.useMemo(() => {
    const list: string[] = [];
    laws.forEach((l) => {
      if (l.examples && Array.isArray(l.examples)) {
        list.push(...l.examples);
      }
    });
    return list.length > 0 ? list.slice(0, 5) : FALLBACK_EXAMPLES.slice(0, 4);
  }, [laws]);

  const allSelected = laws.length > 0 && selectedLawIds.length === laws.length;
  const isOnline = backendHealth?.status === "ok" && backendHealth.collection_exists;

  return (
    <>
      {/* Drawer Backdrop */}
      {isOpen && (
        <div
          role="presentation"
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        aria-label="Statute configuration and filters"
        className={`fixed inset-y-0 left-0 z-50 w-80 shrink-0 bg-[#0c0a21] border-r border-[#24204c] flex flex-col transform transition-transform duration-300 ease-in-out shadow-2xl ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#24204c] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">
                Statute Scope & Filters
              </h2>
              <p className="text-[11px] text-slate-400">
                Registered Pakistani Statutes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1b173e] transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Backend Status Card */}
          <div className="p-3 rounded-xl border bg-[#12102e] border-[#24204c] text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-purple-400" />
                {STRINGS.sidebar.backendStatus}
              </span>
              {isLoadingHealth ? (
                <span className="text-slate-400 text-[11px]">Checking...</span>
              ) : isOnline ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  ONLINE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-rose-400 font-semibold text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  OFFLINE
                </span>
              )}
            </div>

            {isOnline ? (
              <p className="text-slate-400 text-[11px]">
                Vector points active: {backendHealth?.total_chunks ?? 0} {STRINGS.sidebar.chunksSuffix}
              </p>
            ) : (
              <p className="text-rose-400 mt-1 leading-normal font-mono text-[10px] bg-rose-950/40 p-1.5 rounded border border-rose-900/50">
                {STRINGS.errors.backendDown}
              </p>
            )}
          </div>

          {/* Statute Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-purple-400" />
                {STRINGS.sidebar.statuteFilterTitle}
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={allSelected ? onDeselectAll : onSelectAll}
                  className="text-purple-400 hover:underline text-[11px] font-medium"
                >
                  {allSelected ? STRINGS.sidebar.deselectAll : STRINGS.sidebar.selectAll}
                </button>
              </div>
            </div>

            <div className="space-y-1.5" role="group" aria-label="Statutes list">
              {laws.map((law) => {
                const isChecked = selectedLawIds.includes(law.law_id);
                return (
                  <label
                    key={law.law_id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer border text-xs transition-colors ${
                      isChecked
                        ? "bg-[#1d1746] border-purple-500/50 text-white"
                        : "bg-[#0f0d26] border-[#24204c] text-slate-400 hover:bg-[#161338]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleLaw(law.law_id)}
                      className="sr-only"
                    />
                    <div className="mt-0.5 shrink-0">
                      <div
                        className={`h-4 w-4 rounded flex items-center justify-center border ${
                          isChecked
                            ? "bg-purple-600 border-purple-400 text-white"
                            : "border-slate-600 bg-[#070617]"
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">
                        {law.name} {law.year ? `(${law.year})` : ""}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {law.chunk_count} {STRINGS.sidebar.chunksSuffix}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Debug Inspector Switch */}
          <div className="pt-3 border-t border-[#24204c]">
            <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-[#161338] transition-colors">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-2">
                <Bug className="h-4 w-4 text-amber-400" />
                {STRINGS.sidebar.debugToggle}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={showDebug}
                onClick={() => onToggleDebug(!showDebug)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  showDebug ? "bg-purple-600" : "bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    showDebug ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </label>
          </div>

          {/* Sample Questions */}
          {sampleQuestions.length > 0 && (
            <div className="pt-3 border-t border-[#24204c]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                <HelpCircle className="h-3.5 w-3.5 text-purple-400" />
                {STRINGS.sidebar.sampleQuestions}
              </h3>
              <div className="space-y-1.5">
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (onSelectExample) onSelectExample(q);
                    }}
                    className="w-full text-left p-2 rounded-xl text-xs bg-[#0f0d26] hover:bg-purple-950/40 text-slate-300 hover:text-white border border-[#24204c] transition-colors line-clamp-2"
                  >
                    💡 {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#24204c] text-[10px] text-slate-500 text-center">
          Law-agnostic Statutory Engine · Qdrant & Gemini
        </div>
      </aside>
    </>
  );
}
