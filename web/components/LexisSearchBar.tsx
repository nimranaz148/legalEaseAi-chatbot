"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, ChevronDown, Check, BookOpen } from "lucide-react";
import { Law } from "@/types/api";

interface LexisSearchBarProps {
  onSendMessage: (question: string) => Promise<void>;
  isLoading: boolean;
  laws: Law[];
  selectedLawIds: string[];
  onToggleLaw: (lawId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  sampleQuestions?: string[];
}

export function LexisSearchBar({
  onSendMessage,
  isLoading,
  laws,
  selectedLawIds,
  onToggleLaw,
  onSelectAll,
  onDeselectAll,
  sampleQuestions = [],
}: LexisSearchBarProps) {
  const [input, setInput] = useState("");
  const [isJurisdictionOpen, setIsJurisdictionOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsJurisdictionOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    onSendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectSample = (q: string) => {
    if (isLoading) return;
    setInput(q);
    onSendMessage(q);
  };

  const allSelected = laws.length > 0 && selectedLawIds.length === laws.length;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3 pb-3">
      {/* Sample Inquiries (Above Input - Just like in Lexis+ screenshot) */}
      {sampleQuestions.length > 0 && (
        <div className="space-y-1.5 px-2">
          <div className="text-[11px] font-semibold text-slate-400 tracking-wide">
            Examples of legal questions to ask:
          </div>
          <div className="space-y-1">
            {sampleQuestions.slice(0, 3).map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSample(q)}
                className="w-full text-left text-xs text-slate-300 hover:text-purple-300 transition-colors flex items-center gap-1.5 py-0.5 group"
              >
                <span className="text-purple-400 group-hover:translate-x-0.5 transition-transform font-bold">
                  +
                </span>
                <span className="truncate">{q}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Metadata Pill Banner (Lexis+ Style) */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 font-medium">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-300">Includes:</span>
          <span>Statutory Codes</span>
          <span>·</span>
          <span>Character Citations</span>
          <span>·</span>
          <span>Bilingual QA</span>
          <span>·</span>
          <span>Verbatim Verification</span>
        </div>
        <span className="hidden sm:inline text-purple-400/80">⚡ Prompt Tips</span>
      </div>

      {/* Floating Pill Input Bar */}
      <div className="relative">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-purple-500/40 bg-[#0f0d26] p-2 pl-4 flex items-center shadow-[0_0_30px_rgba(124,58,237,0.15)] focus-within:border-purple-500 transition-all gap-2"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            dir="auto"
            placeholder="Ask a legal question (English, Roman Urdu, or Urdu)..."
            className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none resize-none leading-relaxed max-h-24 selection:bg-purple-500/30"
          />

          {/* Statute / Jurisdiction Dropdown Selector */}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsJurisdictionOpen(!isJurisdictionOpen)}
              className="px-3 py-1.5 rounded-xl bg-[#1c1842] hover:bg-[#252055] border border-[#2e2866] text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5 text-purple-400" />
              <span className="hidden sm:inline">
                {selectedLawIds.length === laws.length
                  ? `All Statutes (${laws.length})`
                  : `${selectedLawIds.length} of ${laws.length}`}
              </span>
              <span className="sm:hidden">
                {selectedLawIds.length}/{laws.length}
              </span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {isJurisdictionOpen && (
              <div className="absolute right-0 bottom-full mb-2 w-72 rounded-2xl bg-[#12102e] border border-[#2e2866] p-3 shadow-2xl z-50 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-[#221c54] pb-2">
                  <span className="font-semibold text-white">Filter Statutes</span>
                  <button
                    type="button"
                    onClick={allSelected ? onDeselectAll : onSelectAll}
                    className="text-purple-400 hover:underline text-[11px]"
                  >
                    {allSelected ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {laws.map((law) => {
                    const isChecked = selectedLawIds.includes(law.law_id);
                    return (
                      <label
                        key={law.law_id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-[#1a1640] cursor-pointer text-slate-300 hover:text-white transition-colors"
                      >
                        <span className="truncate pr-2 font-medium">
                          {law.name} ({law.year})
                        </span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleLaw(law.law_id)}
                          className="sr-only"
                        />
                        <div
                          className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border ${
                            isChecked
                              ? "bg-purple-600 border-purple-500 text-white"
                              : "border-slate-600 bg-[#0b0a1d]"
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white disabled:opacity-40 transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)] shrink-0"
            aria-label="Submit Question"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>

      {/* Footer Legal Terms (Lexis+ Style) */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 pt-1">
        <span>Terms & Conditions</span>
        <span>·</span>
        <span>Privacy Policy</span>
        <span>·</span>
        <span>Statutory Processing Notice</span>
        <span>·</span>
        <span>General Information Disclaimer</span>
      </div>
    </div>
  );
}
