"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles, AlertCircle, ArrowDown } from "lucide-react";
import { ChatMessage } from "@/types/chat";
import { MessageBubble } from "@/components/MessageBubble";
import { STRINGS } from "@/config/strings";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (question: string) => Promise<void>;
  isLoading: boolean;
  selectedLawCount: number;
  totalLawCount: number;
  exampleQuestions?: string[];
  renderCitations?: (citations: NonNullable<ChatMessage["citations"]>) => React.ReactNode;
}

export function ChatPanel({
  messages,
  onSendMessage,
  isLoading,
  selectedLawCount,
  totalLawCount,
  exampleQuestions = [],
  renderCitations,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setInput("");
    await onSendMessage(trimmed);

    // Refocus textarea
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleExampleClick = (example: string) => {
    if (isLoading) return;
    setInput(example);
    onSendMessage(example);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto min-h-full flex flex-col justify-between">
          {messages.length === 0 ? (
            /* Empty State / Welcome Hero */
            <div className="my-auto py-12 px-4 text-center max-w-xl mx-auto">
              <div className="inline-flex p-3.5 rounded-2xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 mb-4 border border-emerald-600/20 shadow-sm">
                <Sparkles className="h-7 w-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {STRINGS.chat.emptyConversationTitle}
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {STRINGS.chat.emptyConversationDesc}
              </p>

              {/* Example Question Chips */}
              {exampleQuestions.length > 0 && (
                <div className="mt-8 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 block text-center">
                    Try an inquiry
                  </span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {exampleQuestions.slice(0, 4).map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleExampleClick(q)}
                        className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 hover:shadow-sm dark:hover:border-emerald-700 text-xs sm:text-sm text-slate-700 dark:text-slate-300 transition-all leading-snug"
                      >
                        <span className="text-emerald-600 dark:text-emerald-400 mr-1.5 font-bold">Q:</span>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Message Bubbles */
            <div className="space-y-4 pt-2">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  renderCitations={renderCitations}
                />
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex justify-start gap-3 max-w-3xl mr-auto mb-6">
                  <div className="h-8 w-8 rounded-full bg-slate-900 dark:bg-emerald-950 text-white dark:text-emerald-400 flex items-center justify-center shrink-0 border border-slate-700 dark:border-emerald-800">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-3">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                      {STRINGS.chat.thinking}
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="max-w-4xl mx-auto">
          {selectedLawCount === 0 && (
            <div className="mb-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>Warning: No statutes selected. The search will query all indexed statutes.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative flex items-center">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={STRINGS.chat.inputPlaceholder}
              disabled={isLoading}
              dir="auto"
              className="w-full resize-none rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 pr-24 text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
              style={{ minHeight: "52px", maxHeight: "160px" }}
            />

            <div className="absolute right-2 flex items-center gap-1.5">
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                className="p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:hover:bg-emerald-600 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </form>

          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>
              Press <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono">Enter</kbd> to send,{" "}
              <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono">Shift+Enter</kbd> for new line
            </span>
            <span className="font-mono">
              Scope: {selectedLawCount} of {totalLawCount} statutes active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
