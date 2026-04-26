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
  FileText,
  Type,
  ExternalLink,
  Trash2,
  BookOpen,
  Sparkles,
  History as HistoryIcon,
  Layers,
  LayoutGrid,
  Filter,
  Download,
  X,
  Zap,
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

  // Theme + user state
  const { theme: readingTheme, setTheme: setReadingTheme, t } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    api.getMe().catch((err: any) => { if (err.status === 401) router.push("/login"); })
      .then(u => u && setUser(u));

    api.getCredits().then(d => setCredits(d.balance)).catch(() => {});

    api.getLibrarySessions()
      .then(data => setSessions(data))
      .catch((err: any) => {
        console.error("Failed to fetch library sessions", err);
        if (err.status === 401) router.push("/login");
      });
  }, [router]);

  const switchTheme = (theme: "dark" | "light" | "sepia") => {
    setReadingTheme(theme);
  };

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
    <div className={cn("min-h-screen flex flex-col selection:bg-indigo-500/30 overflow-x-hidden font-sans transition-colors duration-700", t.bg, t.text)}>
      {/* Background grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {readingTheme === "dark" && (
          <>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
          </>
        )}
      </div>

      {/* ── Header ── */}
      <header className={cn(
        "h-16 md:h-20 px-6 md:px-12 flex items-center justify-between backdrop-blur-3xl fixed top-0 w-full z-40 border-b transition-all duration-700",
        t.header, t.border
      )}>
        {/* Left: back + logo */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push("/dashboard")}
            className={cn("flex items-center gap-3 transition-all group", t.subtext, "hover:" + t.text)}
          >
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border transition-all group-hover:scale-110", t.innerCard, t.border)}>
              <ChevronLeft className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] hidden md:block">Dashboard</span>
          </button>
          <div className={cn("h-6 w-px hidden md:block", t.border)} />
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => router.push("/")}>
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-all">
              <Mic2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-black tracking-tighter uppercase italic">Lexis</span>
          </div>
        </div>

        {/* Right: search + theme + credits + user menu */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Search */}
          <div className="relative group hidden sm:block">
            <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors", t.subtext, "group-focus-within:text-indigo-400")} />
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-56 h-10 pl-12 pr-6 rounded-xl border focus:outline-none transition-all text-[10px] font-bold uppercase tracking-widest",
                t.input
              )}
            />
          </div>

          {/* Theme switcher */}
          <div className={cn("flex rounded-xl p-1 gap-1 border transition-colors", t.innerCard, t.border)}>
            {(["dark", "light", "sepia"] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => switchTheme(theme)}
                className={cn(
                  "w-8 h-8 rounded-lg transition-all flex items-center justify-center",
                  readingTheme === theme
                    ? "bg-indigo-600 text-white shadow-lg"
                    : cn(t.subtext, "hover:text-indigo-400")
                )}
                title={`${theme.charAt(0).toUpperCase() + theme.slice(1)} Mode`}
              >
                <div className={cn(
                  "w-3 h-3 rounded-full border",
                  theme === "dark" && "bg-[#030712] border-white/20",
                  theme === "light" && "bg-white border-slate-200",
                  theme === "sepia" && "bg-[#f4ecd8] border-[#d3c6aa]"
                )} />
              </button>
            ))}
          </div>

          {/* Credits badge */}
          {credits !== null && (
            <div className={cn(
              "hidden sm:flex items-center gap-2 h-9 px-4 rounded-full border transition-colors",
              t.innerCard, t.border,
              credits < 2 ? "border-red-500/30 bg-red-500/5" : credits < 5 ? "border-amber-500/30 bg-amber-500/5" : ""
            )}>
              <Zap className={cn("w-3.5 h-3.5", credits < 2 ? "text-red-400" : credits < 5 ? "text-amber-400" : "text-indigo-400")} />
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest",
                credits < 2 ? "text-red-400" : credits < 5 ? "text-amber-400" : t.subtext
              )}>
                {credits.toFixed(1)}
              </span>
            </div>
          )}

          {/* User profile dropdown */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(prev => !prev)}
                className={cn(
                  "flex items-center gap-3 h-10 pl-3 pr-4 rounded-full border transition-all",
                  t.innerCard, t.border, t.cardHover
                )}
              >
                {user.picture ? (
                  <img src={user.picture} alt="" className="w-7 h-7 rounded-full" />
                ) : (
                  <div className={cn("w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-black", t.innerCard, t.border, t.text)}>
                    {user.name?.[0] || "U"}
                  </div>
                )}
                <p className={cn("text-[10px] font-black uppercase tracking-widest hidden lg:block", t.text)}>{user.name}</p>
                <ChevronDown className={cn("w-3 h-3 transition-transform hidden lg:block", showUserMenu && "rotate-180", t.subtext)} />
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
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className={cn(
                        "absolute right-0 top-full mt-3 w-56 rounded-2xl border shadow-2xl overflow-hidden z-50",
                        t.dropdownBg
                      )}
                    >
                      {/* User info */}
                      <div className={cn("px-5 py-4 border-b", t.border)}>
                        <p className="font-black text-sm truncate">{user.name}</p>
                        <p className={cn("text-[9px] font-black uppercase tracking-widest mt-0.5 truncate", t.subtext)}>{user.email}</p>
                      </div>

                      {/* Credits row */}
                      {credits !== null && (
                        <div className={cn("px-5 py-3 border-b flex items-center justify-between", t.border)}>
                          <span className={cn("text-[9px] font-black uppercase tracking-widest", t.subtext)}>Credits</span>
                          <span className={cn(
                            "text-sm font-black",
                            credits < 2 ? "text-red-400" : credits < 5 ? "text-amber-400" : t.accent
                          )}>
                            {credits.toFixed(1)}
                          </span>
                        </div>
                      )}

                      {/* Menu items */}
                      <div className="p-2">
                        <button
                          onClick={() => { setShowUserMenu(false); router.push("/dashboard"); }}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-[11px] font-bold transition-all",
                            t.dropdownItem
                          )}
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
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-[11px] font-bold transition-all",
                            t.dropdownDanger
                          )}
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

      {/* ── Main ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-6 pt-24 md:pt-32 pb-20 max-w-7xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-12"
        >
          {/* Library Header */}
          <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-8">
            <div className="text-center md:text-left">
              {selectedSession ? (
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedSessionId(null)}
                    className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors group mb-4"
                  >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">All Sessions</span>
                  </button>
                  <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight truncate max-w-2xl">
                    {selectedSession.name}
                  </h1>
                  <div className={cn("flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em]", t.subtext)}>
                    <Clock className="w-3 h-3" />
                    {selectedSession.date}
                    <span className="mx-2 opacity-20">|</span>
                    {selectedSession.type === "upload" ? "Document" : "Web Text"}
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.8] mb-6">
                    Personal<br/>
                    <span className="opacity-20">Archive</span>
                  </h1>
                  <p className={cn("text-sm font-medium max-w-md", t.subtext)}>
                    Your curated repository of knowledge, vocabulary, and insights captured across every session.
                  </p>
                </>
              )}
            </div>

            {selectedSession && (
              <div className={cn("flex p-1.5 rounded-2xl border backdrop-blur-3xl shadow-2xl", t.tab)}>
                <button
                  onClick={() => setActiveTab("bookmarks")}
                  className={cn(
                    "flex items-center gap-3 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                    activeTab === "bookmarks" ? t.tabActive : t.tabInactive
                  )}
                >
                  <Bookmark className="w-4 h-4" />
                  Bookmarks ({selectedSession.bookmarks?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab("vocabulary")}
                  className={cn(
                    "flex items-center gap-3 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                    activeTab === "vocabulary" ? t.tabActive : t.tabInactive
                  )}
                >
                  <HistoryIcon className="w-4 h-4" />
                  Vocabulary ({selectedSession.lookups?.length || 0})
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="min-h-[500px]">
            <AnimatePresence mode="wait">
              {!selectedSessionId ? (
                <motion.div
                  key="session-list"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                  {allActiveSessions.length > 0 ? (
                    allActiveSessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSessionId(s.id)}
                        className={cn(
                          "group p-8 rounded-[32px] border transition-all flex flex-col text-left relative overflow-hidden",
                          t.sessionCard
                        )}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 mb-6 group-hover:scale-110 transition-transform">
                          <Clock className="w-5 h-5 text-indigo-400" />
                        </div>
                        <h3 className={cn("text-xl font-black mb-2 truncate w-full group-hover:text-indigo-400 transition-colors")}>{s.name}</h3>
                        <p className={cn("text-[10px] font-black uppercase tracking-[0.2em] mb-6", t.subtext)}>{s.date}</p>
                        <div className="mt-auto flex items-center gap-4">
                          <div className={cn("flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest", t.subtext)}>
                            <Bookmark className="w-3 h-3 text-indigo-400/50" />
                            {s.bookmarks?.length || 0}
                          </div>
                          <div className={cn("flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest", t.subtext)}>
                            <BookOpen className="w-3 h-3 text-emerald-400/50" />
                            {s.lookups?.length || 0}
                          </div>
                        </div>
                        <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight className="w-5 h-5 text-indigo-400" />
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className={cn("col-span-full py-40 rounded-[48px] border-2 border-dashed flex flex-col items-center justify-center text-center", t.border)}>
                      <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mb-8", t.innerCard)}>
                        <HistoryIcon className={cn("w-8 h-8 opacity-20")} />
                      </div>
                      <h3 className={cn("text-xl font-black mb-2 uppercase tracking-widest opacity-20")}>History Empty</h3>
                      <p className={cn("text-[10px] font-black uppercase tracking-[0.3em] opacity-10")}>Your session data will appear here</p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="detail-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  {activeTab === "bookmarks" ? (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {paginatedBookmarks.length > 0 ? (
                          paginatedBookmarks.map((b, i) => (
                            <div key={i} className={cn("p-8 rounded-[32px] border transition-all group relative overflow-hidden flex flex-col justify-between h-full", t.bookmarkCard)}>
                              <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => router.push(`/result/${selectedSessionId}`)}
                                  className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xl hover:scale-110 transition-all"
                                >
                                  <ExternalLink className="w-4 h-4 text-white" />
                                </button>
                              </div>
                              <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", t.innerCard, t.border)}>
                                    <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400/50">Bookmark</span>
                                </div>
                                <div className={cn("text-sm md:text-base leading-relaxed font-medium italic relative pl-6", t.subtext)}>
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/20 rounded-full" />
                                  "{b}"
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className={cn("col-span-full py-20 text-center font-black uppercase tracking-widest opacity-20")}>No bookmarks in this session</div>
                        )}
                      </div>
                      {totalBookmarkPages > 1 && (
                        <div className="flex items-center justify-center gap-4 pt-8">
                          <button
                            disabled={bookmarkPage === 0}
                            onClick={() => setBookmarkPage(p => Math.max(0, p - 1))}
                            className={cn("w-10 h-10 rounded-full border flex items-center justify-center transition-all disabled:opacity-30", t.border, t.cardHover)}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className={cn("text-[10px] font-bold uppercase tracking-widest", t.subtext)}>{bookmarkPage + 1} / {totalBookmarkPages}</span>
                          <button
                            disabled={bookmarkPage >= totalBookmarkPages - 1}
                            onClick={() => setBookmarkPage(p => Math.min(totalBookmarkPages - 1, p + 1))}
                            className={cn("w-10 h-10 rounded-full border flex items-center justify-center transition-all disabled:opacity-30", t.border, t.cardHover)}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={downloadCSV}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all shadow-xl"
                        >
                          <Download className="w-4 h-4" />
                          Export to Sheets
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {filteredLookups.length > 0 ? (
                          filteredLookups.map((l, i) => (
                            <div
                              key={i}
                              onClick={() => setSelectedWord(l.word)}
                              className={cn("p-6 rounded-3xl border transition-all group flex flex-col items-center text-center gap-4 cursor-pointer", t.sessionCard)}
                            >
                              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-all">
                                <BookOpen className="w-5 h-5 text-indigo-400" />
                              </div>
                              <h4 className="text-sm font-black truncate w-full group-hover:text-indigo-400 transition-colors">{l.word}</h4>
                              <button
                                onClick={(e) => { e.stopPropagation(); router.push(`/result/${selectedSessionId}`); }}
                                className="text-[8px] font-black uppercase tracking-widest text-indigo-400/40 hover:text-indigo-400"
                              >
                                Context
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className={cn("col-span-full py-20 text-center font-black uppercase tracking-widest opacity-20")}>No vocabulary in this session</div>
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

      <footer className={cn("py-20 px-12 border-t mt-auto transition-colors duration-700", t.border, t.innerCard)}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/10 flex items-center justify-center">
                <Mic2 className="w-4 h-4 text-indigo-500" />
              </div>
              <span className="text-xl font-black tracking-tight uppercase italic">Lexis</span>
            </div>
            <p className={cn("text-[10px] font-black uppercase tracking-[0.4em]", t.subtext)}>© 2026 Personal Archive System</p>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.1); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.2); }
      `}</style>
    </div>
  );
}
