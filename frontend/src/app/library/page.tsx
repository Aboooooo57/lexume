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
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/api";
import DictionaryModal from "@/components/DictionaryModal";

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
  
  // New Flow State
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  
  // Pagination State
  const [bookmarkPage, setBookmarkPage] = useState(0);
  const BOOKMARKS_PER_PAGE = 4;

  useEffect(() => {
    api.getLibrarySessions()
      .then(data => setSessions(data))
      .catch((err: any) => {
        console.error("Failed to fetch library sessions", err);
        if (err.status === 401) router.push("/login");
      });
  }, []);

  // Filter all sessions that have some activity
  const allActiveSessions = sessions.filter(s => 
    (s.bookmarks?.length || 0) > 0 || (s.lookups?.length || 0) > 0
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  // Filtered Lists for Detail View
  const filteredBookmarks = (selectedSession?.bookmarks || []).filter(b => 
    b.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredLookups = (selectedSession?.lookups || []).filter(l => 
    l.word.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Pagination Logic
  const totalBookmarkPages = Math.ceil(filteredBookmarks.length / BOOKMARKS_PER_PAGE);
  const paginatedBookmarks = filteredBookmarks.slice(
    bookmarkPage * BOOKMARKS_PER_PAGE, 
    (bookmarkPage + 1) * BOOKMARKS_PER_PAGE
  );

  const downloadCSV = () => {
    if (!selectedSession || !selectedSession.lookups) return;
    
    const headers = ["Word", "Lookup Date", "Session Name"];
    const rows = selectedSession.lookups.map(l => [
      `"${l.word}"`, 
      `"${new Date(l.date).toLocaleString()}"`, 
      `"${selectedSession.name}"`
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `vocabulary_${selectedSession.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    setBookmarkPage(0);
  }, [selectedSessionId, searchQuery, activeTab]);

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col selection:bg-indigo-500/30 overflow-x-hidden font-sans">
      {/* Background System */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      </div>

      <header className="h-16 md:h-20 px-6 md:px-12 flex items-center justify-between bg-[#030712]/40 backdrop-blur-3xl fixed top-0 w-full z-40 border-b border-white/[0.03]">
        <div className="flex items-center gap-8">
           <button 
             onClick={() => router.push("/dashboard")}
             className="flex items-center gap-3 text-white/30 hover:text-white transition-all group"
           >
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-white/10 group-hover:scale-110 transition-all">
                 <ChevronLeft className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] hidden md:block">Dashboard</span>
           </button>
           <div className="h-6 w-px bg-white/5 hidden md:block" />
           <div className="flex items-center gap-3 group cursor-pointer" onClick={() => router.push("/")}>
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg">
                <Mic2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-black tracking-tighter uppercase italic">Lexis</span>
           </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="relative group hidden sm:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Search history..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 h-10 pl-12 pr-6 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.07] transition-all text-[10px] font-bold uppercase tracking-widest placeholder:text-white/10"
              />
           </div>
        </div>
      </header>

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
                      <div className="flex items-center gap-3 text-white/20 text-[10px] font-black uppercase tracking-[0.2em]">
                        <Clock className="w-3 h-3" />
                        {selectedSession.date}
                        <span className="mx-2 text-white/5">|</span>
                        {selectedSession.type === "upload" ? "Document" : "Web Text"}
                      </div>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.8] mb-6">
                        Personal<br/>
                        <span className="text-white/20">Archive</span>
                      </h1>
                      <p className="text-sm text-white/30 font-medium max-w-md">Your curated repository of knowledge, vocabulary, and insights captured across every session.</p>
                    </>
                  )}
               </div>

               {selectedSession && (
                 <div className="flex p-1.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-3xl shadow-2xl">
                    <button 
                      onClick={() => setActiveTab("bookmarks")}
                      className={cn(
                        "flex items-center gap-3 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                        activeTab === "bookmarks" ? "bg-white text-black shadow-xl" : "text-white/30 hover:text-white"
                      )}
                    >
                      <Bookmark className="w-4 h-4" />
                      Bookmarks ({selectedSession.bookmarks?.length || 0})
                    </button>
                    <button 
                      onClick={() => setActiveTab("vocabulary")}
                      className={cn(
                        "flex items-center gap-3 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                        activeTab === "vocabulary" ? "bg-white text-black shadow-xl" : "text-white/30 hover:text-white"
                      )}
                    >
                      <HistoryIcon className="w-4 h-4" />
                      Vocabulary ({selectedSession.lookups?.length || 0})
                    </button>
                 </div>
               )}
            </div>

            {/* Content Area */}
            <div className="min-h-[500px]">
               <AnimatePresence mode="wait">
                  {!selectedSessionId ? (
                    /* GLOBAL SESSION LIST */
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
                             className="group p-8 rounded-[32px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all flex flex-col text-left relative overflow-hidden"
                           >
                              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 mb-6 group-hover:scale-110 transition-transform">
                                <Clock className="w-5 h-5 text-indigo-400" />
                              </div>
                              <h3 className="text-xl font-black mb-2 truncate w-full group-hover:text-indigo-400 transition-colors">{s.name}</h3>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-6">{s.date}</p>
                              
                              <div className="mt-auto flex items-center gap-4">
                                <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-white/40">
                                  <Bookmark className="w-3 h-3 text-indigo-400/50" />
                                  {s.bookmarks?.length || 0}
                                </div>
                                <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-white/40">
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
                         <div className="col-span-full py-40 rounded-[48px] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-8">
                               <HistoryIcon className="w-8 h-8 text-white/5" />
                            </div>
                            <h3 className="text-xl font-black mb-2 uppercase tracking-widest text-white/20">History Empty</h3>
                            <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.3em]">Your session data will appear here</p>
                         </div>
                       )}
                    </motion.div>
                  ) : (
                    /* SESSION DETAIL VIEW (Tabbed) */
                    <motion.div 
                      key="detail-view"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                       {activeTab === "bookmarks" ? (
                         /* BOOKMARKS DETAIL */
                         <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               {paginatedBookmarks.length > 0 ? (
                                 paginatedBookmarks.map((b, i) => (
                                   <div key={i} className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 transition-all group relative overflow-hidden flex flex-col justify-between h-full">
                                      <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <button 
                                           onClick={() => router.push(`/result/${selectedSessionId}`)}
                                           className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xl hover:scale-110 transition-all"
                                         >
                                            <ExternalLink className="w-4 h-4 text-white" />
                                         </button>
                                      </div>
                                      <div className="space-y-6">
                                         <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                                               <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400/50">Bookmark</span>
                                         </div>
                                         <div className="text-sm md:text-base leading-relaxed text-white/60 font-medium italic relative pl-6">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/20 rounded-full" />
                                            "{b}"
                                         </div>
                                      </div>
                                   </div>
                                 ))
                               ) : (
                                 <div className="col-span-full py-20 text-center text-white/20 font-black uppercase tracking-widest">No bookmarks in this session</div>
                               )}
                            </div>

                            {totalBookmarkPages > 1 && (
                              <div className="flex items-center justify-center gap-4 pt-8">
                                <button 
                                  disabled={bookmarkPage === 0}
                                  onClick={() => setBookmarkPage(prev => Math.max(0, prev - 1))}
                                  className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 disabled:opacity-30 transition-all"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{bookmarkPage + 1} / {totalBookmarkPages}</span>
                                <button 
                                  disabled={bookmarkPage >= totalBookmarkPages - 1}
                                  onClick={() => setBookmarkPage(prev => Math.min(totalBookmarkPages - 1, prev + 1))}
                                  className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 disabled:opacity-30 transition-all"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                         </div>
                       ) : (
                         /* VOCABULARY DETAIL */
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
                                     className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.04] transition-all group flex flex-col items-center text-center gap-4 cursor-pointer"
                                   >
                                      <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-all">
                                         <BookOpen className="w-5 h-5 text-indigo-400" />
                                      </div>
                                      <h4 className="text-sm font-black truncate w-full group-hover:text-indigo-300 transition-colors">{l.word}</h4>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          router.push(`/result/${selectedSessionId}`);
                                        }}
                                        className="text-[8px] font-black uppercase tracking-widest text-indigo-400/40 hover:text-indigo-400"
                                      >
                                        Context
                                      </button>
                                   </div>
                                 ))
                               ) : (
                                 <div className="col-span-full py-20 text-center text-white/20 font-black uppercase tracking-widest">No vocabulary in this session</div>
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

      <footer className="py-20 px-12 border-t border-white/5 bg-[#010309] mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
           <div className="flex flex-col items-center md:items-start gap-4">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-indigo-600/10 flex items-center justify-center">
                    <Mic2 className="w-4 h-4 text-indigo-500" />
                 </div>
                 <span className="text-xl font-black tracking-tight uppercase italic">Lexis</span>
              </div>
              <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.4em]">© 2026 Personal Archive System</p>
           </div>
        </div>
      </footer>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }
      `}</style>
    </div>
  );
}
