"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Heart, 
  Share2, 
  ArrowLeft,
  Loader2,
  Languages,
  FileText,
  Bookmark,
  ChevronLeft,
  Sparkles,
  ArrowRight,
  Settings,
  Type,
  Maximize2,
  SkipBack,
  SkipForward,
  ChevronDown,
  ChevronUp,
  Maximize,
  Eye,
  EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import DictionaryModal from "@/components/DictionaryModal";

interface WordTiming {
  word: string;
  start: number;
  end: number;
}

interface SessionData {
  session_id: string;
  paragraphs: string[];
  extracted: string;
  word_timings: WordTiming[];
  has_audio: boolean;
  has_original_file?: boolean;
  original_filename?: string;
}

export default function ResultPage() {
  const { sessionId } = useParams();
  const router = useRouter();
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg" | "xl" | "custom">("base");
  const [fontSizePx, setFontSizePx] = useState(32);
  const [fontFamily, setFontFamily] = useState<"sans" | "serif" | "mono">("sans");
  const [showSettings, setShowSettings] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/session/${sessionId}`);
        if (!res.ok) throw new Error("Session not found");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setData({
          session_id: sessionId as string,
          extracted: "# Chapter 3\n## Asyncio Walk-Through\n\nAsyncio provides another tool for concurrent programming in Python, that is more lightweight than threads or multiprocessing. In a very simple sense it does this by having an event loop execute a collection of tasks, with a key difference being that each task chooses when to yield control back to the event loop.\n\n—Philip Jones, \"Understanding Asyncio\"",
          paragraphs: [
            "# Chapter 3",
            "## Asyncio Walk-Through",
            "Asyncio provides another tool for concurrent programming in Python, that is more lightweight than threads or multiprocessing. In a very simple sense it does this by having an event loop execute a collection of tasks, with a key difference being that each task chooses when to yield control back to the event loop.",
            "—Philip Jones, \"Understanding Asyncio\""
          ],
          word_timings: [
            { word: "#", start: 0.1, end: 0.5 },
            { word: "Chapter", start: 0.5, end: 1.2 },
            { word: "3", start: 1.2, end: 1.8 },
            { word: "##", start: 2.0, end: 2.5 },
            { word: "Asyncio", start: 2.5, end: 3.2 },
            { word: "Walk-Through", start: 3.2, end: 4.0 },
            { word: "Asyncio", start: 4.5, end: 5.2 },
            { word: "provides", start: 5.2, end: 5.8 },
            { word: "another", start: 5.8, end: 6.4 },
            { word: "tool", start: 6.4, end: 7.0 },
            { word: "for", start: 7.0, end: 7.3 },
            { word: "concurrent", start: 7.3, end: 8.2 },
            { word: "programming", start: 8.2, end: 9.0 },
            { word: "in", start: 9.0, end: 9.2 },
            { word: "Python,", start: 9.2, end: 9.8 },
            { word: "that", start: 9.8, end: 10.1 },
            { word: "is", start: 10.1, end: 10.3 },
            { word: "more", start: 10.3, end: 10.8 },
            { word: "lightweight", start: 10.8, end: 11.5 },
            { word: "than", start: 11.5, end: 11.8 },
            { word: "threads", start: 11.8, end: 12.5 },
            { word: "or", start: 12.5, end: 12.8 },
            { word: "multiprocessing.", start: 12.8, end: 14.0 }
          ],
          has_audio: true,
          has_original_file: true,
          original_filename: "demo_tutorial.pdf"
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [sessionId, router]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);

      const activeElement = document.querySelector(".word-active");
      if (activeElement && scrollingRef.current) {
        activeElement.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const newTime = percentage * audioRef.current.duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

   const handleWordClick = (word: string) => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, "");
    if (cleanWord) {
      setSelectedWord(cleanWord);
      updateSessionActivity({ type: "lookup", content: cleanWord });
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const updateSessionActivity = (activity: { type: "bookmark" | "lookup", content: string }) => {
    const saved = localStorage.getItem("lexis_recent_sessions");
    if (!saved) return;
    const sessions = JSON.parse(saved);
    const updated = sessions.map((s: any) => {
      if (s.id === sessionId) {
        if (activity.type === "bookmark") {
          const bookmarks = s.bookmarks || [];
          if (!bookmarks.includes(activity.content)) {
            return { ...s, bookmarks: [...bookmarks, activity.content] };
          }
        } else {
          const lookups = s.lookups || [];
          if (!lookups.some((l: any) => l.word === activity.content)) {
            return { ...s, lookups: [...lookups, { word: activity.content, date: new Date().toISOString() }] };
          }
        }
      }
      return s;
    });
    localStorage.setItem("lexis_recent_sessions", JSON.stringify(updated));
  };

  const handleBookmarkParagraph = (text: string) => {
    updateSessionActivity({ type: "bookmark", content: text });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="text-center relative z-10">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-6" />
          <p className="text-white font-black uppercase tracking-[0.4em] text-xs">Preparing your lesson...</p>
        </div>
      </div>
    );
  }

  const activeWordIndex = data?.word_timings.findIndex(
    (t) => currentTime >= t.start && currentTime <= t.end
  ) ?? -1;

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col selection:bg-indigo-500/30 overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <DictionaryModal 
        word={selectedWord} 
        onClose={() => setSelectedWord(null)} 
      />

      <header className={cn(
        "h-24 px-10 flex items-center justify-between bg-[#030712]/50 backdrop-blur-2xl border-b border-white/5 fixed top-0 w-full z-40 transition-all duration-700",
        focusMode ? "translate-y-[-100%] opacity-0" : "translate-y-0 opacity-100"
      )}>
        <div className="flex items-center gap-8">
           <button 
             onClick={() => router.push("/dashboard")}
             className="flex items-center gap-3 text-white/30 hover:text-white transition-all group"
           >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-white/10 group-hover:scale-110 transition-all">
                 <ChevronLeft className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] hidden md:block">Back to Lab</span>
           </button>
           <div className="h-8 w-px bg-white/5 hidden md:block" />
           <div className="flex flex-col">
              <h2 className="text-xl font-black tracking-tight leading-none mb-1">Your Journey</h2>
              <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.3em]">Session {sessionId?.slice(0, 8)}</p>
           </div>
        </div>

        <div className="flex items-center gap-4">
           <button 
             onClick={() => setFocusMode(true)}
             className="p-3 rounded-xl bg-white/5 text-white/40 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-3"
           >
              <EyeOff className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Focus Mode</span>
           </button>
           <div className="relative">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={cn(
                  "p-3 rounded-xl transition-all",
                  showSettings ? "bg-indigo-600 text-white" : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                )}
              >
                <Settings className="w-5 h-5" />
              </button>

              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-4 w-64 bg-[#0a0f1d] border border-white/10 rounded-2xl shadow-2xl p-6 z-[100] backdrop-blur-xl"
                  >
                    <div className="space-y-6">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4 flex items-center gap-2">
                           <Type className="w-3 h-3" /> Size
                        </p>
                        <div className="flex bg-white/5 rounded-xl p-1 gap-1 mb-4">
                          {(["sm", "base", "lg", "xl"] as const).map((size) => (
                            <button
                              key={size}
                              onClick={() => setFontSize(size)}
                              className={cn(
                                "flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                                fontSize === size ? "bg-indigo-600 text-white shadow-lg" : "text-white/30 hover:text-white"
                              )}
                            >
                              {size}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-3 px-1">
                           <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black uppercase tracking-widest text-white/10">Custom Size</span>
                              <span className="text-[10px] font-black text-indigo-400">{fontSizePx}px</span>
                           </div>
                           <input 
                              type="range"
                              min="12"
                              max="120"
                              value={fontSizePx}
                              onChange={(e) => {
                                setFontSizePx(parseInt(e.target.value));
                                setFontSize("custom");
                              }}
                              className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
                           />
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4 flex items-center gap-2">
                           <Maximize2 className="w-3 h-3" /> Style
                        </p>
                        <div className="grid grid-cols-3 bg-white/5 rounded-xl p-1 gap-1">
                          {(["sans", "serif", "mono"] as const).map((style) => (
                            <button
                              key={style}
                              onClick={() => setFontFamily(style)}
                              className={cn(
                                "py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                                fontFamily === style ? "bg-indigo-600 text-white shadow-lg" : "text-white/30 hover:text-white"
                              )}
                            >
                              {style}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
           <button className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:scale-110 active:scale-95 transition-all">
              <Bookmark className="w-5 h-5 text-white fill-white" />
           </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex pt-32 overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-40" ref={scrollingRef}>
          <div className={cn(
            "max-w-4xl mx-auto pt-20 space-y-12 transition-all duration-500 text-left",
            fontSize === "sm" && "text-sm",
            fontSize === "base" && "text-xl md:text-3xl",
            fontSize === "lg" && "text-2xl md:text-5xl",
            fontSize === "xl" && "text-4xl md:text-7xl",
            fontFamily === "sans" && "font-sans",
            fontFamily === "serif" && "font-serif",
            fontFamily === "mono" && "font-mono"
          )}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-32 text-center md:text-left"
            >
               <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mb-12">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  Learning Experience Active
               </div>
               <h1 className="text-7xl md:text-[8rem] font-black tracking-tighter leading-[0.8] mb-12 mix-blend-difference">
                 YOUR<br/>
                 <span className="text-white/20">LESSON</span>
               </h1>
            </motion.div>

            {data && data.paragraphs.map((p, pIdx) => (
              <motion.div 
                key={pIdx}
                className="group/para relative"
              >
                <button 
                  onClick={() => handleBookmarkParagraph(p)}
                  className="absolute -left-12 top-2 p-2 rounded-lg bg-white/5 border border-white/10 opacity-0 group-hover/para:opacity-100 hover:bg-indigo-600 hover:text-white transition-all shadow-xl"
                >
                   <Bookmark className="w-3.5 h-3.5" />
                </button>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  style={{ 
                    fontSize: fontSize === "custom" ? `${fontSizePx}px` : undefined,
                    lineHeight: fontSize === "custom" ? "1.6" : undefined
                  }}
                  className="leading-relaxed text-white/20 text-left"
                >
                  {p.split(/\s+/).map((word, wIdx) => {
                    const globalWordIdx = data.paragraphs.slice(0, pIdx).join(" ").split(/\s+/).length + wIdx;
                    const isActive = activeWordIndex === globalWordIdx;
                    const isSpoken = activeWordIndex > globalWordIdx;

                    return (
                      <span
                        key={wIdx}
                        onClick={() => handleWordClick(word)}
                        className={cn(
                          "inline-block rounded-[0.4em] px-[0.2em] cursor-pointer transition-all duration-300",
                          isActive && "text-white bg-indigo-600 scale-110 shadow-[0_20px_50px_rgba(99,102,241,0.5)] font-black z-10 word-active",
                          !isActive && isSpoken && "text-white/80 font-medium",
                          !isActive && !isSpoken && "hover:bg-white/10 hover:text-white"
                        )}
                      >
                        {word}{" "}
                      </span>
                    );
                  })}
                </motion.p>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* Floating Action Player with Focus Mode Logic */}
      <div className={cn(
        "fixed bottom-10 transition-all duration-700 z-50",
        focusMode ? "right-10 left-auto translate-x-0" : "left-1/2 -translate-x-1/2",
        focusMode && !isPlaying && "opacity-20 hover:opacity-100"
      )}>
        <motion.div 
          layout
          className={cn(
            "bg-[#0a0f1d]/80 backdrop-blur-3xl border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative group/player",
            focusMode ? "rounded-full p-2" : "rounded-[32px] p-4",
            !focusMode && (isMinimized ? "w-80" : "w-[48rem]")
          )}
        >
          {/* Exit Focus Mode Button */}
          {focusMode && (
            <button 
              onClick={() => setFocusMode(false)}
              className="absolute -top-12 left-1/2 -translate-x-1/2 p-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:bg-indigo-600 hover:text-white transition-all shadow-xl"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}

          <AnimatePresence mode="wait">
            {focusMode ? (
              <motion.div 
                key="focus"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2"
              >
                <button 
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all group"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current translate-x-[1px]" />
                  )}
                </button>
                {isPlaying && (
                  <div className="pr-4 flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400">Playing</span>
                    <span className="text-[10px] font-bold text-white/40">{formatTime(currentTime)}</span>
                  </div>
                )}
              </motion.div>
            ) : !isMinimized ? (
              <motion.div 
                key="full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-6 w-full"
              >
                {/* Minimize Toggle */}
                <button 
                  onClick={() => setIsMinimized(true)}
                  className="absolute -top-3 right-8 w-6 h-6 rounded-full bg-white/10 border border-white/10 backdrop-blur-md flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all opacity-0 group-hover/player:opacity-100"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>

                {/* Controls Group */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => audioRef.current && (audioRef.current.currentTime = 0)}
                    className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all group"
                  >
                    <RotateCcw className="w-4 h-4 text-white/40 group-hover:text-white transition-all" />
                  </button>
                  <button 
                    onClick={() => audioRef.current && (audioRef.current.currentTime -= 5)}
                    className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all group"
                  >
                    <SkipBack className="w-4 h-4 text-white/40 group-hover:text-white fill-current" />
                  </button>
                </div>

                {/* Main Play Toggle */}
                <button 
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-[20px] bg-indigo-600 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(79,70,229,0.4)] group relative overflow-hidden shrink-0"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-current relative z-10" />
                  ) : (
                    <Play className="w-6 h-6 fill-current translate-x-[2px] relative z-10" />
                  )}
                </button>

                <button 
                  onClick={() => audioRef.current && (audioRef.current.currentTime += 5)}
                  className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all group"
                >
                  <SkipForward className="w-4 h-4 text-white/40 group-hover:text-white fill-current" />
                </button>

                {/* Progress Section */}
                <div className="flex-1 flex flex-col gap-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{formatTime(currentTime)}</span>
                    <div className="h-1 flex-1 mx-4 bg-white/5 rounded-full relative overflow-hidden cursor-pointer group/seek" onClick={handleProgressClick}>
                      <div className="absolute inset-0 bg-indigo-500/20 opacity-0 group-hover/seek:opacity-100 transition-opacity" />
                      <motion.div 
                        className="absolute top-0 left-0 h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)]"
                        animate={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{formatTime(duration)}</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="min"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between w-full"
              >
                 {/* Maximize Toggle */}
                 <button 
                    onClick={() => setIsMinimized(false)}
                    className="absolute -top-3 right-8 w-6 h-6 rounded-full bg-white/10 border border-white/10 backdrop-blur-md flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all opacity-0 group-hover/player:opacity-100"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>

                 <div className="flex items-center gap-3">
                    <button 
                      onClick={togglePlay}
                      className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:scale-105 active:scale-90 transition-all"
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current translate-x-[1px]" />
                      )}
                    </button>
                    <div className="flex flex-col">
                       <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400">Lesson Active</span>
                       <span className="text-[10px] font-bold text-white/40">{formatTime(currentTime)}</span>
                    </div>
                 </div>
                 
                 <div className="w-24 h-1 bg-white/5 rounded-full relative overflow-hidden">
                    <motion.div 
                      className="absolute top-0 left-0 h-full bg-indigo-500"
                      animate={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                    />
                 </div>

                 <button 
                   onClick={() => setIsMinimized(false)}
                   className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
                 >
                    <Maximize className="w-3 h-3 text-white/40" />
                 </button>
              </motion.div>
            )}
          </AnimatePresence>

          <audio
            ref={audioRef}
            src={`http://localhost:8000/audio/${sessionId}`}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="hidden"
          />
        </motion.div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
