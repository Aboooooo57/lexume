"use client";

import { motion } from "framer-motion";

const PARTNERS = [
  { name: "Harvard", display: "Harvard" },
  { name: "MIT", display: "MIT" },
  { name: "Stanford", display: "Stanford" },
  { name: "Oxford", display: "Oxford" },
  { name: "Cambridge", display: "Cambridge" },
  { name: "Yale", display: "Yale" },
  { name: "Princeton", display: "Princeton" },
  { name: "Columbia", display: "Columbia" },
];

export function LogoCarousel() {
  return (
    <section className="py-16 md:py-20 px-6 relative overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-xs font-semibold uppercase tracking-widest text-white/30 mb-10"
        >
          Trusted by learners from top institutions
        </motion.p>
        
        {/* Marquee container */}
        <div className="relative">
          {/* Gradient masks */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#030712] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#030712] to-transparent z-10 pointer-events-none" />
          
          {/* Scrolling content */}
          <div className="flex overflow-hidden">
            <motion.div
              animate={{ x: ["0%", "-50%"] }}
              transition={{
                duration: 30,
                ease: "linear",
                repeat: Infinity,
              }}
              className="flex gap-16 shrink-0"
            >
              {/* Double the items for seamless loop */}
              {[...PARTNERS, ...PARTNERS].map((partner, i) => (
                <div
                  key={`${partner.name}-${i}`}
                  className="flex items-center justify-center px-6 py-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300 group cursor-default"
                >
                  <span className="text-lg font-bold tracking-tight text-white/20 group-hover:text-white/60 transition-colors whitespace-nowrap">
                    {partner.display}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
