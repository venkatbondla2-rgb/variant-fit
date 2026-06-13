"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { CreatePost } from "@/components/feed/CreatePost";
import { PostList } from "@/components/feed/PostList";
import { StreakBadge } from "@/components/ui/StreakBadge";
import Link from "next/link";
import { LineChart, Utensils, Dumbbell, Trophy } from "lucide-react";

const QUICK_ACTIONS = [
  { href: "/track", icon: LineChart, label: "Track", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/15" },
  { href: "/diet", icon: Utensils, label: "Diet", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20 hover:border-orange-500/40 hover:bg-orange-500/15" },
  { href: "/train", icon: Dumbbell, label: "Train", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20 hover:border-red-500/40 hover:bg-red-500/15" },
  { href: "/challenge", icon: Trophy, label: "Challenge", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20 hover:border-yellow-500/40 hover:bg-yellow-500/15" },
];

export default function FeedPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  const displayName = user.displayName?.split(" ")[0] || "Variant";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="flex flex-col min-h-screen pt-4 sm:pt-6 px-2 sm:px-4 max-w-3xl mx-auto w-full">
      {/* Animated welcome header */}
      <div className="mb-5" style={{ animation: "fade-in-up 0.5s ease-out" }}>
        <p className="text-xs text-zinc-500 mb-1 uppercase tracking-widest font-medium">{greeting} 👋</p>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
          Welcome back, <span className="text-brand">{displayName}</span>
        </h1>
      </div>

      {/* Streak badge */}
      <div style={{ animation: "fade-in-up 0.5s ease-out 0.05s both" }} className="mb-5">
        <StreakBadge variant="compact" />
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-5" style={{ animation: "fade-in-up 0.5s ease-out 0.1s both" }}>
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`flex flex-col items-center gap-1.5 py-3 sm:py-4 rounded-2xl border transition-all duration-300 hover:scale-105 active:scale-95 ${action.bg}`}
          >
            <action.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${action.color}`} />
            <span className="text-[10px] sm:text-xs font-bold text-zinc-400">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Create post */}
      <div style={{ animation: "fade-in-up 0.5s ease-out 0.15s both" }}>
        <CreatePost />
      </div>

      {/* Feed */}
      <div style={{ animation: "fade-in-up 0.5s ease-out 0.2s both" }}>
        <Suspense fallback={<div className="text-center py-10 text-zinc-500">Loading feed...</div>}>
          <PostList />
        </Suspense>
      </div>
    </div>
  );
}
