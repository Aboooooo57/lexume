"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/api";

type Theme = "dark" | "light" | "sepia";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: any;
  t: any;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themeConfigs = {
  dark: {
    // Core colors
    bg: "bg-[#030712]",
    bgAlt: "bg-[#0a0f1c]",
    card: "bg-white/[0.03]",
    cardHover: "hover:bg-white/[0.06]",
    cardSolid: "bg-[#0d1320]",
    border: "border-white/[0.08]",
    borderHover: "hover:border-white/[0.15]",
    borderAccent: "border-indigo-500/30",
    text: "text-white",
    textSecondary: "text-white/70",
    subtext: "text-white/40",
    header: "bg-[#030712]/80 backdrop-blur-xl",
    accent: "text-indigo-400",
    accentBg: "bg-indigo-500",
    accentBgHover: "hover:bg-indigo-600",
    accentBgSubtle: "bg-indigo-500/10",
    accentBorder: "border-indigo-500/30",
    innerCard: "bg-white/[0.04]",
    settings: "bg-[#0a0f1d]",
    gradient: "from-indigo-500/20 via-purple-500/10 to-pink-500/5",
    gradientText: "from-white to-white/60",
    gradientAccent: "from-indigo-400 to-purple-400",
    // Library specific
    input: "bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-indigo-500/20",
    tab: "bg-white/[0.03] border-white/[0.08]",
    tabActive: "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25",
    tabInactive: "text-white/40 hover:text-white/70 hover:bg-white/[0.04]",
    sessionCard: "bg-white/[0.03] border-white/[0.06] hover:border-indigo-500/40 hover:bg-white/[0.05]",
    bookmarkCard: "bg-white/[0.03] border-white/[0.06] hover:border-indigo-500/40 hover:bg-white/[0.05]",
    dropdownBg: "bg-[#0d1320] border-white/[0.1]",
    dropdownItem: "text-white/70 hover:text-white hover:bg-white/[0.06]",
    dropdownDanger: "text-white/50 hover:text-red-400 hover:bg-red-500/10",
    // Result specific
    activeText: "text-white",
    player: "bg-[#0d1320]/95 backdrop-blur-xl",
    icon: "text-white/30",
    buttonBg: "bg-white/[0.06]",
    buttonBgHover: "hover:bg-white/[0.1]",
    // Progress & states
    success: "text-emerald-400",
    successBg: "bg-emerald-500/10",
    successBorder: "border-emerald-500/30",
    warning: "text-amber-400",
    warningBg: "bg-amber-500/10",
    error: "text-red-400",
    errorBg: "bg-red-500/10",
    // Skeleton
    skeleton: "bg-white/[0.06]",
    skeletonShimmer: "via-white/[0.1]",
    // Divider
    divider: "bg-white/[0.06]",
    // Badge
    badge: "bg-white/[0.08] text-white/70",
    badgeAccent: "bg-indigo-500/20 text-indigo-300",
  },
  light: {
    // Core colors
    bg: "bg-[#f8fafc]",
    bgAlt: "bg-white",
    card: "bg-white",
    cardHover: "hover:bg-slate-50",
    cardSolid: "bg-white",
    border: "border-slate-200",
    borderHover: "hover:border-slate-300",
    borderAccent: "border-indigo-300",
    text: "text-slate-900",
    textSecondary: "text-slate-600",
    subtext: "text-slate-400",
    header: "bg-white/80 backdrop-blur-xl",
    accent: "text-indigo-600",
    accentBg: "bg-indigo-600",
    accentBgHover: "hover:bg-indigo-700",
    accentBgSubtle: "bg-indigo-50",
    accentBorder: "border-indigo-200",
    innerCard: "bg-slate-50",
    settings: "bg-white",
    gradient: "from-indigo-100/50 via-purple-50/30 to-pink-50/20",
    gradientText: "from-slate-900 to-slate-600",
    gradientAccent: "from-indigo-600 to-purple-600",
    // Library specific
    input: "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20",
    tab: "bg-slate-100 border-slate-200",
    tabActive: "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/25",
    tabInactive: "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
    sessionCard: "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md",
    bookmarkCard: "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md",
    dropdownBg: "bg-white border-slate-200 shadow-xl",
    dropdownItem: "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
    dropdownDanger: "text-slate-500 hover:text-red-600 hover:bg-red-50",
    // Result specific
    activeText: "text-slate-900",
    player: "bg-white/95 backdrop-blur-xl shadow-xl",
    icon: "text-slate-400",
    buttonBg: "bg-slate-100",
    buttonBgHover: "hover:bg-slate-200",
    // Progress & states
    success: "text-emerald-600",
    successBg: "bg-emerald-50",
    successBorder: "border-emerald-200",
    warning: "text-amber-600",
    warningBg: "bg-amber-50",
    error: "text-red-600",
    errorBg: "bg-red-50",
    // Skeleton
    skeleton: "bg-slate-100",
    skeletonShimmer: "via-slate-200",
    // Divider
    divider: "bg-slate-200",
    // Badge
    badge: "bg-slate-100 text-slate-600",
    badgeAccent: "bg-indigo-100 text-indigo-700",
  },
  sepia: {
    // Core colors
    bg: "bg-[#f4ecd8]",
    bgAlt: "bg-[#fdf6e3]",
    card: "bg-[#fdf6e3]",
    cardHover: "hover:bg-[#f5ecd5]",
    cardSolid: "bg-[#fdf6e3]",
    border: "border-[#d3c6aa]",
    borderHover: "hover:border-[#c4b79a]",
    borderAccent: "border-[#859900]/40",
    text: "text-[#5b4636]",
    textSecondary: "text-[#5b4636]/80",
    subtext: "text-[#5b4636]/50",
    header: "bg-[#f4ecd8]/80 backdrop-blur-xl",
    accent: "text-[#859900]",
    accentBg: "bg-[#859900]",
    accentBgHover: "hover:bg-[#6b7a00]",
    accentBgSubtle: "bg-[#859900]/10",
    accentBorder: "border-[#859900]/30",
    innerCard: "bg-[#f4ecd8]/60",
    settings: "bg-[#f4ecd8]",
    gradient: "from-[#859900]/10 via-[#b58900]/5 to-[#cb4b16]/5",
    gradientText: "from-[#5b4636] to-[#5b4636]/70",
    gradientAccent: "from-[#859900] to-[#b58900]",
    // Library specific
    input: "bg-[#fdf6e3] border-[#d3c6aa] text-[#5b4636] placeholder:text-[#5b4636]/40 focus:border-[#859900]/60 focus:bg-[#fdf6e3] focus:ring-2 focus:ring-[#859900]/20",
    tab: "bg-[#f4ecd8]/50 border-[#d3c6aa]",
    tabActive: "bg-gradient-to-r from-[#5b4636] to-[#6b5646] text-[#fdf6e3] shadow-lg shadow-[#5b4636]/25",
    tabInactive: "text-[#5b4636]/50 hover:text-[#5b4636]/80 hover:bg-[#f4ecd8]",
    sessionCard: "bg-[#fdf6e3] border-[#d3c6aa] hover:border-[#859900]/50 hover:shadow-md",
    bookmarkCard: "bg-[#fdf6e3] border-[#d3c6aa] hover:border-[#859900]/50 hover:shadow-md",
    dropdownBg: "bg-[#fdf6e3] border-[#d3c6aa] shadow-xl",
    dropdownItem: "text-[#5b4636]/70 hover:text-[#5b4636] hover:bg-[#f4ecd8]",
    dropdownDanger: "text-[#5b4636]/50 hover:text-red-600 hover:bg-red-50",
    // Result specific
    activeText: "text-[#5b4636]",
    player: "bg-[#fdf6e3]/95 backdrop-blur-xl shadow-xl",
    icon: "text-[#5b4636]/40",
    buttonBg: "bg-[#5b4636]/[0.06]",
    buttonBgHover: "hover:bg-[#5b4636]/[0.1]",
    // Progress & states
    success: "text-[#859900]",
    successBg: "bg-[#859900]/10",
    successBorder: "border-[#859900]/30",
    warning: "text-[#b58900]",
    warningBg: "bg-[#b58900]/10",
    error: "text-[#dc322f]",
    errorBg: "bg-[#dc322f]/10",
    // Skeleton
    skeleton: "bg-[#5b4636]/[0.06]",
    skeletonShimmer: "via-[#5b4636]/[0.1]",
    // Divider
    divider: "bg-[#d3c6aa]",
    // Badge
    badge: "bg-[#5b4636]/10 text-[#5b4636]/70",
    badgeAccent: "bg-[#859900]/15 text-[#859900]",
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
    const savedTheme = localStorage.getItem("lexis_theme") as Theme | null;
    if (savedTheme && savedTheme !== theme) {
      applyTheme(savedTheme);
    }
    setMounted(true);

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
    api.updatePreferences({ theme: newTheme }).catch(console.error);
  };

  if (!mounted) {
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
