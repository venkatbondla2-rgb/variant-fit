"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BADGES, RARITY_CONFIG, type Badge, checkNewBadges, type UserBadgeData } from "@/lib/badges";
import { Award, Lock } from "lucide-react";

interface BadgeShowcaseProps {
  userId?: string;
  compact?: boolean;
}

export function BadgeShowcase({ userId, compact = false }: BadgeShowcaseProps) {
  const { user } = useAuth();
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const targetUserId = userId || user?.uid;

  useEffect(() => {
    if (!targetUserId) return;
    const load = async () => {
      try {
        // Get user stats
        const userDoc = await getDoc(doc(db, "users", targetUserId));
        const userData = userDoc.data() as any;

        // Count workouts
        const workoutSnap = await getDocs(query(collection(db, "workouts"), where("userId", "==", targetUserId)));
        
        // Count posts
        const postSnap = await getDocs(query(collection(db, "posts"), where("userId", "==", targetUserId)));
        
        // Count progress photos
        const photoSnap = await getDocs(query(collection(db, "progress_photos"), where("userId", "==", targetUserId)));

        // Count challenges
        const challengeSnap = await getDocs(collection(db, "challenges"));
        const challengeCount = challengeSnap.docs.filter(d => 
          (d.data().participants || []).includes(targetUserId)
        ).length;

        // Get streak data
        const streakDoc = await getDoc(doc(db, "streaks", targetUserId));
        const streakData = streakDoc.exists() ? streakDoc.data() as any : {};

        // Count PRs (unique exercises with max weights)
        const workoutDocs = workoutSnap.docs.map(d => d.data() as any);
        const prMap: Record<string, number> = {};
        workoutDocs.forEach(w => {
          if (w.weight > 0) {
            const key = w.exerciseName?.toLowerCase();
            if (!prMap[key] || w.weight > prMap[key]) {
              prMap[key] = w.weight;
            }
          }
        });

        const badgeData: UserBadgeData = {
          unlockedBadges: userData?.unlockedBadges || [],
          stats: {
            workouts: workoutSnap.size,
            streak: streakData.workoutStreak || 0,
            longestStreak: streakData.longestWorkoutStreak || 0,
            posts: postSnap.size,
            friends: userData?.friends?.length || 0,
            communities: 0, // will be counted differently
            prs: Object.keys(prMap).length,
            challenges: challengeCount,
            progress_photos: photoSnap.size,
          },
        };

        // Count communities joined
        const communitySnap = await getDocs(collection(db, "communities"));
        badgeData.stats.communities = communitySnap.docs.filter(d => 
          (d.data().members || []).includes(targetUserId)
        ).length;

        // Check which badges are unlocked
        const newUnlocked = checkNewBadges(badgeData);
        const allUnlocked = [...(userData?.unlockedBadges || []), ...newUnlocked.map(b => b.id)];
        const unique = [...new Set(allUnlocked)];
        setUnlockedBadges(unique);
      } catch (err) {
        console.error("Badge load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [targetUserId]);

  if (loading) return null;

  const categories = ["workout", "streak", "social", "milestone"] as const;

  if (compact) {
    // Show only unlocked badges in a single row
    const earned = BADGES.filter(b => unlockedBadges.includes(b.id));
    if (earned.length === 0) return null;
    
    return (
      <div className="flex gap-1 flex-wrap">
        {earned.slice(0, 6).map(b => (
          <span key={b.id} title={`${b.name}: ${b.description}`}
            className="text-lg cursor-default hover:scale-125 transition-transform">
            {b.icon}
          </span>
        ))}
        {earned.length > 6 && (
          <span className="text-xs text-zinc-500 self-center">+{earned.length - 6}</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
      <div className="px-5 py-3 border-b border-border/30 flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Award className="w-4 h-4 text-yellow-400" />
          Achievement Badges
        </h3>
        <span className="text-[10px] text-zinc-500">
          <span className="text-brand font-bold">{unlockedBadges.length}</span>/{BADGES.length} unlocked
        </span>
      </div>

      <div className="p-4">
        {categories.map(cat => {
          const catBadges = BADGES.filter(b => b.category === cat);
          const catLabel = cat === "workout" ? "💪 Workout" : cat === "streak" ? "🔥 Streak" : cat === "social" ? "👥 Social" : "🎯 Milestones";

          return (
            <div key={cat} className="mb-4 last:mb-0">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-2">{catLabel}</p>
              <div className="grid grid-cols-5 gap-2">
                {catBadges.map(badge => {
                  const isUnlocked = unlockedBadges.includes(badge.id);
                  const rarity = RARITY_CONFIG[badge.rarity];

                  return (
                    <button
                      key={badge.id}
                      onClick={() => setSelectedBadge(selectedBadge?.id === badge.id ? null : badge)}
                      className={`relative flex flex-col items-center p-2 rounded-xl border transition-all ${
                        isUnlocked
                          ? `${rarity.bg} hover:scale-105`
                          : "bg-background/50 border-border/30 opacity-40 grayscale"
                      }`}
                    >
                      <span className="text-2xl mb-0.5">{badge.icon}</span>
                      {!isUnlocked && (
                        <Lock className="w-3 h-3 text-zinc-600 absolute top-1 right-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected badge detail */}
      {selectedBadge && (
        <div className="px-4 pb-4">
          <div className={`rounded-xl p-3 border ${RARITY_CONFIG[selectedBadge.rarity].bg}`}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{selectedBadge.icon}</span>
              <div>
                <p className="font-bold text-sm">{selectedBadge.name}</p>
                <p className="text-[10px] text-zinc-400">{selectedBadge.description}</p>
                <span className={`text-[9px] font-black uppercase ${RARITY_CONFIG[selectedBadge.rarity].color}`}>
                  {RARITY_CONFIG[selectedBadge.rarity].label}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
