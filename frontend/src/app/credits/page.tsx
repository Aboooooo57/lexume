"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, 
  ArrowLeft, 
  Check, 
  CreditCard, 
  ShieldCheck, 
  Sparkles, 
  Mic2, 
  FileText, 
  Languages, 
  Loader2,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/api";

export default function CreditsPage() {
  const router = useRouter();
  const [readingTheme, setReadingTheme] = useState<"dark" | "light" | "sepia">("dark");
  const [credits, setCredits] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("lexis_theme") as any;
    if (savedTheme) setReadingTheme(savedTheme);

    api.getMe().then(setUser).catch(() => router.push("/login"));
    api.getCredits().then(data => setCredits(data.balance)).catch(console.error);
  }, [router]);

  const themes = {
    dark: {
      bg: "bg-[#030712]",
      card: "bg-white/[0.03] hover:bg-white/[0.06]",
      innerCard: "bg-white/[0.02]",
      border: "border-white/5",
      text: "text-white",
      subtext: "text-white/40",
      accent: "text-indigo-400"
    },
    light: {
      bg: "bg-[#f8fafc]",
      card: "bg-white hover:bg-slate-50",
      innerCard: "bg-slate-50",
      border: "border-slate-200",
      text: "text-slate-900",
      subtext: "text-slate-500",
      accent: "text-indigo-600"
    },
    sepia: {
      bg: "bg-[#f4ecd8]",
      card: "bg-[#fdf6e3] hover:bg-[#efe5d0]",
      innerCard: "bg-[#f4ecd8]/50",
      border: "border-[#d3c6aa]",
      text: "text-[#5b4636]",
      subtext: "text-[#5b4636]/60",
      accent: "text-[#859900]"
    }
  };

  const t = themes[readingTheme];

  const packages = [
    { id: 1, name: "Starter", credits: 50, price: 5, popular: false, bonus: 0 },
    { id: 2, name: "Pro Lab", credits: 250, price: 20, popular: true, bonus: 50 },
    { id: 3, name: "Mastery", credits: 1000, price: 70, popular: false, bonus: 300 },
  ];

  const handlePurchase = async (pkg: typeof packages[0]) => {
    setIsProcessing(pkg.id);
    try {
      // In a real app, this would redirect to Stripe/PayPal
      // For this demo, we simulate a successful payment and use the grant API
      // Since I'm the admin, I can grant myself credits if I have the admin key
      // But for a normal user flow, we'd have a server-side verified payment.
      
      // MOCK PAYMENT DELAY
      await new Promise(r => setTimeout(r, 2000));
      
      // Use the grant credits endpoint (simulating the callback from a payment provider)
      // Note: In production, this would be a secure server-to-server call.
      const totalCredits = pkg.credits + (pkg.bonus || 0);
      
      // We'll use a mock internal API call or the admin grant one if we have the key
      // For this implementation, I'll add a new "simulated" purchase endpoint to the backend
      await api.purchaseCredits(pkg.id);

      setShowSuccess(true);
      const newCredits = await api.getCredits();
      setCredits(newCredits.balance);
      
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err) {
      console.error(err);
      alert("Purchase failed. Please try again.");
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className={cn("min-h-screen transition-colors duration-700 font-sans selection:bg-indigo-500/30", t.bg, t.text)}>
      {/* Background patterns */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className={cn("absolute inset-0 opacity-20", 
          readingTheme === "dark" 
            ? "bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)]" 
            : "bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)]"
        )} style={{ bgSize: "40px_40px" }} />
      </div>

      <header className={cn("h-16 md:h-20 px-6 md:px-12 flex items-center justify-between backdrop-blur-3xl fixed top-0 w-full z-40 border-b", t.bg, "bg-opacity-70", t.border)}>
        <button onClick={() => router.push("/dashboard")} className="flex items-center gap-3 group">
          <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center transition-all group-hover:scale-110", t.innerCard, t.border)}>
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Back to Lab</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg">
            <Mic2 className="w-4 md:w-5 h-4 md:h-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase italic">Lexis</span>
        </div>

        <div className={cn("hidden sm:flex items-center gap-2 h-9 px-4 rounded-full border", t.innerCard, t.border)}>
          <Zap className="w-3.5 h-3.5 text-indigo-400" />
          <span className={cn("text-[9px] font-black uppercase tracking-widest", t.subtext)}>
            {credits?.toFixed(1) || "0.0"} credits
          </span>
        </div>
      </header>

      <main className="relative z-10 pt-32 pb-20 px-6 md:px-10 max-w-6xl mx-auto">
        <div className="text-center mb-16 md:mb-24">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-[0.3em] mb-8"
           >
             <Sparkles className="w-3 h-3" />
             Power your learning
           </motion.div>
           <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.8] mb-8">
             REBALANCE<br/>
             <span className="opacity-20">YOUR LAB</span>
           </h1>
           <p className={cn("text-lg md:text-xl font-medium max-w-2xl mx-auto", t.subtext)}>
             Choose a package to fuel your high-fidelity AI learning journey. Credits are added instantly to your balance.
           </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-20">
           {packages.map((pkg) => (
             <motion.div
               key={pkg.id}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: pkg.id * 0.1 }}
               className={cn(
                 "relative p-8 md:p-10 rounded-[32px] md:rounded-[48px] border transition-all flex flex-col justify-between group",
                 pkg.popular ? "bg-indigo-600 border-indigo-500 shadow-[0_40px_80px_rgba(79,70,229,0.3)] text-white scale-[1.02] z-10" : cn(t.card, t.border)
               )}
             >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white text-indigo-600 text-[8px] font-black uppercase tracking-widest shadow-xl">Most Popular</div>
                )}
                
                <div>
                  <div className={cn("w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl flex items-center justify-center mb-8 transition-transform group-hover:scale-110", pkg.popular ? "bg-white/10" : "bg-indigo-500/10")}>
                    <Zap className={cn("w-6 md:w-8 h-6 md:h-8", pkg.popular ? "text-white" : "text-indigo-400")} />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black mb-2 tracking-tight uppercase italic">{pkg.name}</h3>
                  <div className="flex items-baseline gap-2 mb-8">
                    <span className="text-5xl md:text-6xl font-black tracking-tighter">${pkg.price}</span>
                    <span className={cn("text-[10px] font-black uppercase tracking-widest opacity-40", pkg.popular ? "text-white" : t.text)}>one-time</span>
                  </div>
                  
                  <ul className="space-y-4 mb-10">
                    <li className="flex items-center gap-3">
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center", pkg.popular ? "bg-white/20" : "bg-indigo-500/20")}>
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="text-xs md:text-sm font-bold">{pkg.credits} Base Credits</span>
                    </li>
                    {pkg.bonus > 0 && (
                      <li className="flex items-center gap-3">
                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center bg-emerald-500/20")}>
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                        </div>
                        <span className="text-xs md:text-sm font-bold text-emerald-400">+{pkg.bonus} Bonus Credits</span>
                      </li>
                    )}
                    <li className="flex items-center gap-3">
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center", pkg.popular ? "bg-white/20" : "bg-indigo-500/20")}>
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="text-xs md:text-sm font-medium opacity-60">Instant Activation</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => handlePurchase(pkg)}
                  disabled={isProcessing !== null}
                  className={cn(
                    "w-full py-4 md:py-5 rounded-2xl md:rounded-[32px] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3",
                    pkg.popular 
                      ? "bg-white text-indigo-600 hover:scale-[1.02] active:scale-[0.98] shadow-2xl" 
                      : "bg-indigo-600 text-white hover:bg-indigo-500"
                  )}
                >
                  {isProcessing === pkg.id ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Verifying</>
                  ) : (
                    <><CreditCard className="w-4 h-4" /> Purchase Now</>
                  )}
                </button>
             </motion.div>
           ))}
        </div>

        {/* Pricing transparency / Calculator */}
        <div className={cn("p-8 md:p-12 rounded-[40px] md:rounded-[60px] border mb-20", t.innerCard, t.border)}>
           <div className="flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="max-w-md text-center md:text-left">
                 <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4 uppercase italic">Usage Guide</h2>
                 <p className={cn("text-sm md:text-base font-medium", t.subtext)}>
                    We charge based on actual high-fidelity AI processing. Cached content you've already processed is always free to revisit.
                 </p>
              </div>
              
              <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                 {[
                   { icon: <FileText className="w-4 h-4" />, label: "Page Extraction", cost: "1.0 CR", sub: "Gemini AI" },
                   { icon: <Mic2 className="w-4 h-4" />, label: "Audio Narration", cost: "5.0 CR", sub: "Neural Voice" },
                   { icon: <Languages className="w-4 h-4" />, label: "Accurate Translation", cost: "0.1 CR", sub: "AI Analysis" },
                   { icon: <ShieldCheck className="w-4 h-4" />, label: "Everything Else", cost: "0.0 CR", sub: "Always Free" },
                 ].map((item, i) => (
                    <div key={i} className={cn("p-5 md:p-6 rounded-2xl md:rounded-3xl border flex items-center justify-between group", t.card, t.border)}>
                       <div className="flex items-center gap-4">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", t.innerCard)}>
                             {item.icon}
                          </div>
                          <div>
                             <p className="text-[10px] font-black uppercase tracking-widest">{item.label}</p>
                             <p className={cn("text-[8px] font-black uppercase tracking-widest opacity-40", t.subtext)}>{item.sub}</p>
                          </div>
                       </div>
                       <span className="text-lg font-black tracking-tighter">{item.cost}</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 opacity-40">
           <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em]">Secure 256-bit Encryption</span>
           </div>
           <div className="flex items-center gap-3">
              <Zap className="w-5 h-5" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em]">Instant Credit delivery</span>
           </div>
           <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em]">High-Fidelity AI Access</span>
           </div>
        </div>
      </main>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-48px)] max-w-md"
          >
            <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-[0_20px_50px_rgba(16,185,129,0.4)] flex items-center gap-6 border border-emerald-500">
               <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <Check className="w-6 h-6 text-white" />
               </div>
               <div>
                  <h4 className="text-lg font-black uppercase tracking-tight italic leading-none mb-1">Success!</h4>
                  <p className="text-xs font-bold text-white/80">Your lab balance has been rebalanced. Happy learning!</p>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
