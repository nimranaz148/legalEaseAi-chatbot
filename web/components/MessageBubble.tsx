"use client";

import React, { useState } from "react";
import { User, Sparkles, Copy, Check, SearchX } from "lucide-react";
import { ChatMessage } from "@/types/chat";
import { STRINGS } from "@/config/strings";
import { DebugPanel } from "@/components/DebugPanel";

interface MessageBubbleProps {
  message: ChatMessage;
  renderCitations?: (citations: NonNullable<ChatMessage["citations"]>) => React.ReactNode;
}

export function MessageBubble({ message, renderCitations }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 max-w-3xl ml-auto mb-6">
        <div className="flex flex-col items-end">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-3 shadow-[0_0_15px_rgba(147,51,234,0.25)] text-xs sm:text-sm leading-relaxed max-w-xl break-words font-medium">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 px-1">
            {message.timestamp}
          </span>
        </div>
        <div className="h-8 w-8 rounded-full bg-purple-600/20 text-purple-300 flex items-center justify-center shrink-0 border border-purple-500/40">
          <User className="h-4 w-4" />
        </div>
      </div>
    );
  }

  // Assistant Response: Check if found === false (No data found card)
  const isNoData = message.found === false && !message.content.startsWith("⚠️ Error");

  return (
    <div className="flex justify-start gap-3 max-w-3xl mr-auto mb-6">
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(147,51,234,0.4)]">
        <Sparkles className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="bg-[#0e0c24] border border-[#24204c] rounded-2xl rounded-tl-none p-4 sm:p-5 shadow-[0_0_20px_rgba(124,58,237,0.08)]">
          {isNoData ? (
            /* Neutral No-Data Card (Zero citations rendered) */
            <div className="rounded-xl border border-[#2c2759] bg-[#141033] p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#1e194a] text-purple-400 shrink-0">
                  <SearchX className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-white">
                    {STRINGS.chat.noDataTitle}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {STRINGS.chat.noDataDesc}
                  </p>
                  <p className="mt-2 text-xs font-mono text-purple-300 bg-[#0a091c] p-2 rounded border border-[#2c2759] inline-block">
                    {message.content}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Normal Answer Text with dir="auto" and Urdu font */
            <div
              dir="auto"
              className="font-urdu text-sm sm:text-base leading-relaxed text-slate-100 whitespace-pre-wrap selection:bg-purple-500/30"
            >
              {message.content}
            </div>
          )}

          {/* Render Citations ONLY if found !== false */}
          {!isNoData && message.citations && message.citations.length > 0 && renderCitations && (
            <div className="mt-4 pt-3 border-t border-[#1e1b3d]">
              {renderCitations(message.citations)}
            </div>
          )}

          {/* Render Debug Panel if available */}
          {message.debug && (
            <div className="mt-3">
              <DebugPanel debug={message.debug} />
            </div>
          )}

          {/* Footer controls: copy, timestamp */}
          <div className="mt-3 pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-[#1e1b3d]">
            <span className="text-[10px]">{message.timestamp}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                title="Copy response"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
