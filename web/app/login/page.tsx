"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Scale,
  Lock,
  Mail,
  User,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Building2,
  FileBadge,
  Sparkles,
} from "lucide-react";
import { signInUser, signUpUser, getLocalProfile, isSupabaseConfigured } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Sign up fields
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("Advocate");
  const [barLicenseNo, setBarLicenseNo] = useState("");
  const [organization, setOrganization] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLiveSupabase, setIsLiveSupabase] = useState(false);

  useEffect(() => {
    setIsLiveSupabase(isSupabaseConfigured());
    // If already logged in, redirect to admin
    const profile = getLocalProfile();
    if (profile && profile.email) {
      // User is already signed in
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (mode === "signin") {
        if (!email.trim() || !password.trim()) {
          throw new Error("Please enter your email and password.");
        }
        const { user, error } = await signInUser(email.trim(), password);
        if (error) throw new Error(error);

        setSuccessMsg(`Welcome back, ${user?.full_name || "Advocate"}! Redirecting to Admin Panel...`);
        setTimeout(() => {
          router.push("/admin");
        }, 1000);
      } else {
        if (!fullName.trim() || !email.trim() || !password.trim()) {
          throw new Error("Please fill in your name, email, and password.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }

        const { user, error } = await signUpUser(email.trim(), password, {
          full_name: fullName.trim(),
          role,
          bar_license_no: barLicenseNo.trim(),
          organization: organization.trim(),
        });
        if (error) throw new Error(error);

        setSuccessMsg(`Account created for ${user?.full_name}! Redirecting to Admin Panel...`);
        setTimeout(() => {
          router.push("/admin");
        }, 1000);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Authentication failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail("advocate.nimra@legalease.pk");
    setPassword("PakistanLaw#2026");
    if (mode === "signup") {
      setFullName("Adv. Nimra Naz");
      setRole("Advocate");
      setBarLicenseNo("BC-2024-KHI");
      setOrganization("Karachi High Court Bar");
    }
  };

  return (
    <div className="min-h-screen bg-[#070614] text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-purple-900/25 via-indigo-900/20 to-[#D4FF58]/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Top Floating Logo */}
      <div className="mb-8 flex flex-col items-center text-center z-10">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-3 group">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-[#D4FF58] flex items-center justify-center shadow-[0_0_25px_rgba(212,255,88,0.35)] group-hover:scale-105 transition-transform">
            <Scale className="h-5 w-5 text-black stroke-[2.5]" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-white">
            Legal<span className="text-[#D4FF58]">Ease</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/30 text-[10px] font-bold text-purple-300">
              Admin
            </span>
          </span>
        </Link>
        <p className="text-xs text-slate-400 max-w-sm">
          Authorized Legal Practitioner Portal & Knowledge Base Control Center
        </p>
      </div>

      {/* Main Glassmorphic Card */}
      <div className="w-full max-w-md bg-[#0e0c24]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-10 relative">
        {/* Supabase Status Pill */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                isLiveSupabase ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span className="text-[11px] font-mono text-slate-400">
              {isLiveSupabase ? "Supabase Cloud Connected" : "Local Prototype Mode (Ready)"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleFillDemo}
            className="text-[10px] text-[#D4FF58] hover:underline flex items-center gap-1 font-semibold"
          >
            <Sparkles className="h-3 w-3" />
            <span>Fill Demo</span>
          </button>
        </div>

        {/* Tab Switcher: Sign In vs Sign Up */}
        <div className="grid grid-cols-2 p-1 bg-white/5 border border-white/10 rounded-2xl mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl transition-all ${
              mode === "signin"
                ? "bg-[#D4FF58] text-black shadow-md font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl transition-all ${
              mode === "signup"
                ? "bg-[#D4FF58] text-black shadow-md font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-300 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <>
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Full Name / Title
                </label>
                <div className="relative">
                  <User className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Adv. Nimra Naz"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4FF58] transition-colors"
                  />
                </div>
              </div>

              {/* Persona / Role Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Professional Legal Persona
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#14122d] border border-white/10 text-xs text-white focus:outline-none focus:border-[#D4FF58] transition-colors"
                >
                  <option value="Advocate">Advocate (High Court / Supreme Court)</option>
                  <option value="Corporate Counsel">Corporate In-House Counsel</option>
                  <option value="Legal Researcher">Legal Researcher / Associate</option>
                  <option value="Law Student">Law Student / Academic</option>
                </select>
              </div>

              {/* Bar License No & Organization */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Bar License # (Opt)
                  </label>
                  <div className="relative">
                    <FileBadge className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      value={barLicenseNo}
                      onChange={(e) => setBarLicenseNo(e.target.value)}
                      placeholder="BC-2024"
                      className="w-full pl-8 pr-2.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4FF58]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Bar / Firm (Opt)
                  </label>
                  <div className="relative">
                    <Building2 className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="High Court Bar"
                      className="w-full pl-8 pr-2.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4FF58]"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="advocate@legalease.pk"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4FF58] transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4FF58] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-[#D4FF58] hover:bg-[#bceb42] text-black font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,255,88,0.25)] transition-all hover:scale-[1.01] disabled:opacity-50 mt-6"
          >
            <span>
              {isLoading
                ? "Authenticating..."
                : mode === "signin"
                ? "Sign In to Admin Panel"
                : "Create Account & Access Admin"}
            </span>
            <ArrowRight className="h-4 w-4 stroke-[2.5]" />
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span>Public citizen?</span>
          <Link
            href="/chat"
            className="text-[#D4FF58] hover:underline flex items-center gap-1 font-semibold"
          >
            <span>Open Public Legal Chat</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
