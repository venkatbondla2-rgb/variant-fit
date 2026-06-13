import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/ui/navbar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Variant Fit | Social Fitness",
  description: "Track your workouts, follow your friends, and hit your fitness goals.",
};

import { Sidebar } from "@/components/ui/Sidebar";
import { RightSidebar } from "@/components/ui/RightSidebar";
import { MobileHeader } from "@/components/ui/MobileHeader";
import { LoadingWrapper } from "@/components/ui/LoadingWrapper";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { SiteHeader } from "@/components/ui/SiteHeader";
import PWAInstallPrompt from '@/components/pwa/PWAInstallPrompt';

import { LayoutMainContent } from "@/components/ui/LayoutMainContent";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {


  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <head>
        <link rel="manifest" href="/manifest.json?v=6" />
        <link rel="icon" href="/icon-192.png?v=6" />
        <link rel="apple-touch-icon" href="/icon-512.png?v=6" />
        <meta name="theme-color" content="#3b82f6" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-brand selection:text-black">
        <AuthProvider>
          <Suspense fallback={null}>
            <LoadingWrapper />
          </Suspense>
          <SiteHeader />
          <MobileHeader />
          <Navbar />
          <Sidebar />
          <RightSidebar />
          <LayoutMainContent>
            {children}
          </LayoutMainContent>
          <PWAInstallPrompt />
        </AuthProvider>
      </body>
    </html>
  );

}
