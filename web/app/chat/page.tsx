"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Bookmark, ShieldCheck, Scale } from "lucide-react";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { MiosNavbar } from "@/components/MiosNavbar";
import { MiosWorkspace } from "@/components/MiosWorkspace";
import { CitationCard } from "@/components/CitationCard";
import { ErrorState } from "@/components/ErrorState";
import { getHealth, getLaws, ask } from "@/lib/api";
import { Law, Health, ApiError, Chunk, Citation } from "@/types/api";
import { ChatMessage } from "@/types/chat";
import { STRINGS } from "@/config/strings";

export default function ChatPage() {
  const [laws, setLaws] = useState<Law[]>([]);
  const [selectedLawIds, setSelectedLawIds] = useState<string[]>([]);
  const [backendHealth, setBackendHealth] = useState<Health | null>(null);
  const [isLoadingInit, setIsLoadingInit] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Chat conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [activeDisclaimer, setActiveDisclaimer] = useState<string | undefined>(undefined);

  // In-memory cache for fetched section chunks
  const [chunksCache, setChunksCache] = useState<Record<string, Chunk>>({});

  const handleCacheChunk = useCallback((cacheKey: string, chunk: Chunk) => {
    setChunksCache((prev) => ({ ...prev, [cacheKey]: chunk }));
  }, []);

  // Initial data load: laws catalog and backend health
  const loadInitialData = useCallback(async () => {
    setIsLoadingInit(true);
    setInitError(null);
    try {
      const [healthRes, lawsRes] = await Promise.allSettled([getHealth(), getLaws()]);

      if (healthRes.status === "fulfilled") {
        setBackendHealth(healthRes.value);
      } else {
        const err = healthRes.reason as ApiError;
        setBackendHealth(null);
        setInitError(err?.detail || STRINGS.errors.backendDown);
      }

      if (lawsRes.status === "fulfilled") {
        setLaws(lawsRes.value);
        setSelectedLawIds(lawsRes.value.map((l) => l.law_id));
      } else {
        setLaws([]);
      }
    } catch {
      setInitError(STRINGS.errors.generic);
    } finally {
      setIsLoadingInit(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Law multi-select toggles
  const handleToggleLaw = (lawId: string) => {
    setSelectedLawIds((prev) =>
      prev.includes(lawId) ? prev.filter((id) => id !== lawId) : [...prev, lawId]
    );
  };

  // Submit question to statutory RAG backend
  const handleSendMessage = async (question: string) => {
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: question,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsAsking(true);

    try {
      const res = await ask({
        question,
        law_ids: selectedLawIds.length > 0 ? selectedLawIds : null,
        debug: false,
      });

      if (res.disclaimer) {
        setActiveDisclaimer(res.disclaimer);
      }

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.answer,
        citations: res.citations,
        found: res.found,
        disclaimer: res.disclaimer,
        debug: res.debug,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      const errorContent = apiErr?.isNetworkError
        ? STRINGS.errors.backendDown
        : apiErr?.isRateLimit
        ? STRINGS.errors.rateLimit
        : apiErr?.detail || apiErr?.message || STRINGS.errors.generic;

      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ Error: ${errorContent}`,
        found: false,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAsking(false);
    }
  };

  // Render citations with cache
  const renderCitations = useCallback(
    (citations: Citation[]) => {
      if (!citations || citations.length === 0) return null;
      return (
        <div className="space-y-2 mt-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
            <Bookmark className="h-3.5 w-3.5 text-[#D4FF58]" />
            {STRINGS.chat.citationsTitle} ({citations.length})
          </h4>
          <div className="space-y-2">
            {citations.map((cit, idx) => {
              const lawId = cit.id.includes(":") ? cit.id.split(":")[0] : "";
              const cacheKey = `${lawId}:${cit.section}`;
              return (
                <CitationCard
                  key={`${cit.id}-${idx}`}
                  citation={cit}
                  cachedChunk={chunksCache[cacheKey]}
                  onChunkCached={handleCacheChunk}
                />
              );
            })}
          </div>
        </div>
      );
    },
    [chunksCache, handleCacheChunk]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#080718] text-slate-100 font-sans selection:bg-[#D4FF58] selection:text-black relative overflow-x-hidden">
      {/* Background radial atmosphere */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-purple-900/20 via-indigo-950/15 to-transparent blur-[140px] pointer-events-none -z-10" />

      {/* 1. Top Permanent Disclaimer Banner (Repo constraint) */}
      <DisclaimerBanner disclaimerText={activeDisclaimer} />

      {/* 2. Floating Navbar */}
      <MiosNavbar
        laws={laws}
        selectedLawIds={selectedLawIds}
        onToggleLaw={handleToggleLaw}
      />

      {/* Main Workspace Stage */}
      <main className="flex-1 pt-20 pb-12 px-4 sm:px-6 max-w-7xl mx-auto w-full flex flex-col">
        {/* Navigation Breadcrumb & Back Link */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-white/20"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Overview</span>
          </Link>

          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>RAG Engine Online</span>
            </div>
            <Link
              href="/tools"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-900/40 border border-purple-500/30 text-purple-200 hover:text-white transition-colors"
            >
              <span>Doc Summariser</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {initError && !backendHealth && (
          <div className="max-w-4xl mx-auto mb-6 w-full">
            <ErrorState isBackendDown={true} onRetry={loadInitialData} />
          </div>
        )}

        {/* Mios 3-Column Support Workspace */}
        <div className="flex-1 flex flex-col justify-center">
          <MiosWorkspace
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isAsking}
            renderCitations={renderCitations}
            laws={laws}
            selectedLawIds={selectedLawIds}
            onToggleLaw={handleToggleLaw}
            backendHealth={backendHealth}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 px-4 text-center text-xs text-slate-500 bg-[#060515]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-slate-300">
            <Scale className="h-4 w-4 text-[#D4FF58]" />
            <span>LegalEase — Live Workspace</span>
          </div>
          <p className="text-[11px] text-slate-500 max-w-md">
            Yeh nizam sirf maloomati aur qanooni tehqeeq k liye hai, qanooni mashwara nahi. Verbatim chunk citations strictly enforced.
          </p>
          <div className="flex items-center gap-4 text-slate-400 text-xs">
            <Link href="/" className="hover:text-white transition-colors">
              Overview
            </Link>
            <Link href="/tools" className="hover:text-white transition-colors">
              Document Summariser
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
