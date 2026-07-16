"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mic2, ArrowLeft, Globe, Loader2, Shield, Lock } from "lucide-react";
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
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6 selection:bg-indigo-500/30 font-sans overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_30%,transparent_100%)]" />
        
        {/* Centered glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 60%)' }}
        />
        
        {/* Top accent glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[100px]"
          style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.08) 0%, transparent 70%)' }}
        />
      </div>

      {/* Back Link */}
      <Link 
        href="/" 
        className="absolute top-8 left-8 flex items-center gap-3 text-white/40 hover:text-white transition-all duration-300 group z-10"
      >
        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center group-hover:bg-white/[0.08] group-hover:border-white/[0.12] transition-all duration-300">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-300" />
        </div>
        <span className="text-sm font-medium hidden sm:block">Back to Home</span>
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[400px] relative z-10"
      >
        {/* Card Container */}
        <div className="p-8 md:p-10 rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl">
          {/* Logo & Header */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-500/25 mx-auto mb-6 hover:scale-105 transition-transform duration-300">
              <Mic2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Welcome to Lexume</h1>
            <p className="text-white/40 text-sm">Sign in to continue your learning journey</p>
          </div>

          {/* Auth Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={isRedirecting}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white text-slate-900 font-semibold text-sm hover:bg-white/95 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 shadow-lg shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRedirecting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              {isRedirecting ? "Connecting..." : "Continue with Google"}
            </button>

            {/* Divider */}
            <div className="relative py-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.08]" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-[#030712] text-xs text-white/30">More options coming soon</span>
              </div>
            </div>

            {/* Disabled GitHub Button */}
            <button
              disabled
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/30 font-medium text-sm cursor-not-allowed"
            >
              <Globe className="w-5 h-5" />
              GitHub Sign In
            </button>
          </div>
        </div>

        {/* Security Footer */}
        <div className="mt-6 flex items-center justify-center gap-6 text-white/20">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="text-xs">Secure Login</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span className="text-xs">Encrypted</span>
          </div>
        </div>

        {/* Legal Links */}
        <p className="mt-6 text-center text-xs text-white/30">
          By continuing, you agree to our{" "}
          <a href="#" className="text-white/50 hover:text-white underline underline-offset-2 transition-colors">Terms</a>
          {" "}and{" "}
          <a href="#" className="text-white/50 hover:text-white underline underline-offset-2 transition-colors">Privacy Policy</a>
        </p>
      </motion.div>
    </div>
  );
}
