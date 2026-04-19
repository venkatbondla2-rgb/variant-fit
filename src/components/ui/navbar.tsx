"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Home, User, Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-background/95 backdrop-blur-md border-t border-border z-50 sm:hidden">
      <div className="flex items-center justify-around w-full h-16 px-2">
        <NavLink href="/feed" icon={<Home className="w-6 h-6" />} label="Feed" active={pathname === "/feed"} />
        <NavLink href="/track" icon={<Activity className="w-6 h-6" />} label="Track" active={pathname === "/track"} />
        <NavLink href="/notifications" icon={<Bell className="w-6 h-6" />} label="Activity" active={pathname === "/notifications"} />
        <NavLink href="/profile" icon={<User className="w-6 h-6" />} label="Profile" active={pathname === "/profile"} />
      </div>
    </nav>
  );
}

function NavLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-4 py-2 rounded-full transition-all flex-1 sm:flex-none justify-center ${active ? "text-brand bg-brand/10" : "text-zinc-400 hover:text-white hover:bg-surface"}`}>
      {icon}
      <span className="text-[10px] sm:text-sm font-medium">{label}</span>
    </Link>
  );
}
