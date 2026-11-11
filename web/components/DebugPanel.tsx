"use client";

import React, { useState } from "react";
import { Bug, ChevronDown, ChevronUp, Terminal, Cpu, Database } from "lucide-react";
import { DebugInfo } from "@/types/api";

interface DebugPanelProps {
  debug: DebugInfo;
}

export function DebugPanel({ debug }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!debug || (!debug.rewritten_query && (!debug.retrieved || debug.retrieved.length === 0))) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 overflow-hidden text-xs my-2 transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
      >
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
          <Bug className="h-3.5 w-3.5 text-amber-500" />
          <span>Pipeline Debug Info</span>
          {debug.retrieved && (
            <span className="font-mono text-[11px] text-slate-400 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.2 rounded">
              {debug.retrieved.length} chunks
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <span className="text-[11px]">{isOpen ? "Collapse" : "Expand"}</span>
          {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 font-mono space-y-3 bg-white dark:bg-slate-950/70 text-[11px]">
          {/* Rewritten Query */}
          {debug.rewritten_query && (
            <div>
              <div className="text-slate-400 uppercase text-[10px] tracking-wider mb-1 flex items-center gap-1">
                <Terminal className="h-3 w-3" />
                <span>Rewritten Query</span>
              </div>
              <p className="bg-slate-100 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                {debug.rewritten_query}
              </p>
            </div>
          )}

          {/* OCR Stats */}
          {debug.ocr_pages_used > 0 && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Cpu className="h-3.5 w-3.5" />
              <span>OCR pages utilized: {debug.ocr_pages_used}</span>
            </div>
          )}

          {/* Retrieved Chunks Table */}
          {debug.retrieved && debug.retrieved.length > 0 && (
            <div>
              <div className="text-slate-400 uppercase text-[10px] tracking-wider mb-1.5 flex items-center gap-1">
                <Database className="h-3 w-3" />
                <span>Retrieved Chunks & Similarity Scores</span>
              </div>

              <div className="space-y-1.5">
                {debug.retrieved.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-slate-400 font-mono text-[10px]">#{idx + 1}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {item.id}
                      </span>
                      {item.shortcut && (
                        <span className="px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px]">
                          shortcut
                        </span>
                      )}
                      {item.source && (
                        <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px]">
                          {item.source}
                        </span>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, item.score * 100))}%` }}
                        />
                      </div>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                        {typeof item.score === "number" ? item.score.toFixed(3) : item.score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
