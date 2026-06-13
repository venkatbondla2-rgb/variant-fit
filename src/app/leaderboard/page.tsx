"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, getDocs, doc, getDoc, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trophy, Flame, Dumbbell, TrendingUp, Crown, Medal, Loader2, BarChart3, Search } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import Link from "next/link";

const LEADERBOARD_CATEGORIES = [
  { key: "streak", label: "Workout Streak", icon: Flame, color: "text-orange-400" },
  { key: "workouts", label: "Total Workouts", icon: Dumbbell, color: "text-blue-400" },
  { key: "consistency", label: "Consistency", icon: TrendingUp, color: "text-green-400" },
];

interface LeaderboardEntry {
  userId: string;
  username: string;
  value: number;
  rank: number;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState("streak");
  const [searchQuery, setSearchQuery] = useState("");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    loadLeaderboard();
  }, [user, activeCategory]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

      let leaderboard: LeaderboardEntry[] = [];

      if (activeCategory === "streak") {
        const streakSnap = await getDocs(collection(db, "streaks"));
        const streakMap: Record<string, number> = {};
        streakSnap.docs.forEach(d => {
          const data = d.data() as any;
          streakMap[d.id] = Math.max(data.workoutStreak || 0, data.longestWorkoutStreak || 0);
        });

        leaderboard = allUsers.map(u => ({
          userId: u.id,
          username: u.username || u.displayName || u.email?.split("@")[0] || "Variant",
          value: streakMap[u.id] || 0,
          rank: 0,
        }));
      } else if (activeCategory === "workouts") {
        // Count workouts per user
        const workoutSnap = await getDocs(collection(db, "workouts"));
        const workoutCount: Record<string, number> = {};
        workoutSnap.docs.forEach(d => {
          const data = d.data() as any;
          if (data.userId) {
            workoutCount[data.userId] = (workoutCount[data.userId] || 0) + 1;
          }
        });

        leaderboard = allUsers.map(u => ({
          userId: u.id,
          username: u.username || u.displayName || u.email?.split("@")[0] || "Variant",
          value: workoutCount[u.id] || 0,
          rank: 0,
        }));
      } else if (activeCategory === "consistency") {
        // Consistency = unique workout days in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const workoutSnap = await getDocs(query(
          collection(db, "workouts"),
          where("createdAt", ">=", thirtyDaysAgo),
          orderBy("createdAt", "desc")
        ));

        const dayMap: Record<string, Set<string>> = {};
        workoutSnap.docs.forEach(d => {
          const data = d.data() as any;
          if (data.userId) {
            if (!dayMap[data.userId]) dayMap[data.userId] = new Set();
            const date = data.dateString || data.createdAt?.toDate?.()?.toISOString()?.split("T")[0] || "";
            if (date) dayMap[data.userId].add(date);
          }
        });

        leaderboard = allUsers.map(u => ({
          userId: u.id,
          username: u.username || u.displayName || u.email?.split("@")[0] || "Variant",
          value: dayMap[u.id]?.size || 0,
          rank: 0,
        }));
      }

      // Sort and rank
      leaderboard.sort((a, b) => b.value - a.value);
      leaderboard.forEach((entry, i) => { entry.rank = i + 1; });

      // Find user rank
      const myEntry = leaderboard.find(e => e.userId === user?.uid);
      setUserRank(myEntry?.rank || null);

      setEntries(leaderboard.filter(e => e.value > 0));
    } catch (err) {
      console.error("Leaderboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const catConfig = LEADERBOARD_CATEGORIES.find(c => c.key === activeCategory)!;

  return (
    <div className="flex flex-col gap-6 pt-6 pb-20 max-w-3xl mx-auto w-full px-4">
      {/* Header */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-border text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand/10 rounded-full blur-3xl -z-10" />
        <Trophy className="w-14 h-14 text-brand mx-auto mb-4" />
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">Leaderboard</h1>
        <p className="text-sm text-zinc-400 mb-4 max-w-md mx-auto">
          See how you stack up against other Variants. Stay consistent and climb the ranks!
        </p>
        {userRank && (
          <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/30 rounded-full px-4 py-2">
            <BarChart3 className="w-4 h-4 text-brand" />
            <span className="text-sm font-bold">Your Rank: <span className="text-brand">#{userRank}</span></span>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-surface rounded-xl flex items-center px-4 py-3 border border-border focus-within:border-brand transition-colors">
        <Search className="w-5 h-5 text-zinc-500 mr-3" />
        <input 
          type="text" 
          placeholder="Search variants..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="bg-transparent border-none text-white focus:outline-none w-full"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 justify-center">
        {LEADERBOARD_CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold border transition-all ${
              activeCategory === cat.key
                ? "bg-brand/10 border-brand/40 text-brand"
                : "bg-surface border-border text-zinc-400 hover:border-zinc-500"
            }`}
          >
            <cat.icon className="w-3.5 h-3.5" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Leaderboard list */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 opacity-50">
          <Trophy className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No data yet. Start working out to appear on the leaderboard!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Top 3 podium */}
          {entries.length >= 3 && (
            <div className="flex items-end justify-center gap-3 mb-4">
              {/* 2nd place */}
              <div className="flex flex-col items-center">
                <UserAvatar userId={entries[1].userId} username={entries[1].username} size="md" showName={false} />
                <div className="bg-surface border border-zinc-400/30 rounded-xl p-3 mt-2 text-center min-w-[90px]">
                  <Medal className="w-5 h-5 text-zinc-300 mx-auto mb-1" />
                  <p className="text-xs font-bold truncate">{entries[1].username}</p>
                  <p className={`text-sm font-black ${catConfig.color}`}>{entries[1].value}</p>
                </div>
              </div>
              {/* 1st place */}
              <div className="flex flex-col items-center -mt-4">
                <div className="relative">
                  <UserAvatar userId={entries[0].userId} username={entries[0].username} size="lg" showName={false} />
                  <Crown className="w-6 h-6 text-yellow-400 absolute -top-3 left-1/2 -translate-x-1/2" />
                </div>
                <div className="bg-gradient-to-b from-yellow-500/10 to-surface border border-yellow-500/30 rounded-xl p-4 mt-2 text-center min-w-[100px]">
                  <p className="text-sm font-bold truncate">{entries[0].username}</p>
                  <p className={`text-lg font-black ${catConfig.color}`}>{entries[0].value}</p>
                  <span className="text-[9px] text-yellow-400 font-black uppercase">Champion</span>
                </div>
              </div>
              {/* 3rd place */}
              <div className="flex flex-col items-center mt-2">
                <UserAvatar userId={entries[2].userId} username={entries[2].username} size="md" showName={false} />
                <div className="bg-surface border border-orange-400/30 rounded-xl p-3 mt-2 text-center min-w-[90px]">
                  <Medal className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                  <p className="text-xs font-bold truncate">{entries[2].username}</p>
                  <p className={`text-sm font-black ${catConfig.color}`}>{entries[2].value}</p>
                </div>
              </div>
            </div>
          )}

          {/* Remaining entries */}
          {entries.slice(entries.length >= 3 ? 3 : 0).filter(e => e.username.toLowerCase().includes(searchQuery.toLowerCase())).map(entry => {
            const isMe = entry.userId === user?.uid;
            return (
              <Link href={`/profile/${entry.userId}`} key={entry.userId}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isMe ? "bg-brand/10 border border-brand/20" : "bg-surface border border-border hover:border-brand/30"
                }`}
              >
                <span className={`w-8 text-center text-sm font-black ${
                  entry.rank <= 3 ? "text-yellow-400" : "text-zinc-600"
                }`}>
                  #{entry.rank}
                </span>
                <UserAvatar userId={entry.userId} username={entry.username} size="sm" showName={false} />
                <span className="text-sm font-bold flex-1 truncate">{entry.username}</span>
                <div className="flex items-center gap-1.5">
                  <catConfig.icon className={`w-4 h-4 ${catConfig.color}`} />
                  <span className="text-sm font-black">{entry.value}</span>
                </div>
                {isMe && <span className="text-[9px] text-brand font-bold bg-brand/20 px-1.5 py-0.5 rounded-full">YOU</span>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
