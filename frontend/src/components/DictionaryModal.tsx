"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, Loader2, Book, ExternalLink, ArrowLeft, ChevronRight, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/api";

interface DictionaryModalProps {
  word: string | null;
  onClose: () => void;
}

export default function DictionaryModal({ word: initialWord, onClose }: DictionaryModalProps) {
  const [word, setWord] = useState<string | null>(initialWord);
  const [history, setHistory] = useState<string[]>([]);
  const [definition, setDefinition] = useState<any>(null);
  const [translation, setTranslation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    setWord(initialWord);
    setHistory([]);
  }, [initialWord]);

  useEffect(() => {
    if (!word) return;

    const fetchDefinition = async () => {
      setLoading(true);
      setDefinition(null);
      const cleanWord = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
      
      try {
        const data = await api.getDefinition(cleanWord);
        setDefinition(data);
      } catch (err) {
        setDefinition({ word: cleanWord, notFound: true });
      } finally {
        setLoading(false);
      }
    };

    const fetchTranslation = async () => {
      setTranslating(true);
      setTranslation(null);
      try {
        const data = await api.translate(word);
        setTranslation(data.translation);
      } catch (err) {
        console.error("Translation failed", err);
      } finally {
        setTranslating(false);
      }
    };

    fetchDefinition();
    fetchTranslation();
  }, [word]);

  const handleWordClick = (newWord: string) => {
    if (word) setHistory(prev => [...prev, word]);
    setWord(newWord);
  };

  const handleBack = () => {
    if (history.length === 0) return;
    const prevWord = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setWord(prevWord);
  };

  const handleHistoryClick = (index: number) => {
    const targetWord = history[index];
    setHistory(prev => prev.slice(0, index));
    setWord(targetWord);
  };

  const renderClickableText = (text: string) => {
    return text.split(/\s+/).map((w, i) => {
      const clean = w.replace(/[^a-zA-Z]/g, "");
      if (!clean) return w + " ";
      return (
        <span
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            handleWordClick(clean);
          }}
          className="cursor-pointer hover:text-indigo-400 hover:underline decoration-indigo-500/50 underline-offset-4 transition-colors"
        >
          {w}{" "}
        </span>
      );
    });
  };

  return (
    <AnimatePresence>
      {initialWord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#030712]/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-[#0a0f1d] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden text-white"
          >
            {/* Header */}
            <div className="border-b border-white/5 bg-white/5">
              {/* Breadcrumb Path */}
              {history.length > 0 && (
                <div className="px-8 pt-6 flex items-center gap-2 flex-wrap overflow-x-auto no-scrollbar">
                  {history.map((hWord, idx) => (
                    <div key={idx} className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleHistoryClick(idx)}
                        className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-indigo-400 transition-colors"
                      >
                        {hWord}
                      </button>
                      <ChevronRight className="w-3 h-3 text-white/10" />
                    </div>
                  ))}
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">{word}</span>
                </div>
              )}

              <div className="p-8 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {history.length > 0 && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => {
                          const firstWord = history[0];
                          setHistory([]);
                          setWord(firstWord);
                        }}
                        className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest text-indigo-400 transition-all mr-1"
                      >
                        Reset
                      </button>
                      <button 
                        onClick={handleBack}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors mr-1"
                      >
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                      </button>
                    </div>
                  )}
                  <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <Book className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="font-bold text-xl">Word Insight</h3>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/40 hover:text-white" />
                </button>
              </div>

              {/* Translation Section */}
              <div className="px-8 pb-8">
                <div className="p-6 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400">
                        <Languages className="w-3.5 h-3.5" /> Translation
                     </div>
                     {translating && <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />}
                  </div>
                  <p className="text-2xl font-black tracking-tight text-white">
                    {translation || (translating ? "Translating..." : "...")}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-white/30">
                  <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
                  <p className="font-medium">Consulting linguistic records...</p>
                </div>
              ) : definition?.notFound ? (
                <div className="text-center py-12">
                  <p className="text-white/40 italic text-lg">No dictionary entry found for "{word}"</p>
                </div>
              ) : definition ? (
                <div className="space-y-8">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-4xl font-bold tracking-tight">{definition.word}</h4>
                      <button className="p-3 rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:scale-110 active:scale-95 transition-all">
                        <Volume2 className="w-6 h-6" />
                      </button>
                    </div>
                    <p className="text-indigo-400 font-bold text-lg tracking-wide">{definition.phonetic}</p>
                  </div>

                  <div className="space-y-6">
                    {definition.meanings?.map((m: any, i: number) => (
                      <div key={`meaning-${i}-${m.partOfSpeech}`} className="space-y-4">
                        <div className="inline-block px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                          {m.partOfSpeech}
                        </div>
                        {m.definitions.slice(0, 3).map((d: any, di: number) => (
                          <div key={`def-${i}-${di}`} className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-3 group hover:bg-indigo-500/5 transition-colors">
                            <p className="text-white/90 leading-relaxed font-medium text-lg">
                              {renderClickableText(d.definition)}
                            </p>
                            {d.example && (
                              <p className="text-base text-white/40 italic pl-4 border-l-2 border-indigo-500/30 group-hover:border-indigo-500 transition-colors">
                                "{renderClickableText(d.example)}"
                              </p>
                            )}
                          </div>
                        ))}
                        {m.synonyms?.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {m.synonyms.slice(0, 5).map((syn: string, si: number) => (
                              <span 
                                key={`syn-${i}-${si}`} 
                                onClick={() => handleWordClick(syn)}
                                className="text-xs px-3 py-1 rounded-full bg-white/5 text-white/40 border border-white/5 cursor-pointer hover:bg-white/10 hover:text-white transition-colors"
                              >
                                {syn}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 bg-white/[0.02] flex items-center justify-center">
              <a 
                href={`https://www.google.com/search?q=define+${word}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors group"
              >
                View full etymology
                <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
