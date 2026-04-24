"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Home, LineChart, Dumbbell, Trophy, HelpCircle, Users, Activity, Bell, User, MessageCircle, Shield } from "lucide-react";
import { NotificationBadge } from "@/components/ui/NotificationBadge";

export function Sidebar() {
  const pathname = usePathname();
  const { user, userRole } = useAuth();

  if (!user) return null;

  const links = [
    { href: "/feed", label: "Home Feed", icon: <Home className="w-5 h-5" /> },
    { href: "/messages", label: "Messages", icon: <MessageCircle className="w-5 h-5" /> },
    { href: "/track", label: "Track Progress", icon: <LineChart className="w-5 h-5" /> },
    { href: "/diet", label: "Diet & Nutrition", icon: <Activity className="w-5 h-5" /> },
    { href: "/train", label: "Train with Variant", icon: <Dumbbell className="w-5 h-5" /> },
    { href: "/challenge", label: "Challenge Variants", icon: <Trophy className="w-5 h-5" /> },
    { href: "/help", label: "Help me Variant", icon: <HelpCircle className="w-5 h-5" /> },
    { href: "/community", label: "Community", icon: <Users className="w-5 h-5" /> },
  ];

  return (
    <div className="hidden sm:flex flex-col w-64 h-screen fixed left-0 top-0 border-r border-border p-6 bg-background/95 backdrop-blur z-40 overflow-y-auto">
      <Link href="/feed" className="flex items-center gap-2 group mb-10 mt-2">
        <Activity className="w-8 h-8 text-brand group-hover:scale-110 transition-transform" />
        <span className="font-bold text-2xl tracking-tight hidden lg:block">Variant<span className="text-brand">Fit</span></span>
      </Link>

      <div className="flex flex-col gap-2 flex-grow">
        <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Main Menu</div>
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                isActive ? "bg-brand/10 text-brand font-medium" : "text-zinc-400 hover:text-white hover:bg-surface"
              }`}
            >
              {link.icon}
              <span className="text-sm">{link.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 border-t border-border pt-4 flex flex-col gap-2">
         <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Account</div>
         <Link href="/notifications" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${pathname === "/notifications" ? "bg-brand/10 text-brand font-medium" : "text-zinc-400 hover:text-white hover:bg-surface"}`}>
            <NotificationBadge>
               <Bell className="w-5 h-5"/>
            </NotificationBadge>
            <span className="text-sm">Activity</span>
         </Link>
          <Link href="/profile" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${pathname === "/profile" ? "bg-brand/10 text-brand font-medium" : "text-zinc-400 hover:text-white hover:bg-surface"}`}>
            <User className="w-5 h-5"/>
            <span className="text-sm">Profile</span>
         </Link>
         {userRole === "admin" && (
           <Link href="/admin" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${pathname === "/admin" ? "bg-brand/10 text-brand font-medium" : "text-zinc-400 hover:text-white hover:bg-surface"}`}>
              <Shield className="w-5 h-5"/>
              <span className="text-sm">Admin Panel</span>
           </Link>
         )}
      </div>
    </div>
  );
}
