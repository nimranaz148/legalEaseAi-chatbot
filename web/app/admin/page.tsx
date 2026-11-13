"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Scale,
  Database,
  Layers,
  Plus,
  Trash2,
  FileText,
  Search,
  ExternalLink,
  LogOut,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  Loader2,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { UserProfile, getLocalProfile, signOutUser, isSupabaseConfigured } from "@/lib/supabase";
import { UserDocument, Law } from "@/types/api";
import { getUserDocuments, deleteUserDocument, getLaws } from "@/lib/api";
import { UserDetailCard } from "@/components/admin/UserDetailCard";
import { UploadModal } from "@/components/admin/UploadModal";
import { ChunkInspectorModal } from "@/components/admin/ChunkInspectorModal";

export default function AdminPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userDocs, setUserDocs] = useState<UserDocument[]>([]);
  const [statutoryLaws, setStatutoryLaws] = useState<Law[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [inspectingDoc, setInspectingDoc] = useState<{ docId: string; filename: string } | null>(null);

  // Load user profile & documents
  useEffect(() => {
    const currentProfile = getLocalProfile();
    if (!currentProfile) {
      // Redirect to login if unauthenticated
      router.push("/login");
      return;
    }
    setProfile(currentProfile);
    refreshData();
  }, [router]);

  const refreshData = async () => {
    setIsLoadingDocs(true);
    try {
      const [docs, laws] = await Promise.allSettled([
        getUserDocuments(),
        getLaws(),
      ]);

      if (docs.status === "fulfilled") {
        setUserDocs(docs.value);
      }
      if (laws.status === "fulfilled") {
        setStatutoryLaws(laws.value.filter((l) => !l.is_user_doc));
      }
    } catch {
      // Ignore
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleDelete = async (docId: string, filename: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${filename}" and all its vector chunks from Qdrant?`)) {
      return;
    }
    setDeletingDocId(docId);
    try {
      await deleteUserDocument(docId);
      await refreshData();
    } catch (err: any) {
      alert(err?.detail || err?.message || "Failed to delete document.");
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    router.push("/login");
  };

  // Filtered documents
  const filteredDocs = userDocs.filter((d) =>
    d.filename.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const totalUserChunks = userDocs.reduce((acc, d) => acc + d.chunk_count, 0);
  const totalStatutoryChunks = statutoryLaws.reduce((acc, l) => acc + l.chunk_count, 0);

  return (
    <div className="min-h-screen bg-[#070614] text-white flex flex-col">
      {/* ================= TOP NAVIGATION BAR ================= */}
      <header className="border-b border-white/10 bg-[#0c0a22]/90 backdrop-blur-xl px-4 sm:px-8 py-3.5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-[#D4FF58] flex items-center justify-center shadow-[0_0_15px_rgba(212,255,88,0.35)] group-hover:scale-105 transition-transform">
                <Scale className="h-4 w-4 text-black stroke-[2.5]" />
              </div>
              <span className="font-extrabold text-lg tracking-tight text-white">
                Legal<span className="text-[#D4FF58]">Ease</span>
              </span>
            </Link>

            <span className="px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-[10px] font-bold text-purple-300">
              Admin Portal
            </span>
          </div>

          {/* Quick Links & User Pill */}
          <div className="flex items-center gap-3 sm:gap-4 text-xs">
            <Link
              href="/chat"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
            >
              <span>Public Chat</span>
              <ExternalLink className="h-3 w-3" />
            </Link>

            <div className="h-4 w-px bg-white/10 hidden sm:block" />

            {/* Profile & Logout */}
            <div className="flex items-center gap-2.5 pl-1">
              <div className="text-right hidden sm:block">
                <div className="font-bold text-xs text-white leading-tight">
                  {profile?.full_name || "Advocate"}
                </div>
                <div className="text-[10px] text-[#D4FF58] font-mono">
                  {profile?.role || "Advocate"}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-300 hover:text-white transition-colors flex items-center gap-1.5"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-[11px] font-semibold">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ================= MAIN DASHBOARD BODY ================= */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 flex flex-col gap-8">
        {/* Banner / Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Vector DB Status */}
          <div className="p-4 rounded-3xl bg-[#0e0c24] border border-white/10 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-[#D4FF58]/10 border border-[#D4FF58]/30 flex items-center justify-center text-[#D4FF58]">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Qdrant Vector DB
              </span>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-extrabold text-sm text-white">Connected</span>
              </div>
            </div>
          </div>

          {/* Card 2: User Documents */}
          <div className="p-4 rounded-3xl bg-[#0e0c24] border border-white/10 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-cyan-950/60 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                User Custom Docs
              </span>
              <span className="font-extrabold text-base text-white font-mono">
                {userDocs.length} files
              </span>
            </div>
          </div>

          {/* Card 3: Total Vector Chunks */}
          <div className="p-4 rounded-3xl bg-[#0e0c24] border border-white/10 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-purple-950/60 border border-purple-800 flex items-center justify-center text-purple-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Total Vector Chunks
              </span>
              <span className="font-extrabold text-base text-[#D4FF58] font-mono">
                {totalUserChunks + totalStatutoryChunks} chunks
              </span>
            </div>
          </div>

          {/* Card 4: Supabase Cloud */}
          <div className="p-4 rounded-3xl bg-[#0e0c24] border border-white/10 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-emerald-950/60 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Supabase DB
              </span>
              <span className="font-extrabold text-sm text-white">
                {isSupabaseConfigured() ? "Cloud Sync Active" : "Local Sync Ready"}
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Grid (User Details on Left, Knowledge Base on Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ================= COLUMN 1: USER DETAIL (4 Cols) ================= */}
          <div className="lg:col-span-4 space-y-6">
            <UserDetailCard
              profile={profile}
              onProfileUpdated={(updated) => setProfile(updated)}
            />

            {/* Quick Helper Guide */}
            <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <Sparkles className="h-3.5 w-3.5 text-[#D4FF58]" />
                <span>Admin Capabilities</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                As an authorized legal administrator, you can manage custom contracts, inspect generated semantic chunks, and update your bar affiliation details in the database.
              </p>
            </div>
          </div>

          {/* ================= COLUMN 2: KNOWLEDGE BASE (8 Cols) ================= */}
          <div className="lg:col-span-8 bg-[#0e0c24]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
            {/* Header with Title and Create Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#D4FF58]" />
                  <h2 className="text-base font-extrabold text-white">Knowledge Base Library</h2>
                  <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-slate-300">
                    {userDocs.length} Documents
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Upload legal PDFs, inspect generated chunks, or delete custom documents from Qdrant.
                </p>
              </div>

              {/* + Create / Upload Button */}
              <button
                type="button"
                onClick={() => setIsUploadOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-[#D4FF58] hover:bg-[#bceb42] text-black font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,255,88,0.25)] transition-all hover:scale-105 shrink-0"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>Upload New PDF</span>
              </button>
            </div>

            {/* Search Filter & Refresh */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search Knowledge Base documents..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4FF58]"
                />
              </div>

              <button
                type="button"
                onClick={refreshData}
                disabled={isLoadingDocs}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-colors"
                title="Refresh list"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingDocs ? "animate-spin text-[#D4FF58]" : ""}`} />
              </button>
            </div>

            {/* Documents List */}
            {isLoadingDocs ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
                <Loader2 className="h-6 w-6 animate-spin text-[#D4FF58]" />
                <span>Loading Knowledge Base files...</span>
              </div>
            ) : filteredDocs.length > 0 ? (
              <div className="space-y-3">
                {filteredDocs.map((doc) => (
                  <div
                    key={doc.doc_id}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    {/* Document Meta */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-purple-950/80 border border-purple-600 flex items-center justify-center text-purple-300 shrink-0 mt-0.5">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-white truncate max-w-sm">
                          {doc.filename}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-mono flex-wrap">
                          <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                            {doc.chunk_count} chunks
                          </span>
                          <span>{doc.page_count} pages</span>
                          <span>•</span>
                          <span>ID: {doc.doc_id}</span>
                          <span>•</span>
                          <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Inspect Chunks & Delete */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {/* Inspect Chunks Button */}
                      <button
                        type="button"
                        onClick={() => setInspectingDoc({ docId: doc.doc_id, filename: doc.filename })}
                        className="px-3 py-1.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        title="View all generated chunks for this document"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Inspect Chunks</span>
                      </button>

                      {/* Query in Chat */}
                      <Link
                        href="/chat"
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs transition-colors"
                        title="Query this document in Chat Workspace"
                      >
                        Chat
                      </Link>

                      {/* Delete Button */}
                      <button
                        type="button"
                        disabled={deletingDocId === doc.doc_id}
                        onClick={() => handleDelete(doc.doc_id, doc.filename)}
                        className="p-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-400 hover:text-white transition-colors disabled:opacity-50"
                        title="Permanently delete from Qdrant Vector DB"
                      >
                        {deletingDocId === doc.doc_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty Knowledge Base State */
              <div className="py-16 text-center border-2 border-dashed border-white/10 rounded-3xl p-8 space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-slate-400">
                  <Layers className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">No Custom Documents Yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    Upload legal contracts, petitions, or scanned court notices. They will be semantically chunked and indexed into Qdrant.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#D4FF58] text-black font-bold text-xs inline-flex items-center gap-1.5 hover:bg-[#bceb42] transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>Upload First Document</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ================= MODALS ================= */}
      {isUploadOpen && (
        <UploadModal
          onClose={() => setIsUploadOpen(false)}
          onUploadSuccess={() => refreshData()}
          onInspectNewDoc={(docId, filename) => {
            setIsUploadOpen(false);
            setInspectingDoc({ docId, filename });
          }}
        />
      )}

      {inspectingDoc && (
        <ChunkInspectorModal
          docId={inspectingDoc.docId}
          filename={inspectingDoc.filename}
          onClose={() => setInspectingDoc(null)}
        />
      )}
    </div>
  );
}
