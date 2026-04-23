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
  Layers, 
  Play, 
  X,
  FileText,
  Search,
  MousePointer2,
  ChevronLeft,
  Grid,
  Zap,
  Mouse,
  Pause
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const router = useRouter();
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

  return (
    <div className="min-h-screen bg-[#02040a] text-white selection:bg-indigo-500/30 overflow-x-hidden font-sans">
      {/* Immersive Background System */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Dynamic Spotlight */}
        <motion.div 
          animate={{
            x: mousePos.x - 400,
            y: mousePos.y - 400,
          }}
          transition={{ type: "spring", damping: 30, stiffness: 50 }}
          className="absolute w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[120px]"
        />
        
        {/* Glowing Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse [animation-delay:2s]" />

        {/* Technical Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 h-16 md:h-20 px-6 md:px-12 flex items-center justify-between bg-[#02040a]/40 backdrop-blur-3xl border-b border-white/[0.03]">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.3)] group-hover:scale-110 transition-all">
            <Mic2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <span className="text-xl md:text-2xl font-black tracking-tighter uppercase italic">Lexis</span>
        </div>
        
        <div className="hidden md:flex items-center gap-12">
          {["Experience", "Features", "How it Works"].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '')}`} className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-colors">{item}</a>
          ))}
          <button 
            onClick={() => router.push("/dashboard")}
            className="px-8 py-3 rounded-xl bg-white text-black font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl"
          >
            Launch Lab
          </button>
        </div>
        <button 
            onClick={() => router.push("/dashboard")}
            className="md:hidden px-5 py-2 rounded-lg bg-white text-black font-black text-[9px] uppercase tracking-[0.2em]"
          >
            Launch
          </button>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 md:pt-44 pb-20 md:pb-32 px-6 md:px-10 flex flex-col items-center justify-center text-center overflow-hidden">
        <motion.div style={{ y: y1, opacity }} className="relative z-10 max-w-6xl w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-3 px-4 md:px-5 py-1.5 md:py-2 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-xl text-white/40 text-[8px] md:text-[9px] font-black uppercase tracking-[0.4em] mb-12 md:mb-16 shadow-2xl"
            >
              <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              The New Way to Learn English
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="relative mb-12 md:mb-20"
            >
               <h1 className="text-[14vw] md:text-[10vw] font-black tracking-[-0.05em] leading-[0.8] mix-blend-difference select-none">
                 LEARN BY<br/>
                 <span className="text-white/20">READING</span>
               </h1>
               
               {/* Floating Badges: Hidden on mobile for clarity */}
               <motion.div 
                 animate={{ y: [0, -10, 0] }}
                 transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                 className="absolute -top-10 -right-10 hidden lg:flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#0a0f1d] border border-white/10 shadow-2xl backdrop-blur-xl"
               >
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">AI Powered</span>
               </motion.div>
               <motion.div 
                 animate={{ y: [0, 10, 0] }}
                 transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                 className="absolute bottom-10 -left-20 hidden lg:flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#0a0f1d] border border-white/10 shadow-2xl backdrop-blur-xl"
               >
                  <Mouse className="w-4 h-4 text-indigo-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Interactive</span>
               </motion.div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-base md:text-2xl text-white/30 max-w-2xl mx-auto font-medium leading-relaxed mb-12 md:mb-16 px-4 md:px-6"
            >
              Lexis transforms complex documents into high-fidelity learning journeys. Master English naturally through immersive reading and smart context.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6"
            >
              <button 
                onClick={() => router.push("/dashboard")}
                className="w-full sm:w-auto group flex items-center justify-center gap-4 md:gap-6 px-8 md:px-10 py-4 md:py-5 rounded-xl md:rounded-2xl bg-indigo-600 text-white font-black text-[10px] md:text-xs uppercase tracking-[0.2em] hover:bg-indigo-500 hover:scale-105 active:scale-95 transition-all shadow-[0_30px_60px_rgba(79,70,229,0.4)]"
              >
                Enter the Lab
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-2 transition-transform" />
              </button>
              <button className="w-full sm:w-auto px-8 md:px-10 py-4 md:py-5 rounded-xl md:rounded-2xl bg-white/[0.03] border border-white/10 text-white/40 font-black text-[10px] md:text-xs uppercase tracking-[0.2em] hover:bg-white/[0.08] hover:text-white transition-all">
                How it Works
              </button>
            </motion.div>
        </motion.div>

        {/* Ambient Bottom Glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.05)_0%,transparent_70%)] pointer-events-none" />
      </section>

      {/* Interactive Experience Mockup: Redesigned for Mobile */}
      <section id="experience" className="py-20 md:py-40 px-6 md:px-10 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 md:mb-24 px-4">
             <h2 className="text-4xl md:text-7xl font-black tracking-tighter mb-4 md:mb-6 leading-none">THE IMMERSIVE EXPERIENCE</h2>
             <p className="text-white/30 text-base md:text-xl font-medium max-w-2xl mx-auto">Click any highlighted word in the preview below to see how Lexis helps you understand instantly.</p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative bg-[#0a0f1d] rounded-[32px] md:rounded-[48px] border border-white/10 p-2 md:p-8 shadow-[0_80px_160px_rgba(0,0,0,0.6)] overflow-hidden"
          >
            {/* Browser Header */}
            <div className="flex items-center justify-between mb-4 md:mb-8 px-4 py-2 md:py-0">
              <div className="flex gap-1.5 md:gap-2">
                <div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-red-500/20" />
                <div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-yellow-500/20" />
                <div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-green-500/20" />
              </div>
              <div className="flex-1 max-w-xs md:max-w-xl mx-4 md:mx-8 h-8 md:h-10 rounded-lg md:rounded-xl bg-white/5 border border-white/5 flex items-center px-3 md:px-4">
                <Search className="w-2.5 md:w-3 h-2.5 md:h-3 text-white/10 mr-2 md:mr-3" />
                <div className="h-1.5 md:h-2 w-24 md:w-40 bg-white/10 rounded-full" />
              </div>
              <div className="hidden sm:block w-20 h-8 rounded-lg bg-white/5" />
            </div>

            {/* Mockup UI Content */}
            <div className="relative min-h-[450px] md:min-h-[500px] bg-black/40 rounded-[24px] md:rounded-[32px] border border-white/5 p-6 md:p-12 overflow-hidden">
               {/* Skeleton Content with Interactive Words */}
               <div className="space-y-8 md:space-y-12 max-w-3xl">
                  <div className="h-6 md:h-8 w-1/3 bg-white/5 rounded-full" />
                  <div className="space-y-4 md:space-y-6">
                    <div className="flex flex-wrap gap-2 md:gap-4 items-center">
                       <div className={cn("h-3 md:h-4 w-24 md:w-40 rounded-full transition-colors duration-500", mockupPlaybackIndex === 1 ? "bg-indigo-500/40" : "bg-white/5")} />
                       <div className={cn("h-3 md:h-4 w-16 md:w-24 rounded-full transition-colors duration-500", mockupPlaybackIndex === 2 ? "bg-indigo-500/40" : "bg-white/5")} />
                       <span 
                         onClick={() => handleMockupWordClick("Immersive", "Providing, or relating to, a simulated or artificial environment in which the user feels completely absorbed.")}
                         className={cn(
                           "px-2 md:px-3 py-0.5 md:py-1 rounded-md md:rounded-lg text-[10px] md:text-sm font-black uppercase tracking-widest cursor-pointer transition-all duration-500 shadow-lg",
                           mockupPlaybackIndex === 3 ? "bg-indigo-600 text-white scale-110 shadow-indigo-500/50" : "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white"
                         )}
                       >
                         Immersive
                       </span>
                       <div className={cn("h-3 md:h-4 w-40 md:w-60 rounded-full transition-colors duration-500", mockupPlaybackIndex === 4 ? "bg-indigo-500/40" : "bg-white/5")} />
                    </div>
                    
                    <div className="flex flex-wrap gap-2 md:gap-4 items-center">
                       <div className={cn("h-3 md:h-4 w-10 md:w-12 rounded-full transition-colors duration-500", mockupPlaybackIndex === 5 ? "bg-indigo-500/40" : "bg-white/5")} />
                       <span 
                         onClick={() => handleMockupWordClick("Context", "The circumstances that form the setting for an event, statement, or idea, and in terms of which it can be fully understood.")}
                         className={cn(
                            "px-2 md:px-3 py-0.5 md:py-1 rounded-md md:rounded-lg text-[10px] md:text-sm font-black uppercase tracking-widest cursor-pointer transition-all duration-500",
                            mockupPlaybackIndex === 6 ? "bg-indigo-600 text-white scale-110 shadow-indigo-500/50" : "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white"
                         )}
                       >
                         Context
                       </span>
                       <div className={cn("h-3 md:h-4 w-48 md:w-80 rounded-full transition-colors duration-500", mockupPlaybackIndex === 7 ? "bg-indigo-500/40" : "bg-white/5")} />
                       <div className={cn("h-3 md:h-4 w-16 md:w-20 rounded-full transition-colors duration-500", mockupPlaybackIndex === 8 ? "bg-indigo-500/40" : "bg-white/5")} />
                    </div>

                    <div className="flex flex-wrap gap-2 md:gap-4 items-center">
                       <div className={cn("h-3 md:h-4 w-20 md:w-32 rounded-full transition-colors duration-500", mockupPlaybackIndex === 9 ? "bg-indigo-500/40" : "bg-white/5")} />
                       <div className={cn("h-3 md:h-4 w-32 md:w-48 rounded-full transition-colors duration-500", mockupPlaybackIndex === 10 ? "bg-indigo-500/40" : "bg-white/5")} />
                       <span 
                         onClick={() => handleMockupWordClick("Fluency", "The ability to express oneself easily and articulately, especially in a foreign language.")}
                         className={cn(
                            "px-2 md:px-3 py-0.5 md:py-1 rounded-md md:rounded-lg text-[10px] md:text-sm font-black uppercase tracking-widest cursor-pointer transition-all duration-500",
                            mockupPlaybackIndex === 11 ? "bg-indigo-600 text-white scale-110 shadow-indigo-500/50" : "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white"
                         )}
                       >
                         Fluency
                       </span>
                    </div>
                  </div>
                  
                  <div className={cn("h-3 md:h-4 w-full rounded-full transition-colors duration-500", mockupPlaybackIndex === 12 ? "bg-indigo-500/40" : "bg-white/5")} />
                  <div className={cn("h-3 md:h-4 w-2/3 rounded-full transition-colors duration-500", mockupPlaybackIndex === 13 ? "bg-indigo-500/40" : "bg-white/5")} />
               </div>

               {/* Interactive Labels: Repositioned for Mobile */}
               <motion.div 
                 initial={{ opacity: 0, x: 20 }}
                 whileInView={{ opacity: 1, x: 0 }}
                 className="absolute top-10 right-4 md:top-20 md:right-20 flex flex-col gap-3 md:gap-6 pointer-events-none"
               >
                  <div className="px-4 md:px-8 py-2.5 md:py-4 rounded-xl md:rounded-3xl bg-white text-black shadow-2xl flex items-center gap-2 md:gap-4 group">
                     <MousePointer2 className="w-3 md:w-5 h-3 md:h-5 animate-bounce" />
                     <span className="font-black text-[8px] md:text-[10px] uppercase tracking-widest">Click to Translate</span>
                  </div>
                  <div className="px-4 md:px-8 py-2.5 md:py-4 rounded-xl md:rounded-3xl bg-indigo-600 text-white shadow-2xl flex items-center gap-2 md:gap-4">
                     <Sparkles className="w-3 md:w-5 h-3 md:h-5" />
                     <span className="font-black text-[8px] md:text-[10px] uppercase tracking-widest">AI Audio Sync</span>
                  </div>
               </motion.div>

               {/* Mockup Dictionary Popup: Scaled for Mobile */}
               <AnimatePresence>
                 {activeMockupWord && (
                   <motion.div
                     initial={{ opacity: 0, scale: 0.9, y: 20 }}
                     animate={{ opacity: 1, scale: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.9, y: 20 }}
                     className="absolute inset-x-4 md:inset-x-auto top-1/2 md:left-1/2 -translate-y-1/2 md:-translate-x-1/2 md:w-[340px] p-6 md:p-8 rounded-[32px] md:rounded-[40px] bg-[#0f172a] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] z-30"
                   >
                     <div className="flex items-center justify-between mb-6 md:mb-8">
                        <div className="flex items-center gap-2">
                           {mockupHistory.length > 0 && (
                             <button onClick={handleMockupBack} className="p-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                <ChevronLeft className="w-3 h-3 text-white/50" />
                             </button>
                           )}
                           <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Dictionary</span>
                        </div>
                        <button onClick={() => { setActiveMockupWord(null); setMockupHistory([]); }} className="p-1.5 md:p-2 rounded-full hover:bg-white/5 transition-colors">
                           <X className="w-3.5 md:w-4 h-3.5 md:w-4 text-white/30" />
                        </button>
                     </div>
                     <h4 className="text-2xl md:text-4xl font-black mb-4 md:mb-6 truncate">{mockupWordData.word}</h4>
                     
                     <div className="mb-8 md:mb-10">
                        <p className="text-white/40 text-xs md:text-sm font-medium leading-relaxed flex flex-wrap gap-x-1 md:gap-x-1.5 gap-y-0.5 md:gap-y-1">
                           {mockupWordData.def.split(" ").map((w, i) => (
                             <span 
                               key={i} 
                               onClick={() => handleMockupWordClick(w.replace(/[^a-zA-Z]/g, ""))}
                               className="hover:text-white hover:underline cursor-pointer decoration-indigo-500 underline-offset-4"
                             >
                               {w}
                             </span>
                           ))}
                        </p>
                     </div>

                     <button className="w-full py-3 md:py-4 rounded-xl md:rounded-2xl bg-indigo-600 text-white font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-xl">Listen to pronunciation</button>
                   </motion.div>
                 )}
               </AnimatePresence>

               {/* Bottom Player Mockup: Scaled for Mobile */}
               <div className="absolute bottom-6 md:bottom-10 left-6 md:left-10 right-6 md:right-10 p-4 md:p-6 rounded-[24px] md:rounded-[32px] bg-white/[0.03] border border-white/5 backdrop-blur-xl flex items-center gap-4 md:gap-8">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-500/20 group shrink-0">
                     <Pause className="w-4 md:w-5 h-4 md:h-5 text-white fill-white" />
                  </div>
                  <div className="flex-1 space-y-2 md:space-y-3">
                     <div className="flex justify-between text-[7px] md:text-[8px] font-black text-white/20 uppercase tracking-widest">
                        <span>0{Math.floor(mockupProgress / 20)}:{Math.floor((mockupProgress % 20) * 3).toString().padStart(2, "0")}</span>
                        <span>12:00</span>
                     </div>
                     <div className="h-1 md:h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          animate={{ width: `${mockupProgress}%` }}
                          className="h-full bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
                        />
                     </div>
                  </div>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-40 px-6 md:px-10 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center md:items-end justify-between mb-20 md:mb-32 gap-12">
             <div className="max-w-2xl text-center md:text-left">
                <h2 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.8] mb-6 md:mb-8">
                  BUILT FOR<br/>
                  <span className="text-white/20">FLUENCY</span>
                </h2>
                <p className="text-lg md:text-xl text-white/30 font-medium leading-relaxed">
                  Every part of Lexis is made to help you learn faster and enjoy the journey.
                </p>
             </div>
             <div className="flex bg-white/5 rounded-xl md:rounded-2xl p-1 border border-white/5 shrink-0">
                <div className="px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl bg-white/5 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/40">Feature Set v2.6</div>
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
             {[
               {
                 title: "Smart Dictionary",
                 desc: "Step-by-step word meanings. Click any word to understand its root and meaning instantly.",
                 icon: <Search className="w-5 md:w-6 h-5 md:h-6 text-indigo-400" />,
                 tag: "Vocabulary"
               },
               {
                 title: "Audio Immersion",
                 desc: "High-fidelity native audio synchronized with text. Hear the soul of the language.",
                 icon: <Mic2 className="w-5 md:w-6 h-5 md:h-6 text-indigo-400" />,
                 tag: "Listening"
               },
               {
                 title: "Visual Selector",
                 desc: "Choose exactly what you want to learn. Our visual PDF selector puts you in control.",
                 icon: <Grid className="w-5 md:w-6 h-5 md:h-6 text-indigo-400" />,
                 tag: "Efficiency"
               },
               {
                 title: "Cloud Sync",
                 desc: "Your learning history and custom vocabulary list, synchronized across all your devices.",
                 icon: <Globe className="w-5 md:w-6 h-5 md:h-6 text-indigo-400" />,
                 tag: "Continuity"
               }
             ].map((f, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-8 md:p-10 rounded-[32px] md:rounded-[48px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/20 transition-all group shadow-2xl h-full flex flex-col justify-between"
                >
                  <div>
                     <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-8 md:mb-10 group-hover:scale-110 transition-transform">
                        {f.icon}
                     </div>
                     <h3 className="text-xl md:text-2xl font-black mb-3 md:mb-4 tracking-tight">{f.title}</h3>
                     <p className="text-xs md:text-sm text-white/30 font-medium leading-relaxed mb-6 md:mb-8">{f.desc}</p>
                  </div>
                  <div className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-indigo-500/40 group-hover:text-indigo-400 transition-colors">
                     {f.tag}
                  </div>
                </motion.div>
             ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="howitworks" className="py-20 md:py-40 px-6 md:px-10 bg-[#050810]/30">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {[
              { 
                icon: <Languages className="w-6 md:w-8 h-6 md:h-8 text-indigo-400" />, 
                title: "Step-by-Step Words", 
                desc: "Don't know a word? Click it. Simple definitions help you build vocabulary naturally as you read." 
              },
              { 
                icon: <Sparkles className="w-6 md:w-8 h-6 md:h-8 text-indigo-400" />, 
                title: "Live Audio", 
                desc: "Real native voices synchronized with text help you master pronunciation in real-time." 
              },
              { 
                icon: <Brain className="w-6 md:w-8 h-6 md:h-8 text-indigo-400" />, 
                title: "Natural Learning", 
                desc: "By focusing on stories you care about, your brain learns English faster than traditional classes." 
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-10 md:p-12 rounded-[32px] md:rounded-[48px] bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-[22px] md:rounded-[28px] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-8 md:mb-10 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-2xl md:text-3xl font-black mb-4 md:mb-6 tracking-tight">{feature.title}</h3>
                <p className="text-base md:text-lg text-white/40 font-medium leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-32 md:py-60 px-6 md:px-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-600/5 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
        <div className="max-w-7xl mx-auto text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-3 md:gap-4 mb-8 md:mb-12"
            >
               <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-2xl">
                  <Mic2 className="w-6 md:w-8 h-6 md:h-8 text-white" />
               </div>
               <span className="text-3xl md:text-4xl font-black tracking-tighter">Lexis</span>
            </motion.div>

            <h4 className="text-4xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-12 md:mb-16">
               READY TO MASTER<br/>
               <span className="text-white/20">ENGLISH?</span>
            </h4>

            <button 
              onClick={() => router.push("/dashboard")}
              className="w-full sm:w-auto px-10 md:px-12 py-5 md:py-6 rounded-2xl md:rounded-[32px] bg-white text-black font-black text-xs md:text-sm uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-[0_40px_80px_rgba(255,255,255,0.15)]"
            >
              Get Started for Free
            </button>
        </div>
      </section>

      {/* Footer */}
       <footer className="py-20 px-10 border-t border-white/5 bg-[#010309]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
           <div className="flex flex-col items-center md:items-start gap-4">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-indigo-600/10 flex items-center justify-center">
                    <Mic2 className="w-4 h-4 text-indigo-500" />
                 </div>
                 <span className="text-xl font-black tracking-tight">Lexis</span>
              </div>
              <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.4em] text-center md:text-left">© 2026 Lexis • Built for Everyone</p>
           </div>

           <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-12 gap-y-6 md:flex md:gap-12">
              {["Privacy", "Terms", "Twitter", "Discord"].map((link) => (
                <a key={link} href="#" className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 hover:text-indigo-400 transition-colors text-center">
                  {link}
                </a>
              ))}
           </div>
        </div>
      </footer>
    </div>
  );
}
