"use client";

import { motion } from "framer-motion";
import { Languages, Headphones, BookOpen, Star, Zap, MessageCircle } from "lucide-react";

interface FloatingBadgeProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  y?: [number, number, number];
}

function FloatingBadge({ 
  children, 
  className = "", 
  delay = 0,
  duration = 4,
  y = [0, -12, 0]
}: FloatingBadgeProps) {
  return (
    <motion.div
      animate={{ y }}
      transition={{ 
        duration, 
        repeat: Infinity, 
        ease: "easeInOut",
        delay 
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function HeroFloatingElements() {
  return (
    <>
      {/* Top right - Languages badge */}
      <FloatingBadge
        delay={0}
        duration={5}
        y={[0, -15, 0]}
        className="absolute -top-8 right-0 lg:-right-16 hidden lg:flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl shadow-2xl"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 flex items-center justify-center">
          <Languages className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <span className="text-xs font-bold text-white/80 block">50+ Languages</span>
          <span className="text-[10px] text-white/40">Instant translation</span>
        </div>
      </FloatingBadge>

      {/* Bottom left - Audio badge */}
      <FloatingBadge
        delay={1.5}
        duration={6}
        y={[0, 12, 0]}
        className="absolute bottom-12 -left-4 lg:-left-20 hidden lg:flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl shadow-2xl"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-violet-600/20 flex items-center justify-center">
          <Headphones className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <span className="text-xs font-bold text-white/80 block">Native Audio</span>
          <span className="text-[10px] text-white/40">Perfect pronunciation</span>
        </div>
      </FloatingBadge>

      {/* Top left - Stars */}
      <FloatingBadge
        delay={0.5}
        duration={4}
        y={[0, -8, 0]}
        className="absolute top-16 left-4 lg:-left-8 hidden lg:flex"
      >
        <div className="flex items-center gap-1 px-3 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
          ))}
          <span className="text-xs font-semibold text-amber-400/80 ml-1">4.9</span>
        </div>
      </FloatingBadge>

      {/* Bottom right - Quick badge */}
      <FloatingBadge
        delay={2}
        duration={5}
        y={[0, 10, 0]}
        className="absolute bottom-0 right-4 lg:-right-12 hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20"
      >
        <Zap className="w-4 h-4 text-indigo-400" />
        <span className="text-xs font-semibold text-indigo-400">10x Faster Learning</span>
      </FloatingBadge>
    </>
  );
}

export function MockupFloatingElements() {
  return (
    <>
      {/* AI Analysis badge */}
      <FloatingBadge
        delay={0}
        duration={4}
        y={[0, -8, 0]}
        className="absolute -top-6 -right-4 md:-right-10 z-20"
      >
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/30 backdrop-blur-xl shadow-xl">
          <div className="w-8 h-8 rounded-lg bg-violet-500/30 flex items-center justify-center">
            <Zap className="w-4 h-4 text-violet-300" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-violet-200">AI Analysis</p>
            <p className="text-[9px] text-violet-300/60">Context aware</p>
          </div>
        </div>
      </FloatingBadge>

      {/* Progress stats card */}
      <FloatingBadge
        delay={1}
        duration={5}
        y={[0, 10, 0]}
        className="absolute -bottom-8 -left-4 md:-left-10 z-20"
      >
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/90 border border-white/[0.08] backdrop-blur-xl shadow-xl">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">247</p>
            <p className="text-[10px] text-white/40">Words learned</p>
          </div>
        </div>
      </FloatingBadge>

      {/* Voice indicator */}
      <FloatingBadge
        delay={0.5}
        duration={3.5}
        y={[0, -6, 0]}
        className="absolute top-1/3 -left-4 md:-left-14 z-20 hidden md:flex"
      >
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 backdrop-blur-xl">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                animate={{ 
                  height: ["4px", "16px", "4px"],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
                className="w-1 bg-indigo-400 rounded-full"
              />
            ))}
          </div>
          <span className="text-[10px] font-semibold text-indigo-300">Playing</span>
        </div>
      </FloatingBadge>

      {/* Chat bubble hint */}
      <FloatingBadge
        delay={1.5}
        duration={4.5}
        y={[0, 8, 0]}
        className="absolute top-1/4 -right-4 md:-right-12 z-20 hidden md:flex"
      >
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] backdrop-blur-xl">
          <MessageCircle className="w-4 h-4 text-white/60" />
          <span className="text-[10px] font-medium text-white/60">Click any word</span>
        </div>
      </FloatingBadge>
    </>
  );
}
