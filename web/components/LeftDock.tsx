"use client";

import React from "react";
import {
  Search,
  FileText,
  PenTool,
  BarChart3,
  BookOpen,
  MessageSquare,
  HelpCircle,
  Sparkles,
  ChevronRight,
} from "lucide-react";

export type NavMode = "ask" | "summarize" | "draft" | "analytics";

interface LeftDockProps {
  currentMode: NavMode;
  onSelectMode: (mode: NavMode) => void;
  onOpenStatutes: () => void;
  statuteCount: number;
}

export function LeftDock({
  currentMode,
  onSelectMode,
  onOpenStatutes,
  statuteCount,
}: LeftDockProps) {
  return (
    <aside
      aria-label="Application navigation dock"
      className="w-18 md:w-20 shrink-0 bg-[#070617] border-r border-[#1e1b3d] flex flex-col items-center py-4 justify-between z-30 select-none"
    >
      {/* Top: Logo / Brand Badge */}
      <div className="flex flex-col items-center gap-6 w-full">
        <button
          type="button"
          onClick={() => onSelectMode("ask")}
          className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-[0_0_15px_rgba(147,51,234,0.4)] hover:scale-105 transition-transform"
          title="Legal+ AI Home"
        >
          <Sparkles className="h-5 w-5" />
        </button>

        {/* Vertical Dock Items */}
        <nav className="flex flex-col items-center gap-3 w-full px-2" aria-label="Modes">
          {/* 1. Legal Research (Ask QA) */}
          <button
            type="button"
            onClick={() => onSelectMode("ask")}
            className={`w-full py-2.5 px-1 rounded-xl flex flex-col items-center gap-1.5 transition-all text-center ${
              currentMode === "ask"
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#13112c]"
            }`}
            title="Legal Research & Statutory QA"
          >
            <Search className="h-4 w-4" />
            <span className="text-[10px] font-medium leading-tight line-clamp-1">Research</span>
          </button>

          {/* 2. Summarize */}
          <button
            type="button"
            onClick={() => onSelectMode("summarize")}
            className={`w-full py-2.5 px-1 rounded-xl flex flex-col items-center gap-1.5 transition-all text-center ${
              currentMode === "summarize"
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#13112c]"
            }`}
            title="Document Summarizer & Analysis"
          >
            <FileText className="h-4 w-4" />
            <span className="text-[10px] font-medium leading-tight line-clamp-1">Summarise</span>
          </button>

          {/* 3. Draft */}
          <button
            type="button"
            onClick={() => onSelectMode("draft")}
            className={`w-full py-2.5 px-1 rounded-xl flex flex-col items-center gap-1.5 transition-all text-center ${
              currentMode === "draft"
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#13112c]"
            }`}
            title="Legal Drafting & Template Assistant"
          >
            <PenTool className="h-4 w-4" />
            <span className="text-[10px] font-medium leading-tight line-clamp-1">Draft</span>
          </button>

          {/* 4. Corpus Analytics */}
          <button
            type="button"
            onClick={() => onSelectMode("analytics")}
            className={`w-full py-2.5 px-1 rounded-xl flex flex-col items-center gap-1.5 transition-all text-center ${
              currentMode === "analytics"
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#13112c]"
            }`}
            title="Corpus & Vector Analytics"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="text-[10px] font-medium leading-tight line-clamp-1">Corpus</span>
          </button>

          {/* 5. Statutes Filter Drawer Button */}
          <button
            type="button"
            onClick={onOpenStatutes}
            className="w-full py-2.5 px-1 rounded-xl flex flex-col items-center gap-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#13112c] transition-all text-center"
            title="Filter Registered Statutes"
          >
            <BookOpen className="h-4 w-4 text-emerald-400" />
            <span className="text-[10px] font-medium leading-tight line-clamp-1">
              Statutes ({statuteCount})
            </span>
          </button>
        </nav>
      </div>

      {/* Bottom: Help & Profile */}
      <div className="flex flex-col items-center gap-3">
        <a
          href="#help"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-[#13112c] transition-colors"
          title="Legal Assistant Help"
        >
          <HelpCircle className="h-4 w-4" />
        </a>
      </div>
    </aside>
  );
}
