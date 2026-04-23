"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  Type, 
  Sparkles, 
  Mic2,
  Loader2,
  FileText,
  X,
  Plus,
  Cloud,
  ChevronRight,
  ArrowRight,
  History,
  Clock,
  Play,
  Bookmark,
  Search,
  ExternalLink,
  ChevronDown,
  Layers,
  ChevronLeft,
  Settings2,
  Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const PDFPageSelector = dynamic(() => import("@/components/PDFPageSelector"), {
  ssr: false,
});

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

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [isAddingSession, setIsAddingSession] = useState(false);

  const formatRange = (pages: number[]) => {
    if (pages.length === 0) return "";
    const sorted = [...pages].sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sorted[0];
    let end = sorted[0];

    for (let i = 1; i <= sorted.length; i++) {
      if (i < sorted.length && sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        if (start === end) {
          ranges.push(`${start}`);
        } else {
          ranges.push(`${start}-${end}`);
        }
        if (i < sorted.length) {
          start = sorted[i];
          end = sorted[i];
        }
      }
    }
    return ranges.join(", ");
  };

  useEffect(() => {
    const saved = localStorage.getItem("lexis_recent_sessions");
    if (saved) {
      setRecentSessions(JSON.parse(saved));
    }
  }, []);

  const saveSession = (id: string, name: string, type: "upload" | "paste") => {
    const newSession: RecentSession = {
      id,
      name,
      type,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      bookmarks: [],
      lookups: []
    };
    const updated = [newSession, ...recentSessions.filter(s => s.id !== id)].slice(0, 10);
    setRecentSessions(updated);
    localStorage.setItem("lexis_recent_sessions", JSON.stringify(updated));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let f: File | null = null;
    if ("files" in e.target && (e.target as any).files?.[0]) {
      f = (e.target as any).files[0];
    } else if ("dataTransfer" in e && (e as any).dataTransfer.files?.[0]) {
      f = (e as any).dataTransfer.files[0];
    }

    if (f) {
      setFile(f);
      setText("");
      setSelectedPages([]);
      if (f.type === "application/pdf") {
        setShowSelector(true);
      }
    }
  };

  const handleProcess = async () => {
    if (activeTab === "paste" && !text.trim()) return;
    if (activeTab === "upload" && !file) return;

    setIsProcessing(true);
    const formData = new FormData();
    const sessionName = activeTab === "upload" ? file?.name || "Document" : text.slice(0, 20) + "...";
    
    if (activeTab === "upload" && file) formData.append("file", file);
    if (activeTab === "paste" && text) formData.append("text", text);
    
    const pageRange = selectedPages.join(",");
    formData.append("pages", pageRange);
    formData.append("mock_gemini", "false");
    
    try {
      let data;
      try {
        const res = await fetch("http://localhost:8000/extract", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error();
        data = await res.json();
      } catch {
        data = { session_id: "demo-session-" + Math.random().toString(36).substring(7) };
      }
      
      saveSession(data.session_id, sessionName, activeTab);

      try {
        await fetch("http://localhost:8000/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: data.session_id,
            mock_eleven: false
          }),
        });
      } catch {
        console.log("Using mock generation...");
      }

      router.push(`/result/${data.session_id}`);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const expandedSession = recentSessions.find(s => s.id === expandedSessionId);

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col selection:bg-indigo-500/30 overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <PDFPageSelector 
        file={file}
        isOpen={showSelector}
        selectedPages={selectedPages}
        onSelectionChange={setSelectedPages}
        onClose={() => setShowSelector(false)}
      />

      <header className="h-16 md:h-20 px-6 md:px-12 flex items-center justify-between bg-[#030712]/40 backdrop-blur-3xl fixed top-0 w-full z-40 border-b border-white/[0.03]">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => router.push("/")}>
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.3)] group-hover:scale-110 transition-all">
            <Mic2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <span className="text-xl md:text-2xl font-black tracking-tighter uppercase italic">Lexis</span>
        </div>
        
        <div className="flex items-center gap-4 md:gap-6">
           <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Ready</span>
           </div>
           <button 
             onClick={() => router.push("/")}
             className="group flex items-center gap-2 h-9 md:h-10 px-3 md:px-4 rounded-full bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
           >
              <span className="hidden sm:block text-[9px] font-black uppercase tracking-widest text-white/30 group-hover:text-red-400 transition-colors">Exit Lab</span>
              <X className="w-3.5 h-3.5 md:w-4 md:h-4 text-white/30 group-hover:text-red-400 transition-colors" />
           </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center px-4 md:px-6 pt-24 md:pt-32 pb-20 overflow-y-auto custom-scrollbar">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-5xl flex flex-col gap-8 md:gap-12"
        >
          {/* Header Section: Stats & Action */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
             <div className="text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[8px] font-black uppercase tracking-[0.3em] mb-4">
                   <Trophy className="w-3 h-3" />
                   Academic Milestone Reached
                </div>
                <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.8] mb-4">LEARNING<br/><span className="text-white/20">LIBRARY</span></h2>
                <p className="text-sm text-white/30 font-medium">Your curated universe of knowledge.</p>
             </div>
             
             <button 
               onClick={() => setIsAddingSession(!isAddingSession)}
               className={cn(
                 "group flex items-center justify-center gap-4 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-2xl",
                 isAddingSession 
                  ? "bg-white text-black hover:scale-105 active:scale-95" 
                  : "bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105 active:scale-95 shadow-indigo-600/20"
               )}
             >
                {isAddingSession ? (
                  <>
                    <X className="w-4 h-4" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    New Session
                  </>
                )}
             </button>
          </div>

          {/* Builder Section: Collapsible */}
          <AnimatePresence>
            {isAddingSession && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -20 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -20 }}
                className="overflow-hidden"
              >
                <div className="p-8 md:p-12 rounded-[32px] md:rounded-[48px] bg-white/[0.03] border border-white/5 backdrop-blur-3xl shadow-2xl space-y-10">
                   <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div>
                         <h3 className="text-2xl font-black tracking-tight mb-1">LESSON LAB</h3>
                         <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Select your learning material</p>
                      </div>
                      
                      <div className="p-1 rounded-xl bg-white/[0.03] border border-white/10 flex">
                         <button 
                           onClick={() => setActiveTab("upload")}
                           className={cn(
                             "flex items-center gap-2 px-6 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all",
                             activeTab === "upload" ? "bg-white text-black shadow-lg" : "text-white/30 hover:text-white"
                           )}
                         >
                           <Upload className="w-3.5 h-3.5" />
                           Document
                         </button>
                         <button 
                           onClick={() => setActiveTab("paste")}
                           className={cn(
                             "flex items-center gap-2 px-6 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all",
                             activeTab === "paste" ? "bg-white text-black shadow-lg" : "text-white/30 hover:text-white"
                           )}
                         >
                           <Type className="w-3.5 h-3.5" />
                           Text
                         </button>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                      <div className="lg:col-span-8">
                        <AnimatePresence mode="wait">
                          {activeTab === "upload" ? (
                            <motion.div 
                              key="upload"
                              className={cn(
                                "relative h-[300px] rounded-[40px] border-2 border-dashed transition-all duration-700 flex flex-col items-center justify-center p-8 group overflow-hidden shadow-2xl",
                                dragActive ? "border-indigo-500 bg-indigo-500/5" : "border-white/5 bg-white/[0.02] hover:border-white/10"
                              )}
                              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                              onDragLeave={() => setDragActive(false)}
                              onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFileChange(e); }}
                            >
                              {file ? (
                                <>
                                  <div onClick={() => setShowSelector(true)} className="absolute inset-0 z-10 cursor-pointer" />
                                  <div className="flex flex-col items-center relative z-20">
                                     <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 shadow-2xl">
                                        <FileText className="w-9 h-9 text-indigo-400" />
                                     </div>
                                     <h3 className="text-xl font-black mb-1 truncate max-w-[240px]">{file.name}</h3>
                                     <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-6">
                                       {(file.size / 1024 / 1024).toFixed(2)} MB • {selectedPages.length > 0 ? `Pages: ${formatRange(selectedPages)}` : "All Pages"}
                                     </p>
                                     <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="px-5 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] font-black text-red-400 uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Remove</button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Upload className="w-7 h-7 text-white/20 group-hover:text-indigo-400 transition-colors" />
                                  </div>
                                  <p className="text-lg font-black tracking-tight mb-2">Drop Document</p>
                                  <p className="text-xs text-white/20 mb-8 text-center px-4">PDF or Text supported</p>
                                  <button onClick={() => document.getElementById("file-input")?.click()} className="px-8 py-3 rounded-2xl bg-white text-black font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">Browse Files</button>
                                </>
                              )}
                              <input id="file-input" type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" disabled={!!file} />
                            </motion.div>
                          ) : (
                            <motion.div key="paste" className="relative h-[300px] rounded-[40px] border border-white/5 bg-white/[0.02] shadow-2xl overflow-hidden p-2">
                              <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your content..." className="w-full h-full bg-transparent p-8 text-xl font-medium placeholder:text-white/5 focus:outline-none resize-none custom-scrollbar leading-relaxed" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="lg:col-span-4 flex flex-col gap-4">
                        <button className="flex items-center gap-4 p-6 rounded-[32px] bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all group shadow-2xl">
                           <div className="w-12 h-12 rounded-2xl bg-[#4285F4]/10 flex items-center justify-center shadow-2xl shrink-0">
                              <Cloud className="w-6 h-6 text-[#4285F4]" />
                           </div>
                           <div className="text-left overflow-hidden">
                              <p className="font-black text-sm truncate">Google Drive</p>
                              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Connect</p>
                           </div>
                        </button>
                        <div className="flex-1 rounded-[32px] bg-white/[0.01] border border-white/[0.02] p-8 flex flex-col items-center justify-center text-center gap-4 opacity-50 grayscale">
                           <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                              <Sparkles className="w-5 h-5 text-white/20" />
                           </div>
                           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 leading-relaxed">Dictionary &<br/>Stats soon</p>
                        </div>
                      </div>
                   </div>

                   <button 
                      onClick={handleProcess}
                      disabled={isProcessing || (activeTab === "paste" ? !text.trim() : !file)}
                      className={cn(
                        "w-full h-20 md:h-24 rounded-[32px] md:rounded-[40px] font-black text-sm md:text-xl uppercase tracking-[0.1em] flex items-center justify-center gap-6 transition-all shadow-2xl",
                        isProcessing 
                          ? "bg-white/5 text-white/10 cursor-not-allowed border border-white/5" 
                          : (activeTab === "paste" ? text.trim() : file)
                            ? "bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105 active:scale-95 shadow-[0_20px_40px_rgba(79,70,229,0.3)]"
                            : "bg-white/5 text-white/10 cursor-not-allowed border border-white/5"
                      )}
                    >
                      {isProcessing ? (
                        <><Loader2 className="w-7 h-7 animate-spin" />Launching</>
                      ) : (
                        <><span>Start Learning Journey</span><ArrowRight className="w-6 h-6" /></>
                      )}
                    </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Learning Library Section */}
          <div className="space-y-6">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                      <History className="w-4 h-4 text-white/40" />
                   </div>
                   <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Recently Studied</h3>
                </div>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {recentSessions.map((session) => (
                  <motion.button
                    key={session.id}
                    onClick={() => setExpandedSessionId(session.id)}
                    whileHover={{ y: -3 }}
                    className={cn(
                      "group p-4 rounded-3xl border transition-all text-left relative overflow-hidden",
                      expandedSessionId === session.id 
                        ? "bg-indigo-600/10 border-indigo-500/50 shadow-[0_0_40px_rgba(79,70,229,0.1)]" 
                        : "bg-white/[0.02] border-white/5 hover:border-indigo-500/30"
                    )}
                  >
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center mb-3 group-hover:bg-indigo-500/10 transition-colors">
                      {session.type === "upload" ? <FileText className="w-4 h-4 text-white/20" /> : <Type className="w-4 h-4 text-white/20" />}
                    </div>
                    <p className="font-bold text-xs mb-1 truncate pr-4">{session.name}</p>
                    <div className="flex items-center justify-between mt-2">
                       <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-white/10">
                          <Clock className="w-2.5 h-2.5" />
                          {session.date}
                       </div>
                       <div className="flex gap-1">
                          {session.bookmarks && session.bookmarks.length > 0 && <div className="w-1 h-1 rounded-full bg-indigo-400" />}
                          {session.lookups && session.lookups.length > 0 && <div className="w-1 h-1 rounded-full bg-indigo-400" />}
                       </div>
                    </div>
                  </motion.button>
                ))}
             </div>
          </div>

          {/* Session Details Overlay */}
          <AnimatePresence>
            {expandedSessionId && expandedSession && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="p-8 md:p-12 rounded-[48px] bg-[#0a0f1d] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative overflow-hidden backdrop-blur-3xl"
              >
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
                       <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                          <div className="flex items-center gap-6 min-w-0">
                             <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-2xl shrink-0">
                                {expandedSession.type === "upload" ? <FileText className="w-8 h-8 text-white" /> : <Type className="w-8 h-8 text-white" />}
                             </div>
                             <div className="min-w-0 flex-1">
                                <h4 className="text-2xl md:text-3xl font-black mb-1 truncate leading-tight" title={expandedSession.name}>
                                  {expandedSession.name}
                                </h4>
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">{expandedSession.date} • {expandedSession.type === "upload" ? "Document" : "Plain Text"}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                             <button onClick={() => router.push(`/result/${expandedSessionId}`)} className="px-8 py-4 rounded-2xl bg-white text-black font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:scale-105 transition-all shadow-xl"><Play className="w-4 h-4 fill-current" />Continue Lesson</button>
                             <button onClick={() => setExpandedSessionId(null)} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"><X className="w-6 h-6 text-white/30" /></button>
                          </div>
                       </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                       <div className="flex items-center gap-3"><Bookmark className="w-4 h-4 text-indigo-400" /><h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Bookmarked Text</h5></div>
                       <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-6">
                          {expandedSession.bookmarks && expandedSession.bookmarks.length > 0 ? expandedSession.bookmarks.map((b, i) => (
                            <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 text-xs leading-relaxed text-white/60 font-medium italic relative group"><div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-indigo-500 rounded-r-full opacity-30" />"{b}"</div>
                          )) : <div className="h-40 rounded-3xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center"><Bookmark className="w-6 h-6 text-white/5 mb-3" /><p className="text-[10px] font-black uppercase tracking-widest text-white/10">No bookmarks yet</p></div>}
                       </div>
                    </div>
                    <div className="space-y-6">
                       <div className="flex items-center gap-3"><Search className="w-4 h-4 text-indigo-400" /><h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Vocabulary History</h5></div>
                       <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-6">
                          {expandedSession.lookups && expandedSession.lookups.length > 0 ? expandedSession.lookups.map((l, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 group hover:border-indigo-500/30 transition-all"><span className="text-xs font-bold">{l.word}</span><span className="text-[8px] font-black uppercase tracking-widest text-white/10 group-hover:text-indigo-400 transition-colors">Definition</span></div>
                          )) : <div className="col-span-2 h-40 rounded-3xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center"><Search className="w-6 h-6 text-white/5 mb-3" /><p className="text-[10px] font-black uppercase tracking-widest text-white/10">No lookups yet</p></div>}
                       </div>
                    </div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      <footer className="h-14 md:h-16 border-t border-white/5 px-6 md:px-12 flex items-center justify-between bg-black/20 shrink-0">
          <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.4em]">© 2026 Lexis AI</p>
          <div className="flex gap-4 md:gap-6">
             <div className="w-1.5 h-1.5 rounded-full bg-white/5" />
             <div className="w-1.5 h-1.5 rounded-full bg-white/5" />
             <div className="w-1.5 h-1.5 rounded-full bg-white/5" />
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
