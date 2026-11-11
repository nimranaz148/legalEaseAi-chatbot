"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Loader2,
  Check,
  Copy,
  Download,
  AlertCircle,
  FileCheck,
  Sparkles,
  ArrowRight,
  Database,
} from "lucide-react";
import { summarizeDocument, indexUserDocument } from "@/lib/api";
import { SummarizeResponse, ApiError } from "@/types/api";

interface SummarizeViewProps {
  onAskFollowup?: (question: string) => void;
}

export function SummarizeView({ onAskFollowup }: SummarizeViewProps) {
  const [activeInputTab, setActiveInputTab] = useState<"file" | "text">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState("");
  const [instructions, setInstructions] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SummarizeResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexedMessage, setIndexedMessage] = useState<string | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (activeInputTab === "file" && !selectedFile) {
      setError("Please select or drop a PDF / document file first.");
      return;
    }
    if (activeInputTab === "text" && !rawText.trim()) {
      setError("Please enter or paste the legal text to summarize.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await summarizeDocument(
        activeInputTab === "file" ? selectedFile : null,
        activeInputTab === "text" ? rawText : undefined,
        instructions.trim() || undefined
      );
      setResult(res);
    } catch (err: unknown) {
      const apiErr = err as Partial<ApiError>;
      const msg =
        apiErr?.detail ||
        apiErr?.message ||
        (err instanceof Error ? err.message : "Failed to analyze document.");
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.summary) return;
    navigator.clipboard.writeText(result.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result?.summary) return;
    const blob = new Blob([result.summary], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${result.filename || "document"}_summary.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleIndexToDb = async () => {
    if (!selectedFile) return;
    setIsIndexing(true);
    setIndexError(null);
    try {
      const res = await indexUserDocument(selectedFile);
      setIndexedMessage(`Indexed as ${res.document.chunk_count} chunks in Qdrant Vector DB!`);
    } catch (err: unknown) {
      const apiErr = err as Partial<ApiError>;
      setIndexError(apiErr?.detail || apiErr?.message || "Failed to index document into DB.");
    } finally {
      setIsIndexing(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-medium mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          <span>AI Legal Document Intelligence</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Summarise & Analyze Legal Documents
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Upload any contract, petition, court judgment, or legal notice to receive an immediate structured legal breakdown.
        </p>
      </div>

      {/* Input Mode Tabs */}
      <div className="bg-[#12102b] p-1.5 rounded-xl border border-[#24204c] flex items-center gap-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveInputTab("file")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeInputTab === "file"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <UploadCloud className="h-4 w-4" />
          <span>Upload PDF / Image / Document</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveInputTab("text")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeInputTab === "text"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Paste Text</span>
        </button>
      </div>

      {/* Upload / Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {activeInputTab === "file" ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all bg-[#0e0c24] ${
              selectedFile
                ? "border-emerald-500/60 bg-emerald-950/10"
                : "border-[#2c2759] hover:border-purple-500/60 hover:bg-[#131033]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-purple-600/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                {selectedFile ? (
                  <FileCheck className="h-7 w-7 text-emerald-400" />
                ) : (
                  <UploadCloud className="h-7 w-7" />
                )}
              </div>

              {selectedFile ? (
                <div>
                  <p className="font-semibold text-sm sm:text-base text-white">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-emerald-400 mt-1">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Ready for Gemini Vision & Legal Analysis
                  </p>
                  <span className="text-[11px] text-slate-400 underline mt-2 inline-block">
                    Click to change file
                  </span>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-sm sm:text-base text-white">
                    Drag and drop your legal document or scanned image here, or browse
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports PDF, Scanned Images (JPG/PNG/WEBP), TXT with Gemini Vision OCR
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste contract clauses, legal notice text, or judgment excerpt here..."
              className="w-full rounded-2xl border border-[#24204c] bg-[#0e0c24] p-4 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono leading-relaxed"
            />
          </div>
        )}

        {/* Optional Focus Instructions */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Special Focus / Inquiries (Optional):
          </label>
          <input
            type="text"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. Focus on termination rights, indemnity limits, or payment terms"
            className="w-full rounded-xl border border-[#24204c] bg-[#0e0c24] px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        {error && (
          <div className="p-3.5 rounded-xl border border-rose-900/60 bg-rose-950/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || (activeInputTab === "file" && !selectedFile)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-[0_0_20px_rgba(147,51,234,0.3)] disabled:opacity-50 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Reading & Analyzing Document...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Generate Legal Summary</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Summary Output */}
      {result && (
        <div className="rounded-2xl border border-purple-500/30 bg-[#0e0c24] p-5 sm:p-7 shadow-[0_0_30px_rgba(124,58,237,0.15)] space-y-4">
          {/* Header Metadata */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#24204c]">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {result.filename}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-purple-950/60 border border-purple-800 text-purple-300">
                  {result.page_count} Pages
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-blue-950/60 border border-blue-800 text-blue-300">
                  {result.char_count.toLocaleString()} Characters
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                AI Statutory Analysis & Summary Generated
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {selectedFile && (
                <button
                  type="button"
                  onClick={handleIndexToDb}
                  disabled={isIndexing || !!indexedMessage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:text-white hover:bg-cyan-900/50 text-xs font-medium transition-colors disabled:opacity-50"
                  title="Chunk and store this document in Qdrant Vector DB for Chat RAG"
                >
                  {isIndexing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Indexing to DB...</span>
                    </>
                  ) : indexedMessage ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Indexed in DB</span>
                    </>
                  ) : (
                    <>
                      <Database className="h-3.5 w-3.5" />
                      <span>Index into RAG DB</span>
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#24204c] bg-[#161338] text-slate-300 hover:text-white text-xs font-medium transition-colors"
                title="Copy markdown summary"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#24204c] bg-[#161338] text-slate-300 hover:text-white text-xs font-medium transition-colors"
                title="Download markdown summary"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {indexedMessage && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-950/40 border border-cyan-800 text-xs text-cyan-200">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{indexedMessage}</span>
              </div>
              <a
                href="/chat"
                className="inline-flex items-center gap-1 font-semibold text-[#D4FF58] hover:underline"
              >
                Open in Chat Workspace <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {indexError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{indexError}</span>
            </div>
          )}

          {/* Structured Markdown Summary */}
          <div
            dir="auto"
            className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap selection:bg-purple-500/30"
          >
            {result.summary}
          </div>

          {/* Ask follow-up banner */}
          {onAskFollowup && (
            <div className="pt-4 border-t border-[#24204c] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <span className="text-slate-400">
                Want to query the statutory legal codes regarding provisions in this document?
              </span>
              <button
                type="button"
                onClick={() => onAskFollowup(`Based on the summarized document "${result.filename}", what are the legal precedents and relevant statute sections?`)}
                className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 font-semibold"
              >
                <span>Query in Legal Research Chat</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
