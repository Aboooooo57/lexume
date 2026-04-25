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
  BookOpen,
  ExternalLink,
  ChevronDown,
  Layers,
  ChevronLeft,
  ArrowLeft,
  Settings2,
  Trophy,
  Eye,
  EyeOff,
  Folder
} from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { api, apiFetch } from "@/api";
import DictionaryModal from "@/components/DictionaryModal";

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
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [readingTheme, setReadingTheme] = useState<"dark" | "light" | "sepia">("dark");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [isPdfPreparing, setIsPdfPreparing] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [showDriveExplorer, setShowDriveExplorer] = useState(false);
  const [hasDriveToken, setHasDriveToken] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState("root");
  const [folderHistory, setFolderHistory] = useState<{id: string, name: string}[]>([]);
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
    console.log("Fetching Drive files for folder:", folderId);
    try {
      const files = await apiFetch<any[]>(`/api/library/drive/files?folder_id=${folderId}`);
      console.log("Files received:", files.length);
      setDriveFiles(files);
      setShowDriveExplorer(true);
      setHasDriveToken(true);
      return true;
    } catch (err: any) {
      console.error("Drive fetch error:", err);
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
      // 1. Download the file from our backend fetch proxy
      const data = await apiFetch<any>(`/api/library/drive/fetch/${fileId}`);
      
      // 2. Convert base64 to Blob then to a File object
      const binaryString = window.atob(data.content_base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.mimeType || mimeType });
      const driveFile = new File([blob], data.filename || fileName, { type: data.mimeType || mimeType });
      
      // 3. Set it as the active file
      setFile(driveFile);
      setDriveFileId(null); // Clear ID since we now have the physical file
      setDriveFileName(null);
      setText("");
      setActiveTab("upload");
      setSelectedPages([]);
      
      // 4. For PDFs: wait for thumbnails before opening selector
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
      // If we know we don't have a token, go straight to OAuth without 
      // making a failing API call.
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
      const sessions = await api.getLibrarySessions();
      setRecentSessions(sessions);
    } catch (err: any) {
      console.error("Failed to fetch sessions", err);
      if (err.status === 401) {
        router.push("/login");
      }
    }
  };

  useEffect(() => {
    checkAuth();
    fetchSessions();
    const params = new URLSearchParams(window.location.search);
    if (params.get("drive_success") === "true") {
      setIsRedirecting(false);
      setIsAddingSession(true);
      fetchDriveFiles();
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }


    const savedTheme = localStorage.getItem("lexis_theme") as "dark" | "light" | "sepia" | null;
    if (savedTheme) setReadingTheme(savedTheme);
    setIsLoaded(true);

    api.getPreferences()
      .then(data => {
        if (data.theme) setReadingTheme(data.theme as any);
        if (data.hasDriveToken) setHasDriveToken(true);
      })
      .catch(console.error);
  }, []);

  const themes = {
    dark: {
      bg: "bg-[#030712]",
      card: "bg-white/[0.02]",
      cardHover: "hover:bg-white/[0.05]",
      border: "border-white/5",
      text: "text-white",
      subtext: "text-white/30",
      header: "bg-[#030712]/40",
      accent: "text-indigo-400",
      innerCard: "bg-white/[0.03]",
      settings: "bg-[#0a0f1d]"
    },
    light: {
      bg: "bg-[#f8fafc]",
      card: "bg-white",
      cardHover: "hover:bg-slate-50",
      border: "border-slate-200",
      text: "text-slate-900",
      subtext: "text-slate-500",
      header: "bg-white/70",
      accent: "text-indigo-600",
      innerCard: "bg-slate-50",
      settings: "bg-white"
    },
    sepia: {
      bg: "bg-[#f4ecd8]",
      card: "bg-[#fdf6e3]",
      cardHover: "hover:bg-[#efe5d0]",
      border: "border-[#d3c6aa]",
      text: "text-[#5b4636]",
      subtext: "text-[#5b4636]/60",
      header: "bg-[#f4ecd8]/70",
      accent: "text-[#859900]",
      innerCard: "bg-[#f4ecd8]/50",
      settings: "bg-[#f4ecd8]"
    }
  };

  const t = themes[readingTheme];

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
    
    try {
      setError(null);
      const data = await api.extractText(formData);
      router.push(`/result/${data.session_id}`);
    } catch (err: any) {
      console.error(err);
      setError("Failed to process document. Please check your API keys and try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const expandedSession = recentSessions.find(s => s.id === expandedSessionId);

  return (
    <div className={cn("min-h-screen flex flex-col selection:bg-indigo-500/30 overflow-hidden transition-colors duration-700", t.bg, t.text)}>
      <AnimatePresence>
        {(isRedirecting || isDriveLoading || isPdfPreparing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center gap-6"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse" />
              <Loader2 className="w-16 h-16 animate-spin text-indigo-500 relative z-10" />
            </div>
            <div className="text-center">
              {isRedirecting && (
                <>
                  <h3 className="text-xl font-black uppercase tracking-tighter mb-2 italic">Securing Connection</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Redirecting to Google Secure Auth...</p>
                </>
              )}
              {isDriveLoading && !isRedirecting && (
                <>
                  <h3 className="text-xl font-black uppercase tracking-tighter mb-2 italic">Importing from Drive</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Downloading your file...</p>
                </>
              )}
              {isPdfPreparing && !isDriveLoading && !isRedirecting && (
                <>
                  <h3 className="text-xl font-black uppercase tracking-tighter mb-2 italic">Preparing Pages</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Generating page previews...</p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 z-0 pointer-events-none">
        {readingTheme === "dark" && (
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        )}
      </div>

      <PDFPageSelector
        file={file}
        isOpen={showSelector}
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
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-[32px] border shadow-2xl relative z-10 flex flex-col transition-colors duration-700",
                readingTheme === "dark" ? "bg-[#0a0f1d] border-white/10" : "bg-white border-slate-200"
              )}
            >
              <div className={cn("p-8 border-b flex items-center justify-between", t.border)}>
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#4285F4]/10 flex items-center justify-center border border-[#4285F4]/20">
                       <Cloud className="w-6 h-6 text-[#4285F4]" />
                    </div>
                    <div>
                       <h3 className="text-xl font-black tracking-tight uppercase">Drive Explorer</h3>
                       <p className={cn("text-[9px] font-black uppercase tracking-widest", t.subtext)}>
                         {folderHistory.length > 0 ? "Browsing Folder" : "Root Directory"}
                       </p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    {folderHistory.length > 0 && (
                      <button 
                        onClick={handleDriveBack}
                        className={cn("p-2 rounded-xl bg-white/5 border flex items-center gap-2 px-4 transition-all hover:bg-white/10", t.border)}
                      >
                         <ArrowLeft className="w-4 h-4" />
                         <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
                      </button>
                    )}
                    <button 
                      onClick={() => setShowDriveExplorer(false)}
                      className={cn("p-2 rounded-full hover:bg-black/5 transition-colors", t.subtext)}
                    >
                       <X className="w-6 h-6" />
                    </button>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {isDriveLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4">
                     <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                     <p className={cn("text-[10px] font-black uppercase tracking-[0.2em]", t.subtext)}>Connecting to Google...</p>
                  </div>
                ) : driveFiles.length === 0 ? (
                  <div className="py-20 text-center text-left">
                    <p className={cn("text-sm font-medium", t.subtext)}>Empty directory.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {driveFiles.map((df) => {
                      const isFolder = df.mimeType === 'application/vnd.google-apps.folder';
                      return (
                        <button
                          key={df.id}
                          onClick={() => isFolder ? handleFolderClick(df.id, df.name) : handleDriveFileSelect(df.id, df.name, df.mimeType)}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group",
                            t.card, t.border, t.cardHover
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl border flex items-center justify-center transition-colors shadow-inner", 
                            t.innerCard, t.border, 
                            isFolder ? "group-hover:bg-amber-500/10" : "group-hover:bg-indigo-500/10"
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
                             <p className="font-bold text-sm truncate">{df.name}</p>
                             <p className={cn("text-[8px] font-black uppercase tracking-widest", t.subtext)}>
                               {isFolder ? "Folder" : `${(parseInt(df.size) / 1024 / 1024).toFixed(1)} MB`} • Modified {new Date(df.modifiedTime).toLocaleDateString()}
                             </p>
                          </div>
                          <ChevronRight className={cn(
                            "w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all",
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

      <header className={cn("h-16 md:h-20 px-6 md:px-12 flex items-center justify-between backdrop-blur-3xl fixed top-0 w-full z-40 border-b transition-all duration-700", t.header, t.border)}>
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => router.push("/")}>
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.3)] group-hover:scale-110 transition-all">
            <Mic2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <span className="text-xl md:text-2xl font-black tracking-tighter uppercase italic">Lexis</span>
        </div>
        
        <div className="flex items-center gap-4 md:gap-6">
           <div className={cn("flex rounded-xl p-1 gap-1 border transition-colors", t.innerCard, t.border)}>
             {(["dark", "light", "sepia"] as const).map((theme) => (
               <button
                 key={theme}
                 onClick={() => {
                   setReadingTheme(theme);
                   localStorage.setItem("lexis_theme", theme);
                   api.updatePreferences({ theme }).catch(console.error);
                 }}
                 className={cn(
                   "w-8 h-8 rounded-lg transition-all flex items-center justify-center",
                   readingTheme === theme ? "bg-indigo-600 text-white shadow-lg" : (readingTheme === "dark" ? "text-white/20 hover:text-white" : "text-slate-400 hover:text-slate-900")
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
           {user && (
             <div className={cn("hidden lg:flex items-center gap-3 pr-4 border-r transition-colors", t.border)}>
                <div className="text-right">
                  <p className={cn("text-[10px] font-black uppercase tracking-widest transition-colors", t.text)}>{user.name}</p>
                </div>
                {user.picture ? (                  <img src={user.picture} alt="" className={cn("w-8 h-8 rounded-full border transition-colors", t.border)} />
                ) : (
                  <div className={cn("w-8 h-8 rounded-full border flex items-center justify-center text-[10px] font-black transition-colors", t.innerCard, t.border, t.text)}>
                    {user.name?.[0] || "U"}
                  </div>
                )}
             </div>
           )}
           <button 
             onClick={async () => {
               await api.logout();
               router.push("/");
             }}
             className={cn("hidden sm:flex items-center gap-2 h-9 md:h-10 px-4 md:px-5 rounded-full border transition-all group", t.innerCard, t.border, "hover:bg-red-500/10 hover:border-red-500/20")}
           >
              <X className={cn("w-3.5 h-3.5 md:w-4 md:h-4 transition-colors", readingTheme === "dark" ? "text-white/30 group-hover:text-red-400" : "text-slate-400 group-hover:text-red-500")} />
              <span className={cn("text-[9px] font-black uppercase tracking-widest transition-colors", readingTheme === "dark" ? "text-white/30 group-hover:text-white" : "text-slate-400 group-hover:text-slate-900")}>Sign Out</span>
           </button>
           <button 
             onClick={() => router.push("/library")}
             className={cn("hidden sm:flex items-center gap-2 h-9 md:h-10 px-4 md:px-5 rounded-full border transition-all group", t.innerCard, t.border, "hover:bg-indigo-500/10 hover:border-indigo-500/20")}
           >
              <BookOpen className={cn("w-3.5 h-3.5 md:w-4 md:h-4 transition-colors", readingTheme === "dark" ? "text-white/30 group-hover:text-indigo-400" : "text-slate-400 group-hover:text-indigo-600")} />
              <span className={cn("text-[9px] font-black uppercase tracking-widest transition-colors", readingTheme === "dark" ? "text-white/30 group-hover:text-white" : "text-slate-400 group-hover:text-slate-900")}>Personal Archive</span>
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
                <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-[0.3em] mb-4", t.innerCard, t.border, t.accent)}>
                   <Trophy className="w-3 h-3" />
                   Learning Laboratory
                </div>
                <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.8] mb-4">LEARNING<br/><span className={readingTheme === "dark" ? "text-white/20" : "text-black/5"}>LIBRARY</span></h2>
                <p className={cn("text-sm font-medium", t.subtext)}>Your curated universe of knowledge.</p>
             </div>
             
             <button 
               onClick={() => setIsAddingSession(!isAddingSession)}
               className={cn(
                 "group flex items-center justify-center gap-4 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-2xl",
                 isAddingSession 
                  ? (readingTheme === "dark" ? "bg-white text-black" : "bg-slate-900 text-white")
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

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400 text-xs font-bold text-center"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Builder Section: Compact & Elegant */}
          <AnimatePresence>
            {isAddingSession && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="overflow-hidden mb-12"
              >
                <div className={cn(
                  "p-6 md:p-8 rounded-[32px] border shadow-2xl transition-all duration-700 relative overflow-hidden",
                  t.border, readingTheme === 'dark' ? "bg-white/[0.03]" : "bg-white", "backdrop-blur-3xl"
                )}>
                   <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                      <div className="flex items-center gap-4">
                         <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center shadow-lg", t.innerCard, t.border)}>
                            <Plus className={cn("w-5 h-5", t.accent)} />
                         </div>
                         <div>
                            <h3 className="text-xl font-black tracking-tight uppercase italic text-left">Lesson Lab</h3>
                            <p className={cn("text-[9px] font-black uppercase tracking-widest opacity-40 text-left")}>Initialise new knowledge stream</p>
                         </div>
                      </div>
                      
                      <div className={cn("p-1 rounded-xl border flex gap-1", t.innerCard, t.border)}>
                         {[
                           { id: "upload", icon: Upload, label: "Document" },
                           { id: "paste", icon: Type, label: "Text" }
                         ].map((tab) => (
                           <button 
                             key={tab.id}
                             onClick={() => setActiveTab(tab.id as any)}
                             className={cn(
                               "flex items-center gap-2 px-5 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all",
                               activeTab === tab.id 
                                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                                  : cn(t.subtext, "hover:text-indigo-400")
                             )}
                           >
                             <tab.icon className="w-3.5 h-3.5" />
                             {tab.label}
                           </button>
                         ))}
                      </div>
                   </div>

                   <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-stretch mb-8 text-left">
                      <div className="lg:col-span-7">
                        <AnimatePresence mode="wait">
                          {activeTab === "upload" ? (
                            <motion.div 
                              key="upload"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className={cn(
                                "relative h-[220px] rounded-[24px] border-2 border-dashed transition-all flex flex-col items-center justify-center p-6 group overflow-hidden",
                                dragActive 
                                  ? "border-indigo-500 bg-indigo-500/5" 
                                  : cn(t.border, t.card, "hover:border-indigo-500/30")
                              )}
                              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                              onDragLeave={() => setDragActive(false)}
                              onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFileChange(e); }}
                            >
                               {readingTheme === 'dark' && (
                                 <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
                               )}

                               {file || driveFileId ? (
                                  <div className="flex items-center gap-6 relative z-20 w-full px-4">
                                     <div className={cn("w-20 h-20 rounded-2xl border flex items-center justify-center shadow-xl shrink-0", t.innerCard, "border-indigo-500/30")}>
                                        <FileText className="w-8 h-8 text-indigo-400" />
                                     </div>
                                     <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-black mb-1 truncate tracking-tight">{file?.name || driveFileName}</h3>
                                        <p className={cn("text-[9px] font-black uppercase tracking-widest mb-4", t.subtext)}>
                                          {file ? (file.size / 1024 / 1024).toFixed(2) + " MB" : "Google Drive"} • {selectedPages.length > 0 ? `${selectedPages.length} Pages Selected` : "Full Document"}
                                        </p>
                                        <div className="flex gap-2 relative z-30">
                                           <button onClick={(e) => { e.stopPropagation(); setShowSelector(true); }} className="px-4 py-1.5 rounded-lg bg-indigo-600 text-[8px] font-black text-white uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg">Settings</button>
                                           <button onClick={(e) => { e.stopPropagation(); setFile(null); setDriveFileId(null); setDriveFileName(null); }} className="px-4 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[8px] font-black text-red-500 uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Reset</button>
                                        </div>
                                     </div>
                                  </div>
                                ) : (
                                  <>
                                    <Upload className={cn("w-6 h-6 mb-3 transition-colors", t.subtext, "group-hover:text-indigo-400")} />
                                    <p className="text-sm font-black tracking-tight mb-1 text-center">Drag & Drop Knowledge</p>
                                    <p className={cn("text-[10px] font-medium mb-4 opacity-40 text-center", t.subtext)}>PDF or Plain Text</p>
                                    <button onClick={() => document.getElementById("file-input")?.click()} className={cn("px-6 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg", readingTheme === "dark" ? "bg-white text-black" : "bg-indigo-600 text-white")}>Browse</button>
                                  </>
                                )}
                                <input id="file-input" type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" disabled={!!file || !!driveFileId} />
                            </motion.div>
                          ) : (
                            <motion.div key="paste" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn("relative h-[220px] rounded-[24px] border shadow-inner overflow-hidden p-1 transition-colors", t.card, t.border)}>
                              <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste content here..." className={cn("w-full h-full bg-transparent p-6 text-lg font-medium placeholder:opacity-10 focus:outline-none resize-none custom-scrollbar leading-relaxed", t.text)} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="lg:col-span-3 flex flex-col gap-4">
                        <div className="group relative">
                          <button 
                            onClick={handleGoogleDriveSync}
                            disabled={isDriveLoading || isRedirecting}
                            className={cn(
                              "w-full flex items-center gap-4 p-5 rounded-2xl border transition-all group shadow-lg relative overflow-hidden", 
                              t.card, t.border, t.cardHover,
                              (isDriveLoading || isRedirecting) && "opacity-50 cursor-wait"
                            )}
                          >
                             <div className="w-10 h-10 rounded-xl bg-[#4285F4]/10 flex items-center justify-center shrink-0 border border-[#4285F4]/20 group-hover:scale-110 transition-transform">
                                {isDriveLoading || isRedirecting ? <Loader2 className="w-5 h-5 text-[#4285F4] animate-spin" /> : <Cloud className="w-5 h-5 text-[#4285F4]" />}
                             </div>
                             <div className="text-left overflow-hidden flex-1">
                                <p className="font-black text-xs truncate">
                                  {isRedirecting ? "Authenticating..." : isDriveLoading ? "Connecting..." : "Cloud Sync"}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                   <div className={cn("w-1 h-1 rounded-full animate-pulse", hasDriveToken ? "bg-green-500" : "bg-white/10")} />
                                   <p className={cn("text-[8px] font-black uppercase tracking-[0.2em]", hasDriveToken ? "text-green-500/80" : t.subtext)}>
                                     {hasDriveToken ? "Connected" : "Connect Drive"}
                                   </p>
                                </div>
                             </div>
                          </button>
                          
                          {hasDriveToken && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDriveDisconnect(); }}
                              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-20 hover:bg-red-600"
                              title="Disconnect Drive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>                        
                        <div className={cn("flex-1 rounded-2xl border p-6 flex flex-col items-center justify-center text-center gap-3 opacity-30 grayscale transition-colors relative overflow-hidden", t.innerCard, t.border)}>
                           <Sparkles className={cn("w-5 h-5", t.subtext)} />
                           <p className={cn("text-[8px] font-black uppercase tracking-[0.2em] leading-tight", t.subtext)}>Smart Analytics<br/>Locked</p>
                        </div>
                      </div>
                   </div>

                   <button 
                      onClick={handleProcess}
                      disabled={isProcessing || (activeTab === "paste" ? !text.trim() : (!file && !driveFileId))}
                      className={cn(
                        "w-full h-16 rounded-2xl font-black text-xs md:text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all shadow-xl relative overflow-hidden group",
                        isProcessing 
                          ? "bg-white/5 text-white/10 cursor-not-allowed border border-white/5" 
                          : (activeTab === "paste" ? text.trim() : (file || driveFileId))
                            ? "bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-[1.01] active:scale-[0.99] shadow-[0_15px_30px_rgba(79,70,229,0.4)]"
                            : "bg-white/5 text-white/10 cursor-not-allowed border border-white/5"
                      )}
                    >
                      {isProcessing ? (
                        <><Loader2 className="w-5 h-5 animate-spin" />Initialising Journey</>
                      ) : (
                        <><span>Launch Learning Journey</span><ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
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
                   <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center", t.innerCard, t.border)}>
                      <History className={cn("w-4 h-4", t.subtext)} />
                   </div>
                   <h3 className={cn("text-[10px] font-black uppercase tracking-[0.4em]", t.subtext)}>Recently Studied</h3>
                </div>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-left">
                {recentSessions.map((session) => (
                  <motion.button
                    key={session.id}
                    onClick={() => setExpandedSessionId(session.id)}
                    whileHover={{ y: -3 }}
                    className={cn(
                      "group p-4 rounded-3xl border transition-all text-left relative overflow-hidden",
                      expandedSessionId === session.id 
                        ? "bg-indigo-600/10 border-indigo-500/50 shadow-[0_0_40px_rgba(79,70,229,0.1)]" 
                        : cn(t.card, t.border, t.cardHover)
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-xl border flex items-center justify-center mb-3 group-hover:bg-indigo-500/10 transition-colors", t.innerCard, t.border)}>
                      {session.type === "upload" ? <FileText className={cn("w-4 h-4", t.subtext)} /> : <Type className={cn("w-4 h-4", t.subtext)} />}
                    </div>
                    <p className="font-bold text-xs mb-1 truncate pr-4">{session.name}</p>
                    <div className="flex items-center justify-between mt-2">
                       <div className={cn("flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest", t.subtext)}>
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
              <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setExpandedSessionId(null)}
                  className="absolute inset-0 bg-black/70 backdrop-blur-xl"
                />

                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 40 }}
                  transition={{ type: "spring", damping: 28, stiffness: 300 }}
                  className={cn(
                    "relative z-10 w-full md:max-w-3xl md:mx-8 md:mb-0 overflow-hidden",
                    "rounded-t-[40px] md:rounded-[40px]",
                    "border shadow-[0_-20px_80px_rgba(0,0,0,0.6)]",
                    readingTheme === "dark" ? "bg-[#0c1220] border-white/8" : readingTheme === "sepia" ? "bg-[#fdf6e3] border-[#d3c6aa]" : "bg-white border-slate-100"
                  )}
                >
                  {/* Drag handle (mobile) */}
                  <div className="flex justify-center pt-4 pb-2 md:hidden">
                    <div className={cn("w-10 h-1 rounded-full", readingTheme === "dark" ? "bg-white/10" : "bg-slate-200")} />
                  </div>

                  {/* Hero banner */}
                  <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 px-7 pt-7 pb-6">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px]" />
                    <div className="absolute -top-10 -right-10 w-48 h-48 bg-violet-400/20 rounded-full blur-3xl pointer-events-none" />

                    {/* Close */}
                    <button
                      onClick={() => setExpandedSessionId(null)}
                      className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center transition-all"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>

                    <div className="relative flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shadow-xl shrink-0">
                        {expandedSession.type === "upload"
                          ? <FileText className="w-5 h-5 text-white" />
                          : <Type className="w-5 h-5 text-white" />}
                      </div>
                      <div className="min-w-0 flex-1 pr-8">
                        <p className="text-white/50 text-[9px] font-black uppercase tracking-[0.3em] mb-1">
                          {expandedSession.type === "upload" ? "Document" : "Plain Text"} · {new Date(expandedSession.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        <h4 className="text-white font-black text-lg leading-tight line-clamp-2" title={expandedSession.name}>
                          {expandedSession.name}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="px-7 pt-6 pb-6 space-y-6 max-h-[55vh] overflow-y-auto custom-scrollbar">
                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Bookmarks", value: expandedSession.bookmarks?.length ?? 0, icon: Bookmark, color: "indigo" },
                        { label: "Vocabulary", value: expandedSession.lookups?.length ?? 0, icon: Search, color: "violet" },
                      ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className={cn(
                          "rounded-2xl border p-4 flex items-center gap-4",
                          readingTheme === "dark" ? "bg-white/[0.03] border-white/6" : readingTheme === "sepia" ? "bg-[#f4ecd8]/50 border-[#d3c6aa]" : "bg-slate-50 border-slate-100"
                        )}>
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color === "indigo" ? "bg-indigo-500/10" : "bg-violet-500/10")}>
                            <Icon className={cn("w-4 h-4", color === "indigo" ? "text-indigo-400" : "text-violet-400")} />
                          </div>
                          <div>
                            <p className="text-2xl font-black leading-none">{value}</p>
                            <p className={cn("text-[9px] font-black uppercase tracking-widest mt-0.5", t.subtext)}>{label}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bookmarks */}
                    {expandedSession.bookmarks && expandedSession.bookmarks.length > 0 && (
                      <div className="space-y-3">
                        <p className={cn("text-[9px] font-black uppercase tracking-[0.35em] flex items-center gap-2", t.subtext)}>
                          <Bookmark className="w-3 h-3" /> Bookmarked Passages
                        </p>
                        <div className="space-y-2">
                          {expandedSession.bookmarks.map((b, i) => (
                            <div key={i} className={cn(
                              "flex gap-4 p-4 rounded-2xl border",
                              readingTheme === "dark" ? "bg-indigo-500/5 border-indigo-500/15" : readingTheme === "sepia" ? "bg-[#f4ecd8]/60 border-[#d3c6aa]" : "bg-indigo-50 border-indigo-100"
                            )}>
                              <div className="w-0.5 rounded-full bg-indigo-500/40 shrink-0 self-stretch" />
                              <p className={cn("text-sm leading-relaxed italic", readingTheme === "dark" ? "text-white/60" : "text-slate-600")}>
                                "{b}"
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Vocabulary */}
                    {expandedSession.lookups && expandedSession.lookups.length > 0 && (
                      <div className="space-y-3">
                        <p className={cn("text-[9px] font-black uppercase tracking-[0.35em] flex items-center gap-2", t.subtext)}>
                          <Search className="w-3 h-3" /> Vocabulary Looked Up
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {expandedSession.lookups.map((l, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedWord(l.word)}
                              className={cn(
                                "px-4 py-2 rounded-xl border text-sm font-bold transition-all hover:scale-105",
                                readingTheme === "dark"
                                  ? "bg-white/5 border-white/10 text-white/70 hover:bg-indigo-500/20 hover:border-indigo-500/40 hover:text-white"
                                  : "bg-white border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700"
                              )}
                            >
                              {l.word}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer CTA */}
                  <div className={cn("px-8 py-5 border-t flex items-center gap-3", readingTheme === "dark" ? "border-white/6" : "border-slate-100")}>
                    <button
                      onClick={() => router.push(`/result/${expandedSessionId}`)}
                      className="flex-1 h-13 py-3.5 rounded-2xl bg-indigo-600 text-white font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-indigo-600/20"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Continue Lesson
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      <DictionaryModal word={selectedWord} onClose={() => setSelectedWord(null)} />

      <footer className={cn("h-14 md:h-16 border-t px-6 md:px-12 flex items-center justify-between shrink-0 transition-colors duration-700", t.innerCard, t.border)}>
          <p className={cn("text-[9px] font-black uppercase tracking-[0.4em]", t.subtext)}>© 2026 Lexis AI</p>
          <div className="flex gap-4 md:gap-6">
             <div className={cn("w-1.5 h-1.5 rounded-full", t.border, t.innerCard)} />
             <div className={cn("w-1.5 h-1.5 rounded-full", t.border, t.innerCard)} />
             <div className={cn("w-1.5 h-1.5 rounded-full", t.border, t.innerCard)} />
          </div>
      </footer>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(128, 128, 128, 0.1); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(128, 128, 128, 0.2); }
      `}</style>
    </div>
  );
}
