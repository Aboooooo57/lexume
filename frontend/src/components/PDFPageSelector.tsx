"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2, Files, Grid, Keyboard, Maximize2, ArrowLeft, ArrowRight, Trash2, Layers, Sparkles, FileText } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { cn } from "@/lib/utils";

// Use local worker for better reliability in Next.js
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.js";

interface PDFPageSelectorProps {
  file: File | null;
  isOpen: boolean;
  selectedPages: number[];
  onSelectionChange: (pages: number[]) => void;
  onClose: () => void;
  onProcess?: () => void;
  onReady?: () => void;
}

export default function PDFPageSelector({ file, isOpen, selectedPages, onSelectionChange, onClose, onProcess, onReady }: PDFPageSelectorProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [zoomPage, setZoomPage] = useState<number | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  
  const lastProcessedFileRef = useRef<File | null>(null);

  useEffect(() => {
    if (!file) {
      setNumPages(0);
      setThumbnails([]);
      setPdfDoc(null);
      lastProcessedFileRef.current = null;
      return;
    }

    if (lastProcessedFileRef.current === file) {
      onReady?.();
      return;
    }

    const loadPDF = async () => {
      setLoading(true);
      setThumbnails([]);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);

        const thumbArray: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          try {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.2 });
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
              await page.render({ canvasContext: context, viewport }).promise;
              thumbArray.push(canvas.toDataURL());
            }
          } catch (e) {
            thumbArray.push("");
          }
        }
        setThumbnails(thumbArray);
        lastProcessedFileRef.current = file;
      } catch (err) {
        console.error("PDF load error:", err);
      } finally {
        setLoading(false);
        onReady?.();
      }
    };

    loadPDF();
  }, [file]);

  useEffect(() => {
    if (zoomPage && pdfDoc) {
      const renderLarge = async () => {
        const page = await pdfDoc.getPage(zoomPage);
        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        if (context) {
          await page.render({ canvasContext: context, viewport }).promise;
          setZoomImage(canvas.toDataURL());
        }
      };
      renderLarge();
    } else {
      setZoomImage(null);
    }
  }, [zoomPage, pdfDoc]);

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

  // Only update manual input from prop if not focused
  useEffect(() => {
    if (!isInputFocused) {
      setManualInput(formatRange(selectedPages));
    }
  }, [selectedPages, isInputFocused]);

  const handleManualInputChange = (val: string) => {
    setManualInput(val);
    const result = new Set<number>();
    const parts = val.split(/[, ]+/);

    for (const part of parts) {
      if (part.includes("-")) {
        const [startStr, endStr] = part.split("-");
        const start = parseInt(startStr.trim());
        const end = parseInt(endStr.trim());
        if (!isNaN(start) && !isNaN(end)) {
          const s = Math.min(start, end);
          const e = Math.max(start, end);
          for (let i = s; i <= e; i++) {
            if (i > 0 && i <= numPages) result.add(i);
          }
        }
      } else {
        const num = parseInt(part.trim());
        if (!isNaN(num) && num > 0 && num <= numPages) {
          result.add(num);
        }
      }
    }
    
    const uniqueParsed = Array.from(result).sort((a, b) => a - b);
    // Don't call onSelectionChange if nothing has actually changed in the parsed set
    // to avoid unnecessary re-renders of the parent
    const currentSorted = [...selectedPages].sort((a, b) => a - b);
    if (JSON.stringify(uniqueParsed) !== JSON.stringify(currentSorted)) {
      onSelectionChange(uniqueParsed);
    }
  };

  const handleStartProcess = () => {
    if (onProcess) {
      onProcess();
    } else {
      onClose();
    }
  };

  const togglePage = (pageNumber: number) => {
    if (selectedPages.includes(pageNumber)) {
      onSelectionChange(selectedPages.filter(p => p !== pageNumber));
    } else {
      onSelectionChange([...selectedPages, pageNumber].sort((a, b) => a - b));
    }
  };

  const selectAll = () => {
    const all = Array.from({ length: numPages }, (_, i) => i + 1);
    onSelectionChange(all);
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const scrollToPage = (pageNum: number) => {
    const el = document.getElementById(`page-grid-${pageNum}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && file && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#030712]/95 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="relative w-full max-w-5xl h-[95vh] sm:h-[85vh] bg-[#0a0f1d]/80 border border-white/10 rounded-[24px] sm:rounded-[32px] shadow-[0_40px_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col backdrop-blur-3xl"
          >
            {/* Header: Fixed for mobile */}
            <div className="h-14 sm:h-16 px-4 sm:px-8 flex items-center justify-between border-b border-white/5 bg-white/[0.01] shrink-0">
               <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg">
                     <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <div className="hidden xs:block">
                     <h3 className="font-black text-sm sm:text-lg tracking-tighter leading-none mb-0.5 uppercase">Builder</h3>
                     <p className="hidden sm:block text-[8px] text-white/20 font-black uppercase tracking-[0.3em] leading-none">Curate selection</p>
                  </div>
               </div>
               
               <div className="flex items-center gap-2 sm:gap-4">
                  <div className="flex bg-white/5 rounded-lg sm:rounded-xl p-0.5 border border-white/5 backdrop-blur-xl">
                     <button 
                       onClick={selectAll} 
                       className="px-2.5 sm:px-4 py-1.5 text-[8px] sm:text-[9px] font-black uppercase tracking-widest hover:bg-white/5 rounded-md sm:rounded-lg transition-all"
                     >
                       <span className="sm:hidden">All</span>
                       <span className="hidden sm:inline">Select All</span>
                     </button>
                     <div className="w-px h-3 sm:h-4 bg-white/10 self-center" />
                     <button 
                       onClick={clearAll} 
                       className="px-2.5 sm:px-4 py-1.5 text-[8px] sm:text-[9px] font-black uppercase tracking-widest hover:bg-white/5 rounded-md sm:rounded-lg transition-all text-white/20"
                     >
                       Clear
                     </button>
                  </div>
                  <button 
                    onClick={onClose} 
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-500/10 group transition-all"
                  >
                     <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/20 group-hover:text-red-500 transition-colors" />
                  </button>
               </div>
            </div>

            {/* Main Area: Tighter Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar relative bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.1))]">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4 opacity-20" />
                  <span className="font-black tracking-[0.3em] uppercase text-[8px] text-white/20">Loading</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
                  {Array.from({ length: numPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    const isSelected = selectedPages.includes(pageNum);
                    return (
                      <motion.div
                        key={`page-${pageNum}`}
                        id={`page-grid-${pageNum}`}
                        onClick={() => togglePage(pageNum)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={cn(
                          "relative aspect-[3/4] rounded-xl sm:rounded-2xl border-2 transition-all duration-300 overflow-hidden cursor-pointer group shadow-lg",
                          isSelected 
                            ? "border-indigo-600 shadow-indigo-500/20 z-10" 
                            : "border-white/5 bg-white/[0.01] hover:border-white/10 sm:hover:scale-[1.03]"
                        )}
                      >
                        {thumbnails[idx] ? (
                          <img src={thumbnails[idx]} className={cn("w-full h-full object-cover transition-all duration-500", isSelected ? "opacity-100" : "opacity-30 group-hover:opacity-100")} alt="" />
                        ) : (
                          <div className="w-full h-full bg-white/[0.02] flex items-center justify-center">
                             <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white/5" />
                          </div>
                        )}
                        
                        <div className="absolute top-1.5 sm:top-2 right-1.5 sm:top-2">
                           <AnimatePresence>
                             {isSelected && (
                               <motion.div 
                                 initial={{ scale: 0 }}
                                 animate={{ scale: 1 }}
                                 className="w-4 h-4 sm:w-5 sm:h-5 rounded sm:rounded-lg bg-indigo-600 flex items-center justify-center shadow-xl"
                               >
                                  <Check className="w-2.5 h-2.5 sm:w-3 h-3 text-white" />
                               </motion.div>
                             )}
                           </AnimatePresence>
                        </div>

                        <button 
                          onClick={(e) => { e.stopPropagation(); setZoomPage(pageNum); }}
                          className="absolute bottom-1.5 sm:bottom-2 right-1.5 sm:right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-black/60 backdrop-blur-md border border-white/10 sm:opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-600 flex items-center justify-center"
                        >
                           <Maximize2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                        </button>

                        <div className={cn(
                          "absolute bottom-1.5 sm:bottom-2 left-1.5 sm:left-2 text-[7px] sm:text-[8px] font-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg backdrop-blur-md border transition-all duration-300",
                          isSelected ? "bg-indigo-600 border-indigo-500" : "bg-black/40 border-white/5 text-white/30"
                        )}>
                           {pageNum}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Controls: Fixed for mobile */}
            <div className="p-3 sm:p-4 border-t border-white/5 bg-white/[0.01] flex flex-col items-center gap-3 sm:gap-4 shrink-0 relative backdrop-blur-2xl">
               
               {selectedPages.length > 0 && (
                 <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="flex gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/5 max-w-full overflow-hidden"
                 >
                    <div className="px-2 sm:px-3 flex items-center gap-1.5 sm:gap-2 border-r border-white/5 mr-1 shrink-0">
                       <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-400" />
                       <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest">{selectedPages.length} <span className="hidden sm:inline">Selected</span></span>
                    </div>
                    <div className="flex gap-1.5 sm:gap-2 overflow-x-auto custom-scrollbar scrollbar-hide pr-2">
                       {formatRange(selectedPages).split(", ").map(range => (
                          <div 
                            key={`range-${range}`} 
                            className="px-2 sm:px-3 h-6 sm:h-8 rounded sm:rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[7px] sm:text-[8px] font-black text-indigo-400 shrink-0"
                          >
                             {range}
                          </div>
                       ))}
                    </div>
                 </motion.div>
               )}

               <div className="flex items-center gap-2 sm:gap-4 w-full max-w-3xl">
                  <div className="relative flex-1 group hidden xs:block">
                     <Keyboard className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-2.5 sm:w-3 h-2.5 sm:h-3 text-white/10 group-focus-within:text-indigo-400 transition-colors" />
                     <input 
                       type="text"
                       value={manualInput}
                       onChange={(e) => handleManualInputChange(e.target.value)}
                       onFocus={() => setIsInputFocused(true)}
                       onBlur={() => setIsInputFocused(false)}
                       placeholder="Select pages..."
                       className="w-full h-9 sm:h-11 bg-white/[0.02] border border-white/10 rounded-xl sm:rounded-2xl pl-8 sm:pl-10 pr-4 sm:pr-6 text-[10px] sm:text-xs font-bold focus:outline-none focus:border-indigo-600 transition-all placeholder:text-white/5"
                     />
                  </div>
                  <button 
                    onClick={handleStartProcess}
                    className="flex-1 xs:flex-none h-9 sm:h-11 px-4 sm:px-8 rounded-xl sm:rounded-2xl bg-indigo-600 text-white font-black text-[9px] sm:text-xs uppercase tracking-widest hover:bg-indigo-500 sm:hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg sm:shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 sm:gap-3"
                  >
                    <span>Start Lesson</span>
                    <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
               </div>
            </div>
          </motion.div>

          {/* Full Screen Inspector: Fixed for mobile */}
          <AnimatePresence>
            {zoomPage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-8"
              >
                <div className="absolute inset-0 bg-[#030712]/98 backdrop-blur-2xl" onClick={() => setZoomPage(null)} />
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative w-full max-w-4xl h-full flex flex-col items-center justify-center gap-4 sm:gap-8"
                >
                  <div className="fixed top-4 sm:top-8 right-4 sm:right-8">
                     <button 
                       onClick={() => setZoomPage(null)}
                       className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-500/10 group transition-all"
                     >
                        <X className="w-4 h-4 sm:w-5 sm:h-5 text-white/20 group-hover:text-red-500" />
                     </button>
                  </div>

                  <div className="flex-1 w-full relative bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                    {zoomImage ? (
                      <img src={zoomImage} className="w-full h-full object-contain" alt="Large preview" />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-black/5">
                         <Loader2 className="w-8 h-8 animate-spin" />
                      </div>
                    )}

                    <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl bg-[#0a0f1d]/90 backdrop-blur-xl border border-white/10 shadow-2xl">
                       <button 
                         disabled={zoomPage <= 1}
                         onClick={() => setZoomPage(zoomPage - 1)}
                         className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl hover:bg-white/5 transition-all disabled:opacity-5"
                       >
                         <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white/40 hover:text-white" />
                       </button>
                       <div className="h-5 sm:h-6 w-px bg-white/10" />
                       <button 
                         onClick={() => togglePage(zoomPage)}
                         className={cn(
                           "px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all",
                           selectedPages.includes(zoomPage) 
                            ? "bg-indigo-600 text-white" 
                            : "bg-white text-black hover:scale-105"
                         )}
                       >
                         {selectedPages.includes(zoomPage) ? "Deselect" : "Select"}
                       </button>
                       <div className="h-5 sm:h-6 w-px bg-white/10" />
                       <button 
                         disabled={zoomPage >= numPages}
                         onClick={() => setZoomPage(zoomPage + 1)}
                         className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl hover:bg-white/5 transition-all disabled:opacity-5"
                       >
                         <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-white/40 hover:text-white" />
                       </button>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-2xl sm:text-4xl font-black tracking-tighter text-white mb-1 sm:mb-2 uppercase">Page {zoomPage}</p>
                    <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                       <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-400" />
                       <span className="text-indigo-400 font-black uppercase tracking-[0.3em] text-[7px] sm:text-[8px]">Resolution Enhanced</span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
}
