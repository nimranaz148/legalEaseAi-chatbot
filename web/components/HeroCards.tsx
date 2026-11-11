"use client";

import React from "react";
import { MessageSquare, PenTool, FileText, UploadCloud } from "lucide-react";
import { NavMode } from "./LeftDock";

interface HeroCardsProps {
  currentMode: NavMode;
  onSelectMode: (mode: NavMode) => void;
}

export function HeroCards({ currentMode, onSelectMode }: HeroCardsProps) {
  const cards = [
    {
      id: "ask" as NavMode,
      title: "Ask",
      subtitle: "Statutory Search & QA",
      icon: MessageSquare,
      description: "Ask legal questions grounded in Pakistani statutes",
    },
    {
      id: "draft" as NavMode,
      title: "Draft",
      subtitle: "Notices & Agreements",
      icon: PenTool,
      description: "Generate legally sound contract templates and notices",
    },
    {
      id: "summarize" as NavMode,
      title: "Summarise",
      subtitle: "Document Analysis",
      icon: FileText,
      description: "Extract clauses, liabilities, and executive summary",
    },
    {
      id: "summarize" as NavMode,
      title: "Upload",
      subtitle: "Review PDF Files",
      icon: UploadCloud,
      description: "Drop a contract or order for instant AI review",
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 pt-4 pb-2">
      {/* Lexis+ AI Greeting Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
          Welcome back, Counsel
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1.5 font-medium">
          Let&apos;s get started. Which legal task can AI accelerate for you today?
        </p>
      </div>

      {/* Horizontal Task Cards (Lexis+ Style) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((card, idx) => {
          const isActive =
            (card.title === "Upload" && currentMode === "summarize") ||
            (card.title !== "Upload" && currentMode === card.id);
          const Icon = card.icon;

          return (
            <button
              key={`${card.id}-${idx}`}
              type="button"
              onClick={() => onSelectMode(card.id)}
              className={`p-3.5 sm:p-4 rounded-2xl text-left transition-all relative overflow-hidden group ${
                isActive
                  ? "bg-gradient-to-b from-[#221c54] to-[#141133] border-2 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.25)] text-white"
                  : "bg-[#0f0d26] hover:bg-[#161338] border border-[#24204c] text-slate-300 hover:border-purple-500/40"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${
                    isActive
                      ? "bg-purple-600 text-white"
                      : "bg-[#1c1842] text-purple-400 group-hover:bg-purple-600/20"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {isActive && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>

              <div className="text-sm font-bold text-white tracking-tight">
                {card.title}
              </div>
              <div className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                {card.subtitle}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
