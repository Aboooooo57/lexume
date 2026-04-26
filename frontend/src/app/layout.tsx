import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${geistMono.variable} h-full antialiased font-sans`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem('lexis_theme');
                  var theme = savedTheme || 'dark';
                  document.documentElement.setAttribute('data-theme', theme);
                  
                  var bgColors = {
                    dark: '#030712',
                    light: '#f8fafc',
                    sepia: '#f4ecd8'
                  };
                  var textColors = {
                    dark: '#ffffff',
                    light: '#0f172a',
                    sepia: '#5b4636'
                  };
                  
                  var style = document.createElement('style');
                  style.innerHTML = 'body { background-color: ' + bgColors[theme] + '; color: ' + textColors[theme] + '; transition: none !important; }';
                  document.head.appendChild(style);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col transition-colors duration-300">
        {children}
        <script src="https://accounts.google.com/gsi/client" async defer></script>
        <script src="https://apis.google.com/js/api.js" async defer></script>
      </body>
    </html>
  );
}
