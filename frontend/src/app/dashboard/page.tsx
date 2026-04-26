"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Type,
  Mic2,
  Loader2,
  FileText,
  Languages,
  Sparkles,
  EyeOff,
  Layers,
  X,
  Plus,
  Cloud,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  History,
  Clock,
  Play,
  Bookmark,
  Search,
  BookOpen,
  ChevronDown,
  ArrowLeft,
  Zap,
  Folder
} from "lucide-react";
import { cn, formatTimeAgo } from "@/lib/utils";
import dynamic from "next/dynamic";
import { api, apiFetch } from "@/api";
import DictionaryModal from "@/components/DictionaryModal";
import { useTheme } from "@/components/ThemeProvider";

const PDFPageSelector = dynamic(() => import("@/components/PDFPageSelector"), {
  ssr: false,
});

interface SessionLookup {
  word: string;
  date: string;
}

interface LibrarySession {
  id: string;
  name: string;
  type: "upload" | "paste";
  date: string;
  bookmarks?: string[];
  lookups?: SessionLookup[];
  total_pages?: number;
  read_pages?: number;
  extracted?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [driveFileId, setDriveFileId] = useState<string | null>(null);
  const [driveFileName, setDriveFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const [recentSessions, setRecentSessions] = useState<LibrarySession[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [sessionsPage, setSessionsPage] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const SESSIONS_PER_PAGE = 12;
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const { theme: readingTheme, setTheme: setReadingTheme, t } = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [isPdfPreparing, setIsPdfPreparing] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [showDriveExplorer, setShowDriveExplorer] = useState(false);
  const [hasDriveToken, setHasDriveToken] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState("root");
  const [folderHistory, setFolderHistory] = useState<{id: string, name: string}[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [audioMode, setAudioMode] = useState<"auto" | "manual" | "off">("manual");
  const [targetLanguage, setTargetLanguage] = useState("Persian");
  const [translationEngine, setTranslationEngine] = useState<"google" | "gemini">("google");

  const startDriveOAuth = async () => {
    setIsRedirecting(true);
    try {
      const { url } = await apiFetch<{ url: string }>("/api/auth/drive/auth-url");
      window.location.href = url;
    } catch (err) {
      console.error("Drive sync failed", err);
      setIsRedirecting(false);
      setError("Failed to initialize Google Drive connection.");
    }
  };

  const fetchDriveFiles = async (folderId: string = "root") => {
    setIsDriveLoading(true);
    setCurrentFolderId(folderId);
    try {
      const files = await apiFetch<any[]>(`/api/library/drive/files?folder_id=${folderId}`);
      setDriveFiles(files);
      setShowDriveExplorer(true);
      setHasDriveToken(true);
      return true;
    } catch (err: any) {
      if (err.status === 401) {
        setHasDriveToken(false);
        await startDriveOAuth();
      } else {
        setError("Could not retrieve files from Drive.");
      }
      return false;
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleFolderClick = (folderId: string, folderName: string) => {
    setFolderHistory(prev => [...prev, { id: currentFolderId, name: folderName }]);
    fetchDriveFiles(folderId);
  };

  const handleDriveBack = () => {
    const prev = folderHistory[folderHistory.length - 1];
    if (prev) {
      setFolderHistory(prevHistory => prevHistory.slice(0, -1));
      fetchDriveFiles(prev.id);
    }
  };

  const handleDriveFileSelect = async (fileId: string, fileName: string, mimeType: string) => {
    setIsDriveLoading(true);
    setShowDriveExplorer(false);
    setError(null);
    
    try {
      const data = await apiFetch<any>(`/api/library/drive/fetch/${fileId}`);
      const binaryString = window.atob(data.content_base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.mimeType || mimeType });
      const driveFile = new File([blob], data.filename || fileName, { type: data.mimeType || mimeType });
      
      setFile(driveFile);
      setDriveFileId(null);
      setDriveFileName(null);
      setText("");
      setActiveTab("upload");
      setSelectedPages([]);
      
      if (driveFile.type === "application/pdf") {
        setIsPdfPreparing(true);
      }
      setIsAddingSession(true);
    } catch (err) {
      console.error("Failed to import Drive file:", err);
      setError("Failed to download file from Google Drive.");
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleDriveDisconnect = async () => {
    try {
      await apiFetch("/api/users/me/preferences", {
         method: "PUT",
         body: JSON.stringify({ googleDriveToken: "" })
      });
      setHasDriveToken(false);
      setError("Google Drive disconnected.");
    } catch (err) {
      console.error(err);
      setHasDriveToken(false);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'DRIVE_AUTH_SUCCESS') {
        fetchDriveFiles();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGoogleDriveSync = async () => {
    setError(null);
    if (!hasDriveToken) {
      await startDriveOAuth();
      return;
    }
    await fetchDriveFiles();
  };

  const checkAuth = async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch (err: any) {
      if (err.status === 401) {
        router.push("/login");
      }
    }
  };

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

  const fetchSessions = async () => {
    try {
      const data = await api.getLibrarySessions(SESSIONS_PER_PAGE, sessionsPage * SESSIONS_PER_PAGE, searchQuery);
      setRecentSessions(data.sessions);
      setTotalSessions(data.total);
    } catch (err: any) {
      console.error("Failed to fetch sessions", err);
      if (err.status === 401) {
        router.push("/login");
      }
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [sessionsPage, searchQuery]);

  useEffect(() => {
    checkAuth();
    // fetchSessions() is now handled by the specific effect above

    const params = new URLSearchParams(window.location.search);
    if (params.get("drive_success") === "true") {
      setIsRedirecting(false);
      setIsAddingSession(true);
      fetchDriveFiles();
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    setIsLoaded(true);

    const savedAudioMode = localStorage.getItem("lexis_audio_mode") as any;
    if (savedAudioMode) setAudioMode(savedAudioMode);

    api.getPreferences()
      .then(data => {
        if (data.hasDriveToken) setHasDriveToken(true);
        if (data.audioMode) {
          setAudioMode(data.audioMode);
          localStorage.setItem("lexis_audio_mode", data.audioMode);
        }
        if (data.targetLanguage) setTargetLanguage(data.targetLanguage);
        if (data.translationEngine) setTranslationEngine(data.translationEngine as any);
      })
      .catch(console.error);

    api.getCredits()
      .then(data => setCredits(data.balance))
      .catch(console.error);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let f: File | null = null;
    if ("files" in e.target && (e.target as any).files?.[0]) {
      f = (e.target as any).files[0];
    } else if ("dataTransfer" in e && (e as any).dataTransfer.files?.[0]) {
      f = (e as any).dataTransfer.files[0];
    }

    if (f) {
      setFile(f);
      setDriveFileId(null);
      setDriveFileName(null);
      setText("");
      setSelectedPages([]);
      if (f.type === "application/pdf") {
        setIsPdfPreparing(true);
      }
    }
  };

  const handleProcess = async () => {
    if (activeTab === "paste" && !text.trim()) return;
    if (activeTab === "upload" && !file && !driveFileId) return;

    setShowSelector(false);
    setIsProcessing(true);
    const formData = new FormData();
    
    if (activeTab === "upload") {
      if (file) {
        formData.append("file", file);
      } else if (driveFileId) {
        formData.append("drive_file_id", driveFileId);
        formData.append("drive_file_name", driveFileName || "");
      }
    } else if (activeTab === "paste" && text) {
      formData.append("text", text);
    }
    
    const pageRange = formatRange(selectedPages);
    formData.append("pages", pageRange);
    formData.append("audio_mode", audioMode);
    
    try {
      setError(null);
      const data = await api.extractText(formData);
      router.push(`/lesson/${data.session_id}`);
    } catch (err: any) {
      console.error(err);
      setError("Failed to process document. Please check your API keys and try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const expandedSession = recentSessions.find(s => s.id === expandedSessionId);

  return (
    <div className={cn("min-h-screen flex flex-col selection:bg-indigo-500/30 overflow-hidden transition-colors duration-500", t.bg, t.text)}>
      {/* Loading Overlay */}
      <AnimatePresence>
        {(isRedirecting || isDriveLoading || isPdfPreparing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center gap-6"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/30 blur-3xl rounded-full animate-pulse" />
              <Loader2 className="w-12 h-12 animate-spin text-indigo-400 relative z-10" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-1">
                {isRedirecting ? "Connecting to Google" : isDriveLoading ? "Importing File" : "Preparing Pages"}
              </h3>
              <p className="text-sm text-white/40">
                {isRedirecting ? "Redirecting to secure auth..." : isDriveLoading ? "Downloading from Drive..." : "Generating previews..."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {readingTheme === "dark" && (
          <>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_40%,transparent_100%)]" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[120px] opacity-30" 
              style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.2) 0%, transparent 70%)' }} 
            />
          </>
        )}
      </div>

      {/* PDF Page Selector */}
      <PDFPageSelector
        file={file}
        isOpen={showSelector}
        readingTheme={readingTheme}
        selectedPages={selectedPages}
        onSelectionChange={setSelectedPages}
        onClose={() => setShowSelector(false)}
        onProcess={handleProcess}
        onReady={() => {
          setIsPdfPreparing(false);
          setShowSelector(true);
        }}
      />

      {/* Google Drive Explorer Modal */}
      <AnimatePresence>
        {showDriveExplorer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDriveExplorer(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-3xl border shadow-2xl relative z-10 flex flex-col",
                readingTheme === "dark" ? "bg-[#0d1320] border-white/10" : "bg-white border-slate-200"
              )}
            >
              <div className={cn("p-6 border-b flex items-center justify-between", t.border)}>
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Cloud className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Google Drive</h3>
                    <p className={cn("text-xs", t.subtext)}>
                      {folderHistory.length > 0 ? "Browsing folder" : "Root directory"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {folderHistory.length > 0 && (
                    <button 
                      onClick={handleDriveBack}
                      className={cn("p-2.5 rounded-xl border flex items-center gap-2 px-4 transition-all hover:bg-white/5", t.border)}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span className="text-xs font-medium">Back</span>
                    </button>
                  )}
                  <button 
                    onClick={() => setShowDriveExplorer(false)}
                    className={cn("p-2 rounded-xl hover:bg-white/5 transition-colors", t.subtext)}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {isDriveLoading ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <p className={cn("text-sm", t.subtext)}>Loading files...</p>
                  </div>
                ) : driveFiles.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className={cn("text-sm", t.subtext)}>This folder is empty</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {driveFiles.map((df) => {
                      const isFolder = df.mimeType === 'application/vnd.google-apps.folder';
                      return (
                        <button
                          key={df.id}
                          onClick={() => isFolder ? handleFolderClick(df.id, df.name) : handleDriveFileSelect(df.id, df.name, df.mimeType)}
                          className={cn(
                            "w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left group",
                            t.card, t.border, "hover:border-indigo-500/30"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors", 
                            isFolder ? "bg-amber-500/10" : "bg-indigo-500/10"
                          )}>
                            {isFolder ? (
                              <Folder className="w-5 h-5 text-amber-500" />
                            ) : df.mimeType === "application/pdf" ? (
                              <FileText className="w-5 h-5 text-indigo-400" />
                            ) : (
                              <Type className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{df.name}</p>
                            <p className={cn("text-xs", t.subtext)}>
                              {isFolder ? "Folder" : `${(parseInt(df.size) / 1024 / 1024).toFixed(1)} MB`} · {new Date(df.modifiedTime).toLocaleDateString()}
                            </p>
                          </div>
                          <ChevronRight className={cn(
                            "w-4 h-4 opacity-0 group-hover:opacity-100 transition-all",
                            isFolder ? "text-amber-500" : "text-indigo-500"
                          )} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className={cn("h-16 px-6 md:px-8 flex items-center justify-between fixed top-0 w-full z-40 border-b transition-all duration-500", t.header, t.border)}>
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => router.push("/")}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Mic2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight hidden sm:block">Lexis</span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Theme Switcher */}
          <div className={cn("flex rounded-xl p-1 gap-1 border", t.card, t.border)}>
            {(["dark", "light", "sepia"] as const).map((themeName) => (
              <button
                key={themeName}
                onClick={() => setReadingTheme(themeName)}
                className={cn(
                  "w-8 h-8 rounded-lg transition-all flex items-center justify-center",
                  readingTheme === themeName 
                    ? "bg-indigo-500 shadow-lg shadow-indigo-500/25" 
                    : "hover:bg-white/5"
                )}
                title={`${themeName.charAt(0).toUpperCase() + themeName.slice(1)} mode`}
              >
                <div className={cn(
                  "w-3 h-3 rounded-full border-2",
                  themeName === "dark" && "bg-slate-900 border-slate-700",
                  themeName === "light" && "bg-white border-slate-300",
                  themeName === "sepia" && "bg-amber-100 border-amber-300"
                )} />
              </button>
            ))}
          </div>

          {/* Credits */}
          {credits !== null && (
            <button 
              onClick={() => router.push("/credits")}
              className={cn(
                "hidden sm:flex items-center gap-2 h-9 px-4 rounded-xl border transition-all hover:scale-[1.02]",
                t.card, t.border,
                credits < 2 ? "border-red-500/30 bg-red-500/5" : credits < 5 ? "border-amber-500/30 bg-amber-500/5" : ""
              )}
            >
              <Zap className={cn("w-4 h-4", credits < 2 ? "text-red-400" : credits < 5 ? "text-amber-400" : "text-indigo-400")} />
              <span className={cn("text-sm font-semibold", credits < 2 ? "text-red-400" : credits < 5 ? "text-amber-400" : "")}>
                {credits.toFixed(1)}
              </span>
            </button>
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
                      className={cn(
                        "absolute right-0 top-full mt-2 w-56 rounded-xl border shadow-xl overflow-hidden z-50",
                        t.cardSolid, t.border
                      )}
                    >
                      <div className={cn("px-4 py-3 border-b", t.border)}>
                        <p className="font-semibold text-sm truncate">{user.name}</p>
                        <p className={cn("text-xs truncate", t.subtext)}>{user.email}</p>
                      </div>

                      {credits !== null && (
                        <div className={cn("px-4 py-3 border-b flex items-center justify-between", t.border)}>
                          <span className={cn("text-xs", t.subtext)}>Credits</span>
                          <span className={cn("text-sm font-bold", credits < 2 ? "text-red-400" : credits < 5 ? "text-amber-400" : t.accent)}>
                            {credits.toFixed(1)}
                          </span>
                        </div>
                      )}

                      <div className="p-2">
                        <button
                          onClick={() => { setShowUserMenu(false); router.push("/library"); }}
                          className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all", t.dropdownItem)}
                        >
                          <BookOpen className="w-4 h-4" />
                          Library
                        </button>
                        <button
                          onClick={() => { setShowUserMenu(false); router.push("/credits"); }}
                          className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all", t.dropdownItem)}
                        >
                          <Zap className="w-4 h-4" />
                          Credits
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

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-4 md:px-6 pt-24 pb-20 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl flex flex-col gap-8"
        >
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className={cn("inline-flex items-center gap-2 text-xs font-semibold mb-3", t.accent)}>
                <Zap className="w-3.5 h-3.5" />
                Learning Dashboard
              </span>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
              </h1>
              <p className={cn("text-sm mt-1", t.subtext)}>Ready to continue learning?</p>
            </div>
             
            <button 
              onClick={() => setIsAddingSession(!isAddingSession)}
              className={cn(
                "flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all",
                isAddingSession 
                  ? cn(t.card, t.border, "border")
                  : "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02]"
              )}
            >
              {isAddingSession ? (
                <><X className="w-4 h-4" />Cancel</>
              ) : (
                <><Plus className="w-4 h-4" />New Session</>
              )}
            </button>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm text-center"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* New Session Builder */}
          <AnimatePresence>
            {isAddingSession && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className={cn("p-6 rounded-2xl border shadow-xl", t.card, t.border)}>
                  {/* Tabs */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-semibold">Create New Session</h2>
                    <div className={cn("p-1 rounded-lg flex gap-1", t.innerCard)}>
                      {[
                        { id: "upload", icon: Upload, label: "Upload" },
                        { id: "paste", icon: Type, label: "Paste" }
                      ].map((tab) => (
                        <button 
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            activeTab === tab.id 
                              ? "bg-indigo-500 text-white shadow-lg" 
                              : t.subtext
                          )}
                        >
                          <tab.icon className="w-4 h-4" />
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    {/* Upload/Paste Area */}
                    <div className="lg:col-span-2">
                      <AnimatePresence mode="wait">
                        {activeTab === "upload" ? (
                          <motion.div 
                            key="upload"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={cn(
                              "relative h-48 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-6",
                              dragActive 
                                ? "border-indigo-500 bg-indigo-500/5" 
                                : cn(t.border, "hover:border-indigo-500/30")
                            )}
                            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFileChange(e); }}
                          >
                            {file || driveFileId ? (
                              <div className="flex items-center gap-4 w-full">
                                <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center shrink-0", t.innerCard)}>
                                  <FileText className="w-6 h-6 text-indigo-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold truncate">{file?.name || driveFileName}</h3>
                                  <p className={cn("text-xs", t.subtext)}>
                                    {file ? (file.size / 1024 / 1024).toFixed(2) + " MB" : "Google Drive"} 
                                    {selectedPages.length > 0 && ` · ${selectedPages.length} pages`}
                                  </p>
                                  <div className="flex gap-2 mt-3">
                                    <button onClick={(e) => { e.stopPropagation(); setShowSelector(true); }} className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-medium hover:bg-indigo-600 transition-colors">
                                      Configure
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setFile(null); setDriveFileId(null); setDriveFileName(null); }} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors">
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <Upload className={cn("w-6 h-6 mb-2", t.subtext)} />
                                <p className="font-medium text-sm mb-1">Drop your file here</p>
                                <p className={cn("text-xs mb-3", t.subtext)}>PDF or plain text</p>
                                <button onClick={() => document.getElementById("file-input")?.click()} className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors">
                                  Browse Files
                                </button>
                              </>
                            )}
                            <input id="file-input" type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" disabled={!!file || !!driveFileId} />
                          </motion.div>
                        ) : (
                          <motion.div key="paste" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn("h-48 rounded-xl border overflow-hidden", t.border)}>
                            <textarea 
                              value={text} 
                              onChange={(e) => setText(e.target.value)} 
                              placeholder="Paste your text here..." 
                              className={cn("w-full h-full bg-transparent p-4 text-sm resize-none focus:outline-none", t.text, "placeholder:" + t.subtext)} 
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Settings */}
                    <div className="flex flex-col gap-3">
                      {/* Google Drive */}
                      <div className="relative group">
                        <button 
                          onClick={handleGoogleDriveSync}
                          disabled={isDriveLoading || isRedirecting}
                          className={cn("w-full flex items-center gap-3 p-4 rounded-xl border transition-all", t.card, t.border, "hover:border-blue-500/30")}
                        >
                          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                            {isDriveLoading || isRedirecting ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin" /> : <Cloud className="w-4 h-4 text-blue-500" />}
                          </div>
                          <div className="text-left flex-1">
                            <p className="font-medium text-sm">Google Drive</p>
                            <p className={cn("text-xs flex items-center gap-1.5", hasDriveToken ? "text-emerald-500" : t.subtext)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", hasDriveToken ? "bg-emerald-500" : "bg-white/20")} />
                              {hasDriveToken ? "Connected" : "Connect"}
                            </p>
                          </div>
                        </button>
                        {hasDriveToken && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDriveDisconnect(); }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Audio Mode Control */}
                      <div className={cn("p-4 rounded-xl border flex flex-col gap-3 transition-colors", t.innerCard, t.border)}>
                         <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">Audio Narration</p>
                            <Mic2 className={cn("w-4 h-4", audioMode === "off" ? t.subtext : "text-indigo-400")} />
                         </div>
                         <div className={cn(
                           "flex rounded-lg p-0.5 gap-0.5",
                           readingTheme === "dark"  ? "bg-black/20" :
                           readingTheme === "sepia" ? "bg-[#e8dcc8]" :
                           "bg-black/5"
                         )}>
                           {(["auto", "manual", "off"] as const).map((mode) => (
                             <button
                               key={mode}
                               onClick={() => {
                                 setAudioMode(mode);
                                 localStorage.setItem("lexis_audio_mode", mode);
                                 api.updatePreferences({ audioMode: mode }).catch(console.error);
                               }}
                               className={cn(
                                 "flex-1 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-1",
                                 audioMode === mode
                                   ? "bg-indigo-500 text-white shadow-sm"
                                   : readingTheme === "dark"  ? "text-white/25 hover:text-white/70"
                                   : readingTheme === "sepia" ? "text-[#5b4636]/35 hover:text-[#5b4636]/80"
                                   : "text-slate-400 hover:text-slate-700"
                               )}
                             >
                               {mode === "auto" && <Sparkles className="w-3 h-3" />}
                               {mode === "manual" && <Mic2 className="w-3 h-3" />}
                               {mode === "off" && <EyeOff className="w-3 h-3" />}
                               {mode}
                             </button>
                           ))}
                         </div>
                      </div>

                      {/* Language */}
                      <div className={cn("p-4 rounded-xl border", t.card, t.border)}>
                        <div className="flex items-center gap-2 mb-2">
                          <Languages className={cn("w-4 h-4", t.subtext)} />
                          <span className={cn("text-xs", t.subtext)}>Translate to</span>
                        </div>
                        <select 
                          value={targetLanguage}
                          onChange={(e) => {
                            setTargetLanguage(e.target.value);
                            api.updatePreferences({ targetLanguage: e.target.value }).catch(console.error);
                          }}
                          className={cn("w-full bg-transparent text-sm font-medium focus:outline-none cursor-pointer", t.text)}
                        >
                          {["Persian", "Spanish", "French", "German", "Chinese", "Japanese", "Russian", "Arabic", "Turkish", "Italian"].map(lang => (
                            <option key={lang} value={lang} className={readingTheme === "dark" ? "bg-slate-900" : "bg-white"}>{lang}</option>
                          ))}
                        </select>
                        <div className={cn("flex rounded-lg p-0.5 mt-2 gap-0.5", t.innerCard)}>
                          {(["google", "gemini"] as const).map((engine) => (
                            <button
                              key={engine}
                              onClick={() => {
                                setTranslationEngine(engine);
                                api.updatePreferences({ translationEngine: engine }).catch(console.error);
                              }}
                              className={cn(
                                "flex-1 py-1.5 rounded-md text-xs font-medium transition-all",
                                translationEngine === engine ? "bg-indigo-500 text-white" : t.subtext
                              )}
                            >
                              {engine === "google" ? "Fast" : "Accurate"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Process Button */}
                  <button 
                    onClick={handleProcess}
                    disabled={isProcessing || (activeTab === "paste" ? !text.trim() : (!file && !driveFileId))}
                    className={cn(
                      "w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all",
                      isProcessing || (activeTab === "paste" ? !text.trim() : (!file && !driveFileId))
                        ? cn(t.card, t.border, "border cursor-not-allowed", t.subtext)
                        : "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
                    )}
                  >
                    {isProcessing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />Processing...</>
                    ) : (
                      <><span>Start Learning</span><ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent Sessions */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <History className={cn("w-4 h-4", t.subtext)} />
                <h2 className={cn("text-sm font-medium", t.subtext)}>Recent Sessions</h2>
              </div>

              <div className="flex items-center gap-4">
                {/* Search Bar */}
                <div className="relative group flex-1 md:w-64">
                   <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors", t.subtext)} />
                   <input 
                     type="text"
                     value={searchQuery}
                     onChange={(e) => {
                       setSearchQuery(e.target.value);
                       setSessionsPage(0); // Reset to first page on search
                     }}
                     placeholder="Search sessions..."
                     className={cn(
                       "w-full h-9 pl-9 pr-4 rounded-xl border text-[11px] font-bold focus:outline-none transition-all",
                       t.innerCard, t.border, "focus:border-indigo-500/50"
                     )}
                   />
                </div>
                
                {totalSessions > SESSIONS_PER_PAGE && (
                  <div className="flex items-center gap-2">
                     <button 
                       disabled={sessionsPage === 0}
                       onClick={() => setSessionsPage(p => p - 1)}
                       className={cn("w-8 h-8 rounded-lg border flex items-center justify-center transition-all", sessionsPage === 0 ? "opacity-10 cursor-not-allowed" : "hover:bg-indigo-600 hover:text-white hover:border-indigo-500", t.innerCard, t.border)}
                     >
                        <ChevronLeft className="w-4 h-4" />
                     </button>
                     <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 whitespace-nowrap", t.subtext)}>
                        {sessionsPage + 1} / {Math.ceil(totalSessions / SESSIONS_PER_PAGE)}
                     </span>
                     <button 
                       disabled={sessionsPage >= Math.ceil(totalSessions / SESSIONS_PER_PAGE) - 1}
                       onClick={() => setSessionsPage(p => p + 1)}
                       className={cn("w-8 h-8 rounded-lg border flex items-center justify-center transition-all", sessionsPage >= Math.ceil(totalSessions / SESSIONS_PER_PAGE) - 1 ? "opacity-10 cursor-not-allowed" : "hover:bg-indigo-600 hover:text-white hover:border-indigo-500", t.innerCard, t.border)}
                     >
                        <ChevronRight className="w-4 h-4" />
                     </button>
                  </div>
                )}
              </div>
            </div>

            {recentSessions.length === 0 ? (
              <div className={cn("text-center py-12 rounded-xl border", t.card, t.border)}>
                <BookOpen className={cn("w-8 h-8 mx-auto mb-3", t.subtext)} />
                <p className={cn("text-sm", t.subtext)}>
                  {searchQuery ? "No matching sessions found." : "No sessions yet. Create your first one above!"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {recentSessions.map((session) => (
                  <motion.button
                    key={session.id}
                    onClick={() => setExpandedSessionId(session.id)}
                    whileHover={{ y: -2 }}
                    className={cn(
                      "group p-4 rounded-xl border transition-all text-left",
                      expandedSessionId === session.id 
                        ? "border-indigo-500/50 bg-indigo-500/5" 
                        : cn(t.card, t.border, "hover:border-indigo-500/30")
                    )}
                  >
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", t.innerCard)}>
                      {session.type === "upload" ? <FileText className={cn("w-4 h-4", t.subtext)} /> : <Type className={cn("w-4 h-4", t.subtext)} />}
                    </div>
                    <p className="font-medium text-sm mb-1 truncate">{session.name}</p>
                    <div className="flex items-center justify-between">
                      <div className={cn("flex items-center gap-1.5 text-[10px]", t.subtext)}>
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(session.date)}
                      </div>
                      {((session.bookmarks?.length || 0) + (session.lookups?.length || 0)) > 0 && (
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Session Details Modal */}
          <AnimatePresence>
            {expandedSessionId && expandedSession && (
              <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setExpandedSessionId(null)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                />

                <motion.div
                  initial={{ opacity: 0, y: 40, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 40, scale: 0.95 }}
                  className={cn(
                    "relative z-10 w-full md:max-w-2xl overflow-hidden rounded-[32px] border shadow-2xl flex flex-col max-h-[85vh]",
                    t.cardSolid, t.border
                  )}
                >
                  {/* Header */}
                  <div className="relative p-8 md:p-10 border-b border-white/5 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent" />
                    
                    <button
                      onClick={() => setExpandedSessionId(null)}
                      className={cn("absolute top-6 right-6 w-10 h-10 rounded-xl border flex items-center justify-center transition-all hover:scale-105 active:scale-95", t.innerCard, t.border)}
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="relative z-10 flex items-start gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-500/20 shrink-0">
                        {expandedSession.type === "upload" ? <FileText className="w-8 h-8 text-white" /> : <Type className="w-8 h-8 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center gap-3 mb-2">
                           <span className={cn("px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border", readingTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10")}>
                             {expandedSession.type === "upload" ? "Document" : "Text Sync"}
                           </span>
                           <span className={cn("text-[10px] font-bold opacity-40", t.subtext)}>
                             {new Date(expandedSession.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                           </span>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black tracking-tighter leading-tight">{expandedSession.name}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                      <div className={cn("rounded-2xl p-5 border flex flex-col justify-between", t.innerCard, t.border)}>
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-4">
                           <Bookmark className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-black tracking-tight leading-none">{expandedSession.bookmarks?.length ?? 0}</p>
                          <p className={cn("text-[9px] font-black uppercase tracking-widest mt-1", t.subtext)}>Bookmarks</p>
                        </div>
                      </div>
                      <div className={cn("rounded-2xl p-5 border flex flex-col justify-between", t.innerCard, t.border)}>
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center mb-4">
                           <Search className="w-4 h-4 text-violet-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-black tracking-tight leading-none">{expandedSession.lookups?.length ?? 0}</p>
                          <p className={cn("text-[9px] font-black uppercase tracking-widest mt-1", t.subtext)}>Vocabulary</p>
                        </div>
                      </div>
                      <div className={cn("rounded-2xl p-5 border flex flex-col justify-between", t.innerCard, t.border)}>
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                           <Layers className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-black tracking-tight leading-none">
                            {expandedSession.read_pages || 0} 
                            <span className="text-sm opacity-30 mx-1">/</span> 
                            {expandedSession.total_pages || 1}
                          </p>
                          <p className={cn("text-[9px] font-black uppercase tracking-widest mt-1", t.subtext)}>Pages Sync</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-10">
                       {/* Extracted Text Preview */}
                       <div>
                          <p className={cn("text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-40", t.subtext)}>Material Preview</p>
                          <div className={cn("p-6 rounded-2xl border text-sm font-medium leading-relaxed italic relative", t.innerCard, t.border)}>
                             <div className="absolute top-0 right-0 p-4">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-500/30" />
                             </div>
                             {expandedSession.extracted ? (
                               <p className="line-clamp-4">{expandedSession.extracted}</p>
                             ) : (
                               <p className="opacity-30">Full sync material available inside lesson environment...</p>
                             )}
                          </div>
                       </div>

                       {expandedSession.lookups && expandedSession.lookups.length > 0 && (
                        <div className="space-y-4">
                          <p className={cn("text-[10px] font-black uppercase tracking-[0.2em] opacity-40", t.subtext)}>Active Vocabulary</p>
                          <div className="flex flex-wrap gap-2">
                            {expandedSession.lookups.map((l, i) => (
                              <button
                                key={i}
                                onClick={() => setSelectedWord(l.word)}
                                className={cn("px-4 py-2 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95", t.card, t.border, "hover:border-indigo-500/50")}
                              >
                                {l.word}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className={cn("p-8 md:p-10 border-t flex items-center justify-between", t.border)}>
                    <div className="hidden sm:block">
                       <p className={cn("text-[10px] font-black uppercase tracking-widest", t.subtext)}>Session ID</p>
                       <p className="text-[10px] font-mono opacity-20 truncate max-w-[120px]">{expandedSession.id}</p>
                    </div>
                    <button
                      onClick={() => router.push(`/lesson/${expandedSessionId}`)}
                      className="flex-1 sm:flex-none h-14 px-10 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-indigo-600/20"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Enter Learning Lab
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      <DictionaryModal word={selectedWord} onClose={() => setSelectedWord(null)} />

      {/* Footer */}
      <footer className={cn("h-14 border-t px-6 flex items-center justify-between shrink-0", t.card, t.border)}>
        <p className={cn("text-xs", t.subtext)}>© 2026 Lexis</p>
        <div className="flex gap-2">
          <div className={cn("w-1.5 h-1.5 rounded-full", t.divider)} />
          <div className={cn("w-1.5 h-1.5 rounded-full", t.divider)} />
          <div className={cn("w-1.5 h-1.5 rounded-full", t.divider)} />
        </div>
      </footer>
    </div>
  );
}
