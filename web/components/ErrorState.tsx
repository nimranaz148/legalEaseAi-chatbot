"use client";

import React from "react";
import { AlertCircle, RefreshCw, Terminal, Clock, Copy, Check } from "lucide-react";
import { STRINGS } from "@/config/strings";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  isBackendDown?: boolean;
  isRateLimit?: boolean;
  className?: string;
}

export function ErrorState({
  title,
  message,
  onRetry,
  isBackendDown,
  isRateLimit,
  className = "",
}: ErrorStateProps) {
  const [copied, setCopied] = React.useState(false);

  const command = "uvicorn api.main:app --reload";

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const defaultTitle = isBackendDown
    ? "Backend Connection Failed"
    : isRateLimit
    ? "Rate Limit Reached"
    : "Request Failed";

  const defaultMessage = isBackendDown
    ? STRINGS.errors.backendDown
    : isRateLimit
    ? STRINGS.errors.rateLimit
    : message || STRINGS.errors.generic;

  return (
    <div
      role="alert"
      className={`rounded-2xl border p-4 sm:p-5 transition-all ${
        isRateLimit
          ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200"
          : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200"
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-xl shrink-0 ${
            isRateLimit
              ? "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400"
              : "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400"
          }`}
        >
          {isRateLimit ? (
            <Clock className="h-5 w-5" />
          ) : isBackendDown ? (
            <Terminal className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm sm:text-base leading-tight">
            {title || defaultTitle}
          </h4>
          <p className="mt-1 text-xs sm:text-sm opacity-90 leading-relaxed">
            {message || defaultMessage}
          </p>

          {/* Quick command copy for backend down */}
          {isBackendDown && (
            <div className="mt-3 flex items-center gap-2">
              <code className="text-xs font-mono bg-black/5 dark:bg-black/40 px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 select-all">
                {command}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
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
          )}

          {/* Retry Action */}
          {onRetry && (
            <div className="mt-3">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Retry Connection</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
