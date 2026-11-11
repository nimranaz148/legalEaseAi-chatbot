"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { STRINGS } from "@/config/strings";

interface DisclaimerBannerProps {
  disclaimerText?: string;
  className?: string;
}

export function DisclaimerBanner({ disclaimerText, className = "" }: DisclaimerBannerProps) {
  const content = disclaimerText || STRINGS.defaultDisclaimer;

  return (
    <aside
      role="note"
      aria-label="Legal Disclaimer"
      className={`w-full bg-[#160e29] border-b border-[#2e1d52] text-amber-200/90 px-4 py-2 transition-colors ${className}`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-medium">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
          <p className="leading-snug truncate">
            <strong className="font-semibold text-amber-300">{STRINGS.disclaimerPrefix}</strong>{" "}
            <span>{content}</span>
          </p>
        </div>
        <span className="hidden md:inline text-[11px] text-amber-300/70 font-mono">
          Non-binding statutory references
        </span>
      </div>
    </aside>
  );
}
