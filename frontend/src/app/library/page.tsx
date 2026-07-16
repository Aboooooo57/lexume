"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark,
  Search,
  Clock,
  ArrowLeft,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Mic2,
  BookOpen,
  History as HistoryIcon,
  Download,
  X,
  Zap,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/api";
import DictionaryModal from "@/components/DictionaryModal";
import { useTheme } from "@/components/ThemeProvider";

interface SessionLookup {
  word: string;
  date: string;
}

interface RecentSession {
  id: string;
  name: string;
  type: "upload" | "paste";
  date: string;
  bookmarks?: string[];
  lookups?: SessionLookup[];
}

export default function LibraryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"bookmarks" | "vocabulary">("bookmarks");
  const [searchQuery, setSearchQuery] = useState("");
  const [sessions, setSessions] = useState<RecentSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [bookmarkPage, setBookmarkPage] = useState(0);
  const BOOKMARKS_PER_PAGE = 4;

  const { theme: readingTheme, setTheme: setReadingTheme, t } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    api.getMe().catch((err: any) => { if (err.status === 401) router.push("/login"); })
      .then(u => u && setUser(u));

    api.getCredits().then(d => setCredits(d.balance)).catch(() => {});

    api.getLibrarySessions()
      .then(data => setSessions(Array.isArray(data) ? data : (data as any).sessions ?? []))
      .catch((err: any) => {
        console.error("Failed to fetch library sessions", err);
        if (err.status === 401) router.push("/login");
      });
  }, [router]);

  const allActiveSessions = sessions.filter(s => {
    const hasActivity = (s.bookmarks?.length || 0) > 0 || (s.lookups?.length || 0) > 0;
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return hasActivity && matchesSearch;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  const filteredBookmarks = (selectedSession?.bookmarks || []).filter(b =>
    b.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredLookups = (selectedSession?.lookups || []).filter(l =>
    l.word.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalBookmarkPages = Math.ceil(filteredBookmarks.length / BOOKMARKS_PER_PAGE);
  const paginatedBookmarks = filteredBookmarks.slice(
    bookmarkPage * BOOKMARKS_PER_PAGE,
    (bookmarkPage + 1) * BOOKMARKS_PER_PAGE
  );

  const downloadCSV = () => {
    if (!selectedSession?.lookups) return;
    const headers = ["Word", "Lookup Date", "Session Name"];
    const rows = selectedSession.lookups.map(l => [
      `"${l.word}"`,
      `"${new Date(l.date).toLocaleString()}"`,
      `"${selectedSession.name}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vocabulary_${selectedSession.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    setBookmarkPage(0);
  }, [selectedSessionId, searchQuery, activeTab]);

  return (
    <div className={cn("min-h-screen flex flex-col selection:bg-indigo-500/30 overflow-x-hidden font-sans transition-colors duration-500", t.bg, t.text)}>
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {readingTheme === "dark" && (
          <>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_40%,transparent_100%)]" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4"
              style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)' }}
            />
          </>
        )}
      </div>

      {/* Header */}
      <header className={cn("h-16 px-6 md:px-8 flex items-center justify-between fixed top-0 w-full z-40 border-b transition-all duration-500", t.header, t.border)}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className={cn("flex items-center gap-2 transition-all group", t.subtext, "hover:text-indigo-400")}
          >
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border transition-all group-hover:border-indigo-500/30", t.card, t.border)}>
              <ChevronLeft className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium hidden md:block">Dashboard</span>
          </button>
          <div className={cn("h-6 w-px hidden md:block", t.divider)} />
          <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => router.push("/")}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Mic2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight hidden sm:block">Lexume</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", t.subtext)} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn("w-48 h-9 pl-10 pr-4 rounded-xl border text-sm focus:outline-none transition-all", t.input)}
            />
          </div>

          {/* Theme switcher */}
          <div className={cn("flex rounded-xl p-1 gap-1 border", t.card, t.border)}>
            {(["dark", "light", "sepia"] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => setReadingTheme(theme)}
                className={cn(
                  "w-8 h-8 rounded-lg transition-all flex items-center justify-center",
                  readingTheme === theme ? "bg-indigo-500 shadow-lg shadow-indigo-500/25" : "hover:bg-white/5"
                )}
              >
                <div className={cn(
                  "w-3 h-3 rounded-full border-2",
                  theme === "dark" && "bg-slate-900 border-slate-700",
                  theme === "light" && "bg-white border-slate-300",
                  theme === "sepia" && "bg-amber-100 border-amber-300"
                )} />
              </button>
            ))}
          </div>

          {/* Credits */}
          {credits !== null && (
            <div className={cn(
              "hidden sm:flex items-center gap-2 h-9 px-4 rounded-xl border",
              t.card, t.border,
              credits < 2 ? "border-red-500/30 bg-red-500/5" : credits < 5 ? "border-amber-500/30 bg-amber-500/5" : ""
            )}>
              <Zap className={cn("w-4 h-4", credits < 2 ? "text-red-400" : credits < 5 ? "text-amber-400" : "text-indigo-400")} />
              <span className={cn("text-sm font-semibold", credits < 2 ? "text-red-400" : credits < 5 ? "text-amber-400" : "")}>
                {credits.toFixed(1)}
              </span>
            </div>
          )}

          {/* User Menu */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(prev => !prev)}
                className={cn("flex items-center gap-2 h-10 pl-1 pr-3 rounded-xl border transition-all", t.card, t.border, "hover:border-indigo-500/30")}
              >
                {user.picture ? (
                  <img src={user.picture} alt="" className="w-8 h-8 rounded-lg" referrerPolicy="no-referrer" />
                ) : (
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold", t.innerCard)}>
                    {user.name?.[0] || "U"}
                  </div>
                )}
                <ChevronDown className={cn("w-4 h-4 transition-transform hidden sm:block", showUserMenu && "rotate-180", t.subtext)} />
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className={cn("absolute right-0 top-full mt-2 w-56 rounded-xl border shadow-xl overflow-hidden z-50", t.cardSolid, t.border)}
                    >
                      <div className={cn("px-4 py-3 border-b", t.border)}>
                        <p className="font-semibold text-sm truncate">{user.name}</p>
                        <p className={cn("text-xs truncate", t.subtext)}>{user.email}</p>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={() => { setShowUserMenu(false); router.push("/dashboard"); }}
                          className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all", t.dropdownItem)}
                        >
                          <Mic2 className="w-4 h-4" />
                          Dashboard
                        </button>
                        <button
                          onClick={async () => {
                            setShowUserMenu(false);
                            await api.logout();
                            router.push("/");
                          }}
                          className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all", t.dropdownDanger)}
                        >
                          <X className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-6 pt-24 pb-20 max-w-6xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-8"
        >
          {/* Header Section */}
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div>
              {selectedSession ? (
                <div className="space-y-3">
                  <button
                    onClick={() => setSelectedSessionId(null)}
                    className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors group mb-2"
                  >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">All Sessions</span>
                  </button>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate max-w-lg">
                    {selectedSession.name}
                  </h1>
                  <div className={cn("flex items-center gap-3 text-sm", t.subtext)}>
                    <Clock className="w-4 h-4" />
                    {selectedSession.date}
                    <span className="opacity-30">|</span>
                    {selectedSession.type === "upload" ? "Document" : "Text"}
                  </div>
                </div>
              ) : (
                <>
                  <span className={cn("inline-flex items-center gap-2 text-xs font-semibold mb-3", t.accent)}>
                    <BookOpen className="w-3.5 h-3.5" />
                    Personal Archive
                  </span>
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                    Your Library
                  </h1>
                  <p className={cn("text-sm mt-1", t.subtext)}>
                    Bookmarks, vocabulary, and insights from your learning sessions.
                  </p>
                </>
              )}
            </div>

            {selectedSession && (
              <div className={cn("flex p-1 rounded-xl border", t.card, t.border)}>
                <button
                  onClick={() => setActiveTab("bookmarks")}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
                    activeTab === "bookmarks" ? "bg-indigo-500 text-white shadow-lg" : t.subtext
                  )}
                >
                  <Bookmark className="w-4 h-4" />
                  Bookmarks ({selectedSession.bookmarks?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab("vocabulary")}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
                    activeTab === "vocabulary" ? "bg-indigo-500 text-white shadow-lg" : t.subtext
                  )}
                >
                  <HistoryIcon className="w-4 h-4" />
                  Vocabulary ({selectedSession.lookups?.length || 0})
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="min-h-[400px]">
            <AnimatePresence mode="wait">
              {!selectedSessionId ? (
                <motion.div
                  key="session-list"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {allActiveSessions.length > 0 ? (
                    allActiveSessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSessionId(s.id)}
                        className={cn(
                          "group p-5 rounded-xl border transition-all flex flex-col text-left hover:border-indigo-500/30",
                          t.card, t.border
                        )}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", t.innerCard)}>
                            <Clock className="w-5 h-5 text-indigo-400" />
                          </div>
                          <ChevronRight className={cn("w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity", t.subtext)} />
                        </div>
                        <h3 className="font-semibold text-sm mb-1 truncate group-hover:text-indigo-400 transition-colors">{s.name}</h3>
                        <p className={cn("text-xs mb-4", t.subtext)}>{s.date}</p>
                        <div className="mt-auto flex items-center gap-4">
                          <div className={cn("flex items-center gap-1.5 text-xs", t.subtext)}>
                            <Bookmark className="w-3 h-3 text-indigo-400/50" />
                            {s.bookmarks?.length || 0}
                          </div>
                          <div className={cn("flex items-center gap-1.5 text-xs", t.subtext)}>
                            <BookOpen className="w-3 h-3 text-emerald-400/50" />
                            {s.lookups?.length || 0}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className={cn("col-span-full py-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center", t.border)}>
                      <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center mb-4", t.innerCard)}>
                        <HistoryIcon className={cn("w-6 h-6", t.subtext)} />
                      </div>
                      <h3 className="font-semibold mb-1">No sessions yet</h3>
                      <p className={cn("text-sm", t.subtext)}>Your bookmarks and vocabulary will appear here</p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="detail-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {activeTab === "bookmarks" ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {paginatedBookmarks.length > 0 ? (
                          paginatedBookmarks.map((b, i) => (
                            <div key={i} className={cn("p-5 rounded-xl border transition-all group relative", t.card, t.border, "hover:border-indigo-500/30")}>
                              <button
                                onClick={() => router.push(`/lesson/${selectedSessionId}`)}
                                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg transition-all hover:scale-110"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-white" />
                              </button>
                              <div className="flex items-center gap-2 mb-3">
                                <Bookmark className="w-4 h-4 text-indigo-400" />
                                <span className={cn("text-xs", t.subtext)}>Bookmark</span>
                              </div>
                              <p className={cn("text-sm leading-relaxed italic border-l-2 border-indigo-500/30 pl-4", t.textSecondary)}>
                                "{b}"
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className={cn("col-span-full py-12 text-center", t.subtext)}>No bookmarks in this session</div>
                        )}
                      </div>
                      {totalBookmarkPages > 1 && (
                        <div className="flex items-center justify-center gap-4">
                          <button
                            disabled={bookmarkPage === 0}
                            onClick={() => setBookmarkPage(p => Math.max(0, p - 1))}
                            className={cn("w-9 h-9 rounded-lg border flex items-center justify-center transition-all disabled:opacity-30", t.card, t.border)}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className={cn("text-sm", t.subtext)}>{bookmarkPage + 1} / {totalBookmarkPages}</span>
                          <button
                            disabled={bookmarkPage >= totalBookmarkPages - 1}
                            onClick={() => setBookmarkPage(p => Math.min(totalBookmarkPages - 1, p + 1))}
                            className={cn("w-9 h-9 rounded-lg border flex items-center justify-center transition-all disabled:opacity-30", t.card, t.border)}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-end">
                        <button
                          onClick={downloadCSV}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-all"
                        >
                          <Download className="w-4 h-4" />
                          Export CSV
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {filteredLookups.length > 0 ? (
                          filteredLookups.map((l, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedWord(l.word)}
                              className={cn("p-4 rounded-xl border transition-all group text-center hover:border-indigo-500/30", t.card, t.border)}
                            >
                              <div className={cn("w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform", t.innerCard)}>
                                <BookOpen className="w-5 h-5 text-indigo-400" />
                              </div>
                              <h4 className="text-sm font-medium truncate group-hover:text-indigo-400 transition-colors">{l.word}</h4>
                            </button>
                          ))
                        ) : (
                          <div className={cn("col-span-full py-12 text-center", t.subtext)}>No vocabulary in this session</div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>

      <DictionaryModal word={selectedWord} onClose={() => setSelectedWord(null)} />

      {/* Footer */}
      <footer className={cn("py-8 px-6 border-t mt-auto", t.card, t.border)}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Mic2 className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <span className="text-sm font-semibold">Lexume</span>
          </div>
          <p className={cn("text-xs", t.subtext)}>© 2026 Personal Archive</p>
        </div>
      </footer>
    </div>
  );
}
