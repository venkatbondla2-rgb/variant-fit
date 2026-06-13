"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getStreakData, recordLoginStreak, isStreakAtRisk, type StreakData } from "@/lib/streaks";
import { Flame, Dumbbell, Utensils, LogIn, AlertTriangle, Trophy } from "lucide-react";

interface StreakBadgeProps {
  variant?: "full" | "compact" | "mini";
}

export function StreakBadge({ variant = "full" }: StreakBadgeProps) {
  const { user } = useAuth();
  const [streakData, setStreakData] = useState<StreakData | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Record login streak automatically
      const data = await recordLoginStreak(user.uid);
      setStreakData(data);
    };
    load();
  }, [user]);

  if (!streakData) return null;

  const atRisk = isStreakAtRisk(streakData);
  const maxStreak = Math.max(streakData.workoutStreak, streakData.loginStreak, streakData.proteinStreak);

  // Mini badge (for sidebar)
  if (variant === "mini") {
    if (maxStreak === 0) return null;
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
        <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
        <span className="text-xs font-black text-orange-400">{maxStreak}</span>
      </div>
    );
  }

  // Compact badge (for feed header)
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-500/10 via-surface to-red-500/10 rounded-2xl border border-orange-500/20">
        <div className="relative">
          <Flame className="w-8 h-8 text-orange-400" style={{ animation: "flameWiggle 1.5s ease-in-out infinite" }} />
          {maxStreak >= 7 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-[8px] font-black text-black">🔥</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white">
            {streakData.workoutStreak > 0
              ? `${streakData.workoutStreak}-day workout streak`
              : streakData.loginStreak > 0
              ? `${streakData.loginStreak}-day login streak`
              : "Start your streak today!"}
          </p>
          {(atRisk.workout || atRisk.protein) && (
            <p className="text-[10px] text-orange-400 flex items-center gap-1 mt-0.5">
              <AlertTriangle className="w-3 h-3" />
              Don&apos;t break your streak!
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {streakData.workoutStreak > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
              <Dumbbell className="w-3 h-3 text-green-400" />
              <span className="text-[10px] font-bold text-green-400">{streakData.workoutStreak}</span>
            </div>
          )}
          {streakData.loginStreak > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <LogIn className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] font-bold text-blue-400">{streakData.loginStreak}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full card
  return (
    <div className="bg-surface rounded-3xl border border-border overflow-hidden card-glow">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-orange-500/20 via-red-500/10 to-yellow-500/20 px-5 py-3 flex items-center gap-3">
        <Flame className="w-6 h-6 text-orange-400" style={{ animation: "flameWiggle 1.5s ease-in-out infinite" }} />
        <h3 className="text-sm font-black uppercase tracking-wider text-white/90">Daily Streaks</h3>
        {maxStreak >= 7 && (
          <span className="ml-auto bg-orange-500/20 text-orange-400 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
            <Trophy className="w-3 h-3" /> On Fire!
          </span>
        )}
      </div>

      <div className="p-4 grid grid-cols-3 gap-3">
        {/* Workout Streak */}
        <div className={`rounded-2xl p-3 text-center border transition-all ${
          atRisk.workout
            ? "bg-orange-500/10 border-orange-500/30 animate-pulse"
            : streakData.workoutStreak > 0
            ? "bg-green-500/10 border-green-500/20"
            : "bg-background border-border/50"
        }`}>
          <Dumbbell className={`w-5 h-5 mx-auto mb-1.5 ${
            streakData.workoutStreak > 0 ? "text-green-400" : "text-zinc-600"
          }`} />
          <p className={`text-xl font-black ${
            streakData.workoutStreak > 0 ? "text-green-400" : "text-zinc-600"
          }`}>{streakData.workoutStreak}</p>
          <p className="text-[9px] text-zinc-500 uppercase font-bold mt-0.5">Workout</p>
          {atRisk.workout && (
            <p className="text-[8px] text-orange-400 mt-1 font-bold">⚠️ At risk</p>
          )}
        </div>

        {/* Protein Streak */}
        <div className={`rounded-2xl p-3 text-center border transition-all ${
          atRisk.protein
            ? "bg-orange-500/10 border-orange-500/30 animate-pulse"
            : streakData.proteinStreak > 0
            ? "bg-purple-500/10 border-purple-500/20"
            : "bg-background border-border/50"
        }`}>
          <Utensils className={`w-5 h-5 mx-auto mb-1.5 ${
            streakData.proteinStreak > 0 ? "text-purple-400" : "text-zinc-600"
          }`} />
          <p className={`text-xl font-black ${
            streakData.proteinStreak > 0 ? "text-purple-400" : "text-zinc-600"
          }`}>{streakData.proteinStreak}</p>
          <p className="text-[9px] text-zinc-500 uppercase font-bold mt-0.5">Protein</p>
          {atRisk.protein && (
            <p className="text-[8px] text-orange-400 mt-1 font-bold">⚠️ At risk</p>
          )}
        </div>

        {/* Login Streak */}
        <div className={`rounded-2xl p-3 text-center border transition-all ${
          streakData.loginStreak > 0
            ? "bg-blue-500/10 border-blue-500/20"
            : "bg-background border-border/50"
        }`}>
          <LogIn className={`w-5 h-5 mx-auto mb-1.5 ${
            streakData.loginStreak > 0 ? "text-blue-400" : "text-zinc-600"
          }`} />
          <p className={`text-xl font-black ${
            streakData.loginStreak > 0 ? "text-blue-400" : "text-zinc-600"
          }`}>{streakData.loginStreak}</p>
          <p className="text-[9px] text-zinc-500 uppercase font-bold mt-0.5">Login</p>
        </div>
      </div>

      {/* Best streaks */}
      {(streakData.longestWorkoutStreak > 1 || streakData.longestLoginStreak > 1) && (
        <div className="px-4 pb-3 flex items-center justify-center gap-4 text-[10px] text-zinc-500">
          {streakData.longestWorkoutStreak > 1 && (
            <span>Best workout: <strong className="text-zinc-300">{streakData.longestWorkoutStreak} days</strong></span>
          )}
          {streakData.longestLoginStreak > 1 && (
            <span>Best login: <strong className="text-zinc-300">{streakData.longestLoginStreak} days</strong></span>
          )}
        </div>
      )}
    </div>
  );
}
