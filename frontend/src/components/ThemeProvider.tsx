"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/api";

type Theme = "dark" | "light" | "sepia";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: any; // Direct access to theme-specific tailwind classes
  t: any;      // The current theme's classes
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themeConfigs = {
  dark: {
    bg: "bg-[#030712]",
    card: "bg-white/[0.02]",
    cardHover: "hover:bg-white/[0.05]",
    border: "border-white/5",
    text: "text-white",
    subtext: "text-white/30",
    header: "bg-[#030712]/40",
    accent: "text-indigo-400",
    innerCard: "bg-white/[0.03]",
    settings: "bg-[#0a0f1d]",
    // Library specific
    input: "bg-white/5 border-white/10 text-white placeholder:text-white/10 focus:border-indigo-500/50 focus:bg-white/[0.07]",
    tab: "bg-white/[0.03] border-white/10",
    tabActive: "bg-white text-black",
    tabInactive: "text-white/30 hover:text-white",
    sessionCard: "bg-white/[0.02] border-white/5 hover:border-indigo-500/30",
    bookmarkCard: "bg-white/[0.02] border-white/5 hover:border-indigo-500/30",
    dropdownBg: "bg-[#0a0f1d] border-white/10",
    dropdownItem: "text-white/60 hover:text-white hover:bg-white/5",
    dropdownDanger: "text-white/40 hover:text-red-400 hover:bg-red-500/10",
    // Result specific
    activeText: "text-white",
    player: "bg-[#0a0f1d]/80",
    icon: "text-white/20",
    buttonBg: "bg-white/5"
  },
  light: {
    bg: "bg-[#f8fafc]",
    card: "bg-white",
    cardHover: "hover:bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-900",
    subtext: "text-slate-500",
    header: "bg-white/70",
    accent: "text-indigo-600",
    innerCard: "bg-slate-50",
    settings: "bg-white",
    // Library specific
    input: "bg-white border-slate-200 text-slate-900 placeholder:text-slate-300 focus:border-indigo-400 focus:bg-white",
    tab: "bg-slate-100 border-slate-200",
    tabActive: "bg-indigo-600 text-white",
    tabInactive: "text-slate-400 hover:text-slate-900",
    sessionCard: "bg-white border-slate-200 hover:border-indigo-400/50",
    bookmarkCard: "bg-white border-slate-200 hover:border-indigo-400/50",
    dropdownBg: "bg-white border-slate-200",
    dropdownItem: "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
    dropdownDanger: "text-slate-500 hover:text-red-600 hover:bg-red-50",
    // Result specific
    activeText: "text-slate-900",
    player: "bg-white/90",
    icon: "text-slate-400",
    buttonBg: "bg-slate-100"
  },
  sepia: {
    bg: "bg-[#f4ecd8]",
    card: "bg-[#fdf6e3]",
    cardHover: "hover:bg-[#efe5d0]",
    border: "border-[#d3c6aa]",
    text: "text-[#5b4636]",
    subtext: "text-[#5b4636]/60",
    header: "bg-[#f4ecd8]/70",
    accent: "text-[#859900]",
    innerCard: "bg-[#f4ecd8]/50",
    settings: "bg-[#f4ecd8]",
    // Library specific
    input: "bg-[#fdf6e3] border-[#d3c6aa] text-[#5b4636] placeholder:text-[#5b4636]/30 focus:border-[#859900]/60 focus:bg-[#fdf6e3]",
    tab: "bg-[#f4ecd8]/50 border-[#d3c6aa]",
    tabActive: "bg-[#5b4636] text-[#fdf6e3]",
    tabInactive: "text-[#5b4636]/50 hover:text-[#5b4636]",
    sessionCard: "bg-[#fdf6e3] border-[#d3c6aa] hover:border-[#859900]/40",
    bookmarkCard: "bg-[#fdf6e3] border-[#d3c6aa] hover:border-[#859900]/40",
    dropdownBg: "bg-[#fdf6e3] border-[#d3c6aa]",
    dropdownItem: "text-[#5b4636]/70 hover:text-[#5b4636] hover:bg-[#f4ecd8]",
    dropdownDanger: "text-[#5b4636]/50 hover:text-red-600 hover:bg-red-50",
    // Result specific
    activeText: "text-[#5b4636]",
    player: "bg-[#fdf6e3]/90",
    icon: "text-[#5b4636]/40",
    buttonBg: "bg-[#5b4636]/5"
  }
};

const setCookie = (name: string, value: string) => {
  if (typeof document !== "undefined") {
    document.cookie = `${name}=${value}; path=/; max-age=31536000; SameSite=Lax`;
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode, initialTheme: Theme }> = ({ children, initialTheme }) => {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  const applyTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    setCookie("lexis_theme", newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("lexis_theme", newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
      
      // Zero-flash background update
      const bgColors: Record<string, string> = {
        dark: '#030712',
        light: '#f8fafc',
        sepia: '#f4ecd8'
      };
      document.body.style.backgroundColor = bgColors[newTheme];
    }
  }, []);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check localStorage on mount in case it differs from cookie
    const savedTheme = localStorage.getItem("lexis_theme") as Theme | null;
    if (savedTheme && savedTheme !== theme) {
      applyTheme(savedTheme);
    }
    setMounted(true);

    // Fetch from API to sync
    api.getPreferences()
      .then(data => {
        if (data.theme && data.theme !== (savedTheme || theme)) {
          applyTheme(data.theme as Theme);
        }
      })
      .catch(() => {});
  }, [applyTheme, theme]);

  const setTheme = (newTheme: Theme) => {
    applyTheme(newTheme);
    // Persist to backend
    api.updatePreferences({ theme: newTheme }).catch(console.error);
  };

  // Prevent rendering with the wrong theme by waiting for mount
  // If the server and client initial states match, this is fast.
  if (!mounted) {
    // Render the context with the initial theme to match server
    return (
      <ThemeContext.Provider value={{ theme: initialTheme, setTheme, themes: themeConfigs, t: themeConfigs[initialTheme] }}>
        <div style={{ visibility: 'hidden' }}>{children}</div>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: themeConfigs, t: themeConfigs[theme] }}>
      <div style={{ visibility: 'visible', height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
