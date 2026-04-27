"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { 
  Sparkles, 
  ArrowRight, 
  Mic2, 
  Languages, 
  Brain,
  Globe,
  X,
  FileText,
  Search,
  MousePointer2,
  ChevronLeft,
  Grid,
  Zap,
  Mouse,
  Pause,
  Check,
  BookOpen
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { api } from "@/api";
import { useTheme } from "@/components/ThemeProvider";

export default function LandingPage() {
  const router = useRouter();
  useEffect(() => {
    // Force dark theme on landing page
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.style.backgroundColor = '#030712';
  }, []);

  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  
  const [activeMockupWord, setActiveMockupWord] = useState<string | null>(null);
  const [mockupHistory, setMockupHistory] = useState<{word: string, def: string}[]>([]);
  const [mockupWordData, setMockupWordData] = useState({ word: "Immersive", def: "Providing a simulated environment in which the user feels completely absorbed." });
  const [mockupPlaybackIndex, setMockupPlaybackIndex] = useState(0);
  const [mockupProgress, setMockupProgress] = useState(30);

  useEffect(() => {
    const interval = setInterval(() => {
      setMockupPlaybackIndex((prev) => (prev + 1) % 15);
      setMockupProgress((prev) => (prev + 0.5) % 100);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const handleMockupWordClick = (word: string, def: string = "A concept or state used to explain the recursive nature of learning in Lexis.") => {
    if (activeMockupWord) {
      setMockupHistory([...mockupHistory, mockupWordData]);
    }
    setActiveMockupWord(word);
    setMockupWordData({ word, def });
  };

  const handleMockupBack = () => {
    if (mockupHistory.length === 0) {
      setActiveMockupWord(null);
      return;
    }
    const prev = mockupHistory[mockupHistory.length - 1];
    setMockupHistory(mockupHistory.slice(0, -1));
    setActiveMockupWord(prev.word);
    setMockupWordData(prev);
  };

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const [user, setUser] = useState<any>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    api.getMe()
      .then(u => setUser(u))
      .catch(() => setUser(null));
  }, []);

  const handleLogin = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white selection:bg-indigo-500/30 overflow-x-hidden font-sans" data-theme="dark">
      {/* Immersive Background System */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Dynamic Spotlight following mouse */}
        <motion.div 
          animate={{
            x: mousePos.x - 400,
            y: mousePos.y - 400,
          }}
          transition={{ type: "spring", damping: 30, stiffness: 50 }}
          className="absolute w-[800px] h-[800px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
          }}
        />
        
        {/* Ambient Gradient Orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] animate-pulse opacity-60" 
          style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 70%)' }} 
        />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] animate-pulse opacity-50 animation-delay-2000" 
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)' }} 
        />
        <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] rounded-full blur-[120px] animate-pulse opacity-30 animation-delay-4000" 
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)' }} 
        />

        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_40%,#000_40%,transparent_100%)]" />
        
        {/* Noise Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.015]" 
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} 
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 h-16 md:h-20 px-6 md:px-12">
        <div className="h-full max-w-7xl mx-auto flex items-center justify-between bg-white/[0.02] backdrop-blur-2xl rounded-b-2xl border-x border-b border-white/[0.05] px-6">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 group-hover:scale-105 transition-all duration-300">
              <Mic2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <span className="text-xl md:text-2xl font-bold tracking-tight">Lexis</span>
          </div>
          
          <div className="hidden md:flex items-center gap-10">
            {["Experience", "Features", "Pricing", "How it Works"].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase().replace(/\s+/g, '')}`} 
                className="text-[11px] font-semibold uppercase tracking-wider text-white/40 hover:text-white transition-colors duration-300"
              >
                {item}
              </a>
            ))}
            <button 
              onClick={user ? () => router.push("/dashboard") : handleLogin}
              disabled={isLoggingIn}
              className="px-6 py-2.5 rounded-xl bg-white text-slate-900 font-semibold text-sm hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-white/10"
            >
              {isLoggingIn ? "Redirecting..." : "Launch App"}
            </button>
          </div>
          
          <button 
            onClick={user ? () => router.push("/dashboard") : handleLogin}
            className="md:hidden px-5 py-2 rounded-xl bg-white text-slate-900 font-semibold text-xs"
          >
            Launch
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 md:pt-44 pb-20 md:pb-32 px-6 md:px-10 flex flex-col items-center justify-center text-center overflow-hidden">
        <motion.div style={{ y: y1, opacity }} className="relative z-10 max-w-5xl w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl mb-10 md:mb-14"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
            <span className="text-white/50 text-xs font-medium tracking-wide">The New Way to Learn English</span>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="relative mb-10 md:mb-16"
          >
            <h1 className="text-5xl md:text-8xl lg:text-9xl font-bold tracking-tight leading-[0.9] text-smooth">
              <span className="bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">Learn by</span>
              <br/>
              <span className="bg-gradient-to-b from-white/30 to-white/10 bg-clip-text text-transparent">Reading</span>
            </h1>
             
            {/* Floating Accent Badges */}
            <motion.div 
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-6 -right-4 lg:-right-12 hidden lg:flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl shadow-2xl"
            >
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-violet-400" />
              </div>
              <span className="text-xs font-semibold text-white/70">AI Powered</span>
            </motion.div>
            <motion.div 
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-4 -left-4 lg:-left-16 hidden lg:flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl shadow-2xl"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Mouse className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-xs font-semibold text-white/70">Interactive</span>
            </motion.div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-base md:text-xl text-white/40 max-w-2xl mx-auto font-medium leading-relaxed mb-10 md:mb-14 px-4"
          >
            Lexis transforms complex documents into immersive learning experiences. Master English naturally through smart context and AI-powered audio.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button 
              onClick={user ? () => router.push("/dashboard") : handleLogin}
              className="w-full sm:w-auto group flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold text-sm hover:from-indigo-600 hover:to-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-xl shadow-indigo-500/30"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
            </button>
            <button 
              onClick={() => document.getElementById("howitworks")?.scrollIntoView({ behavior: "smooth" })}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white/60 font-semibold text-sm hover:bg-white/[0.08] hover:text-white transition-all duration-200"
            >
              See How it Works
            </button>
          </motion.div>
        </motion.div>

        {/* Ambient Bottom Glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-[50%] pointer-events-none" 
          style={{ background: 'radial-gradient(ellipse at center bottom, rgba(79,70,229,0.08) 0%, transparent 70%)' }} 
        />
      </section>

      {/* Interactive Experience Mockup */}
      <section id="experience" className="py-20 md:py-32 px-6 md:px-10 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-20">
            <motion.span 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="inline-block text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4"
            >
              Live Preview
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 md:mb-6"
            >
              The Immersive Experience
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-white/40 text-base md:text-lg font-medium max-w-xl mx-auto"
            >
              Click any highlighted word below to see instant definitions and translations.
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl md:rounded-[40px] border border-white/[0.08] overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(180deg, rgba(3,7,18,0.8) 0%, rgba(3,7,18,0.95) 100%)' }}
          >
            {/* Browser Chrome */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
              </div>
              <div className="flex-1 max-w-md mx-6 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center px-4">
                <Search className="w-3 h-3 text-white/20 mr-3" />
                <div className="h-1.5 w-32 bg-white/10 rounded-full" />
              </div>
              <div className="hidden sm:block w-16 h-7 rounded-lg bg-white/[0.04]" />
            </div>

            {/* Mockup Content */}
            <div className="relative min-h-[420px] md:min-h-[480px] p-6 md:p-10 overflow-hidden">
              {/* Text Content with Interactive Words */}
              <div className="space-y-6 md:space-y-8 max-w-2xl">
                <div className="h-6 md:h-7 w-1/3 bg-white/[0.06] rounded-lg" />
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 md:gap-3 items-center">
                    <div className={cn("h-3 md:h-4 w-28 md:w-36 rounded-md transition-all duration-500", mockupPlaybackIndex === 1 ? "bg-indigo-500/30" : "bg-white/[0.06]")} />
                    <div className={cn("h-3 md:h-4 w-16 md:w-20 rounded-md transition-all duration-500", mockupPlaybackIndex === 2 ? "bg-indigo-500/30" : "bg-white/[0.06]")} />
                    <button 
                      onClick={() => handleMockupWordClick("Immersive", "Providing, or relating to, a simulated or artificial environment in which the user feels completely absorbed.")}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs md:text-sm font-semibold cursor-pointer transition-all duration-300",
                        mockupPlaybackIndex === 3 
                          ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/40 scale-105" 
                          : "bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/30 hover:text-indigo-200"
                      )}
                    >
                      Immersive
                    </button>
                    <div className={cn("h-3 md:h-4 w-32 md:w-48 rounded-md transition-all duration-500", mockupPlaybackIndex === 4 ? "bg-indigo-500/30" : "bg-white/[0.06]")} />
                  </div>
                  
                  <div className="flex flex-wrap gap-2 md:gap-3 items-center">
                    <div className={cn("h-3 md:h-4 w-12 rounded-md transition-all duration-500", mockupPlaybackIndex === 5 ? "bg-indigo-500/30" : "bg-white/[0.06]")} />
                    <button 
                      onClick={() => handleMockupWordClick("Context", "The circumstances that form the setting for an event, statement, or idea, and in terms of which it can be fully understood.")}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs md:text-sm font-semibold cursor-pointer transition-all duration-300",
                        mockupPlaybackIndex === 6 
                          ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/40 scale-105" 
                          : "bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/30 hover:text-indigo-200"
                      )}
                    >
                      Context
                    </button>
                    <div className={cn("h-3 md:h-4 w-40 md:w-64 rounded-md transition-all duration-500", mockupPlaybackIndex === 7 ? "bg-indigo-500/30" : "bg-white/[0.06]")} />
                    <div className={cn("h-3 md:h-4 w-14 md:w-16 rounded-md transition-all duration-500", mockupPlaybackIndex === 8 ? "bg-indigo-500/30" : "bg-white/[0.06]")} />
                  </div>

                  <div className="flex flex-wrap gap-2 md:gap-3 items-center">
                    <div className={cn("h-3 md:h-4 w-20 md:w-28 rounded-md transition-all duration-500", mockupPlaybackIndex === 9 ? "bg-indigo-500/30" : "bg-white/[0.06]")} />
                    <div className={cn("h-3 md:h-4 w-28 md:w-40 rounded-md transition-all duration-500", mockupPlaybackIndex === 10 ? "bg-indigo-500/30" : "bg-white/[0.06]")} />
                    <button 
                      onClick={() => handleMockupWordClick("Fluency", "The ability to express oneself easily and articulately, especially in a foreign language.")}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs md:text-sm font-semibold cursor-pointer transition-all duration-300",
                        mockupPlaybackIndex === 11 
                          ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/40 scale-105" 
                          : "bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/30 hover:text-indigo-200"
                      )}
                    >
                      Fluency
                    </button>
                  </div>
                </div>
                
                <div className={cn("h-3 md:h-4 w-full rounded-md transition-all duration-500", mockupPlaybackIndex === 12 ? "bg-indigo-500/30" : "bg-white/[0.06]")} />
                <div className={cn("h-3 md:h-4 w-2/3 rounded-md transition-all duration-500", mockupPlaybackIndex === 13 ? "bg-indigo-500/30" : "bg-white/[0.06]")} />
              </div>

              {/* Feature Labels */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                className="absolute top-8 right-4 md:top-12 md:right-12 flex flex-col gap-3 pointer-events-none"
              >
                <div className="px-4 py-2.5 rounded-xl bg-white text-slate-900 shadow-xl flex items-center gap-3">
                  <MousePointer2 className="w-4 h-4 text-indigo-600 animate-bounce" />
                  <span className="font-semibold text-xs">Click to Translate</span>
                </div>
                <div className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-xl shadow-indigo-500/30 flex items-center gap-3">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-semibold text-xs">AI Audio Sync</span>
                </div>
              </motion.div>

              {/* Dictionary Popup */}
              <AnimatePresence>
                {activeMockupWord && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="absolute inset-x-4 md:inset-x-auto top-1/2 md:left-1/2 -translate-y-1/2 md:-translate-x-1/2 md:w-[360px] p-6 rounded-2xl bg-[#0f172a] border border-white/10 shadow-2xl z-30"
                  >
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        {mockupHistory.length > 0 && (
                          <button onClick={handleMockupBack} className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] transition-colors">
                            <ChevronLeft className="w-3.5 h-3.5 text-white/60" />
                          </button>
                        )}
                        <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Dictionary</span>
                      </div>
                      <button onClick={() => { setActiveMockupWord(null); setMockupHistory([]); }} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
                        <X className="w-4 h-4 text-white/40" />
                      </button>
                    </div>
                    
                    <h3 className="text-2xl font-bold mb-4 text-white">{mockupWordData.word}</h3>
                    
                    <div className="mb-6">
                      <p className="text-white/50 text-sm leading-relaxed flex flex-wrap gap-x-1.5 gap-y-1">
                        {mockupWordData.def.split(" ").map((w, i) => (
                          <span 
                            key={i} 
                            onClick={() => handleMockupWordClick(w.replace(/[^a-zA-Z]/g, ""))}
                            className="hover:text-white hover:underline cursor-pointer decoration-indigo-500/50 underline-offset-2 transition-colors"
                          >
                            {w}
                          </span>
                        ))}
                      </p>
                    </div>

                    <button className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow">
                      Listen to Pronunciation
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Audio Player */}
              <div className="absolute bottom-5 md:bottom-8 left-5 md:left-8 right-5 md:right-8 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-xl flex items-center gap-4">
                <button className="w-11 h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0 hover:shadow-indigo-500/40 transition-shadow">
                  <Pause className="w-4 h-4 text-white fill-white" />
                </button>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-[10px] font-medium text-white/30">
                    <span>0{Math.floor(mockupProgress / 20)}:{Math.floor((mockupProgress % 20) * 3).toString().padStart(2, "0")}</span>
                    <span>12:00</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/[0.08] rounded-full overflow-hidden">
                    <motion.div 
                      animate={{ width: `${mockupProgress}%` }}
                      className="h-full bg-gradient-to-r from-indigo-400 to-indigo-500 rounded-full" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32 px-6 md:px-10 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center md:items-end justify-between mb-14 md:mb-20 gap-8">
            <div className="max-w-xl text-center md:text-left">
              <span className="inline-block text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">Features</span>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-4">
                Built for
                <span className="block text-white/20">Fluency</span>
              </h2>
              <p className="text-base md:text-lg text-white/40 font-medium leading-relaxed">
                Everything you need to master English faster and enjoy the journey.
              </p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs font-medium text-white/40">
              Feature Set v2.6
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                title: "Smart Dictionary",
                desc: "Click any word for instant definitions. Build vocabulary naturally as you read.",
                icon: <Search className="w-5 h-5" />,
                tag: "Vocabulary",
                color: "from-blue-500/20 to-cyan-500/20"
              },
              {
                title: "Audio Immersion",
                desc: "Native audio synchronized with text. Hear the language as it&apos;s meant to be spoken.",
                icon: <Mic2 className="w-5 h-5" />,
                tag: "Listening",
                color: "from-violet-500/20 to-purple-500/20"
              },
              {
                title: "Visual Selector",
                desc: "Choose exactly what you want to learn with our intuitive PDF page selector.",
                icon: <Grid className="w-5 h-5" />,
                tag: "Efficiency",
                color: "from-indigo-500/20 to-blue-500/20"
              },
              {
                title: "Cloud Sync",
                desc: "Your progress and vocabulary list, synchronized across all your devices.",
                icon: <Globe className="w-5 h-5" />,
                tag: "Continuity",
                color: "from-emerald-500/20 to-teal-500/20"
              }
            ].map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-6 md:p-8 rounded-2xl md:rounded-3xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300 flex flex-col"
              >
                <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-6 text-white/80 group-hover:scale-110 transition-transform duration-300", f.color)}>
                  {f.icon}
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-2 tracking-tight">{f.title}</h3>
                <p className="text-sm text-white/40 font-medium leading-relaxed mb-6 flex-1">{f.desc}</p>
                <span className="text-xs font-semibold text-indigo-400/60 uppercase tracking-wider group-hover:text-indigo-400 transition-colors">
                  {f.tag}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="howitworks" className="py-20 md:py-32 px-6 md:px-10 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-14 md:mb-20">
            <span className="inline-block text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">How it Works</span>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
              Three Simple Steps
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              { 
                icon: <Languages className="w-6 h-6" />, 
                title: "Click Any Word", 
                desc: "Don&apos;t know a word? Click it. Get simple definitions that help you build vocabulary naturally.",
                step: "01"
              },
              { 
                icon: <Sparkles className="w-6 h-6" />, 
                title: "Listen & Learn", 
                desc: "Native voices synchronized with text help you master pronunciation in real-time.",
                step: "02"
              },
              { 
                icon: <Brain className="w-6 h-6" />, 
                title: "Learn Naturally", 
                desc: "Focus on stories you love. Your brain learns English faster than traditional methods.",
                step: "03"
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative p-8 md:p-10 rounded-3xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 group"
              >
                <span className="absolute top-6 right-6 text-6xl font-bold text-white/[0.03] group-hover:text-indigo-500/10 transition-colors">
                  {feature.step}
                </span>
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-base text-white/40 font-medium leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 md:py-32 px-6 md:px-10 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14 md:mb-20"
          >
            <span className="inline-block text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">Pricing</span>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
              Credit System
            </h2>
            <p className="text-base md:text-lg text-white/40 font-medium max-w-xl mx-auto">
              Pay only for AI processing. Re-reading is always free. Credits never expire.
            </p>
          </motion.div>

          {/* Free starter banner */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-3 mb-10 px-6 py-3.5 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/20 w-fit mx-auto"
          >
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-emerald-400">Start free — every new account gets 20 credits instantly</span>
          </motion.div>

          {/* Package cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {[
              { name: "Starter",  total: 50,   price: 5,  highlight: false, tag: null },
              { name: "Builder",  total: 230,  price: 15, highlight: false, tag: "+15% bonus" },
              { name: "Pro",      total: 750,  price: 35, highlight: true,  tag: "Best Value" },
              { name: "Power",    total: 2000, price: 75, highlight: false, tag: "+33% bonus" },
            ].map((pkg, i) => {
              const lessons = Math.floor(pkg.total / 8); // ~7-8 credits/typical lesson
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className={cn(
                    "relative rounded-2xl md:rounded-3xl p-5 md:p-6 flex flex-col gap-3 border",
                    pkg.highlight
                      ? "bg-gradient-to-br from-indigo-500 to-indigo-700 border-indigo-400/50 shadow-2xl shadow-indigo-500/25"
                      : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] transition-colors"
                  )}
                >
                  {pkg.tag && (
                    <span className={cn(
                      "absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide",
                      pkg.highlight ? "bg-white/20 text-white" : "bg-indigo-500/15 text-indigo-400"
                    )}>
                      {pkg.tag}
                    </span>
                  )}
                  <p className={cn("text-xs font-bold uppercase tracking-widest", pkg.highlight ? "text-white/60" : "text-white/30")}>
                    {pkg.name}
                  </p>
                  <p className={cn("text-3xl font-black", pkg.highlight ? "text-white" : "text-white")}>
                    ${pkg.price}
                  </p>
                  <div className={cn("flex items-center gap-1.5 text-sm font-semibold", pkg.highlight ? "text-white/80" : "text-white/60")}>
                    <Zap className="w-3.5 h-3.5" />
                    {pkg.total.toLocaleString()} credits
                  </div>
                  <p className={cn("text-xs", pkg.highlight ? "text-white/50" : "text-white/30")}>
                    ≈ {lessons} full audio lessons
                  </p>
                  <button
                    onClick={user ? () => router.push("/credits") : handleLogin}
                    className={cn(
                      "mt-2 w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                      pkg.highlight
                        ? "bg-white text-indigo-700 hover:bg-white/90"
                        : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1] hover:text-white border border-white/[0.08]"
                    )}
                  >
                    {user ? "Get Credits" : "Sign Up Free"}
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* Cost breakdown row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl md:rounded-3xl bg-white/[0.02] border border-white/[0.06] p-6 md:p-8"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-6">What each credit covers</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[
                { icon: <FileText className="w-4 h-4" />, label: "Text Extraction", cost: "1 cr / page",       sub: "Any length, one-time", color: "text-indigo-400", bg: "bg-indigo-500/10" },
                { icon: <Mic2     className="w-4 h-4" />, label: "Audio Narration",  cost: "4 cr / 1 000 chars", sub: "Scales with length",   color: "text-violet-400", bg: "bg-violet-500/10" },
                { icon: <Languages className="w-4 h-4" />, label: "Translation",    cost: "0.1 cr / click",    sub: "Per paragraph",         color: "text-emerald-400", bg: "bg-emerald-500/10" },
                { icon: <BookOpen  className="w-4 h-4" />, label: "Re-reads",       cost: "Free",              sub: "Cached forever",        color: "text-white/30",   bg: "bg-white/[0.04]" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", item.bg)}>
                    <span className={item.color}>{item.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white/80">{item.label}</p>
                    <p className={cn("text-sm font-black", item.color)}>{item.cost}</p>
                    <p className="text-xs text-white/30 mt-0.5">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 md:py-40 px-6 md:px-10 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" 
          style={{ background: 'radial-gradient(ellipse at center, rgba(79,70,229,0.08) 0%, transparent 60%)' }} 
        />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-4 mb-8"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
          >
            Ready to Master
            <span className="block text-white/20">English?</span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-base md:text-lg text-white/40 mb-10 max-w-lg mx-auto"
          >
            Join thousands of learners who are mastering English the natural way.
          </motion.p>

          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            onClick={user ? () => router.push("/dashboard") : handleLogin}
            className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-white text-slate-900 font-semibold text-base hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-xl shadow-white/10"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 md:px-10 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <Mic2 className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-lg font-bold">Lexis</span>
            </div>
            <p className="text-xs text-white/30">© 2026 Lexis. Built for Everyone.</p>
          </div>

          <div className="flex flex-wrap justify-center gap-8">
            {["Privacy", "Terms", "Twitter", "Discord"].map((link) => (
              <a 
                key={link} 
                href="#" 
                className="text-sm text-white/40 hover:text-white transition-colors"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
