"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/api";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const hasCalled = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      if (!code || hasCalled.current) return;
      hasCalled.current = true;
      
      if (!code) {
        console.error("No code found in URL");
        router.push("/login");
        return;
      }

      console.log("DEBUG: AuthCallbackPage received code:", code);
      console.log("DEBUG: AuthCallbackPage received state:", state);

      try {
        await api.googleCallback(code, state || undefined);
        // On success, the cookie is set by the backend.
        // Redirect to dashboard.
        router.push("/dashboard");
      } catch (err) {
        console.error("Authentication failed", err);
        router.push("/login");
      }
    };

    handleCallback();
  }, [code, router]);

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-[0_0_50px_rgba(79,70,229,0.3)] animate-pulse">
           <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-tight mb-2 uppercase italic">Authenticating</h2>
          <p className="text-white/30 text-xs font-black uppercase tracking-[0.3em]">Connecting with Google Lab System</p>
        </div>
      </div>
    </div>
  );
}
