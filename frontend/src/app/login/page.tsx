"use client";

import { motion } from "framer-motion";
import { Mic2, ArrowLeft, Globe, Sparkles } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const handleGoogleLogin = () => {
    // Redirect to backend OAuth initiation
    window.location.href = "http://localhost:8000/auth/login/google";
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6 text-white selection:bg-indigo-500/30">
      <Link 
        href="/" 
        className="absolute top-8 left-8 flex items-center gap-2 text-white/40 hover:text-white transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back to Home</span>
      </Link>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-2xl shadow-indigo-500/20 mx-auto mb-6">
            <Mic2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome Back</h1>
          <p className="text-white/50">Experience the magic of immersive reading.</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white text-black font-bold hover:bg-white/90 transition-all active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            Continue with Google
          </button>

          <Link
            href="/dashboard"
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-bold hover:bg-indigo-600/30 transition-all active:scale-[0.98]"
          >
            <Sparkles className="w-5 h-5" />
            Enter Demo Mode
          </Link>
          
          <div className="relative my-8 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <span className="relative px-4 bg-[#030712] text-sm text-white/30 uppercase tracking-widest font-semibold">
              or
            </span>
          </div>

          <button
            disabled
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/50 font-semibold cursor-not-allowed opacity-50 transition-all"
          >
            <Globe className="w-5 h-5" />
            Continue with GitHub
          </button>
        </div>

        <p className="mt-10 text-center text-sm text-white/30 leading-relaxed max-w-xs mx-auto">
          By continuing, you agree to Lexis's{" "}
          <a href="#" className="text-white/50 hover:text-indigo-400">Terms of Service</a> and{" "}
          <a href="#" className="text-white/50 hover:text-indigo-400">Privacy Policy</a>.
        </p>
      </motion.div>
    </div>
  );
}
