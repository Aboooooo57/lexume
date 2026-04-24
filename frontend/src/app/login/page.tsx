"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mic2, ArrowLeft, Globe, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { api } from "@/api";

export default function LoginPage() {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleGoogleLogin = async () => {
    setIsRedirecting(true);
    try {
      const { url } = await api.getGoogleAuthUrl();
      window.location.href = url;
    } catch (err) {
      console.error("Failed to get auth URL", err);
      setIsRedirecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#02040a] flex items-center justify-center p-6 text-white selection:bg-indigo-500/30 font-sans overflow-hidden">
      {/* Ambient Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      <Link 
        href="/" 
        className="absolute top-8 left-8 flex items-center gap-3 text-white/20 hover:text-white transition-all group z-10"
      >
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 group-hover:bg-white/10 transition-all">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Return Home</span>
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px] relative z-10"
      >
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-[28px] bg-indigo-600 flex items-center justify-center shadow-[0_20px_50px_rgba(79,70,229,0.3)] mx-auto mb-8 group hover:scale-110 transition-all duration-500">
            <Mic2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter mb-4 italic uppercase">Identity Check</h1>
          <p className="text-white/30 text-xs font-black uppercase tracking-[0.3em]">Authenticate to access the Lab system</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={isRedirecting}
            className="w-full flex items-center justify-center gap-4 px-8 py-5 rounded-2xl bg-white text-black font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-50 hover:text-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_40px_rgba(0,0,0,0.4)] disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isRedirecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {isRedirecting ? "Connecting..." : "Continue with Google"}
          </button>

          <div className="relative py-8 flex items-center justify-center">
             <div className="absolute inset-0 flex items-center">
               <div className="w-full border-t border-white/5" />
             </div>
             <span className="relative px-4 bg-[#02040a] text-[8px] font-black uppercase tracking-[0.4em] text-white/10">Authorized Personnel Only</span>
          </div>

          <button
            disabled
            className="w-full flex items-center justify-center gap-4 px-8 py-5 rounded-2xl bg-white/[0.03] border border-white/5 text-white/20 font-black text-[10px] uppercase tracking-[0.2em] cursor-not-allowed group"
          >
            <Globe className="w-4 h-4" />
            GitHub Sign In
          </button>
        </div>

        <p className="mt-12 text-center text-[9px] font-black text-white/20 uppercase tracking-[0.2em] leading-relaxed max-w-[280px] mx-auto">
          Security Protocol v4.0.12<br/>
          Encrypting Session via <span className="text-indigo-400/50">RSA-4096</span>
        </p>
      </motion.div>
    </div>
  );
}
