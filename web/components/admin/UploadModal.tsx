"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  ArrowRight,
  Sparkles,
  Database,
  Cpu,
} from "lucide-react";
import { indexUserDocument } from "@/lib/api";
import { IndexDocumentResponse } from "@/types/api";

interface UploadModalProps {
  onClose: () => void;
  onUploadSuccess: (newDoc: IndexDocumentResponse["document"]) => void;
  onInspectNewDoc: (docId: string, filename: string) => void;
}

export function UploadModal({ onClose, onUploadSuccess, onInspectNewDoc }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadedResult, setUploadedResult] = useState<IndexDocumentResponse["document"] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMsg(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setErrorMsg(null);
    }
  };

  const handleStartUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setErrorMsg(null);
    setUploadStep(1); // Extracting

    try {
      const stepTimer1 = setTimeout(() => setUploadStep(2), 1500); // Chunking
      const stepTimer2 = setTimeout(() => setUploadStep(3), 3000); // Embedding & Qdrant

      const res = await indexUserDocument(selectedFile);

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setUploadStep(4); // Done

      setUploadedResult(res.document);
      onUploadSuccess(res.document);
    } catch (err: any) {
      const raw = String(err?.detail || err?.message || "Failed to index document.");
      if (raw.includes("429") || raw.includes("quota")) {
        setErrorMsg("Google Gemini rate limit reached. The system indexed the first batch or fallback vectors. Please try documents under 25 pages.");
      } else {
        setErrorMsg(raw);
      }
      setUploadStep(0);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0e0c26] border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#D4FF58]/10 border border-[#D4FF58]/30 flex items-center justify-center text-[#D4FF58]">
              <UploadCloud className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Knowledge Base Upload</h3>
              <p className="text-[11px] text-slate-400">PDF Document Ingestion & Chunk Vectorization</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Upload Success State */}
        {uploadedResult ? (
          <div className="space-y-5 text-center py-4">
            <div className="h-16 w-16 mx-auto rounded-3xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
            </div>

            <div>
              <h4 className="text-base font-extrabold text-white">{uploadedResult.filename}</h4>
              <p className="text-xs text-[#D4FF58] font-mono mt-1">
                Successfully processed into {uploadedResult.chunk_count} semantic vector chunks!
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-2xl bg-white/5 border border-white/10 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Pages Indexed</span>
                <span className="font-bold text-white font-mono">{uploadedResult.page_count}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Total Chunks</span>
                <span className="font-bold text-[#D4FF58] font-mono">{uploadedResult.chunk_count}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Vector Dimension</span>
                <span className="font-bold text-cyan-400 font-mono">768-D</span>
              </div>
            </div>

            {/* Primary Action: Inspect Chunks */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onInspectNewDoc(uploadedResult.doc_id, uploadedResult.filename);
                }}
                className="w-full py-3 rounded-xl bg-[#D4FF58] hover:bg-[#bceb42] text-black font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,255,88,0.25)] transition-all hover:scale-[1.01]"
              >
                <Layers className="h-4 w-4 stroke-[2.5]" />
                <span>View & Inspect Generated Chunks Now</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
              >
                Done / Back to Knowledge Base
              </button>
            </div>
          </div>
        ) : (
          /* Upload Form */
          <div className="space-y-4">
            {/* Drag & Drop Area */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                selectedFile
                  ? "border-[#D4FF58]/60 bg-[#D4FF58]/5"
                  : "border-white/15 hover:border-white/30 bg-white/[0.02]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <>
                  <div className="h-10 w-10 rounded-xl bg-purple-950/80 border border-purple-600 flex items-center justify-center text-purple-300">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-white truncate max-w-xs">
                    {selectedFile.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready to Chunk
                  </span>
                </>
              ) : (
                <>
                  <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-200">
                    Click to select PDF or drag & drop file
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Supports PDFs, Scanned Legal Docs (OCR), and Legal Text
                  </span>
                </>
              )}
            </div>

            {/* Pipeline Stage Indicators (while uploading) */}
            {isUploading && (
              <div className="space-y-2 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pb-2 border-b border-white/5">
                  <span className="flex items-center gap-1.5 text-white">
                    <Loader2 className="h-3 w-3 animate-spin text-[#D4FF58]" />
                    Processing Pipeline BTS...
                  </span>
                  <span className="text-[#D4FF58]">Stage {uploadStep} of 4</span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className={`flex items-center gap-2 ${uploadStep >= 1 ? "text-emerald-400" : "text-slate-500"}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>PyMuPDF Text & Structure Extraction</span>
                  </div>
                  <div className={`flex items-center gap-2 ${uploadStep >= 2 ? "text-emerald-400" : "text-slate-500"}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Semantic Section & Clause Chunking (~1000 char blocks)</span>
                  </div>
                  <div className={`flex items-center gap-2 ${uploadStep >= 3 ? "text-emerald-400" : "text-slate-500"}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Gemini Embedding (768-dim) & Qdrant Upsert</span>
                  </div>
                </div>
              </div>
            )}

            {/* Notice */}
            <p className="text-[10px] text-slate-500 leading-relaxed">
              💡 For instant web indexing, the first 25 pages / 60 chunks are indexed to stay within Gemini Free Tier limits.
            </p>

            {/* Submit Button */}
            <button
              type="button"
              disabled={!selectedFile || isUploading}
              onClick={handleStartUpload}
              className="w-full py-3 rounded-xl bg-[#D4FF58] hover:bg-[#bceb42] text-black font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,255,88,0.25)] transition-all disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing & Chunking...</span>
                </>
              ) : (
                <>
                  <span>Upload & Run Ingestion Pipeline</span>
                  <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
