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
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/api";
import { useTheme } from "@/components/ThemeProvider";

export default function CreditsPage() {
  const router = useRouter();
  const { theme: readingTheme, t } = useTheme();
  const [credits, setCredits] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    api.getMe().then(setUser).catch(() => router.push("/login"));
    api.getCredits().then(data => setCredits(data.balance)).catch(console.error);
  }, [router]);

  const packages = [
    { id: 1, name: "Starter", credits: 50, price: 5, popular: false, bonus: 0 },
    { id: 2, name: "Pro Lab", credits: 250, price: 20, popular: true, bonus: 50 },
    { id: 3, name: "Mastery", credits: 1000, price: 70, popular: false, bonus: 300 },
  ];

  const handlePurchase = async (pkg: typeof packages[0]) => {
    setIsProcessing(pkg.id);
    try {
      await new Promise(r => setTimeout(r, 2000));
      const totalCredits = pkg.credits + (pkg.bonus || 0);
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
    <div className={cn("min-h-screen transition-colors duration-500 font-sans selection:bg-indigo-500/30", t.bg, t.text)}>
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {readingTheme === "dark" && (
          <>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_40%,transparent_100%)]" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[120px] opacity-30" 
              style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.2) 0%, transparent 70%)' }} 
            />
          </>
        )}
      </div>

      {/* Header */}
      <header className={cn("h-16 px-6 md:px-8 flex items-center justify-between fixed top-0 w-full z-40 border-b backdrop-blur-xl transition-all duration-500", t.header, t.border)}>
        <button onClick={() => router.push("/dashboard")} className={cn("flex items-center gap-2 transition-all group", t.subtext, "hover:text-indigo-400")}>
          <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center transition-all group-hover:border-indigo-500/30", t.card, t.border)}>
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium hidden sm:block">Dashboard</span>
        </button>

        <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => router.push("/")}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Mic2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight hidden sm:block">Lexis</span>
        </div>

        <div className={cn("flex items-center gap-2 h-9 px-4 rounded-xl border", t.card, t.border)}>
          <Zap className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold">
            {credits?.toFixed(1) || "0.0"}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-28 pb-20 px-6 md:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-12 md:mb-16">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4"
          >
            <Sparkles className="w-4 h-4" />
            Power your learning
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold tracking-tight mb-4"
          >
            Get More Credits
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={cn("text-base md:text-lg max-w-xl mx-auto", t.subtext)}
          >
            Choose a package to fuel your AI learning journey. Credits are added instantly.
          </motion.p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 1) }}
              className={cn(
                "relative p-6 rounded-2xl border transition-all flex flex-col",
                pkg.popular 
                  ? "bg-gradient-to-br from-indigo-500 to-indigo-600 border-indigo-400/50 shadow-xl shadow-indigo-500/20 text-white" 
                  : cn(t.card, t.border, "hover:border-indigo-500/30")
              )}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white text-indigo-600 text-xs font-semibold shadow-lg">
                  Most Popular
                </div>
              )}
              
              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center mb-5", pkg.popular ? "bg-white/15" : "bg-indigo-500/10")}>
                <Zap className={cn("w-5 h-5", pkg.popular ? "text-white" : "text-indigo-400")} />
              </div>
              
              <h3 className="text-lg font-bold mb-1">{pkg.name}</h3>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-4xl font-bold">${pkg.price}</span>
                <span className={cn("text-sm", pkg.popular ? "text-white/60" : t.subtext)}>one-time</span>
              </div>
              
              <ul className="space-y-3 mb-6 flex-1">
                <li className="flex items-center gap-2">
                  <Check className={cn("w-4 h-4", pkg.popular ? "text-white" : "text-indigo-400")} />
                  <span className="text-sm">{pkg.credits} Credits</span>
                </li>
                {pkg.bonus > 0 && (
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-emerald-400">+{pkg.bonus} Bonus</span>
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <Check className={cn("w-4 h-4", pkg.popular ? "text-white/60" : t.subtext)} />
                  <span className={cn("text-sm", pkg.popular ? "text-white/60" : t.subtext)}>Instant Activation</span>
                </li>
              </ul>

              <button
                onClick={() => handlePurchase(pkg)}
                disabled={isProcessing !== null}
                className={cn(
                  "w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2",
                  pkg.popular 
                    ? "bg-white text-indigo-600 hover:bg-white/90" 
                    : "bg-indigo-500 text-white hover:bg-indigo-600"
                )}
              >
                {isProcessing === pkg.id ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Processing</>
                ) : (
                  <><CreditCard className="w-4 h-4" />Purchase</>
                )}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Usage Guide */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={cn("p-6 md:p-8 rounded-2xl border mb-12", t.card, t.border)}
        >
          <h2 className="text-xl font-bold mb-2">Usage Guide</h2>
          <p className={cn("text-sm mb-6", t.subtext)}>
            We charge based on actual AI processing. Cached content is always free to revisit.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: <FileText className="w-4 h-4" />, label: "Page Extraction", cost: "1.0" },
              { icon: <Mic2 className="w-4 h-4" />, label: "Audio Narration", cost: "5.0" },
              { icon: <Languages className="w-4 h-4" />, label: "AI Translation", cost: "0.1" },
              { icon: <ShieldCheck className="w-4 h-4" />, label: "Everything Else", cost: "0.0" },
            ].map((item, i) => (
              <div key={i} className={cn("p-4 rounded-xl flex flex-col gap-2", t.innerCard)}>
                <div className="flex items-center gap-2">
                  <span className={cn("", t.subtext)}>{item.icon}</span>
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
                <span className="text-lg font-bold">{item.cost} <span className={cn("text-xs", t.subtext)}>CR</span></span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Trust badges */}
        <div className={cn("flex flex-wrap items-center justify-center gap-6 md:gap-10", t.subtext)}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs">256-bit Encryption</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span className="text-xs">Instant Delivery</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs">AI Powered</span>
          </div>
        </div>
      </main>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-48px)] max-w-sm"
          >
            <div className="bg-emerald-500 text-white p-4 rounded-xl shadow-xl shadow-emerald-500/30 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold">Success!</h4>
                <p className="text-sm text-white/80">Your credits have been added.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
