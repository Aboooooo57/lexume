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
  Zap,
  Pause,
  Check,
  BookOpen,
  Star,
  Users,
  TrendingUp
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { api } from "@/api";
import { LogoCarousel } from "@/components/landing/logo-carousel";
import { VideoSection } from "@/components/landing/video-section";
import { HeroFloatingElements, MockupFloatingElements } from "@/components/landing/floating-elements";
import { BentoGrid } from "@/components/landing/bento-grid";

export default function LandingPage() {
  const router = useRouter();
  useEffect(() => {
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
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    api.getMe()
      .then(u => setUser(u))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setNavScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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
        
        {/* Animated Gradient Orbs */}
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.4, 0.6, 0.4]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[150px]" 
          style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.2) 0%, transparent 70%)' }} 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.15, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[150px]" 
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)' }} 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute top-[40%] right-[10%] w-[30%] h-[30%] rounded-full blur-[120px]" 
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)' }} 
        />

        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_40%,#000_40%,transparent_100%)]" />
        
        {/* Noise Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.015]" 
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} 
        />
      </div>

      {/* Navigation */}
      <nav className={cn(
        "fixed top-0 w-full z-50 h-16 md:h-20 px-4 md:px-12 transition-all duration-300",
        navScrolled ? "py-2" : "py-0"
      )}>
        <div className={cn(
          "h-full max-w-7xl mx-auto flex items-center justify-between rounded-2xl px-6 transition-all duration-300",
          navScrolled 
            ? "bg-slate-900/80 backdrop-blur-2xl border border-white/[0.08] shadow-xl shadow-black/20" 
            : "bg-transparent"
        )}>
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

      {/* Hero Section - Enhanced */}
      <section className="relative pt-32 md:pt-44 pb-16 md:pb-24 px-6 md:px-10 flex flex-col items-center justify-center text-center overflow-hidden">
        <motion.div style={{ y: y1, opacity }} className="relative z-10 max-w-5xl w-full">
          {/* New Way Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 backdrop-blur-xl mb-8 md:mb-10"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
            <span className="text-white/60 text-xs font-semibold tracking-wide">The Future of Language Learning</span>
            <div className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">NEW</div>
          </motion.div>
          
          {/* Main Headline */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="relative mb-8 md:mb-12"
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] text-smooth">
              <span className="bg-gradient-to-b from-white via-white to-white/60 bg-clip-text text-transparent">Master English</span>
              <br/>
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent animate-gradient-text">Through Reading</span>
            </h1>
             
            {/* Floating Elements around Hero */}
            <HeroFloatingElements />
          </motion.div>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-base md:text-xl text-white/50 max-w-2xl mx-auto font-medium leading-relaxed mb-8 md:mb-10 px-4"
          >
            Transform any document into an immersive learning experience. Click words for instant definitions, listen to native audio, and build fluency naturally.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 md:mb-16"
          >
            <button 
              onClick={user ? () => router.push("/dashboard") : handleLogin}
              className="w-full sm:w-auto group relative flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold text-sm hover:from-indigo-600 hover:to-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-xl shadow-indigo-500/30 animate-glow-pulse"
            >
              Start Learning Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
            </button>
            <button 
              onClick={() => document.getElementById("howitworks")?.scrollIntoView({ behavior: "smooth" })}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white/70 font-semibold text-sm hover:bg-white/[0.08] hover:text-white hover:border-white/[0.15] transition-all duration-200"
            >
              See How it Works
            </button>
          </motion.div>

          {/* Social Proof Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-6 md:gap-10"
          >
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div 
                    key={i} 
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-[#030712] flex items-center justify-center"
                  >
                    <Users className="w-3.5 h-3.5 text-white/40" />
                  </div>
                ))}
              </div>
              <span className="text-sm font-medium text-white/50">
                <span className="text-white font-bold">10,000+</span> learners
              </span>
            </div>
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <span className="text-sm font-medium text-white/50">
                <span className="text-white font-bold">4.9</span> rating
              </span>
            </div>
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-white/50">
                <span className="text-white font-bold">3x</span> faster learning
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* Ambient Bottom Glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-[50%] pointer-events-none" 
          style={{ background: 'radial-gradient(ellipse at center bottom, rgba(79,70,229,0.1) 0%, transparent 70%)' }} 
        />
      </section>

      {/* Logo Carousel */}
      <LogoCarousel />

      {/* Interactive Experience Mockup - Enhanced */}
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

          {/* Mockup with floating elements */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            {/* Floating UI elements */}
            <MockupFloatingElements />
            
            {/* Glow effect behind mockup */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] rounded-full bg-indigo-500/10 blur-[100px]" />
            </div>

            {/* Main mockup container */}
            <div className="relative rounded-3xl md:rounded-[40px] border border-white/[0.08] overflow-hidden shadow-2xl shadow-black/50"
              style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(3,7,18,0.95) 100%)' }}
            >
              {/* Browser Chrome */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
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
                      className="absolute inset-x-4 md:inset-x-auto top-1/2 md:left-1/2 -translate-y-1/2 md:-translate-x-1/2 md:w-[360px] p-6 rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl z-30 backdrop-blur-xl"
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
            </div>
          </motion.div>
        </div>
      </section>

      {/* Video Demo Section */}
      <VideoSection />

      {/* Features Section - Bento Grid */}
      <BentoGrid />

      {/* How it Works Section - Enhanced */}
      <section id="howitworks" className="py-20 md:py-32 px-6 md:px-10 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/[0.03] to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-14 md:mb-20">
            <motion.span 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="inline-block text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4"
            >
              How it Works
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-6xl font-bold tracking-tight"
            >
              Three Simple Steps
            </motion.h2>
          </div>
          
          {/* Steps with connecting line */}
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute top-24 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent hidden md:block" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {[
                { 
                  icon: <Languages className="w-6 h-6" />, 
                  title: "Click Any Word", 
                  desc: "Don&apos;t know a word? Click it. Get simple definitions that help you build vocabulary naturally.",
                  step: "01",
                  color: "from-blue-500/20 to-cyan-500/10",
                  iconColor: "text-blue-400"
                },
                { 
                  icon: <Sparkles className="w-6 h-6" />, 
                  title: "Listen & Learn", 
                  desc: "Native voices synchronized with text help you master pronunciation in real-time.",
                  step: "02",
                  color: "from-violet-500/20 to-purple-500/10",
                  iconColor: "text-violet-400"
                },
                { 
                  icon: <Brain className="w-6 h-6" />, 
                  title: "Learn Naturally", 
                  desc: "Focus on stories you love. Your brain learns English faster than traditional methods.",
                  step: "03",
                  color: "from-emerald-500/20 to-teal-500/10",
                  iconColor: "text-emerald-400"
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
                  {/* Step number */}
                  <div className="absolute -top-4 left-8 px-3 py-1 rounded-full bg-slate-900 border border-white/[0.08]">
                    <span className="text-xs font-bold text-indigo-400">{feature.step}</span>
                  </div>
                  
                  <span className="absolute top-6 right-6 text-6xl font-bold text-white/[0.03] group-hover:text-indigo-500/10 transition-colors">
                    {feature.step}
                  </span>
                  <div className={cn(
                    "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300",
                    feature.color
                  )}>
                    <span className={feature.iconColor}>{feature.icon}</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-3 tracking-tight">{feature.title}</h3>
                  <p className="text-base text-white/40 font-medium leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Enhanced */}
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
              const lessons = Math.floor(pkg.total / 8);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className={cn(
                    "relative rounded-2xl md:rounded-3xl p-5 md:p-6 flex flex-col gap-3 border transition-all duration-300",
                    pkg.highlight
                      ? "bg-gradient-to-br from-indigo-500 to-indigo-700 border-indigo-400/50 shadow-2xl shadow-indigo-500/25 scale-[1.02]"
                      : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"
                  )}
                >
                  {/* Most Popular glow */}
                  {pkg.highlight && (
                    <div className="absolute -inset-[1px] rounded-2xl md:rounded-3xl bg-gradient-to-br from-indigo-400/50 via-violet-500/30 to-indigo-600/50 blur-sm -z-10" />
                  )}
                  
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
                    Approx. {lessons} full audio lessons
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

      {/* Final CTA - Enhanced */}
      <section className="py-24 md:py-40 px-6 md:px-10 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(79,70,229,0.12) 0%, transparent 60%)' }} />
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-500/10 blur-[100px]"
          />
          <motion.div
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ duration: 10, repeat: Infinity, delay: 2 }}
            className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-violet-500/10 blur-[100px]"
          />
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-4 mb-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
          >
            Ready to Master
            <span className="block bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">English?</span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-base md:text-lg text-white/40 mb-10 max-w-lg mx-auto"
          >
            Join thousands of learners who are mastering English the natural way. Start your journey today.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button 
              onClick={user ? () => router.push("/dashboard") : handleLogin}
              className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-white text-slate-900 font-semibold text-base hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-xl shadow-white/10"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-sm text-white/30">No credit card required</p>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-6 mt-12"
          >
            <div className="flex items-center gap-2 text-white/30">
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium">20 free credits</span>
            </div>
            <div className="flex items-center gap-2 text-white/30">
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium">No signup required</span>
            </div>
            <div className="flex items-center gap-2 text-white/30">
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium">Cancel anytime</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer - Enhanced */}
      <footer className="py-16 px-6 md:px-10 border-t border-white/[0.06] relative">
        {/* Gradient border effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
        
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <Mic2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Lexis</span>
              </div>
              <p className="text-xs text-white/30">Master English through immersive reading.</p>
            </div>

            <div className="flex flex-wrap justify-center gap-8">
              {[
                { name: "Privacy", href: "#" },
                { name: "Terms", href: "#" },
                { name: "Twitter", href: "#" },
                { name: "Discord", href: "#" },
              ].map((link) => (
                <a 
                  key={link.name} 
                  href={link.href} 
                  className="text-sm text-white/40 hover:text-white transition-colors"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/20">2026 Lexis. All rights reserved.</p>
            <p className="text-xs text-white/20">Built with care for language learners everywhere.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
