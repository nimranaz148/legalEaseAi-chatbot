"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale, Sparkles, Menu, ChevronDown, Check, BookOpen, ShieldCheck, FileText, ArrowRight, User, Shield } from "lucide-react";
import { Law } from "@/types/api";

interface MiosNavbarProps {
  laws?: Law[];
  selectedLawIds?: string[];
  onToggleLaw?: (lawId: string) => void;
}

export function MiosNavbar({
  laws = [],
  selectedLawIds = [],
  onToggleLaw,
}: MiosNavbarProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLawDropdownOpen, setIsLawDropdownOpen] = useState(false);

  const isChat = pathname === "/chat";
  const isTools = pathname === "/tools";
  const isAdmin = pathname === "/admin";
  const isHome = pathname === "/";

  return (
    <header className="fixed top-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto bg-[#100d28]/90 backdrop-blur-xl border border-white/10 rounded-full px-4 sm:px-6 py-2 flex items-center gap-3 sm:gap-6 shadow-[0_10px_35px_rgba(0,0,0,0.5)]">
        {/* Brand Logo (Scales of Justice) */}
        <Link
          href="/"
          className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
        >
          <div className="h-7 w-7 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-[#D4FF58] flex items-center justify-center shadow-[0_0_12px_rgba(212,255,88,0.35)]">
            <Scale className="h-4 w-4 text-black stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
              Legal<span className="text-[#D4FF58]">Ease</span>
            </span>
            <span className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-purple-900/60 border border-purple-500/30 text-[9px] font-bold text-purple-300">
              AI
            </span>
          </div>
        </Link>

        {/* View Switcher Navigation */}
        <nav className="hidden md:flex items-center gap-1 text-xs">
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-full transition-all font-medium ${
              isHome
                ? "bg-white/15 text-[#D4FF58] border border-[#D4FF58]/30 shadow-[0_0_12px_rgba(212,255,88,0.2)]"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Overview
          </Link>

          <Link
            href="/chat"
            className={`px-3.5 py-1.5 rounded-full transition-all font-semibold flex items-center gap-1.5 ${
              isChat
                ? "bg-[#D4FF58] text-black shadow-[0_0_15px_rgba(212,255,88,0.35)]"
                : "bg-white/10 text-white hover:bg-white/15 border border-white/10"
            }`}
          >
            <Scale className="h-3.5 w-3.5" />
            <span>Chat Workspace</span>
          </Link>

          <Link
            href="/#section-metrics"
            className="px-3 py-1.5 rounded-full transition-all font-medium text-slate-300 hover:text-white"
          >
            Statutory Metrics
          </Link>

          <Link
            href="/#section-bento"
            className="px-3 py-1.5 rounded-full transition-all font-medium text-slate-300 hover:text-white"
          >
            Workflow & Citations
          </Link>

          <Link
            href="/tools"
            className={`px-3 py-1.5 rounded-full transition-all font-medium ${
              isTools
                ? "bg-white/15 text-[#D4FF58] border border-[#D4FF58]/30 shadow-[0_0_12px_rgba(212,255,88,0.2)]"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Doc Summariser & Draft
          </Link>

          <Link
            href="/admin"
            className={`px-3 py-1.5 rounded-full transition-all font-medium ${
              isAdmin
                ? "bg-white/15 text-[#D4FF58] border border-[#D4FF58]/30 shadow-[0_0_12px_rgba(212,255,88,0.2)]"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Admin Panel
          </Link>
        </nav>

        {/* Quick Statutes Filter (Corpus selector) */}
        {laws.length > 0 && onToggleLaw && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLawDropdownOpen(!isLawDropdownOpen)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 transition-colors"
            >
              <BookOpen className="h-3 w-3 text-[#D4FF58]" />
              <span>
                {selectedLawIds.length === laws.length
                  ? `Statutes (${laws.length})`
                  : `${selectedLawIds.length}/${laws.length}`}
              </span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {isLawDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#120f2e] border border-white/15 rounded-2xl p-2.5 shadow-2xl text-xs z-50">
                <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 border-b border-white/10 mb-1 flex items-center justify-between">
                  <span>Active Statutes</span>
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                </div>
                {laws.map((law) => {
                  const isChecked = selectedLawIds.includes(law.law_id);
                  return (
                    <button
                      key={law.law_id}
                      type="button"
                      onClick={() => onToggleLaw(law.law_id)}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/10 text-left transition-colors"
                    >
                      <span className="truncate pr-2 text-slate-200">{law.name}</span>
                      <div
                        className={`h-4 w-4 rounded flex items-center justify-center border ${
                          isChecked ? "bg-[#D4FF58] text-black border-[#D4FF58]" : "border-slate-500"
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Admin Portal Button */}
        <Link
          href="/admin"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D4FF58]/10 hover:bg-[#D4FF58]/20 border border-[#D4FF58]/30 text-[#D4FF58] text-xs font-semibold transition-all hover:scale-105"
        >
          <Shield className="h-3 w-3" />
          <span>Admin Portal</span>
        </Link>

        {/* Mobile Menu Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-all border border-white/15"
          >
            <Menu className="h-3.5 w-3.5" />
            <span>Menu</span>
          </button>

          {/* Menu Dropdown */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-[#120f2e] border border-white/15 rounded-2xl p-2 shadow-2xl text-xs z-50 space-y-1">
              <Link
                href="/"
                onClick={() => setIsMenuOpen(false)}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 transition-colors flex items-center gap-2"
              >
                <span>🏠 Overview</span>
              </Link>
              <Link
                href="/chat"
                onClick={() => setIsMenuOpen(false)}
                className="w-full text-left px-3 py-2 rounded-xl bg-[#D4FF58]/10 text-[#D4FF58] font-semibold transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Scale className="h-3.5 w-3.5" />
                  <span>Chat Workspace</span>
                </div>
                <ArrowRight className="h-3 w-3" />
              </Link>
              <Link
                href="/admin"
                onClick={() => setIsMenuOpen(false)}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 text-emerald-300 transition-colors flex items-center gap-2 font-semibold"
              >
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                <span>Admin Portal</span>
              </Link>
              <Link
                href="/login"
                onClick={() => setIsMenuOpen(false)}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 text-[#D4FF58] transition-colors flex items-center gap-2 font-semibold"
              >
                <User className="h-3.5 w-3.5 text-[#D4FF58]" />
                <span>Login / Signup</span>
              </Link>
              <Link
                href="/#section-metrics"
                onClick={() => setIsMenuOpen(false)}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 transition-colors flex items-center gap-2"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                <span>Statutory Metrics</span>
              </Link>
              <Link
                href="/#section-bento"
                onClick={() => setIsMenuOpen(false)}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 transition-colors flex items-center gap-2"
              >
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                <span>Workflow & Citations</span>
              </Link>
              <Link
                href="/tools"
                onClick={() => setIsMenuOpen(false)}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 transition-colors flex items-center gap-2"
              >
                <FileText className="h-3.5 w-3.5 text-pink-400" />
                <span>Doc Summariser & Draft</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
