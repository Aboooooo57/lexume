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
    >
      <body className="min-h-full flex flex-col bg-[#030712] text-white">
        {children}
        <script src="https://accounts.google.com/gsi/client" async defer></script>
        <script src="https://apis.google.com/js/api.js" async defer></script>
      </body>
    </html>
  );
}
