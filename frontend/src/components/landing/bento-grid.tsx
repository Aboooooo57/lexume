"use client";

import { motion } from "framer-motion";
import { Search, Mic2, Grid, Globe, Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "AI-Powered Dictionary",
    description: "Click any word for instant definitions, context-aware translations, and pronunciation guides. Build vocabulary naturally as you read.",
    icon: <Search className="w-6 h-6" />,
    tag: "Vocabulary",
    gradient: "from-blue-500/20 via-cyan-500/10 to-blue-500/5",
    iconBg: "bg-gradient-to-br from-blue-500/30 to-cyan-500/20",
    iconColor: "text-blue-400",
    size: "large",
  },
  {
    title: "Native Audio Sync",
    description: "High-quality narration synchronized with text highlighting. Hear the language as it&apos;s meant to be spoken.",
    icon: <Mic2 className="w-5 h-5" />,
    tag: "Listening",
    gradient: "from-violet-500/20 via-purple-500/10 to-violet-500/5",
    iconBg: "bg-gradient-to-br from-violet-500/30 to-purple-500/20",
    iconColor: "text-violet-400",
    size: "small",
  },
  {
    title: "Smart Selection",
    description: "Choose pages visually with our intuitive PDF selector.",
    icon: <Grid className="w-5 h-5" />,
    tag: "Efficiency",
    gradient: "from-indigo-500/20 via-blue-500/10 to-indigo-500/5",
    iconBg: "bg-gradient-to-br from-indigo-500/30 to-blue-500/20",
    iconColor: "text-indigo-400",
    size: "small",
  },
  {
    title: "Cloud Sync",
    description: "Your progress and vocabulary, synchronized across all devices.",
    icon: <Globe className="w-5 h-5" />,
    tag: "Continuity",
    gradient: "from-emerald-500/20 via-teal-500/10 to-emerald-500/5",
    iconBg: "bg-gradient-to-br from-emerald-500/30 to-teal-500/20",
    iconColor: "text-emerald-400",
    size: "small",
  },
  {
    title: "Contextual Learning",
    description: "Learn words in context with AI-generated examples and memory techniques.",
    icon: <Brain className="w-5 h-5" />,
    tag: "Memory",
    gradient: "from-rose-500/20 via-pink-500/10 to-rose-500/5",
    iconBg: "bg-gradient-to-br from-rose-500/30 to-pink-500/20",
    iconColor: "text-rose-400",
    size: "small",
  },
  {
    title: "Adaptive Progress Tracking",
    description: "Smart analytics that track your learning journey. See which words stick, identify weak spots, and celebrate milestones with detailed insights.",
    icon: <Sparkles className="w-6 h-6" />,
    tag: "Analytics",
    gradient: "from-amber-500/20 via-orange-500/10 to-amber-500/5",
    iconBg: "bg-gradient-to-br from-amber-500/30 to-orange-500/20",
    iconColor: "text-amber-400",
    size: "large",
  },
];

export function BentoGrid() {
  return (
    <section id="features" className="py-20 md:py-32 px-6 md:px-10 relative overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center md:items-end justify-between mb-14 md:mb-20 gap-8">
          <div className="max-w-xl text-center md:text-left">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="inline-block text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4"
            >
              Features
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-4"
            >
              Built for
              <span className="block text-white/20">Fluency</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-base md:text-lg text-white/40 font-medium leading-relaxed"
            >
              Everything you need to master English faster and enjoy the journey.
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs font-medium text-white/40"
          >
            6 Core Features
          </motion.div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={cn(
                "group relative rounded-2xl md:rounded-3xl overflow-hidden",
                "bg-white/[0.02] border border-white/[0.06]",
                "hover:border-white/[0.15] transition-all duration-500",
                feature.size === "large" ? "md:col-span-2 lg:col-span-2" : "col-span-1"
              )}
            >
              {/* Gradient background on hover */}
              <div 
                className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                  feature.gradient
                )}
              />
              
              {/* Gradient border glow on hover */}
              <div className="absolute inset-0 rounded-2xl md:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div className="absolute -inset-[1px] rounded-2xl md:rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-white/5" />
              </div>

              {/* Content */}
              <div className={cn(
                "relative z-10 p-6 md:p-8 h-full flex flex-col",
                feature.size === "large" ? "min-h-[200px]" : "min-h-[180px]"
              )}>
                {/* Icon */}
                <div 
                  className={cn(
                    "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-5",
                    "group-hover:scale-110 transition-transform duration-300",
                    feature.iconBg
                  )}
                >
                  <span className={feature.iconColor}>{feature.icon}</span>
                </div>

                {/* Text */}
                <h3 className="text-lg md:text-xl font-bold mb-2 tracking-tight text-white/90 group-hover:text-white transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-white/40 font-medium leading-relaxed mb-auto group-hover:text-white/50 transition-colors">
                  {feature.description}
                </p>

                {/* Tag */}
                <div className="mt-6">
                  <span className={cn(
                    "text-xs font-semibold uppercase tracking-wider transition-colors",
                    "text-white/20 group-hover:text-white/40",
                    feature.iconColor.replace("text-", "group-hover:text-")
                  )}>
                    {feature.tag}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
