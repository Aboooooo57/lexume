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
  TrendingDown,
  TrendingUp,
  Clock,
  ChevronDown,
  BookOpen,
  Star,
  Infinity,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/api";
import { useTheme } from "@/components/ThemeProvider";
import type { CreditTransaction } from "@/api/types";

// ── helpers ───────────────────────────────────────────────────────────────────

/** Dynamic audio credits formula — mirrors backend */
const audioCreditsFor = (chars: number) =>
  Math.max(2, Math.ceil((chars / 1000) * 4));

/** Typical page estimate (1 500 chars) */
const TYPICAL_PAGE_CHARS = 1500;
const TYPICAL_PAGE_CREDITS = 1 + audioCreditsFor(TYPICAL_PAGE_CHARS); // extract + audio

const pagesFrom = (credits: number) =>
  Math.floor(credits / TYPICAL_PAGE_CREDITS);

// ─────────────────────────────────────────────────────────────────────────────

const PACKAGES = [
  {
    id: 1,
    name: "Starter",
    credits: 50,
    bonus: 0,
    price: 5,
    highlight: false,
    badge: null,
    color: "from-slate-500 to-slate-600",
    description: "Try the platform, see if it clicks.",
  },
  {
    id: 2,
    name: "Builder",
    credits: 200,
    bonus: 30,
    price: 15,
    highlight: false,
    badge: "+15% bonus",
    color: "from-indigo-500 to-indigo-600",
    description: "For consistent learners tackling real content.",
  },
  {
    id: 3,
    name: "Pro",
    credits: 600,
    bonus: 150,
    price: 35,
    highlight: true,
    badge: "Best Value",
    color: "from-violet-500 to-indigo-600",
    description: "Serious students who go deep every week.",
  },
  {
    id: 4,
    name: "Power",
    credits: 1500,
    bonus: 500,
    price: 75,
    highlight: false,
    badge: "+33% bonus",
    color: "from-amber-500 to-orange-500",
    description: "Never think about credits again.",
  },
];

const AUDIO_EXAMPLES = [
  { label: "Flash card (200 chars)", chars: 200 },
  { label: "Short article (800 chars)", chars: 800 },
  { label: "Typical lesson (1 500 chars)", chars: 1500 },
  { label: "Long page (3 000 chars)", chars: 3000 },
  { label: "Dense chapter (6 000 chars)", chars: 6000 },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function CreditsPage() {
  const router = useRouter();
  const { theme: readingTheme, t } = useTheme();

  const [credits, setCredits] = useState<number | null>(null);
  const [history, setHistory] = useState<CreditTransaction[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showPricingDetail, setShowPricingDetail] = useState(false);

  useEffect(() => {
    api.getMe().then(setUser).catch(() => router.push("/login"));
    api.getCredits()
      .then(data => {
        setCredits(data.balance);
        setHistory(data.history ?? []);
      })
      .catch(console.error);
  }, [router]);

  const handlePurchase = async (pkg: (typeof PACKAGES)[0]) => {
    setIsProcessing(pkg.id);
    try {
      await api.purchaseCredits(pkg.id);
      const updated = await api.getCredits();
      setCredits(updated.balance);
      setHistory(updated.history ?? []);
      setShowSuccess(`${pkg.credits + pkg.bonus} credits added to your account!`);
      setTimeout(() => setShowSuccess(null), 5000);
    } catch (err) {
      console.error(err);
      alert("Purchase failed. Please try again.");
    } finally {
      setIsProcessing(null);
    }
  };

  // ── balance colour logic ───────────────────────────────────────────────────
  const isLow    = credits !== null && credits < 10;
  const isCritical = credits !== null && credits < 4;
  const balanceColor = isCritical ? "text-red-400" : isLow ? "text-amber-400" : "text-indigo-400";
  const balanceBorder = isCritical
    ? "border-red-500/30 bg-red-500/5"
    : isLow
    ? "border-amber-500/30 bg-amber-500/5"
    : "";

  const visibleHistory = showAllHistory ? history : history.slice(0, 5);

  return (
    <div className={cn("min-h-screen transition-colors duration-500 font-sans selection:bg-indigo-500/30", t.bg, t.text)}>

      {/* Ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {readingTheme === "dark" && (
          <>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_40%,transparent_100%)]" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full blur-[140px] opacity-20"
              style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.3) 0%, transparent 70%)" }}
            />
          </>
        )}
      </div>

      {/* Header */}
      <header className={cn("h-16 px-6 md:px-8 flex items-center justify-between fixed top-0 w-full z-40 border-b backdrop-blur-xl", t.header, t.border)}>
        <button
          onClick={() => router.push("/dashboard")}
          className={cn("flex items-center gap-2 transition-all group", t.subtext, "hover:text-indigo-400")}
        >
          <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center transition-all group-hover:border-indigo-500/30", t.card, t.border)}>
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium hidden sm:block">Dashboard</span>
        </button>

        <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => router.push("/")}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Mic2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight hidden sm:block">Lexume</span>
        </div>

        {/* Live balance badge */}
        <div className={cn("flex items-center gap-2 h-9 px-4 rounded-xl border transition-colors", t.card, t.border, balanceBorder)}>
          <Zap className={cn("w-4 h-4", balanceColor)} />
          <span className={cn("text-sm font-bold", balanceColor)}>
            {credits?.toFixed(1) ?? "—"}
          </span>
        </div>
      </header>

      <main className="relative z-10 pt-28 pb-24 px-5 md:px-8 max-w-5xl mx-auto space-y-14">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="text-center">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("text-xs font-bold uppercase tracking-widest mb-3 flex items-center justify-center gap-2", t.subtext)}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Credits &amp; Pricing
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="text-4xl md:text-6xl font-black tracking-tight mb-4"
          >
            Power your learning
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className={cn("text-base md:text-lg max-w-lg mx-auto", t.subtext)}
          >
            Pay only for what you process. Re-reading cached pages is always&nbsp;free.
          </motion.p>
        </div>

        {/* ── Balance card ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className={cn(
            "rounded-3xl border p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6",
            t.card, t.border,
            isCritical ? "border-red-500/30" : isLow ? "border-amber-500/30" : ""
          )}
        >
          <div className="flex items-center gap-5">
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0",
              isCritical ? "bg-red-500/15" : isLow ? "bg-amber-500/15" : "bg-indigo-500/10"
            )}>
              <Zap className={cn("w-8 h-8", balanceColor)} />
            </div>
            <div>
              <p className={cn("text-xs font-semibold uppercase tracking-widest mb-1", t.subtext)}>Current Balance</p>
              <p className={cn("text-5xl font-black leading-none", balanceColor)}>
                {credits?.toFixed(1) ?? "—"}
              </p>
              <p className={cn("text-sm mt-1.5", t.subtext)}>
                {credits !== null
                  ? isCritical
                    ? "⚠️ Almost empty — top up to continue"
                    : isLow
                    ? `~${pagesFrom(credits)} full audio lessons remaining`
                    : `≈ ${pagesFrom(credits)} full audio lessons`
                  : "Loading…"}
              </p>
            </div>
          </div>

          {/* Quick-buy shortcut on low balance */}
          {isLow && (
            <a
              href="#packages"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/25 shrink-0"
            >
              <Zap className="w-4 h-4" />
              Top Up Now
            </a>
          )}
        </motion.div>

        {/* ── Packages ─────────────────────────────────────────────────────── */}
        <section id="packages">
          <h2 className="text-2xl font-black mb-1">Choose a package</h2>
          <p className={cn("text-sm mb-7", t.subtext)}>
            Credits never expire. Use them at your own pace.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PACKAGES.map((pkg, i) => {
              const total = pkg.credits + pkg.bonus;
              const pages = pagesFrom(total);
              return (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * i }}
                  className={cn(
                    "relative rounded-2xl border flex flex-col overflow-hidden transition-all group",
                    pkg.highlight
                      ? `bg-gradient-to-br ${pkg.color} border-transparent shadow-2xl shadow-indigo-500/25`
                      : cn(t.card, t.border, "hover:border-indigo-500/30 hover:shadow-lg")
                  )}
                >
                  {/* Badge */}
                  {pkg.badge && (
                    <div className={cn(
                      "absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                      pkg.highlight
                        ? "bg-white/25 text-white"
                        : "bg-indigo-500/15 text-indigo-400"
                    )}>
                      {pkg.badge}
                    </div>
                  )}

                  <div className="p-5 flex-1 flex flex-col">
                    {/* Icon */}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center mb-4",
                      pkg.highlight ? "bg-white/20" : "bg-indigo-500/10"
                    )}>
                      {pkg.id === 4
                        ? <Infinity className={cn("w-5 h-5", pkg.highlight ? "text-white" : "text-indigo-400")} />
                        : pkg.id === 3
                        ? <Star className={cn("w-5 h-5", pkg.highlight ? "text-white" : "text-indigo-400")} />
                        : <Zap className={cn("w-5 h-5", pkg.highlight ? "text-white" : "text-indigo-400")} />
                      }
                    </div>

                    {/* Name & price */}
                    <p className={cn("text-xs font-bold uppercase tracking-widest mb-1", pkg.highlight ? "text-white/60" : t.subtext)}>
                      {pkg.name}
                    </p>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className={cn("text-3xl font-black", pkg.highlight ? "text-white" : "")}>
                        ${pkg.price}
                      </span>
                    </div>

                    {/* Credits */}
                    <div className={cn("flex items-center gap-1 mb-1", pkg.highlight ? "text-white/80" : "")}>
                      <Zap className="w-3.5 h-3.5" />
                      <span className="text-sm font-bold">{pkg.credits.toLocaleString()} credits</span>
                      {pkg.bonus > 0 && (
                        <span className="text-xs font-bold text-emerald-400 ml-1">+{pkg.bonus} free</span>
                      )}
                    </div>

                    {/* What it unlocks */}
                    <p className={cn("text-xs mb-4", pkg.highlight ? "text-white/60" : t.subtext)}>
                      {pkg.description}
                    </p>

                    {/* What you get */}
                    <ul className="space-y-2 mb-5 flex-1">
                      <li className="flex items-center gap-2">
                        <Check className={cn("w-3.5 h-3.5 shrink-0", pkg.highlight ? "text-white/80" : "text-indigo-400")} />
                        <span className={cn("text-xs", pkg.highlight ? "text-white/80" : t.subtext)}>
                          ≈ <strong className={pkg.highlight ? "text-white" : ""}>{pages}</strong> full audio lessons
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className={cn("w-3.5 h-3.5 shrink-0", pkg.highlight ? "text-white/80" : "text-indigo-400")} />
                        <span className={cn("text-xs", pkg.highlight ? "text-white/80" : t.subtext)}>
                          Extract <strong className={pkg.highlight ? "text-white" : ""}>{Math.floor(total / 1)}</strong> pages of text
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className={cn("w-3.5 h-3.5 shrink-0", pkg.highlight ? "text-white/80" : "text-indigo-400")} />
                        <span className={cn("text-xs", pkg.highlight ? "text-white/80" : t.subtext)}>Instant delivery · never expire</span>
                      </li>
                    </ul>

                    {/* CTA */}
                    <button
                      onClick={() => handlePurchase(pkg)}
                      disabled={isProcessing !== null}
                      className={cn(
                        "w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                        pkg.highlight
                          ? "bg-white text-indigo-700 hover:bg-white/90 shadow-lg"
                          : "bg-indigo-500 text-white hover:bg-indigo-600 shadow-md shadow-indigo-500/20"
                      )}
                    >
                      {isProcessing === pkg.id ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />Processing…</>
                      ) : (
                        <><CreditCard className="w-4 h-4" />Get {total.toLocaleString()} Credits</>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── What each credit does ─────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-black">What costs what?</h2>
            <button
              onClick={() => setShowPricingDetail(p => !p)}
              className={cn("flex items-center gap-1.5 text-xs font-semibold transition-colors", t.subtext, "hover:text-indigo-400")}
            >
              <Info className="w-3.5 h-3.5" />
              {showPricingDetail ? "Less detail" : "Full breakdown"}
            </button>
          </div>

          {/* Main cost cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              {
                icon: <FileText className="w-5 h-5" />,
                label: "Text Extraction",
                cost: "1 cr / page",
                sub: "Flat rate — any length",
                color: "text-indigo-400",
                bg: "bg-indigo-500/10",
              },
              {
                icon: <Mic2 className="w-5 h-5" />,
                label: "Audio Narration",
                cost: "4 cr / 1 000 chars",
                sub: "Min 2 cr · scales with length",
                color: "text-violet-400",
                bg: "bg-violet-500/10",
              },
              {
                icon: <Languages className="w-5 h-5" />,
                label: "Translation",
                cost: "0.1 cr / call",
                sub: "Per paragraph click",
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
              },
              {
                icon: <BookOpen className="w-5 h-5" />,
                label: "Re-read / Replay",
                cost: "Free",
                sub: "Cached content forever",
                color: "text-slate-400",
                bg: readingTheme === "dark" ? "bg-white/[0.04]" : "bg-slate-100",
              },
            ].map((item, i) => (
              <div key={i} className={cn("p-4 rounded-2xl border flex flex-col gap-2", t.card, t.border)}>
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", item.bg)}>
                  <span className={item.color}>{item.icon}</span>
                </div>
                <p className="text-xs font-semibold">{item.label}</p>
                <p className={cn("text-lg font-black leading-none", item.color)}>{item.cost}</p>
                <p className={cn("text-[11px]", t.subtext)}>{item.sub}</p>
              </div>
            ))}
          </div>

          {/* Expandable audio detail table */}
          <AnimatePresence>
            {showPricingDetail && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className={cn("rounded-2xl border p-5", t.card, t.border)}>
                  <p className={cn("text-xs font-bold uppercase tracking-widest mb-4", t.subtext)}>
                    Audio credit examples
                  </p>
                  <div className="space-y-3">
                    {AUDIO_EXAMPLES.map((ex, i) => {
                      const cr = audioCreditsFor(ex.chars);
                      const maxCr = audioCreditsFor(6000);
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className={cn("text-xs w-44 shrink-0", t.subtext)}>{ex.label}</span>
                          <div className={cn("flex-1 h-2 rounded-full overflow-hidden", readingTheme === "dark" ? "bg-white/[0.06]" : "bg-slate-100")}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(cr / maxCr) * 100}%` }}
                              transition={{ delay: 0.1 * i, duration: 0.5 }}
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                            />
                          </div>
                          <span className="text-sm font-bold w-16 text-right">{cr} cr</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className={cn("text-xs mt-4", t.subtext)}>
                    Formula: <code className={cn("px-1 py-0.5 rounded text-xs", readingTheme === "dark" ? "bg-white/[0.06]" : "bg-slate-100")}>max(2, ceil(chars / 1000 × 4))</code>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ── Transaction History ───────────────────────────────────────────── */}
        {history.length > 0 && (
          <section>
            <h2 className="text-2xl font-black mb-5">Activity</h2>
            <div className={cn("rounded-2xl border overflow-hidden", t.card, t.border)}>
              {visibleHistory.map((tx, i) => {
                const isCredit = tx.amount > 0;
                return (
                  <div
                    key={tx.id}
                    className={cn(
                      "flex items-center gap-4 px-5 py-4 transition-colors",
                      i !== 0 && cn("border-t", t.border),
                      i % 2 === 1 && (readingTheme === "dark" ? "bg-white/[0.015]" : "bg-black/[0.015]")
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                      isCredit ? "bg-emerald-500/10" : "bg-indigo-500/10"
                    )}>
                      {isCredit
                        ? <TrendingUp className="w-4 h-4 text-emerald-400" />
                        : tx.reason === "audio_generation"
                        ? <Mic2 className="w-4 h-4 text-violet-400" />
                        : <FileText className="w-4 h-4 text-indigo-400" />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold capitalize">
                        {tx.reason.replace(/_/g, " ")}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className={cn("text-xs flex items-center gap-1", t.subtext)}>
                          <Clock className="w-3 h-3" />
                          {new Date(tx.date).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {tx.usd_cost != null && (
                          <span className={cn("text-xs", t.subtext)}>
                            ${tx.usd_cost.toFixed(4)} actual API cost
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={cn(
                        "text-sm font-black",
                        isCredit ? "text-emerald-400" : t.subtext
                      )}>
                        {isCredit ? "+" : ""}{tx.amount.toFixed(1)} cr
                      </p>
                    </div>
                  </div>
                );
              })}

              {history.length > 5 && (
                <button
                  onClick={() => setShowAllHistory(p => !p)}
                  className={cn(
                    "w-full py-3.5 flex items-center justify-center gap-2 text-xs font-semibold border-t transition-colors",
                    t.border, t.subtext, "hover:text-indigo-400"
                  )}
                >
                  <ChevronDown className={cn("w-4 h-4 transition-transform", showAllHistory && "rotate-180")} />
                  {showAllHistory ? "Show less" : `Show all ${history.length} transactions`}
                </button>
              )}
            </div>
          </section>
        )}

        {/* ── Trust row ─────────────────────────────────────────────────────── */}
        <div className={cn("flex flex-wrap items-center justify-center gap-8", t.subtext)}>
          {[
            { icon: <ShieldCheck className="w-4 h-4" />, text: "Secure checkout" },
            { icon: <Zap className="w-4 h-4" />, text: "Instant delivery" },
            { icon: <Sparkles className="w-4 h-4" />, text: "Credits never expire" },
            { icon: <Clock className="w-4 h-4" />, text: "Re-reads always free" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              {item.icon}
              <span className="text-xs font-medium">{item.text}</span>
            </div>
          ))}
        </div>
      </main>

      {/* ── Success toast ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-40px)] max-w-sm"
          >
            <div className="bg-emerald-500 text-white px-5 py-4 rounded-2xl shadow-2xl shadow-emerald-500/40 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">Credits added!</p>
                <p className="text-xs text-white/80 mt-0.5">{showSuccess}</p>
              </div>
              <Zap className="w-5 h-5 text-white/60 shrink-0" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
