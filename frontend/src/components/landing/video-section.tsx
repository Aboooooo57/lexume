"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X, Volume2, Sparkles, BookOpen } from "lucide-react";

export function VideoSection() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <section className="py-20 md:py-32 px-6 md:px-10 relative overflow-hidden">
      {/* Background glow */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{ 
          background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(99, 102, 241, 0.06) 0%, transparent 70%)' 
        }}
      />
      
      <div className="max-w-5xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-16"
        >
          <span className="inline-block text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">
            See It In Action
          </span>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
            Watch How Lexis Works
          </h2>
          <p className="text-white/40 text-base md:text-lg font-medium max-w-xl mx-auto">
            Experience the future of language learning in under 2 minutes.
          </p>
        </motion.div>

        {/* Video container */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative group"
        >
          {/* Gradient border glow */}
          <div className="absolute -inset-[1px] rounded-3xl md:rounded-[32px] bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-indigo-500/30 opacity-60 blur-sm group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Video thumbnail */}
          <div 
            className="relative aspect-video rounded-3xl md:rounded-[32px] overflow-hidden cursor-pointer bg-slate-900/80 border border-white/[0.08]"
            onClick={() => setIsPlaying(true)}
          >
            {/* Fake video thumbnail content */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800/50 to-slate-900">
              {/* Grid pattern */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
              
              {/* Decorative elements */}
              <div className="absolute top-1/4 left-1/4 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl" />
              <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl" />
              
              {/* Mock UI preview */}
              <div className="absolute inset-8 md:inset-16 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-medium text-white/60">Interactive Reading</span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-2 w-12 rounded-full bg-white/[0.06]" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white flex items-center justify-center shadow-2xl shadow-white/20 group-hover:shadow-white/30 transition-shadow"
              >
                <Play className="w-8 h-8 md:w-10 md:h-10 text-slate-900 ml-1" fill="currentColor" />
              </motion.div>
            </div>

            {/* Duration badge */}
            <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-xs font-semibold text-white/80">
              1:47
            </div>
          </div>

          {/* Floating feature badges */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="absolute -left-4 md:-left-8 top-1/4 hidden lg:flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/90 border border-white/[0.08] backdrop-blur-xl shadow-2xl"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white/80">Native Audio</p>
              <p className="text-[10px] text-white/40">Perfect pronunciation</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="absolute -right-4 md:-right-8 bottom-1/4 hidden lg:flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/90 border border-white/[0.08] backdrop-blur-xl shadow-2xl"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white/80">AI Powered</p>
              <p className="text-[10px] text-white/40">Smart translations</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Video Modal */}
        <AnimatePresence>
          {isPlaying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
              onClick={() => setIsPlaying(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-5xl aspect-video rounded-2xl overflow-hidden bg-slate-900"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <button
                  onClick={() => setIsPlaying(false)}
                  className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                
                {/* Placeholder video content */}
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                      <Play className="w-8 h-8 text-indigo-400 ml-1" />
                    </div>
                    <p className="text-white/60 font-medium">Video coming soon</p>
                    <p className="text-white/30 text-sm mt-1">Demo video will be added here</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
