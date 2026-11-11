"use client";

import React, { useState } from "react";
import { PenTool, Sparkles, Loader2, Copy, Check, Download, AlertCircle, ShieldCheck } from "lucide-react";
import { draftDocument } from "@/lib/api";
import { DraftResponse, ApiError } from "@/types/api";

const DOCUMENT_TYPES = [
  "Legal Notice",
  "Non-Disclosure Agreement (NDA)",
  "Employment Contract",
  "Power of Attorney (Mukhtarnama)",
  "Tenancy / Lease Agreement",
  "Written Reply / Statement",
  "Settlement & Release Deed",
];

export function DraftView() {
  const [selectedType, setSelectedType] = useState(DOCUMENT_TYPES[0]);
  const [topic, setTopic] = useState("");
  const [parties, setParties] = useState("");
  const [keyTerms, setKeyTerms] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DraftResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError("Please describe the topic or instructions for the legal draft.");
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const res = await draftDocument({
        topic: topic.trim(),
        document_type: selectedType,
        parties: parties.trim() || undefined,
        key_terms: keyTerms.trim() || undefined,
      });
      setResult(res);
    } catch (err: unknown) {
      const apiErr = err as Partial<ApiError>;
      const msg =
        apiErr?.detail ||
        apiErr?.message ||
        (err instanceof Error ? err.message : "Failed to generate legal draft.");
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.draft) return;
    navigator.clipboard.writeText(result.draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result?.draft) return;
    const blob = new Blob([result.draft], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${result.document_type.replace(/[^a-zA-Z0-9]/g, "_")}_draft.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-medium mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          <span>AI Legal Drafting Assistant</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Draft Legal Documents & Agreements
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Generate legally sound templates, formal notices, and contract clauses structured with standard legal conventions.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-[#0e0c24] border border-[#24204c] rounded-2xl p-5 sm:p-6 space-y-5">
        {/* Document Type Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Select Document Template
          </label>
          <div className="flex flex-wrap gap-2">
            {DOCUMENT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedType === type
                    ? "bg-purple-600 text-white shadow-sm border border-purple-400/40"
                    : "bg-[#161338] text-slate-400 hover:text-white border border-[#282352]"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Topic / Core Instructions */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Subject Matter & Instructions <span className="text-purple-400">*</span>
          </label>
          <textarea
            rows={3}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Legal notice for non-payment of professional fee amounting to Rs. 250,000 against breach of delivery agreement within 15 days."
            className="w-full rounded-xl border border-[#24204c] bg-[#070617] p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        {/* Two-column: Parties & Key Terms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Parties Involved (Optional)
            </label>
            <input
              type="text"
              value={parties}
              onChange={(e) => setParties(e.target.value)}
              placeholder="e.g. Sender: ABC Services, Recipient: XYZ Enterprises"
              className="w-full rounded-xl border border-[#24204c] bg-[#070617] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Key Terms / Special Clauses (Optional)
            </label>
            <input
              type="text"
              value={keyTerms}
              onChange={(e) => setKeyTerms(e.target.value)}
              placeholder="e.g. 15-day cure notice, 2% penalty interest, Karachi jurisdiction"
              className="w-full rounded-xl border border-[#24204c] bg-[#070617] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl border border-rose-900/60 bg-rose-950/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isLoading || !topic.trim()}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-[0_0_20px_rgba(147,51,234,0.3)] disabled:opacity-50 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Drafting Legal Document...</span>
              </>
            ) : (
              <>
                <PenTool className="h-4 w-4" />
                <span>Generate Legal Draft</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Generated Draft Output */}
      {result && (
        <div className="rounded-2xl border border-purple-500/30 bg-[#0e0c24] p-5 sm:p-7 shadow-[0_0_30px_rgba(124,58,237,0.15)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#24204c]">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {result.title}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Customizable Legal Draft Template Generated
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#24204c] bg-[#161338] text-slate-300 hover:text-white text-xs font-medium transition-colors"
                title="Copy full draft"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#24204c] bg-[#161338] text-slate-300 hover:text-white text-xs font-medium transition-colors"
                title="Download draft"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Draft text */}
          <div
            dir="auto"
            className="p-4 rounded-xl bg-[#070617] border border-[#24204c] text-xs sm:text-sm text-slate-200 font-mono leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto selection:bg-purple-500/30"
          >
            {result.draft}
          </div>
        </div>
      )}
    </div>
  );
}
