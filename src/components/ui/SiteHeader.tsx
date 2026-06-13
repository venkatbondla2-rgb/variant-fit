"use client";

import Link from "next/link";
import Image from "next/image";
import { Bell } from "lucide-react";
import { NotificationBadge } from "@/components/ui/NotificationBadge";
import { usePathname, useRouter } from "next/navigation";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const handleBellClick = (e: React.MouseEvent) => {
    if (pathname === "/notifications") {
      e.preventDefault();
      router.back();
    }
  };

  return (
    <header className="hidden sm:flex fixed top-0 left-0 w-full h-16 bg-background/95 backdrop-blur-md border-b border-border z-[60] items-center px-4 md:px-8 justify-between">
      <Link href="/feed" className="flex items-center gap-2 group">
        <div className="bg-black p-1.5 rounded-lg flex items-center justify-center">
          <Image src="/logo.png" alt="VariantFit Logo" width={32} height={32} className="object-contain h-8 w-auto" />
        </div>
      </Link>
      <div className="flex items-center gap-4">
        <Link href="/notifications" onClick={handleBellClick} className="p-2 text-zinc-400 hover:text-brand transition-colors">
          <NotificationBadge>
            <Bell className="w-5 h-5" />
          </NotificationBadge>
        </Link>
      </div>
    </header>
  );
}
