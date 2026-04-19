import type { Metadata } from "next";
import { Inter } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-brand selection:text-black">
        <AuthProvider>
          <MobileHeader />
          <Navbar />
          <Sidebar />
          <RightSidebar />
          <main className="pb-20 sm:pb-8 pt-20 sm:pt-6 min-h-screen flex flex-col sm:ml-64 xl:mr-80 px-4 md:px-8 max-w-3xl mx-auto w-full transition-all">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
