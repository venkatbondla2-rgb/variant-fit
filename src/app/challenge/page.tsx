"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, updateDoc, doc, arrayUnion, arrayRemove, getDoc, getDocs, query, where, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trophy, Users, CheckCircle, Dumbbell, Flame, Target, Medal, Crown, Star, ChevronDown, ChevronUp, TrendingUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/UserAvatar";
import Link from "next/link";

const CHALLENGE_CATEGORIES = [
  { key: "all", label: "All", icon: Trophy },
  { key: "strength", label: "Strength", icon: Dumbbell },
  { key: "consistency", label: "Consistency", icon: Flame },
  { key: "endurance", label: "Endurance", icon: TrendingUp },
  { key: "community", label: "Community", icon: Users },
];

const BADGE_ICONS: Record<string, { icon: any; color: string }> = {
  gold: { icon: Crown, color: "text-yellow-400" },
  silver: { icon: Medal, color: "text-zinc-300" },
  bronze: { icon: Medal, color: "text-orange-400" },
  participant: { icon: Star, color: "text-blue-400" },
};

export default function ChallengePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});
  const [userStreaks, setUserStreaks] = useState<Record<string, number>>({});
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [newCategory, setNewCategory] = useState("strength");
  const [newIsPremium, setNewIsPremium] = useState(false);
  const [creating, setCreating] = useState(false);

  const [activePlan, setActivePlan] = useState<"free" | "pro" | "elite">("free");

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          let plan = "free";
          if (data.subscription && data.subscription.expiresAt) {
            const expires = data.subscription.expiresAt.toDate ? data.subscription.expiresAt.toDate() : new Date(data.subscription.expiresAt);
            if (expires > new Date()) {
              plan = data.subscription.plan || "free";
            }
          }
          setActivePlan(plan as any);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadProfile();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "challenges"), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setChallenges(data);

      // Collect all unique participant IDs
      const allIds = new Set<string>();
      data.forEach(c => (c.participants || []).forEach((id: string) => allIds.add(id)));
      fetchParticipantNames(Array.from(allIds));
    });
    return () => unsub();
  }, [user]);

  // Load streak data for leaderboard
  useEffect(() => {
    if (!user) return;
    const loadStreaks = async () => {
      try {
        const snap = await getDocs(collection(db, "streaks"));
        const streaks: Record<string, number> = {};
        snap.docs.forEach(d => {
          const data = d.data() as any;
          streaks[d.id] = data.workoutStreak || 0;
        });
        setUserStreaks(streaks);
      } catch {}
    };
    loadStreaks();
  }, [user]);

  const fetchParticipantNames = async (ids: string[]) => {
    const names: Record<string, string> = {};
    for (const id of ids) {
      if (participantNames[id]) { names[id] = participantNames[id]; continue; }
      try {
        const snap = await getDoc(doc(db, "users", id));
        if (snap.exists()) {
          const data = snap.data() as any;
          names[id] = data.username || data.displayName || data.email?.split("@")[0] || "Variant";
        }
      } catch {}
    }
    setParticipantNames(prev => ({ ...prev, ...names }));
  };

  const joinChallenge = async (id: string) => {
    if (!user) return;
    const challenge = challenges.find(c => c.id === id);
    if (challenge?.isPremium && activePlan !== "elite") {
      alert("Premium challenges are exclusive to Elite plan members. Please upgrade your subscription!");
      router.push("/premium");
      return;
    }
    setJoiningId(id);
    try {
      await updateDoc(doc(db, "challenges", id), {
        participants: arrayUnion(user.uid),
      });
      // Send notification to challenge creator
      const challenge = challenges.find(c => c.id === id);
      if (challenge?.createdBy && challenge.createdBy !== user.uid) {
        await addDoc(collection(db, "notifications"), {
          userId: challenge.createdBy,
          type: "challenge_join",
          message: `${user.displayName || "Someone"} joined your challenge "${challenge.title}"!`,
          link: "/challenge",
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to join challenge.");
    } finally {
      setJoiningId(null);
    }
  };

  const leaveChallenge = async (id: string) => {
    if (!user) return;
    setJoiningId(id);
    try {
      await updateDoc(doc(db, "challenges", id), {
        participants: arrayRemove(user.uid),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setJoiningId(null);
    }
  };

  const handleCreateChallenge = async () => {
    if (!user || !newTitle.trim()) return;
    if (newIsPremium && activePlan !== "elite") {
      alert("Creating premium challenges is exclusive to Elite plan members. Please upgrade your subscription!");
      router.push("/premium");
      return;
    }
    setCreating(true);
    try {
      await addDoc(collection(db, "challenges"), {
        title: newTitle.trim(),
        description: newDesc.trim(),
        duration: newDuration.trim() || "7 days",
        category: newCategory,
        participantsCount: 1,
        participants: [user.uid],
        createdBy: user.uid,
        isPremium: newIsPremium,
        createdAt: serverTimestamp()
      });
      setShowCreateModal(false);
      setNewTitle("");
      setNewDesc("");
      setNewDuration("");
      setNewIsPremium(false);
    } catch (err) {
      console.error(err);
      alert("Failed to create challenge.");
    } finally {
      setCreating(false);
    }
  };

  if (!user) return null;

  const filteredChallenges = activeCategory === "all"
    ? challenges
    : challenges.filter(c => c.category === activeCategory);

  const joinedCount = challenges.filter(c => (c.participants || []).includes(user.uid)).length;

  return (
    <div className="flex flex-col gap-6 pt-6 pb-20 max-w-3xl mx-auto w-full px-4">
      {/* Header */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-border text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand/10 rounded-full blur-3xl -z-10" />
        <Trophy className="w-14 h-14 text-brand mb-4 mx-auto" />
        <h1 className="text-3xl sm:text-4xl font-black mb-2 tracking-tight">Challenge Variants</h1>
        <p className="text-zinc-400 mb-4 max-w-md mx-auto text-sm">
          Compete with your Variants in strength, consistency, and endurance challenges.
        </p>

        {/* Stats bar */}
        <div className="flex justify-center gap-6 mt-4">
          <div className="text-center">
            <p className="text-2xl font-black text-brand">{challenges.length}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold">Active</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-green-400">{joinedCount}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold">Joined</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-yellow-400">
              {challenges.reduce((acc, c) => acc + (c.participants?.length || 0), 0)}
            </p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold">Total Athletes</p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 flex-1">
          {CHALLENGE_CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
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
        <Button onClick={() => setShowCreateModal(true)} size="sm" className="bg-brand text-black font-bold whitespace-nowrap shrink-0">
          <Plus className="w-4 h-4 mr-1" /> Create
        </Button>
      </div>

      {/* Challenges List */}
      <div className="flex flex-col gap-4">
        {filteredChallenges.length === 0 ? (
          <div className="text-center py-16 opacity-50">
            <Trophy className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 italic">No challenges in this category yet.</p>
          </div>
        ) : (
          filteredChallenges.map(c => {
            const participants: string[] = c.participants || [];
            const isJoined = participants.includes(user.uid);
            const isExpanded = expandedId === c.id;
            const categoryConfig = CHALLENGE_CATEGORIES.find(cat => cat.key === c.category);

            // Sort participants by streak for leaderboard
            const sortedParticipants = [...participants].sort((a, b) => (userStreaks[b] || 0) - (userStreaks[a] || 0));

            return (
              <div key={c.id} className={`bg-surface rounded-3xl border overflow-hidden transition-all ${
                isJoined ? "border-brand/40 shadow-[0_0_20px_rgba(234,255,102,0.06)]" : "border-border"
              }`}>
                {/* Category badge */}
                <div className="bg-gradient-to-r from-brand/5 to-transparent px-5 py-1.5 flex items-center justify-between border-b border-border/30">
                  {categoryConfig && c.category && (
                    <div className="flex items-center gap-2">
                      <categoryConfig.icon className="w-3 h-3 text-brand" />
                      <span className="text-[10px] font-black text-brand uppercase tracking-wider">{categoryConfig.label}</span>
                    </div>
                  )}
                  {c.isPremium && (
                    <span className="bg-yellow-500/20 text-yellow-400 text-[9px] uppercase font-black px-2 py-0.5 rounded-full flex items-center gap-1 border border-yellow-500/30">
                      👑 Premium (Elite)
                    </span>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-black text-lg">{c.title}</h4>
                        {isJoined && (
                          <span className="bg-brand/20 text-brand text-[9px] uppercase font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Joined
                          </span>
                        )}
                      </div>
                      {c.description && <p className="text-sm text-zinc-400 mb-3">{c.description}</p>}
                      
                      {/* Goal indicator */}
                      {c.goal && (
                        <div className="flex items-center gap-2 mb-3">
                          <Target className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-xs text-blue-400 font-bold">Goal: {c.goal}</span>
                        </div>
                      )}

                      {/* Duration */}
                      {c.duration && (
                        <span className="text-[10px] text-zinc-500 bg-background px-2 py-0.5 rounded-full border border-border">
                          {c.duration}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {isJoined ? (
                        <Button
                          onClick={() => leaveChallenge(c.id)}
                          disabled={joiningId === c.id}
                          size="sm"
                          variant="outline"
                          className="text-red-400 border-red-500/30 hover:bg-red-500/10 text-xs"
                        >
                          Leave
                        </Button>
                      ) : (
                        <Button
                          onClick={() => joinChallenge(c.id)}
                          disabled={joiningId === c.id}
                          size="sm"
                          className="bg-brand text-black hover:brightness-110 font-bold text-xs"
                        >
                          {joiningId === c.id ? "..." : "Join Challenge"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Participants bar */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-sm text-zinc-400">
                        <Users className="w-4 h-4" />
                        <span className="font-bold text-white">{participants.length}</span> enrolled
                      </div>
                      {participants.length > 0 && (
                        <div className="flex -space-x-2">
                          {participants.slice(0, 5).map((uid) => (
                            <div key={uid} className="w-7 h-7 rounded-full border-2 border-surface overflow-hidden bg-zinc-800">
                              <UserAvatar userId={uid} username="" size="sm" showName={false} className="w-full h-full" />
                            </div>
                          ))}
                          {participants.length > 5 && (
                            <div className="w-7 h-7 rounded-full border-2 border-surface bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300">
                              +{participants.length - 5}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Expand leaderboard */}
                    {participants.length > 0 && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : c.id)}
                        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-brand transition-colors"
                      >
                        <Trophy className="w-3 h-3" />
                        Leaderboard
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Leaderboard */}
                {isExpanded && (
                  <div className="border-t border-border/30 bg-background/50 p-4">
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Trophy className="w-3 h-3 text-brand" /> Leaderboard — By Workout Streak
                    </h4>
                    <div className="flex flex-col gap-2">
                      {sortedParticipants.map((uid, idx) => {
                        const streak = userStreaks[uid] || 0;
                        const badge = idx === 0 ? "gold" : idx === 1 ? "silver" : idx === 2 ? "bronze" : "participant";
                        const badgeConfig = BADGE_ICONS[badge];

                        return (
                          <div
                            key={uid}
                            className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                              uid === user.uid ? "bg-brand/10 border border-brand/20" : "hover:bg-surface"
                            }`}
                          >
                            <span className={`text-xs font-black w-6 text-center ${idx < 3 ? badgeConfig.color : "text-zinc-600"}`}>
                              {idx < 3 ? <badgeConfig.icon className="w-4 h-4 mx-auto" /> : `#${idx + 1}`}
                            </span>
                            <UserAvatar userId={uid} username={participantNames[uid] || "Variant"} size="sm" />
                            <div className="ml-auto flex items-center gap-1.5">
                              <Flame className={`w-3.5 h-3.5 ${streak > 0 ? "text-orange-400" : "text-zinc-600"}`} />
                              <span className="text-sm font-bold">{streak}</span>
                              <span className="text-[10px] text-zinc-500">day streak</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create Challenge Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-surface rounded-3xl border border-border p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-brand" /> Create Challenge
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-zinc-500 font-bold uppercase mb-1 block">Title</label>
                <input 
                  type="text" 
                  value={newTitle} 
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. 100 Pushups a Day"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand"
                />
              </div>
              
              <div>
                <label className="text-xs text-zinc-500 font-bold uppercase mb-1 block">Category</label>
                <select 
                  value={newCategory} 
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand"
                >
                  {CHALLENGE_CATEGORIES.filter(c => c.key !== "all").map(c => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-500 font-bold uppercase mb-1 block">Description (optional)</label>
                <textarea 
                  value={newDesc} 
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="What's the goal of this challenge?"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand min-h-[80px] resize-none"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 font-bold uppercase mb-1 block">Duration (optional)</label>
                <input 
                  type="text" 
                  value={newDuration} 
                  onChange={e => setNewDuration(e.target.value)}
                  placeholder="e.g. 30 days"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand"
                />
              </div>

              <div className="flex items-center gap-2 py-2">
                <input 
                  type="checkbox" 
                  id="premiumCheck"
                  checked={newIsPremium} 
                  onChange={e => setNewIsPremium(e.target.checked)}
                  className="rounded border-zinc-700 bg-background text-brand focus:ring-brand w-4 h-4"
                />
                <label htmlFor="premiumCheck" className="text-xs font-bold text-zinc-300 cursor-pointer">
                  👑 Premium Challenge (Elite Exclusive)
                </label>
              </div>

              <Button 
                onClick={handleCreateChallenge} 
                disabled={!newTitle.trim() || creating}
                className="w-full bg-brand text-black font-bold h-12 mt-2"
              >
                {creating ? "Creating..." : "Launch Challenge"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
