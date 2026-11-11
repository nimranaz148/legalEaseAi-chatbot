"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, FileText, Loader2, BookOpen, Calendar, ExternalLink } from "lucide-react";
import { Citation, Chunk } from "@/types/api";
import { getChunk } from "@/lib/api";
import { STRINGS } from "@/config/strings";

interface CitationCardProps {
  citation: Citation;
  cachedChunk?: Chunk;
  onChunkCached?: (cacheKey: string, chunk: Chunk) => void;
}

export function CitationCard({ citation, cachedChunk, onChunkCached }: CitationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [chunkData, setChunkData] = useState<Chunk | null>(cachedChunk || null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Extract law_id from citation.id ("law_id:section" or "law_id:section#chunk")
  const lawId = citation.id.includes(":") ? citation.id.split(":")[0] : "";
  const cacheKey = `${lawId}:${citation.section}`;

  const handleToggleExpand = async () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);

    // If expanding and chunk data not yet loaded
    if (nextState && !chunkData && !cachedChunk) {
      setIsLoading(true);
      setFetchError(null);
      try {
        const data = await getChunk(lawId, citation.section);
        setChunkData(data);
        if (onChunkCached) {
          onChunkCached(cacheKey, data);
        }
      } catch (err: unknown) {
        setFetchError(STRINGS.errors.noTextAvailable);
      } finally {
        setIsLoading(false);
      }
    } else if (cachedChunk && !chunkData) {
      setChunkData(cachedChunk);
    }
  };

  const activeChunk = chunkData || cachedChunk;

  return (
    <div className="rounded-xl border border-[#2e2866] bg-[#110e2e]/80 overflow-hidden text-xs sm:text-sm my-2.5 transition-all shadow-sm">
      {/* Citation Header & Quote */}
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 font-semibold text-purple-300">
              <BookOpen className="h-3.5 w-3.5 shrink-0 text-purple-400" />
              <span>{citation.law_name} §{citation.section}</span>
            </span>
            {citation.title && (
              <span className="text-slate-300 font-medium">
                · {citation.title}
              </span>
            )}
          </div>

          {citation.page_start != null && (
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#1e194a] text-purple-300 border border-purple-800">
              Page {citation.page_start}
            </span>
          )}
        </div>

        {/* Verbatim quote */}
        <blockquote className="my-2 pl-3 border-l-2 border-purple-500 text-slate-300 italic font-serif text-xs sm:text-sm leading-relaxed">
          &ldquo;{citation.quote}&rdquo;
        </blockquote>

        {/* Expand / Collapse Button */}
        <button
          type="button"
          onClick={handleToggleExpand}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-purple-400 hover:text-purple-300 hover:underline transition-colors"
        >
          <FileText className="h-3.5 w-3.5" />
          <span>{isExpanded ? STRINGS.chat.hideFullText : STRINGS.chat.viewFullText}</span>
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Expanded Full Section Text Drawer */}
      {isExpanded && (
        <div className="border-t border-[#2e2866] bg-[#09071c] p-3.5 sm:p-4 text-xs">
          {isLoading ? (
            <div className="py-4 flex items-center justify-center gap-2 text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
              <span>Fetching full statutory section text...</span>
            </div>
          ) : fetchError ? (
            <div className="p-3 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-900 flex items-center justify-between">
              <span>{fetchError}</span>
              <button
                type="button"
                onClick={handleToggleExpand}
                className="underline hover:no-underline font-medium ml-2"
              >
                Retry
              </button>
            </div>
          ) : activeChunk ? (
            <div className="space-y-3">
              {/* Metadata Badges */}
              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                <span className="font-semibold text-white">
                  {activeChunk.title || `Section ${citation.section}`}
                </span>
                {activeChunk.version_date && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#161338] text-slate-300 border border-[#2e2866]">
                    <Calendar className="h-3 w-3 text-purple-400" />
                    {activeChunk.version_date}
                  </span>
                )}
                {activeChunk.source && (
                  <span className="uppercase px-1.5 py-0.5 rounded bg-[#161338] text-slate-400 font-mono text-[9px] border border-[#2e2866]">
                    Source: {activeChunk.source}
                  </span>
                )}
                {activeChunk.status && (
                  <span className="uppercase px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 text-[9px] font-semibold border border-emerald-800">
                    {activeChunk.status}
                  </span>
                )}
              </div>

              {/* Full statutory text */}
              <div className="p-3 rounded-xl bg-[#060514] border border-[#24204c] font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-slate-200 max-h-72 overflow-y-auto">
                {activeChunk.text}
              </div>

              {activeChunk.source_url && (
                <div className="pt-1 flex justify-end">
                  <a
                    href={activeChunk.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-purple-400 transition-colors"
                  >
                    <span>Official Gazette Source</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
