"use client";

import React, { useState } from "react";
import {
  User,
  Mail,
  Shield,
  FileBadge,
  Building2,
  Calendar,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  Phone,
} from "lucide-react";
import { UserProfile, updateUserProfile } from "@/lib/supabase";

interface UserDetailCardProps {
  profile: UserProfile | null;
  onProfileUpdated: (updated: UserProfile) => void;
}

export function UserDetailCard({ profile, onProfileUpdated }: UserDetailCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [role, setRole] = useState(profile?.role || "Advocate");
  const [barLicenseNo, setBarLicenseNo] = useState(profile?.bar_license_no || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [organization, setOrganization] = useState(profile?.organization || "");

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleOpenEdit = () => {
    setFullName(profile?.full_name || "");
    setRole(profile?.role || "Advocate");
    setBarLicenseNo(profile?.bar_license_no || "");
    setPhone(profile?.phone || "");
    setOrganization(profile?.organization || "");
    setIsEditing(true);
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const { user, error } = await updateUserProfile(profile.id, {
        full_name: fullName.trim(),
        role,
        bar_license_no: barLicenseNo.trim(),
        phone: phone.trim(),
        organization: organization.trim(),
      });

      if (error) throw new Error(error);
      if (user) onProfileUpdated(user);

      setSaveSuccess(true);
      setTimeout(() => {
        setIsEditing(false);
        setSaveSuccess(false);
      }, 1000);
    } catch (err: any) {
      setSaveError(err?.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#0e0c24]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
      {/* Glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#D4FF58]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              User Detail (Database)
            </h2>
          </div>
          <button
            type="button"
            onClick={handleOpenEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#D4FF58]/40 text-[#D4FF58] text-xs font-semibold transition-all hover:scale-105"
            title="Edit profile in Supabase"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Update Details</span>
          </button>
        </div>

        {/* User Avatar & Headline */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-[#D4FF58] p-0.5 flex items-center justify-center shadow-[0_0_20px_rgba(212,255,88,0.25)] shrink-0">
            <div className="h-full w-full bg-[#120f2e] rounded-2xl flex items-center justify-center">
              <User className="h-7 w-7 text-[#D4FF58]" />
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-base text-white truncate">
              {profile?.full_name || "Advocate"}
            </h3>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/30 text-[10px] font-semibold text-purple-300 mt-0.5">
              <Shield className="h-2.5 w-2.5" />
              <span>{profile?.role || "Advocate High Court"}</span>
            </div>
          </div>
        </div>

        {/* Details List */}
        <div className="space-y-3 text-xs">
          {/* Email */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-2 text-slate-400">
              <Mail className="h-3.5 w-3.5 text-purple-400" />
              <span>Email:</span>
            </div>
            <span className="font-mono text-white text-[11px] truncate max-w-[180px]">
              {profile?.email || "N/A"}
            </span>
          </div>

          {/* Bar License */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-2 text-slate-400">
              <FileBadge className="h-3.5 w-3.5 text-cyan-400" />
              <span>Bar License #:</span>
            </div>
            <span className="font-mono text-[#D4FF58] text-[11px] font-bold">
              {profile?.bar_license_no || "BC-2024-KHI"}
            </span>
          </div>

          {/* Organization */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-2 text-slate-400">
              <Building2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Affiliation:</span>
            </div>
            <span className="text-white text-[11px] font-medium truncate max-w-[170px]">
              {profile?.organization || "High Court Bar Association"}
            </span>
          </div>

          {/* Phone */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-2 text-slate-400">
              <Phone className="h-3.5 w-3.5 text-amber-400" />
              <span>Contact:</span>
            </div>
            <span className="font-mono text-slate-300 text-[11px]">
              {profile?.phone || "+92 300 1234567"}
            </span>
          </div>

          {/* Member Since */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-2 text-slate-400">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <span>Member Since:</span>
            </div>
            <span className="font-mono text-slate-400 text-[10px]">
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "Active"}
            </span>
          </div>
        </div>
      </div>

      {/* Supabase Sync Footer */}
      <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <span>Source: Supabase DB (public.profiles)</span>
        <span className="text-emerald-400 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Synchronized
        </span>
      </div>

      {/* ================= EDIT MODAL ================= */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#100d2b] border border-white/15 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-[#D4FF58]" />
                <h3 className="font-bold text-sm text-white">Update User Details (Database)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {saveSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Details updated successfully in Supabase DB!</span>
              </div>
            )}

            {saveError && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Full Name / Title
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4FF58]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Professional Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#14122d] border border-white/10 text-white focus:outline-none focus:border-[#D4FF58]"
                >
                  <option value="Advocate High Court">Advocate High Court</option>
                  <option value="Advocate Supreme Court">Advocate Supreme Court</option>
                  <option value="Corporate Counsel">Corporate In-House Counsel</option>
                  <option value="Legal Researcher">Legal Researcher / Associate</option>
                  <option value="Law Student">Law Student / Academic</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Bar Council License No
                </label>
                <input
                  type="text"
                  value={barLicenseNo}
                  onChange={(e) => setBarLicenseNo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4FF58]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Bar Association / Law Firm
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4FF58]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4FF58]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-[#D4FF58] hover:bg-[#bceb42] text-black font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>{isSaving ? "Saving..." : "Save to Database"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
