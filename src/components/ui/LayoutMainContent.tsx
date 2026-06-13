"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "./SiteFooter";

export function LayoutMainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMessages = pathname === "/messages";

  return (
    <main className={`min-h-screen flex flex-col sm:ml-64 transition-all ${
      isMessages 
        ? "xl:mr-0 px-0 md:px-0 max-w-none w-auto pt-16 pb-0" 
        : "xl:mr-72 px-4 md:px-8 max-w-5xl mx-auto w-full pt-20 sm:pt-24 pb-20 sm:pb-8"
    }`}>
      {children}
      {!isMessages && <SiteFooter />}
    </main>
  );
}
