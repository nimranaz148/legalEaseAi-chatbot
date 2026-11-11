"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Scale,
  Users,
  BookOpen,
  ShieldCheck,
  Search,
  Plus,
  Phone,
  Star,
  Trash2,
  Send,
  Play,
  Pause,
  Loader2,
  MessageSquare,
  FileText,
  Bookmark,
  Gavel,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Briefcase,
  Mic,
  MicOff,
  Sparkles,
  FolderPlus,
  UploadCloud,
  Database,
} from "lucide-react";
import { ChatMessage } from "@/types/chat";
import { Law, Health, UserDocument } from "@/types/api";
import { getUserDocuments, indexUserDocument, deleteUserDocument } from "@/lib/api";
import { ask } from "@/lib/api";

export interface LegalMatter {
  id: string;
  title: string;
  client: string;
  clientEmail: string;
  category: "client" | "notice" | "brief";
  status: "Active (3)" | "Pending Review" | "Statute Match" | "Urgent SLA" | "Concluded";
  time: string;
  messages: ChatMessage[];
  bookmarked?: boolean;
}

const PROMPT_CHIPS = [
  {
    icon: "📜",
    label: "Section 73 Breach Compensation",
    query: "Contract tootne par Section 73 ke tehat damages aur compensation kaise claim hoti hai?",
  },
  {
    icon: "⚖️",
    label: "Agreements without Consideration",
    query: "Agar agreement me consideration na ho to kya wo valid contract hai?",
  },
  {
    icon: "👤",
    label: "Minor Legal Capacity",
    query: "Minor (na-baaligh) k sath contract valid hota hai ya void-ab-initio?",
  },
  {
    icon: "🛡️",
    label: "Fraud & Voidable Contracts",
    query: "Fraud ya Coercion se karwaya gaya contract kya legal hota hai?",
  },
];

interface MiosWorkspaceProps {
  messages: ChatMessage[];
  onSendMessage: (question: string) => Promise<void>;
  isLoading: boolean;
  renderCitations?: (citations: NonNullable<ChatMessage["citations"]>) => React.ReactNode;
  laws?: Law[];
  selectedLawIds?: string[];
  onToggleLaw?: (lawId: string) => void;
  backendHealth?: Health | null;
}

export function MiosWorkspace({
  messages: externalMessages,
  onSendMessage,
  isLoading,
  renderCitations,
  laws = [],
  selectedLawIds = [],
  onToggleLaw,
  backendHealth,
}: MiosWorkspaceProps) {
  // Input and active filter states
  const [input, setInput] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("Active (3)");
  const [portalFilter, setPortalFilter] = useState<"all" | "client" | "notice" | "brief">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Drawers state
  const [activeModal, setActiveModal] = useState<"corpus" | "validator" | "team" | "documents" | null>(null);

  // User uploaded documents in Qdrant Vector DB state
  const [userDocs, setUserDocs] = useState<UserDocument[]>([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadDocMsg, setUploadDocMsg] = useState<string | null>(null);
  const [uploadDocError, setUploadDocError] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  const refreshUserDocs = async () => {
    try {
      const docs = await getUserDocuments();
      setUserDocs(docs);
    } catch (e) {
      console.error("Failed to fetch user documents:", e);
    }
  };

  useEffect(() => {
    refreshUserDocs();
  }, []);

  const handleUploadAndIndex = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setIsUploadingDoc(true);
    setUploadDocMsg(null);
    setUploadDocError(null);
    try {
      const res = await indexUserDocument(file);
      const isCapped = res.document.total_pdf_pages && res.document.total_pdf_pages > res.document.page_count;
      if (isCapped) {
        setUploadDocMsg(`"${res.document.filename}" (first ${res.document.page_count} of ${res.document.total_pdf_pages} pages) indexed into ${res.document.chunk_count} vectors & saved to DB!`);
      } else {
        setUploadDocMsg(`"${res.document.filename}" chunked into ${res.document.chunk_count} vectors & saved to DB!`);
      }
      await refreshUserDocs();
    } catch (err: unknown) {
      const apiErr = err as any;
      const rawMsg = String(apiErr?.detail || apiErr?.message || "Failed to index document.");
      if (rawMsg.includes("429") || rawMsg.includes("RESOURCE_EXHAUSTED") || rawMsg.includes("quota")) {
        setUploadDocError("⚠️ Google Gemini Free Tier Quota Reached: Free tier allows up to 100 embedding calls/minute. Please wait 20-30 seconds or upload documents under 25 pages.");
      } else {
        setUploadDocError(rawMsg);
      }
    } finally {
      setIsUploadingDoc(false);
      if (docFileInputRef.current) docFileInputRef.current.value = "";
    }
  };

  const handleDeleteUserDoc = async (docId: string, filename: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${filename}" and all its vector chunks from the database?`)) return;
    setDeletingDocId(docId);
    try {
      await deleteUserDocument(docId);
      await refreshUserDocs();
    } catch (err: unknown) {
      const apiErr = err as any;
      alert(apiErr?.detail || apiErr?.message || "Failed to delete document.");
    } finally {
      setDeletingDocId(null);
    }
  };

  // Audio timeline state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioSeconds, setAudioSeconds] = useState(14);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Counsel persona state
  const [counselPersona, setCounselPersona] = useState<"senior" | "quick" | "plain">("senior");

  // Voice input speech-to-text state
  const [isListening, setIsListening] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState<"en-US" | "ur-PK">("en-US");
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Multi-session matters
  const [matters, setMatters] = useState<LegalMatter[]>([
    {
      id: "matter-1",
      title: "Breach of contract & notice period inquiry",
      client: "Adv. Farhan",
      clientEmail: "farhan@legalcounsel.pk",
      category: "client",
      status: "Active (3)",
      time: "10:24",
      messages: [],
      bookmarked: true,
    },
    {
      id: "matter-2",
      title: "Statutory limitation period analysis",
      client: "Matter #204",
      clientEmail: "briefs@courtrecords.gov",
      category: "notice",
      status: "Pending Review",
      time: "Yesterday",
      messages: [
        {
          id: "m2-1",
          role: "user",
          content: "What is the limitation period for enforcing an agreement in case of breach?",
          timestamp: "Yesterday",
        },
        {
          id: "m2-2",
          role: "assistant",
          content: "Under statutory limitation principles, legal proceedings for breach of contract must typically be initiated within 3 years from the date of cause of action or default. All claims require strict verifiable filing dates.",
          timestamp: "Yesterday",
        },
      ],
      bookmarked: false,
    },
    {
      id: "matter-3",
      title: "Indemnity clause statutory verification",
      client: "Matter #109",
      clientEmail: "corporate@advisory.io",
      category: "brief",
      status: "Statute Match",
      time: "2 days ago",
      messages: [
        {
          id: "m3-1",
          role: "user",
          content: "Does statutory law enforce express indemnity against third-party liabilities?",
          timestamp: "2 days ago",
        },
        {
          id: "m3-2",
          role: "assistant",
          content: "Statutory provisions explicitly recognize contracts of indemnity whereby one party promises to save the other from loss caused to him by the conduct of the promisor or any other person. Verbatim provisions govern enforceability.",
          timestamp: "2 days ago",
        },
      ],
      bookmarked: false,
    },
  ]);

  const [activeMatterId, setActiveMatterId] = useState<string>("matter-1");
  const [internalLoading, setInternalLoading] = useState(false);
  const activeLoading = isLoading || internalLoading;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync external messages to active matter if active is matter-1
  useEffect(() => {
    if (activeMatterId === "matter-1" && externalMessages.length > 0) {
      setMatters((prev) =>
        prev.map((m) => (m.id === "matter-1" ? { ...m, messages: externalMessages } : m))
      );
    }
  }, [externalMessages, activeMatterId]);

  const activeMatter = useMemo(
    () => matters.find((m) => m.id === activeMatterId) || matters[0],
    [matters, activeMatterId]
  );

  const displayedMessages = activeMatter.messages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedMessages, activeLoading]);

  // Audio simulation timer
  useEffect(() => {
    if (isPlayingAudio) {
      audioIntervalRef.current = setInterval(() => {
        setAudioSeconds((sec) => (sec >= 48 ? 0 : sec + 1));
      }, 1000);
    } else if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
    }
    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, [isPlayingAudio]);

  // Filtered matters list
  const filteredMatters = useMemo(() => {
    return matters.filter((m) => {
      // Portal category filter
      if (portalFilter !== "all" && m.category !== portalFilter) return false;
      // Status pill filter
      if (activeFilter !== "All" && activeFilter !== "Active (3)" && m.status !== activeFilter) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.title.toLowerCase().includes(q) ||
          m.client.toLowerCase().includes(q) ||
          m.clientEmail.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [matters, portalFilter, activeFilter, searchQuery]);

  // Handle creating new legal inquiry matter
  const handleCreateNewInquiry = () => {
    const newId = `matter-${Date.now()}`;
    const newMatter: LegalMatter = {
      id: newId,
      title: "New Legal Inquiry #" + (matters.length + 101),
      client: "New Consultation",
      clientEmail: "client@advisory.pk",
      category: "client",
      status: "Active (3)",
      time: "Just now",
      messages: [],
      bookmarked: false,
    };
    setMatters((prev) => [newMatter, ...prev]);
    setActiveMatterId(newId);
  };

  // Handle archiving / clearing conversation
  const handleArchiveMatter = () => {
    if (confirm("Are you sure you want to clear/archive this matter's conversation history?")) {
      setMatters((prev) =>
        prev.map((m) => (m.id === activeMatterId ? { ...m, messages: [] } : m))
      );
    }
  };

  // Handle toggling bookmark for active matter
  const handleToggleBookmark = () => {
    setMatters((prev) =>
      prev.map((m) =>
        m.id === activeMatterId ? { ...m, bookmarked: !m.bookmarked } : m
      )
    );
  };

  // Toggle voice recognition (speech-to-text)
  const toggleVoiceRecognition = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError("Aap k browser me speech recognition support nahi hai. Chrome ya Edge use karein.");
      setTimeout(() => setSpeechError(null), 4500);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = voiceLanguage;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInput(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed") {
          setSpeechError("Microphone permission block hai. Browser settings me microphone allow karein.");
        } else if (event.error !== "no-speech") {
          setSpeechError(`Voice error: ${event.error}`);
        }
        setIsListening(false);
        setTimeout(() => setSpeechError(null), 4500);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setSpeechError("Voice input start nahi ho saka. Dobara koshish karein.");
      setTimeout(() => setSpeechError(null), 4500);
    }
  };

  // Execute question against statutory RAG pipeline
  const handleExecuteInquiry = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || activeLoading) return;
    setInput("");

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // 1. Immediately append user message to the active matter
    setMatters((prev) =>
      prev.map((m) =>
        m.id === activeMatterId
          ? { ...m, messages: [...m.messages, userMsg], time: "Just now" }
          : m
      )
    );

    setInternalLoading(true);

    try {
      // 2. Query statutory RAG backend
      const res = await ask({
        question: trimmed,
        law_ids: selectedLawIds.length > 0 ? selectedLawIds : null,
        debug: false,
      });

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.answer,
        citations: res.citations,
        found: res.found,
        disclaimer: res.disclaimer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      // 3. Append assistant reply to the active matter
      setMatters((prev) =>
        prev.map((m) =>
          m.id === activeMatterId
            ? { ...m, messages: [...m.messages, assistantMsg], time: "Just now" }
            : m
        )
      );

      // Also notify parent if handler provided
      if (onSendMessage && activeMatterId === "matter-1") {
        onSendMessage(trimmed).catch(() => {});
      }
    } catch (err: unknown) {
      const apiErr = err as any;
      const errorDetail =
        apiErr?.detail || apiErr?.message || "Could not reach backend API on port 8000.";

      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ Error: ${errorDetail}`,
        found: false,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMatters((prev) =>
        prev.map((m) =>
          m.id === activeMatterId
            ? { ...m, messages: [...m.messages, errorMsg], time: "Just now" }
            : m
        )
      );
    } finally {
      setInternalLoading(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    handleExecuteInquiry(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto rounded-3xl border border-white/10 bg-[#0b0a1d]/90 backdrop-blur-2xl shadow-[0_20px_70px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col my-4 relative">
      {/* 3-Column Legal Workspace Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[640px]">
        {/* ================= COLUMN 1: LEFT LEGAL SIDEBAR (Col 2-3) ================= */}
        <div className="md:col-span-3 lg:col-span-2 border-r border-white/10 p-4 flex flex-col justify-between bg-[#080718]">
          <div className="space-y-6">
            {/* Legal Brand Logo */}
            <div className="flex items-center gap-2 px-2">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-purple-600 to-[#D4FF58] flex items-center justify-center text-black shadow-[0_0_10px_rgba(212,255,88,0.3)]">
                <Scale className="h-3.5 w-3.5 text-black stroke-[2.5]" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-white">
                Legal<span className="text-[#D4FF58]">.AI</span>
              </span>
            </div>

            {/* Main Action Pill: All Legal Inquiries */}
            <button
              type="button"
              onClick={() => {
                setPortalFilter("all");
                setActiveFilter("Active (3)");
              }}
              className={`w-full py-2.5 px-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-semibold shadow-inner border transition-all ${
                portalFilter === "all"
                  ? "bg-white/20 text-[#D4FF58] border-[#D4FF58]/40 shadow-[0_0_15px_rgba(212,255,88,0.15)]"
                  : "bg-white/10 hover:bg-white/15 text-white border-white/10"
              }`}
            >
              <Gavel className="h-4 w-4 text-[#D4FF58]" />
              <span>All Inquiries</span>
            </button>

            {/* Practice Management Tools (Interactive Modals) */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 flex items-center justify-between">
                <span>Practice Tools</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF58]" />
              </div>

              <div className="space-y-1">
                {/* 1. Advocates & Team Button */}
                <button
                  type="button"
                  onClick={() => setActiveModal("team")}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                    activeModal === "team"
                      ? "bg-purple-600/30 text-white border border-purple-500/40"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                  title="Switch consultation personas"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="h-3.5 w-3.5 text-purple-400" />
                    <span>Advocates & Team</span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-slate-500" />
                </button>

                {/* 2. Statute Corpus Button */}
                <button
                  type="button"
                  onClick={() => setActiveModal("corpus")}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                    activeModal === "corpus"
                      ? "bg-cyan-600/30 text-white border border-cyan-500/40"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                  title="View indexed statutes and chunk counts"
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Statute Corpus</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {laws.length}
                  </span>
                </button>

                {/* 3. Citation Validator Button */}
                <button
                  type="button"
                  onClick={() => setActiveModal("validator")}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                    activeModal === "validator"
                      ? "bg-[#D4FF58]/20 text-white border border-[#D4FF58]/40"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                  title="Verify verbatim ground truth citations"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#D4FF58]" />
                    <span>Citation Validator</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">100%</span>
                </button>

                {/* 4. Custom Uploaded Documents Button */}
                <button
                  type="button"
                  onClick={() => setActiveModal("documents")}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                    activeModal === "documents"
                      ? "bg-amber-500/20 text-white border border-amber-500/40"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                  title="Upload, chunk, query, and delete custom legal documents in DB"
                >
                  <div className="flex items-center gap-2.5">
                    <Database className="h-3.5 w-3.5 text-amber-400" />
                    <span>My Documents (DB)</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                    {userDocs.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Inbound Portals (Filter Matters by Category) */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 flex items-center justify-between">
                <span>Legal Portals</span>
              </div>

              <div className="space-y-1">
                {/* Client Inquiries Filter */}
                <button
                  type="button"
                  onClick={() => setPortalFilter(portalFilter === "client" ? "all" : "client")}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                    portalFilter === "client"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Client Inquiries</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {matters.filter((m) => m.category === "client").length}
                  </span>
                </button>

                {/* Court Notices Filter */}
                <button
                  type="button"
                  onClick={() => setPortalFilter(portalFilter === "notice" ? "all" : "notice")}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                    portalFilter === "notice"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-3.5 w-3.5 text-amber-400" />
                    <span>Court Notices</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {matters.filter((m) => m.category === "notice").length}
                  </span>
                </button>

                {/* Internal Briefs Filter */}
                <button
                  type="button"
                  onClick={() => setPortalFilter(portalFilter === "brief" ? "all" : "brief")}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                    portalFilter === "brief"
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bookmark className="h-3.5 w-3.5 text-blue-400" />
                    <span>Internal Briefs</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {matters.filter((m) => m.category === "brief").length}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Status Footer */}
          <div className="pt-4 border-t border-white/5 px-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>RAG Engine v2.4</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Qdrant Active
            </span>
          </div>
        </div>

        {/* ================= COLUMN 2: INQUIRIES LIST (Col 3-4) ================= */}
        <div className="md:col-span-4 lg:col-span-3 border-r border-white/10 p-4 flex flex-col bg-[#0b0922]/60">
          {/* Search Legal Matters Input */}
          <div className="relative mb-3">
            <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-purple-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search legal inquiries, clauses..."
              className="w-full pl-8 pr-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4FF58] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Inquiries Header + Interactive '+' Button */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">Legal Inquiries</span>
              <span className="px-1.5 py-0.2 rounded bg-white/10 text-[10px] text-slate-400 font-mono">
                {filteredMatters.length}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCreateNewInquiry}
              className="h-6 w-6 rounded-full bg-[#D4FF58] hover:bg-[#bceb42] text-black font-bold flex items-center justify-center transition-all shadow-sm hover:scale-105"
              title="Start New Legal Inquiry (+)"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
          </div>

          {/* Filter Pills Row */}
          <div className="flex flex-wrap gap-1 mb-4 text-[11px]">
            {["Active (3)", "Pending Review", "Statute Match", "Urgent SLA", "Concluded"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveFilter(activeFilter === tab ? "All" : tab)}
                className={`px-2 py-0.5 rounded-xl transition-all ${
                  activeFilter === tab
                    ? "bg-white/20 text-white font-semibold border border-white/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Dynamic Inquiries List */}
          <div className="space-y-2 flex-1 overflow-y-auto pr-1">
            {filteredMatters.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 space-y-2">
                <p>No legal inquiries found.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setPortalFilter("all");
                    setActiveFilter("All");
                  }}
                  className="text-[#D4FF58] underline text-[11px]"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              filteredMatters.map((matter) => {
                const isActive = matter.id === activeMatterId;
                const lastSnippet =
                  matter.messages.length > 0
                    ? matter.messages[matter.messages.length - 1].content
                    : "Ready for statutory legal inquiry...";

                return (
                  <div
                    key={matter.id}
                    onClick={() => setActiveMatterId(matter.id)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      isActive
                        ? "bg-white/15 border-[#D4FF58]/40 shadow-md"
                        : "bg-white/[0.03] border-white/5 hover:bg-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                            {matter.category === "notice"
                              ? "§"
                              : matter.category === "brief"
                              ? "⚖"
                              : "P"}
                          </div>
                          {isActive && (
                            <span className="h-2 w-2 rounded-full bg-emerald-400 absolute bottom-0 right-0 border border-black" />
                          )}
                        </div>
                        <span className="font-semibold text-xs text-white">
                          {matter.client}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">{matter.time}</span>
                    </div>

                    <p className="text-[11px] text-slate-300 line-clamp-1 pl-9">
                      {matter.title}
                    </p>

                    <p className="text-[10px] text-slate-400 line-clamp-1 pl-9 mt-0.5 italic">
                      {lastSnippet}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= COLUMN 3: MAIN LEGAL CHAT PANEL (Col 5-12) ================= */}
        <div className="md:col-span-5 lg:col-span-7 flex flex-col justify-between bg-[#0e0c24]/90 p-4 sm:p-6 relative">
          {/* Chat Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-[#D4FF58] flex items-center justify-center text-sm font-bold text-black shadow-[0_0_12px_rgba(212,255,88,0.25)]">
                  <Scale className="h-5 w-5 stroke-[2.5]" />
                </div>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 absolute bottom-0 right-0 border-2 border-[#0e0c24]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-sm text-white">
                    {activeMatter.client}
                  </h4>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-white/10 text-slate-300 font-mono">
                    {counselPersona === "senior"
                      ? "Senior Counsel"
                      : counselPersona === "quick"
                      ? "Fast Citation"
                      : "Plain Language"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  {activeMatter.clientEmail}
                </p>
              </div>
            </div>

            {/* Header Action Buttons (Interactive!) */}
            <div className="flex items-center gap-1.5 text-slate-400">
              {/* Call / Audio toggle */}
              <button
                type="button"
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className={`p-2 rounded-xl transition-colors ${
                  isPlayingAudio
                    ? "bg-[#D4FF58] text-black shadow-[0_0_12px_rgba(212,255,88,0.3)]"
                    : "hover:bg-white/10 hover:text-white"
                }`}
                title={isPlayingAudio ? "Pause consultation audio" : "Play consultation audio"}
              >
                <Phone className="h-4 w-4" />
              </button>

              {/* Star / Bookmark toggle */}
              <button
                type="button"
                onClick={handleToggleBookmark}
                className={`p-2 rounded-xl transition-colors ${
                  activeMatter.bookmarked
                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                    : "hover:bg-white/10 hover:text-white"
                }`}
                title="Bookmark / Star Matter"
              >
                <Star
                  className={`h-4 w-4 ${
                    activeMatter.bookmarked ? "fill-amber-400 text-amber-400" : ""
                  }`}
                />
              </button>

              {/* Clear / Archive Matter */}
              <button
                type="button"
                onClick={handleArchiveMatter}
                className="p-2 rounded-xl hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
                title="Clear / Archive Matter conversation"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="flex-1 overflow-y-auto py-4 space-y-5 min-h-[460px]">
            {/* Clean Welcome State (When chat is empty) */}
            {displayedMessages.length === 0 && (
              <div className="py-12 px-4 text-center max-w-lg mx-auto space-y-6 my-auto">
                <div className="relative inline-flex items-center justify-center">
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-[#D4FF58] opacity-25 blur-lg" />
                  <div className="relative h-14 w-14 rounded-2xl bg-[#120f2e] border border-white/20 flex items-center justify-center shadow-2xl">
                    <Scale className="h-7 w-7 text-[#D4FF58] stroke-[2.2]" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-extrabold text-xl text-white tracking-tight">
                    LegalEase Assistant
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                    Statutory RAG workspace with 100% verbatim grounding. Inquire in English, Roman Urdu, or Urdu.
                  </p>
                </div>

                {/* Sleek, Minimal Suggestion Pills */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1 max-w-md mx-auto">
                  {PROMPT_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleExecuteInquiry(chip.query)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#D4FF58]/50 text-slate-300 hover:text-white text-xs font-medium transition-all group backdrop-blur-sm"
                    >
                      <span className="text-xs group-hover:scale-110 transition-transform">{chip.icon}</span>
                      <span className="group-hover:text-[#D4FF58] transition-colors">{chip.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Messages from State */}
            {displayedMessages.map((msg) => {
              const isUser = msg.role === "user";
              return isUser ? (
                <div key={msg.id} className="flex justify-start">
                  <div className="bg-[#D4FF58] text-black font-semibold rounded-2xl rounded-tl-none px-4 py-3 shadow-[0_0_20px_rgba(212,255,88,0.25)] text-xs sm:text-sm max-w-md break-words">
                    <p>{msg.content}</p>
                    <span className="text-[10px] text-black/60 block text-right mt-1 font-mono">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex justify-end">
                  <div className="bg-[#1b173e]/90 border border-white/10 rounded-2xl rounded-tr-none p-4 shadow-xl text-xs sm:text-sm max-w-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-[10px] font-bold">
                        LegalEase
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Verified Statutory Answer
                      </span>
                    </div>

                    <div dir="auto" className="font-urdu text-slate-100 leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>

                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-white/10">
                        {renderCitations ? (
                          renderCitations(msg.citations)
                        ) : (
                          <div className="space-y-1.5 mt-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4FF58]">
                              Citations ({msg.citations.length}):
                            </span>
                            {msg.citations.map((c, i) => (
                              <div
                                key={i}
                                className="p-2 rounded-xl bg-white/5 border border-white/10 text-[11px] text-slate-300"
                              >
                                <span className="font-semibold text-white">Section {c.section}</span>
                                {c.quote && (
                                  <p className="italic text-slate-400 mt-0.5 line-clamp-2">
                                    "{c.quote}"
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <span className="text-[10px] text-slate-400 block text-right font-mono">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Thinking pulse */}
            {activeLoading && (
              <div className="flex justify-end">
                <div className="bg-[#1b173e]/90 border border-white/10 rounded-2xl rounded-tr-none p-3.5 flex items-center gap-2 text-xs text-purple-300">
                  <Loader2 className="h-4 w-4 animate-spin text-[#D4FF58]" />
                  <span>Searching statutory corpus & validating verbatim citations...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Bar with Voice Input */}
          <div className="pt-2 space-y-2">
            {/* Listening Indicator Banner */}
            {isListening && (
              <div className="flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200 animate-pulse shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="font-semibold text-[11px]">
                    🎙️ Listening... Bolye, aapka sawal transcribe ho raha hai
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setVoiceLanguage(voiceLanguage === "en-US" ? "ur-PK" : "en-US")
                    }
                    className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] text-white hover:bg-white/20 font-mono transition-colors"
                    title="Switch voice recognition language"
                  >
                    {voiceLanguage === "en-US" ? "Lang: English (US)" : "Lang: اردو / Roman Urdu"}
                  </button>
                  <button
                    type="button"
                    onClick={toggleVoiceRecognition}
                    className="text-rose-300 hover:text-white p-0.5"
                    title="Stop listening"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Speech error banner */}
            {speechError && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-200">
                <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px]">{speechError}</span>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className={`rounded-2xl border bg-white/5 p-2 pl-4 flex items-center gap-2 transition-all ${
                isListening
                  ? "border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] bg-rose-950/10"
                  : "border-white/15 focus-within:border-[#D4FF58]"
              }`}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={activeLoading}
                placeholder={
                  isListening
                    ? "Listening to your voice... Speak your legal query now..."
                    : "Ask a legal question across statutory corpus... (English / Roman Urdu / اردو)"
                }
                className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
              />

              {/* Voice Input Microphone Button */}
              <button
                type="button"
                onClick={toggleVoiceRecognition}
                disabled={activeLoading}
                className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                  isListening
                    ? "bg-rose-500 text-white animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.6)]"
                    : "bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border border-white/10 hover:border-white/20"
                }`}
                title={isListening ? "Stop listening" : "Voice Input: Speak to transcribe (English / Urdu)"}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4 text-[#D4FF58]" />
                )}
              </button>

              {/* Submit Send Button */}
              <button
                type="submit"
                disabled={!input.trim() || activeLoading}
                className="h-9 w-9 rounded-xl bg-[#D4FF58] hover:bg-[#bceb42] text-black font-bold flex items-center justify-center transition-all disabled:opacity-40 shrink-0 shadow-[0_0_10px_rgba(212,255,88,0.2)]"
                title="Send inquiry"
              >
                {activeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ================= BOTTOM AUDIO TIMELINE SCRUBBER ================= */}
      <div className="border-t border-white/10 px-4 py-3 bg-[#070615] flex items-center gap-4">
        {/* Play / Pause Button */}
        <button
          type="button"
          onClick={() => setIsPlayingAudio(!isPlayingAudio)}
          className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
            isPlayingAudio ? "bg-[#D4FF58] text-black" : "bg-white/10 hover:bg-white/20 text-white"
          }`}
          title="Play/Pause Oral Consultation Audio"
        >
          {isPlayingAudio ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
        </button>

        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline-block shrink-0">
          Oral Consultation Recording:
        </span>

        {/* Progress Scrubber Bar */}
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            setAudioSeconds(Math.round(clickPos * 48));
          }}
          className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer relative group"
        >
          <div
            className="h-full bg-gradient-to-r from-pink-500 to-[#D4FF58] rounded-full transition-all"
            style={{ width: `${(audioSeconds / 48) * 100}%` }}
          />
        </div>

        <span className="text-[10px] font-mono text-slate-400 shrink-0">
          00:{audioSeconds < 10 ? `0${audioSeconds}` : audioSeconds} / 00:48
        </span>
      </div>

      {/* ================= MODAL 1: STATUTE CORPUS DRAWER ================= */}
      {activeModal === "corpus" && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#120f2e] border border-white/15 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-cyan-400" />
                <h3 className="font-bold text-base text-white">Statute Knowledge Base</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Active statutory corpora indexed into Qdrant vector database. Toggle statutes to scope search retrieval.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {laws.map((law) => {
                const isSelected = selectedLawIds.includes(law.law_id);
                return (
                  <div
                    key={law.law_id}
                    onClick={() => onToggleLaw && onToggleLaw(law.law_id)}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-xs text-white">{law.name}</div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ID: {law.law_id} • Year: {law.year || "N/A"}
                      </span>
                    </div>

                    <div
                      className={`h-5 w-5 rounded-lg flex items-center justify-center border transition-all ${
                        isSelected
                          ? "bg-[#D4FF58] text-black border-[#D4FF58]"
                          : "border-slate-500 text-transparent"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-between items-center text-xs">
              <span className="text-slate-400 text-[11px]">
                {selectedLawIds.length} of {laws.length} statutes selected
              </span>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl bg-[#D4FF58] text-black font-bold text-xs hover:bg-[#bceb42] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: CITATION VALIDATOR DRAWER ================= */}
      {activeModal === "validator" && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#120f2e] border border-white/15 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#D4FF58]" />
                <h3 className="font-bold text-base text-white">Citation Grounding Validator</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Every legal answer is filtered through <code className="text-[#D4FF58] font-mono">core/validate.py</code>.
              Claims without character-by-character citations from retrieved chunks are rejected.
            </p>

            <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="font-semibold">Verbatim Substring Matching Active</span>
              </div>
              <div className="flex items-center gap-2 text-cyan-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Deterministic UUID5 Point ID Indexing</span>
              </div>
              <div className="flex items-center gap-2 text-purple-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Strict Hallucination Gate (Vector Score ≥ 0.45)</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors"
              >
                Close Validator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: ADVOCATES & TEAM DRAWER ================= */}
      {activeModal === "team" && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#120f2e] border border-white/15 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-400" />
                <h3 className="font-bold text-base text-white">Consultation Persona & Mode</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Select the response style and depth for the Legal Assistant AI:
            </p>

            <div className="space-y-2">
              {/* Senior Counsel Mode */}
              <div
                onClick={() => setCounselPersona("senior")}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  counselPersona === "senior"
                    ? "bg-purple-900/30 border-purple-400/60 shadow-md"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-white">
                    <Briefcase className="h-4 w-4 text-purple-400" />
                    <span>Senior Counsel Mode (Default)</span>
                  </div>
                  {counselPersona === "senior" && (
                    <CheckCircle2 className="h-4 w-4 text-[#D4FF58]" />
                  )}
                </div>
                <p className="text-[11px] text-slate-300">
                  Comprehensive legal reasoning, statutory doctrine explanation, and section citations.
                </p>
              </div>

              {/* Fast Citation Mode */}
              <div
                onClick={() => setCounselPersona("quick")}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  counselPersona === "quick"
                    ? "bg-cyan-900/30 border-cyan-400/60 shadow-md"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-white">
                    <Bookmark className="h-4 w-4 text-cyan-400" />
                    <span>Fast Direct Section Finder</span>
                  </div>
                  {counselPersona === "quick" && (
                    <CheckCircle2 className="h-4 w-4 text-[#D4FF58]" />
                  )}
                </div>
                <p className="text-[11px] text-slate-300">
                  Concise answers focusing purely on section numbers, statutory clauses, and quotes.
                </p>
              </div>

              {/* Plain Language Explainer */}
              <div
                onClick={() => setCounselPersona("plain")}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  counselPersona === "plain"
                    ? "bg-emerald-900/30 border-emerald-400/60 shadow-md"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-white">
                    <UserCheck className="h-4 w-4 text-emerald-400" />
                    <span>Citizen Plain-Language Explainer</span>
                  </div>
                  {counselPersona === "plain" && (
                    <CheckCircle2 className="h-4 w-4 text-[#D4FF58]" />
                  )}
                </div>
                <p className="text-[11px] text-slate-300">
                  Simple Roman Urdu or English explanation without convoluted legalese jargon.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl bg-[#D4FF58] text-black font-bold text-xs hover:bg-[#bceb42] transition-colors"
              >
                Apply Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: USER DOCUMENTS (QDRANT VECTOR DB) ================= */}
      {activeModal === "documents" && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl bg-[#120f2e] border border-amber-500/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Custom Documents (Qdrant RAG DB)</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Upload custom legal agreements, court notices, or scanned PDFs. They are automatically chunked, embedded with Gemini, and stored in Qdrant Vector DB for verbatim RAG querying. Delete anytime.
            </p>

            {/* Hidden file input */}
            <input
              ref={docFileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              className="hidden"
              onChange={handleUploadAndIndex}
            />

            {/* Upload CTA Card */}
            <div
              onClick={() => !isUploadingDoc && docFileInputRef.current?.click()}
              className={`p-4 rounded-2xl border-2 border-dashed border-amber-500/40 bg-amber-950/10 hover:bg-amber-950/20 cursor-pointer flex flex-col items-center justify-center text-center gap-2 transition-all ${
                isUploadingDoc ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {isUploadingDoc ? (
                <>
                  <Loader2 className="h-6 w-6 text-amber-400 animate-spin" />
                  <span className="text-xs font-semibold text-amber-200">
                    Extracting/OCR ➔ Chunking ➔ Embedding ➔ Storing in Qdrant...
                  </span>
                  <span className="text-[10px] text-slate-400">Please wait a few seconds...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-6 w-6 text-amber-400" />
                  <span className="text-xs font-bold text-white">
                    Click to Upload & Index New Document into DB
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Supports PDFs, Scanned Docs (Gemini OCR), Images, and Text
                  </span>
                </>
              )}
            </div>

            {uploadDocMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{uploadDocMsg}</span>
              </div>
            )}

            {uploadDocError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{uploadDocError}</span>
              </div>
            )}

            {/* Indexed Documents List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
                <span>Indexed Documents in DB ({userDocs.length})</span>
                <button
                  type="button"
                  onClick={refreshUserDocs}
                  className="text-[11px] text-amber-400 hover:underline"
                >
                  Refresh List
                </button>
              </div>

              {userDocs.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center text-xs text-slate-400">
                  No custom documents indexed yet. Upload a document above to test RAG on your own files!
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {userDocs.map((doc) => (
                    <div
                      key={doc.doc_id}
                      className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-5 w-5 text-amber-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-white truncate">
                            {doc.filename}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                            <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                              {doc.chunk_count} chunks
                            </span>
                            <span>{doc.page_count} pages</span>
                            <span>ID: {doc.doc_id}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveModal(null);
                            handleExecuteInquiry(`Summarize the main provisions and legal liabilities in ${doc.filename}`);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800 text-cyan-300 hover:text-white hover:bg-cyan-900/60 text-[11px] font-medium transition-colors"
                          title="Ask a query about this document in chat"
                        >
                          Query Doc
                        </button>
                        <button
                          type="button"
                          disabled={deletingDocId === doc.doc_id}
                          onClick={() => handleDeleteUserDoc(doc.doc_id, doc.filename)}
                          className="p-1.5 rounded-lg bg-red-950/40 border border-red-800 text-red-400 hover:bg-red-900/60 hover:text-white transition-colors disabled:opacity-50"
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
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
