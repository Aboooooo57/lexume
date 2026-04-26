import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";

import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/ThemeProvider";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lexis | Future Academic Platform",
  description: "Master English naturally through immersive reading and smart context.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("lexis_theme")?.value || "dark";

  const bgColors: Record<string, string> = {
    dark: '#030712',
    light: '#f8fafc',
    sepia: '#f4ecd8'
  };

  return (
    <html
      lang="en"
      className={`${outfit.variable} ${geistMono.variable} h-full antialiased font-sans`}
      data-theme={theme}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var storedTheme = localStorage.getItem('lexis_theme');
                var cookieTheme = document.cookie.split('; ').find(row => row.startsWith('lexis_theme='))?.split('=')[1];
                
                if (storedTheme && storedTheme !== cookieTheme) {
                  document.cookie = 'lexis_theme=' + storedTheme + '; path=/; max-age=31536000; SameSite=Lax';
                  window.location.reload();
                }
                
                var theme = storedTheme || cookieTheme || 'dark';
                document.documentElement.setAttribute('data-theme', theme);
                var bgColors = { dark: '#030712', light: '#f8fafc', sepia: '#f4ecd8' };
                if (bgColors[theme]) {
                  var style = document.createElement('style');
                  style.innerHTML = 'body { background-color: ' + bgColors[theme] + ' !important; transition: none !important; }';
                  document.head.appendChild(style);
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body 
        className="min-h-full flex flex-col transition-colors duration-300"
        style={{ backgroundColor: bgColors[theme] || bgColors.dark }}
      >
        <ThemeProvider initialTheme={theme as any}>
          {children}
        </ThemeProvider>
        <script src="https://accounts.google.com/gsi/client" async defer></script>
        <script src="https://apis.google.com/js/api.js" async defer></script>
      </body>
    </html>
  );
}
