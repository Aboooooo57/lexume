"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Mic2,
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
  EyeOff,
  X,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import DictionaryModal from "@/components/DictionaryModal";
import { api } from "@/api";
import { useTheme } from "@/components/ThemeProvider";

interface WordTiming {
  word: string;
  start: number;
  end: number;
}

interface SessionMeta {
  session_id: string;
  name?: string;
  total_pages?: number;
}

interface PageData {
  page_number: number;
  title?: string;
  extracted: string;
  paragraphs: string[];
  word_timings: WordTiming[];
  page_images?: string[];
}

export default function LessonPage() {
  const { sessionId } = useParams();
  const router = useRouter();
  const [sessionMeta, setSessionMeta] = useState<SessionMeta | null>(null);
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedParagraph, setSelectedParagraph] = useState<string | null>(null);
  const [paragraphTranslations, setParagraphTranslations] = useState<Record<number, string>>({});
  const [translatingParagraphs, setTranslatingParagraphs] = useState<Record<number, boolean>>({});
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg" | "xl" | "custom">("base");
  const [fontSizePx, setFontSizePx] = useState(32);
  const [fontFamily, setFontFamily] = useState<"sans" | "serif" | "mono">("sans");
  const { theme: readingTheme, setTheme: setReadingTheme, t } = useTheme();
  const [targetLanguage, setTargetLanguage] = useState("Persian");
  const [translationEngine, setTranslationEngine] = useState<"google" | "gemini">("google");
  const [generateAudio, setGenerateAudio] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false); // Used to prevent hydration mismatch
  const [bookmarkFlash, setBookmarkFlash] = useState(false);
  const [bookmarkedParagraphs, setBookmarkedParagraphs] = useState<Set<number>>(new Set());

  // Credits state
  const [credits, setCredits] = useState<number | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(false);

  // Escape key exits focus mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocusMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Renaming State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  // Load preferences from local storage and backend on mount
  useEffect(() => {
    const savedFontSize = localStorage.getItem("lexis_font_size") as "sm" | "base" | "lg" | "xl" | "custom" | null;
    const savedFontFamily = localStorage.getItem("lexis_font_family") as "sans" | "serif" | "mono" | null;
    const savedLanguage = localStorage.getItem("lexis_target_language");
    const savedEngine = localStorage.getItem("lexis_translation_engine") as "google" | "gemini" | null;

    if (savedFontSize) setFontSize(savedFontSize);
    if (savedFontFamily) setFontFamily(savedFontFamily);
    if (savedLanguage) setTargetLanguage(savedLanguage);
    if (savedEngine) setTranslationEngine(savedEngine);
    
    setIsLoaded(true);

    // Fetch preferences from the backend
    api.getPreferences()
      .then(data => {
        if (data.fontSize) setFontSize(data.fontSize);
        if (data.fontFamily) setFontFamily(data.fontFamily);
        if (data.targetLanguage) setTargetLanguage(data.targetLanguage);
        if (data.translationEngine) setTranslationEngine(data.translationEngine as "google" | "gemini");
        if (data.generateAudio !== undefined) setGenerateAudio(data.generateAudio);
      })
      .catch(err => {
        console.error("Failed to fetch preferences", err);
        if (err.status === 401) router.push("/login");
      });

    // Fetch credit balance
    api.getCredits()
      .then(data => setCredits(data.balance))
      .catch(console.error);
  }, []);

  // Save preferences when they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("lexis_font_size", fontSize);
      localStorage.setItem("lexis_font_family", fontFamily);
      localStorage.setItem("lexis_target_language", targetLanguage);
      localStorage.setItem("lexis_translation_engine", translationEngine);

      // Sync to backend
      api.updatePreferences({ fontSize, fontFamily, targetLanguage, translationEngine, generateAudio })
        .catch(err => console.error("Failed to save preferences", err));
    }
  }, [fontSize, fontFamily, targetLanguage, translationEngine, generateAudio, isLoaded]);

 
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!isLoaded) return;
      try {
        setLoading(true);
        setError(null);
        
        // Reset page-specific states
        setParagraphTranslations({});
        setTranslatingParagraphs({});
        setBookmarkedParagraphs(new Set());
        
        let currentTotalPages = totalPages;
        if (!sessionMeta) {
          const meta = await api.getSession(sessionId as string);
          setSessionMeta(meta);
          if (meta.total_pages) {
             setTotalPages(meta.total_pages);
             currentTotalPages = meta.total_pages;
          }
          
          // Resume from last page on first load
          if (meta.last_page && meta.last_page !== currentPage) {
             setCurrentPage(meta.last_page);
             setLoading(false); // fetchData will be called again via dependency array
             return;
          }
        }
        
        const [page, savedBookmarks] = await Promise.all([
          api.getSessionPage(sessionId as string, currentPage, generateAudio),
          api.getSessionBookmarks(sessionId as string).catch(() => [] as string[]),
        ]);
        setPageData(page);

        // Refresh credit balance after consuming credits
        api.getCredits().then(data => setCredits(data.balance)).catch(() => {});

        // Pre-populate which paragraphs are already bookmarked
        if (savedBookmarks.length > 0 && page.paragraphs?.length > 0) {
          const bookmarkedSet = new Set<number>();
          page.paragraphs.forEach((para: string, idx: number) => {
            if (savedBookmarks.includes(para)) bookmarkedSet.add(idx);
          });
          setBookmarkedParagraphs(bookmarkedSet);
        }
      } catch (err: any) {
        console.error("Failed to fetch session", err);
        if (err.status === 402) {
          setOutOfCredits(true);
          setError("You've run out of credits. Please contact support to top up your balance.");
        } else {
          setError(err.message || "Failed to load page. Please check your API limits.");
        }
        if (err.status === 401) router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [sessionId, currentPage, router, generateAudio, isLoaded]); // Re-fetch when currentPage, generateAudio, or isLoaded changes

  // Persist current page position on change
  useEffect(() => {
    if (isLoaded && sessionMeta) {
      api.updateSessionMetadata(sessionId as string, { last_page: currentPage }).catch(console.error);
    }
  }, [currentPage, sessionId, isLoaded, sessionMeta]);


  const togglePlay = () => {
    if (audioRef.current && !error) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && !isPlaying) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const activeWordRef = useRef(-1);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        if (audioRef.current) {
          // Add a 100ms lookahead offset to fix the "laggy" or "backward" text issue
          setCurrentTime(audioRef.current.currentTime + 0.1);
        }
      }, 50); // 20 FPS for smooth updates
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const activeWordIndex = pageData?.word_timings?.findIndex(
    (t) => currentTime >= t.start && currentTime <= t.end
  ) ?? -1;

  useEffect(() => {
    if (activeWordIndex !== -1 && activeWordIndex !== activeWordRef.current) {
      activeWordRef.current = activeWordIndex;
      const activeElement = document.querySelector(".word-active");
      if (activeElement && scrollingRef.current) {
        activeElement.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }
    }
  }, [activeWordIndex]);

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

   const handleWordClick = (word: string, paragraph: string) => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, "");
    if (cleanWord) {
      setSelectedWord(cleanWord);
      setSelectedParagraph(paragraph);
      updateSessionActivity({ type: "lookup", content: cleanWord });
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const updateSessionActivity = async (activity: { type: "bookmark" | "lookup", content: string }) => {
    // Sync to backend
    try {
      if (activity.type === "bookmark") {
        await api.addBookmark(sessionId as string, activity.content);
      } else {
        await api.addVocabulary(sessionId as string, activity.content);
      }
    } catch (e) {
      console.error("Failed to sync activity to backend", e);
    }
  };

  const handleBookmarkParagraph = (text: string, index?: number) => {
    if (index === undefined) {
      // Called from header button — always add
      updateSessionActivity({ type: "bookmark", content: text });
      return;
    }
    const isAlreadyBookmarked = bookmarkedParagraphs.has(index);
    if (isAlreadyBookmarked) {
      // Remove
      setBookmarkedParagraphs(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      api.removeBookmark(sessionId as string, text).catch(console.error);
    } else {
      // Add
      setBookmarkedParagraphs(prev => new Set(prev).add(index));
      api.addBookmark(sessionId as string, text).catch(console.error);
    }
  };

  const handleNameSave = async () => {
    if (!editedName.trim() || editedName === sessionMeta?.name) {
      setIsEditingName(false);
      return;
    }

    try {
      await api.updateSessionMetadata(sessionId as string, { name: editedName.trim() });
      setSessionMeta(prev => prev ? { ...prev, name: editedName.trim() } : null);
    } catch (err) {
      console.error("Failed to update session name", err);
    } finally {
      setIsEditingName(false);
    }
  };

  const translateParagraph = async (text: string, index: number) => {
    setTranslatingParagraphs(prev => ({ ...prev, [index]: true }));
    try {
      const data = await api.translate(text);
      setParagraphTranslations(prev => ({ ...prev, [index]: data.translation }));
    } catch (err) {
      console.error("Paragraph translation failed", err);
    } finally {
      setTranslatingParagraphs(prev => ({ ...prev, [index]: false }));
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className={cn(
          "max-w-md w-full rounded-[32px] p-10 text-center relative z-10 backdrop-blur-xl border",
          outOfCredits
            ? "bg-amber-500/10 border-amber-500/20"
            : "bg-red-500/10 border-red-500/20"
        )}>
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6",
            outOfCredits ? "bg-amber-500/20" : "bg-red-500/20"
          )}>
            {outOfCredits
              ? <Zap className="w-8 h-8 text-amber-400" />
              : <X className="w-8 h-8 text-red-500" />
            }
          </div>
          <h2 className={cn(
            "text-2xl font-black mb-4 uppercase tracking-tighter",
            outOfCredits ? "text-amber-300" : "text-white"
          )}>
            {outOfCredits ? "Out of Credits" : "System Error"}
          </h2>
          <p className={cn(
            "text-sm font-medium leading-relaxed mb-2",
            outOfCredits ? "text-amber-400/80" : "text-red-400/80"
          )}>
            {error}
          </p>
          {outOfCredits && (
            <p className="text-amber-500/50 text-xs font-medium mb-8">
              Each new page costs <strong>1 credit</strong> for extraction
              {" "}+ <strong>5 credits</strong> for audio. Contact the admin to top up.
            </p>
          )}
          {!outOfCredits && (
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-widest hover:scale-105 transition-all mb-4"
            >
              Try Again
            </button>
          )}
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full mt-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/40 font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    const initialBg = typeof window !== 'undefined' ? (localStorage.getItem('lexis_theme') === 'light' ? 'bg-[#f8fafc]' : localStorage.getItem('lexis_theme') === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-[#030712]') : 'bg-[#030712]';
    return (
      <div className={cn("min-h-screen flex items-center justify-center transition-colors duration-700", t.bg)}>
        {readingTheme === "dark" && (
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px]" />
        )}
        <div className="text-center relative z-10">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-6" />
          <p className={cn("font-black uppercase tracking-[0.4em] text-xs", readingTheme === "dark" ? "text-white" : "text-slate-900")}>Preparing your lesson...</p>
        </div>
      </div>
    );
  }

  // activeWordIndex is computed above now

  return (
    <div className={cn("min-h-screen flex flex-col transition-colors duration-700 overflow-hidden", t.bg, readingTheme === "dark" ? "text-white" : "text-slate-900")}>
      <div className="fixed inset-0 z-0 pointer-events-none">
        {readingTheme === "dark" && (
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        )}
      </div>

      <DictionaryModal 
        word={selectedWord} 
        contextText={selectedParagraph}
        onClose={() => {
          setSelectedWord(null);
          setSelectedParagraph(null);
        }} 
      />

      {/* ── Focus Mode exit button — always visible, always works ── */}
      <AnimatePresence>
        {focusMode && (
          <motion.button
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            onClick={() => setFocusMode(false)}
            className={cn(
              "fixed top-5 right-5 z-[200] flex items-center gap-2 px-4 py-2.5 rounded-2xl border shadow-2xl backdrop-blur-xl transition-colors",
              readingTheme === "dark"
                ? "bg-white/5 border-white/10 text-white/50 hover:bg-indigo-600 hover:border-indigo-500 hover:text-white"
                : "bg-black/5 border-black/10 text-slate-500 hover:bg-indigo-600 hover:border-indigo-500 hover:text-white"
            )}
            title="Exit Focus Mode (Esc)"
          >
            <Eye className="w-4 h-4" />
            <span className="text-[9px] font-black uppercase tracking-widest">Exit Focus</span>
          </motion.button>
        )}
      </AnimatePresence>

      <header className={cn(
        "h-16 px-6 md:px-8 flex items-center justify-between backdrop-blur-xl border-b fixed top-0 w-full z-40 transition-all duration-500",
        t.header, t.border,
        focusMode ? "translate-y-[-100%] opacity-0" : "translate-y-0 opacity-100"
      )}>
        <div className="flex items-center gap-4">
           <button 
             onClick={() => router.push("/dashboard")}
             className={cn("flex items-center gap-2 transition-all group", readingTheme === "dark" ? "text-white/40 hover:text-white" : "text-slate-500 hover:text-slate-900")}
           >
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border transition-all", t.card, t.border, "group-hover:border-indigo-500/30")}>
                 <ChevronLeft className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium hidden md:block">Dashboard</span>
           </button>
           <div className={cn("h-6 w-px hidden md:block", t.divider)} />
           <div className="flex flex-col min-w-0 max-w-[180px] md:max-w-sm">
              {isEditingName ? (
                <input
                  autoFocus
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                  className={cn("bg-transparent border-b-2 border-indigo-500 px-1 py-0.5 text-sm font-semibold outline-none w-full", t.text)}
                />
              ) : (
                <h2 
                  onDoubleClick={() => {
                    setIsEditingName(true);
                    setEditedName(sessionMeta?.name || "Untitled Session");
                  }}
                  className="text-sm font-semibold leading-none truncate cursor-pointer hover:text-indigo-400 transition-colors"
                  title="Double click to rename"
                >
                  {sessionMeta?.name || "Untitled Session"}
                </h2>
              )}
              {isEditingName && (
                <p className={cn("text-xs mt-1", t.subtext)}>
                  Press Enter to save
                </p>
              )}
           </div>
        </div>

        <div className="flex items-center gap-3">
           {/* Credits badge */}
           {credits !== null && (
             <div className={cn(
               "hidden sm:flex items-center gap-2 h-9 px-4 rounded-xl border transition-colors",
               t.card, t.border,
               credits < 2 ? "border-red-500/30 bg-red-500/5" : credits < 5 ? "border-amber-500/30 bg-amber-500/5" : ""
             )}>
               <Zap className={cn("w-4 h-4", credits < 2 ? "text-red-400" : credits < 5 ? "text-amber-400" : "text-indigo-400")} />
               <span className={cn(
                 "text-sm font-semibold",
                 credits < 2 ? "text-red-400" : credits < 5 ? "text-amber-400" : ""
               )}>
                 {credits.toFixed(1)}
               </span>
             </div>
           )}

           <button
             onClick={() => setFocusMode(true)}
             className={cn("h-9 px-4 rounded-xl transition-all flex items-center gap-2", t.card, t.border, "hover:border-indigo-500/30")}
           >
              <EyeOff className="w-4 h-4" />
              <span className="text-sm font-medium hidden lg:block">Focus</span>
           </button>
           <div className="relative">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={cn(
                  "w-9 h-9 rounded-xl transition-all flex items-center justify-center",
                  showSettings ? "bg-indigo-500 text-white shadow-lg" : cn(t.card, t.border, "hover:border-indigo-500/30")
                )}
              >
                <Settings className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className={cn(
                      "absolute top-full right-0 mt-4 w-64 border rounded-2xl shadow-2xl p-6 z-[100] backdrop-blur-xl transition-colors duration-700",
                      t.settings, t.border
                    )}
                  >
                    <div className="space-y-8">
                      <div>
                        <p className={cn("text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2", readingTheme === "dark" ? "text-white/40" : "text-slate-400")}>
                           <Eye className="w-3 h-3" /> Reading Theme
                        </p>
                        <div className={cn("grid grid-cols-3 rounded-xl p-1 gap-1", readingTheme === "dark" ? "bg-black/20" : "bg-black/5")}>
                          {(["dark", "light", "sepia"] as const).map((theme) => (
                            <button
                              key={theme}
                              onClick={() => setReadingTheme(theme)}
                              className={cn(
                                "py-3 rounded-lg text-[10px] font-black uppercase transition-all flex flex-col items-center gap-1.5",
                                readingTheme === theme ? "bg-indigo-600 text-white shadow-lg" : (readingTheme === "dark" ? "text-white/20 hover:text-white" : "text-slate-400 hover:text-slate-900")
                              )}
                            >
                              <div className={cn(
                                "w-4 h-4 rounded-full border",
                                theme === "dark" && "bg-[#030712] border-white/20",
                                theme === "light" && "bg-white border-slate-200",
                                theme === "sepia" && "bg-[#f4ecd8] border-[#d3c6aa]"
                              )} />
                              {theme}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className={cn("text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2", readingTheme === "dark" ? "text-white/40" : "text-slate-400")}>
                           <Type className="w-3 h-3" /> Size
                        </p>
                        <div className={cn("flex rounded-xl p-1 gap-1 mb-4", readingTheme === "dark" ? "bg-black/20" : "bg-black/5")}>
                          {(["sm", "base", "lg", "xl"] as const).map((size) => (
                            <button
                              key={size}
                              onClick={() => setFontSize(size)}
                              className={cn(
                                "flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                                fontSize === size ? "bg-indigo-600 text-white shadow-lg" : (readingTheme === "dark" ? "text-white/20 hover:text-white" : "text-slate-400 hover:text-slate-900")
                              )}
                            >
                              {size}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-3 px-1">
                           <div className="flex justify-between items-center">
                              <span className={cn("text-[9px] font-black uppercase tracking-widest", readingTheme === "dark" ? "text-white/40" : "text-slate-400")}>Custom Size</span>
                              <span className={cn("text-[10px] font-black", t.subtext)}>{fontSizePx}px</span>
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
                              className={cn(
                                "w-full h-1 rounded-full appearance-none cursor-pointer accent-indigo-500",
                                readingTheme === "dark" ? "bg-white/10" : "bg-black/10"
                              )}
                           />
                        </div>
                      </div>

                      <div>
                        <p className={cn("text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2", readingTheme === "dark" ? "text-white/40" : "text-slate-400")}>
                           <Maximize2 className="w-3 h-3" /> Style
                        </p>
                        <div className={cn("grid grid-cols-3 rounded-xl p-1 gap-1", readingTheme === "dark" ? "bg-black/20" : "bg-black/5")}>
                          {(["sans", "serif", "mono"] as const).map((style) => (
                            <button
                              key={style}
                              onClick={() => setFontFamily(style)}
                              className={cn(
                                "py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                                fontFamily === style ? "bg-indigo-600 text-white shadow-lg" : (readingTheme === "dark" ? "text-white/20 hover:text-white" : "text-slate-400 hover:text-slate-900")
                              )}
                            >
                              {style}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className={cn("text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2", readingTheme === "dark" ? "text-white/40" : "text-slate-400")}>
                           <Languages className="w-3 h-3" /> Translation Language
                        </p>
                        <select 
                          value={targetLanguage}
                          onChange={(e) => setTargetLanguage(e.target.value)}
                          className={cn(
                            "w-full border rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-indigo-500 transition-all mb-3",
                            readingTheme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                          )}
                        >
                          {["Persian", "Spanish", "French", "German", "Chinese", "Japanese", "Russian", "Arabic", "Turkish", "Italian"].map(lang => (
                            <option key={lang} value={lang} className={readingTheme === "dark" ? "bg-[#0a0f1d] text-white" : "bg-white text-slate-900"}>{lang}</option>
                          ))}
                        </select>
                        <div className={cn("flex rounded-xl p-1 gap-1", readingTheme === "dark" ? "bg-black/20" : "bg-black/5")}>
                          <button
                            onClick={() => setTranslationEngine("google")}
                            className={cn(
                              "flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all",
                              translationEngine === "google" ? "bg-indigo-600 text-white shadow-lg" : (readingTheme === "dark" ? "text-white/20 hover:text-white" : "text-slate-400 hover:text-slate-900")
                            )}
                            title="Fast & Free"
                          >
                            Google (Fast)
                          </button>
                          <button
                            onClick={() => setTranslationEngine("gemini")}
                            className={cn(
                              "flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all",
                              translationEngine === "gemini" ? "bg-indigo-600 text-white shadow-lg" : (readingTheme === "dark" ? "text-white/20 hover:text-white" : "text-slate-400 hover:text-slate-900")
                            )}
                            title="Accurate but costs API tokens"
                          >
                            Gemini (Accurate)
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className={cn("text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2", readingTheme === "dark" ? "text-white/40" : "text-slate-400")}>
                          <Mic2 className="w-3 h-3" /> Audio Narration
                        </p>
                        <button
                          onClick={() => setGenerateAudio(v => !v)}
                          className={cn(
                            "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all",
                            generateAudio
                              ? "bg-indigo-600 border-indigo-500 text-white"
                              : (readingTheme === "dark" ? "bg-white/5 border-white/10 text-white/40" : "bg-black/5 border-black/10 text-slate-400")
                          )}
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {generateAudio ? "Enabled" : "Disabled"}
                          </span>
                          <div className={cn(
                            "w-8 h-4 rounded-full relative transition-all",
                            generateAudio ? "bg-white/30" : (readingTheme === "dark" ? "bg-white/10" : "bg-black/10")
                          )}>
                            <div className={cn(
                              "absolute top-0.5 w-3 h-3 rounded-full transition-all",
                              generateAudio ? "right-0.5 bg-white" : "left-0.5 bg-slate-400"
                            )} />
                          </div>
                        </button>
                        {!generateAudio && (
                          <p className={cn("text-[9px] mt-2 leading-relaxed", readingTheme === "dark" ? "text-white/30" : "text-slate-400")}>
                            Text extraction only. Saves API quota.
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
           <button
             onClick={() => {
               if (!pageData) return;
               let charCount = 0;
               let activeParagraph = pageData.paragraphs[0];
               for (const para of pageData.paragraphs) {
                 const wordCount = para.split(/\s+/).length;
                 charCount += wordCount;
                 if (activeWordIndex < charCount) {
                   activeParagraph = para;
                   break;
                 }
               }
               const textToBookmark = activeParagraph || pageData.paragraphs[0];
               if (textToBookmark) {
                 handleBookmarkParagraph(textToBookmark);
                 setBookmarkFlash(true);
                 setTimeout(() => setBookmarkFlash(false), 1000);
               }
             }}
             className={cn(
               "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
               bookmarkFlash 
                 ? "bg-emerald-500 shadow-lg shadow-emerald-500/30" 
                 : "bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
             )}
             title="Bookmark current paragraph"
           >
              {bookmarkFlash
                ? <span className="text-white text-xs font-bold">Done</span>
                : <Bookmark className="w-4 h-4 text-white fill-white" />
              }
           </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex pt-32 overflow-hidden">
        <div className={cn("flex-1 overflow-y-auto custom-scrollbar px-8", generateAudio ? "pb-40" : "pb-20")} ref={scrollingRef}>
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
                {pageData?.title ? (
                  <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-12">
                    {pageData.title.split(' ').map((word, i) => (
                      <span key={i} className={i % 2 === 1 ? cn(readingTheme === "dark" ? "text-slate-700" : "text-black/5") : ""}>
                        {word}{' '}
                        {i === 0 && pageData.title && pageData.title.split(' ').length > 2 && <br/>}
                      </span>
                    ))}
                  </h1>
                ) : (
                  <h1 className="text-7xl md:text-[8rem] font-black tracking-tighter leading-[0.8] mb-12">
                    Your<br/>
                    <span className={cn(readingTheme === "dark" ? "text-slate-700" : "text-black/5")}>Lesson</span>
                  </h1>
                )}
            </motion.div>

            {/* Page images extracted from PDF */}
            {pageData?.page_images && pageData.page_images.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-6 mb-8"
              >
                {pageData.page_images.map((b64, i) => (
                  <figure key={i} className={cn(
                    "rounded-3xl overflow-hidden border shadow-xl",
                    readingTheme === "dark" ? "border-white/8 bg-white/5" : readingTheme === "sepia" ? "border-[#d3c6aa] bg-[#fdf6e3]" : "border-slate-200 bg-white"
                  )}>
                    <img
                      src={`data:image/png;base64,${b64}`}
                      alt={`Page image ${i + 1}`}
                      className="w-full h-auto object-contain max-h-[70vh]"
                    />
                  </figure>
                ))}
              </motion.div>
            )}

            {pageData && pageData.paragraphs.map((p, pIdx) => {
              const isTranslating = translatingParagraphs[pIdx];
              const hasTranslation = !!paragraphTranslations[pIdx];
              const isSelected = isTranslating || hasTranslation;

              return (
              <motion.div
                key={pIdx}
                className="group/para relative flex flex-col gap-4"
              >
                <div className={cn(
                  "absolute -left-12 top-2 flex flex-col gap-2 transition-opacity",
                  isSelected ? "opacity-100" : "opacity-0 group-hover/para:opacity-100"
                )}>
                  <button
                    onClick={() => handleBookmarkParagraph(p, pIdx)}
                    className={cn(
                      "p-2 rounded-lg border transition-all shadow-xl",
                      bookmarkedParagraphs.has(pIdx)
                        ? "bg-indigo-600 border-indigo-500 text-white scale-110"
                        : "bg-white/5 border-white/10 hover:bg-indigo-600 hover:text-white"
                    )}
                    title={bookmarkedParagraphs.has(pIdx) ? "Bookmarked!" : "Bookmark Paragraph"}
                  >
                     <Bookmark className={cn("w-3.5 h-3.5", bookmarkedParagraphs.has(pIdx) && "fill-current")} />
                  </button>
                  <button
                    onClick={() => hasTranslation
                      ? setParagraphTranslations(prev => { const n = {...prev}; delete n[pIdx]; return n; })
                      : translateParagraph(p, pIdx)
                    }
                    disabled={isTranslating}
                    className={cn(
                      "p-2 rounded-lg border transition-all shadow-xl disabled:opacity-50",
                      hasTranslation
                        ? "bg-indigo-600 text-white border-indigo-500"
                        : "bg-white/5 border-white/10 hover:bg-indigo-600 hover:text-white"
                    )}
                    title={hasTranslation ? "Hide Translation" : "Translate Paragraph"}
                  >
                     {isTranslating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  style={{
                    fontSize: fontSize === "custom" ? `${fontSizePx}px` : undefined,
                    lineHeight: fontSize === "custom" ? "1.6" : undefined
                  }}
                  className={cn(
                    "leading-relaxed text-left transition-all duration-300 rounded-2xl",
                    isSelected
                      ? readingTheme === "dark"
                        ? "text-white/90 bg-indigo-500/5 border border-indigo-500/20 px-6 py-4 shadow-[0_0_30px_rgba(99,102,241,0.05)]"
                        : "text-slate-900 bg-indigo-50 border border-indigo-200 px-6 py-4"
                      : cn(t.text, "px-0 py-0 border border-transparent")
                  )}
                >
                  {p.split(/\s+/).map((word, wIdx) => {
                    const globalWordIdx = pageData.paragraphs.slice(0, pIdx).join(" ").split(/\s+/).length + wIdx;
                    const isActive = activeWordIndex === globalWordIdx;
                    const isSpoken = activeWordIndex > globalWordIdx;

                    return (
                      <span
                        key={wIdx}
                        onClick={() => handleWordClick(word, p)}
                        className={cn(
                          "inline-block rounded-[0.4em] px-[0.2em] cursor-pointer transition-all duration-300",
                          isActive && "text-white bg-indigo-600 scale-110 shadow-[0_20px_50px_rgba(99,102,241,0.5)] font-black z-10 word-active",
                          !isActive && isSpoken && t.activeText + " font-medium",
                          !isActive && !isSpoken && (readingTheme === "dark" ? "hover:bg-white/10 hover:text-white" : "hover:bg-indigo-50 hover:text-indigo-600")
                        )}
                      >
                        {word}{" "}
                      </span>
                    );
                  })}
                </motion.p>

                {/* Paragraph Translation Output */}
                <AnimatePresence>
                  {paragraphTranslations[pIdx] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className={cn(
                        "p-6 rounded-2xl border-l-4",
                        readingTheme === "dark" ? "bg-white/5 border-indigo-500 text-white/80" : "bg-indigo-50 border-indigo-500 text-slate-700"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", readingTheme === "dark" ? "text-indigo-400" : "text-indigo-600")}>
                          Translation
                        </span>
                        <button 
                          onClick={() => {
                            const newTranslations = { ...paragraphTranslations };
                            delete newTranslations[pIdx];
                            setParagraphTranslations(newTranslations);
                          }}
                          className={cn("p-1 rounded-md transition-colors", readingTheme === "dark" ? "hover:bg-white/10" : "hover:bg-black/5")}
                        >
                          <X className="w-4 h-4 opacity-50 hover:opacity-100" />
                        </button>
                      </div>
                      <p className="text-xl md:text-2xl leading-relaxed" dir="auto">
                        {paragraphTranslations[pIdx]}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Floating Action Player with Focus Mode Logic */}
      <div className={cn(
        "fixed bottom-10 transition-all duration-700 z-50",
        focusMode ? "right-10 left-auto translate-x-0" : "left-1/2 -translate-x-1/2",
        focusMode && !isPlaying && "opacity-20 hover:opacity-100"
      )}>

        {/* Audio disabled pill */}
        {!generateAudio && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-xl backdrop-blur-2xl",
              readingTheme === "dark" ? "bg-[#0a0f1d]/90 border-white/8 text-white/50" : "bg-white/90 border-slate-200 text-slate-500"
            )}
          >
            <Mic2 className="w-4 h-4 opacity-40" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Audio Off</span>
            <button
              onClick={() => setGenerateAudio(true)}
              className="ml-2 px-3 py-1 rounded-lg bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all"
            >
              Enable
            </button>
          </motion.div>
        )}

        {generateAudio && <motion.div
          layout
          className={cn(
            "backdrop-blur-3xl border shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative group/player transition-colors duration-700",
            t.player, t.border,
            focusMode ? "rounded-full p-2" : "rounded-[32px] p-4",
            !focusMode && (isMinimized ? "w-80" : "w-[48rem]")
          )}
        >

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
                    <span className={cn("text-[8px] font-black uppercase tracking-widest", readingTheme === "dark" ? "text-indigo-400" : "text-indigo-600")}>Lesson Active</span>
                    <span className={cn("text-[10px] font-bold", readingTheme === "dark" ? "text-white/40" : "text-slate-500")}>{formatTime(currentTime)}</span>
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
                  className={cn("absolute -top-3 right-8 w-6 h-6 rounded-full border backdrop-blur-md flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all opacity-0 group-hover/player:opacity-100", readingTheme === "dark" ? "bg-white/10 border-white/10 text-white" : "bg-black/10 border-black/10 text-black")}
                >
                  <ChevronDown className="w-3 h-3" />
                </button>

                {/* Pagination Controls */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="text-white/50 hover:text-white disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
                    Page {currentPage} / {totalPages}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="text-white/50 hover:text-white disabled:opacity-30 transition-all"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Controls Group */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => audioRef.current && (audioRef.current.currentTime = 0)}
                    className={cn("w-10 h-10 rounded-2xl border flex items-center justify-center transition-all group", readingTheme === "dark" ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-black/5 border-black/5 hover:bg-black/10")}
                  >
                    <RotateCcw className={cn("w-4 h-4 transition-all", readingTheme === "dark" ? "text-white/40 group-hover:text-white" : "text-slate-500 group-hover:text-slate-900")} />
                  </button>
                  <button 
                    onClick={() => audioRef.current && (audioRef.current.currentTime -= 5)}
                    className={cn("w-10 h-10 rounded-2xl border flex items-center justify-center transition-all group", readingTheme === "dark" ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-black/5 border-black/5 hover:bg-black/10")}
                  >
                    <SkipBack className={cn("w-4 h-4 fill-current transition-all", readingTheme === "dark" ? "text-white/40 group-hover:text-white" : "text-slate-500 group-hover:text-slate-900")} />
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
                  className={cn("w-10 h-10 rounded-2xl border flex items-center justify-center transition-all group", readingTheme === "dark" ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-black/5 border-black/5 hover:bg-black/10")}
                >
                  <SkipForward className={cn("w-4 h-4 fill-current transition-all", readingTheme === "dark" ? "text-white/40 group-hover:text-white" : "text-slate-500 group-hover:text-slate-900")} />
                </button>

                {/* Progress Section */}
                <div className="flex-1 flex flex-col gap-3">
                  <div className="flex justify-between items-center px-1">
                    <span className={cn("text-[10px] font-black uppercase tracking-widest", t.subtext)}>{formatTime(Math.max(0, currentTime - 0.1))}</span>
                    <div className={cn("h-1 flex-1 mx-4 rounded-full relative overflow-hidden cursor-pointer group/seek", readingTheme === "dark" ? "bg-white/5" : "bg-black/5")} onClick={handleProgressClick}>
                      <div className="absolute inset-0 bg-indigo-500/20 opacity-0 group-hover/seek:opacity-100 transition-opacity" />
                      <motion.div 
                        className="absolute top-0 left-0 h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)]"
                        animate={{ width: `${(Math.max(0, currentTime - 0.1) / (duration || 1)) * 100}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                    <span className={cn("text-[10px] font-black uppercase tracking-widest", t.subtext)}>{formatTime(duration)}</span>
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
                    className={cn("absolute -top-3 right-8 w-6 h-6 rounded-full border backdrop-blur-md flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all opacity-0 group-hover/player:opacity-100", readingTheme === "dark" ? "bg-white/10 border-white/10 text-white" : "bg-black/10 border-black/10 text-black")}
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
                       <span className={cn("text-[8px] font-black uppercase tracking-widest", readingTheme === "dark" ? "text-indigo-400" : "text-indigo-600")}>Lesson Active</span>
                       <span className={cn("text-[10px] font-bold", readingTheme === "dark" ? "text-white/40" : "text-slate-500")}>{formatTime(Math.max(0, currentTime - 0.1))}</span>
                    </div>
                 </div>
                 
                 <div className={cn("w-24 h-1 rounded-full relative overflow-hidden", readingTheme === "dark" ? "bg-white/5" : "bg-black/5")}>
                    <motion.div 
                      className="absolute top-0 left-0 h-full bg-indigo-500"
                      animate={{ width: `${(Math.max(0, currentTime - 0.1) / (duration || 1)) * 100}%` }}
                    />
                 </div>

                 <button 
                   onClick={() => setIsMinimized(false)}
                   className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all", readingTheme === "dark" ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10")}
                 >
                    <Maximize className={cn("w-3 h-3", readingTheme === "dark" ? "text-white/40" : "text-slate-500")} />
                 </button>
              </motion.div>
            )}
          </AnimatePresence>

          <audio
            ref={audioRef}
            src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/audio/${sessionId}/page/${currentPage}`}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => {
              setIsPlaying(false);
              if (currentPage < totalPages) {
                setCurrentPage(p => p + 1);
              }
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="hidden"
          />
        </motion.div>}
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
