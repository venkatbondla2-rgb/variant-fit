"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, addDoc, serverTimestamp, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Search, Loader2, UserPlus, Clock, UserCheck, Users, Flame, Sparkles, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/UserAvatar";
import Link from "next/link";

export default function VariantsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [friendsList, setFriendsList] = useState<Set<string>>(new Set());
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [activeFilter, setActiveFilter] = useState<"all" | "friends" | "suggested">("all");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch all users
        const usersSnap = await getDocs(collection(db, "users"));
        const users = usersSnap.docs
          .map(doc => ({ id: doc.id, ...(doc.data() as any) }))
          .filter(u => u.id !== user.uid);
        setAllUsers(users);
        setFilteredUsers(users);

        // Fetch sent pending requests
        const sentQuery = query(
          collection(db, "friend_requests"),
          where("fromId", "==", user.uid),
          where("status", "==", "pending")
        );
        const sentSnap = await getDocs(sentQuery);
        setSentRequests(new Set(sentSnap.docs.map(d => (d.data() as any).toId)));

        // Fetch current user's friends
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const friends: string[] = userDoc.data()?.friends || [];
        setFriendsList(new Set(friends));

        // Fetch streaks for all users
        const streakSnap = await getDocs(collection(db, "streaks"));
        const streakMap: Record<string, number> = {};
        streakSnap.docs.forEach(d => {
          const data = d.data() as any;
          streakMap[d.id] = data.workoutStreak || 0;
        });
        setStreaks(streakMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    let result = allUsers;
    
    // Filter by tab
    if (activeFilter === "friends") {
      result = result.filter(u => friendsList.has(u.id));
    } else if (activeFilter === "suggested") {
      // Suggested = users who are friends of friends but not yet your friend
      result = result.filter(u => !friendsList.has(u.id) && !sentRequests.has(u.id));
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u =>
        u.username?.toLowerCase().includes(q) ||
        u.displayName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }

    setFilteredUsers(result);
  }, [searchQuery, allUsers, activeFilter, friendsList, sentRequests]);

  const sendFriendRequest = async (targetId: string, targetName: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "friend_requests"), {
        fromId: user.uid,
        fromName: user.displayName || "Variant",
        toId: targetId,
        toName: targetName,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "notifications"), {
        userId: targetId,
        type: "friend_request",
        message: `${user.displayName || "Someone"} sent you a friend request!`,
        link: `/profile/${user.uid}`,
        read: false,
        createdAt: serverTimestamp(),
      });

      setSentRequests(prev => new Set([...prev, targetId]));
    } catch (err) {
      console.error(err);
      alert("Failed to send request.");
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="flex flex-col gap-6 pt-6 pb-20 max-w-3xl mx-auto w-full px-4">
      {/* Header */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-border text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand/10 rounded-full blur-3xl -z-10" />
        <Users className="w-12 h-12 text-brand mx-auto mb-4" />
        <h1 className="text-3xl sm:text-4xl font-black mb-2 tracking-tight">All Variants</h1>
        <p className="text-zinc-400 mb-6 max-w-md mx-auto text-sm">
          Discover and connect with the VariantFit community. Send friend requests and start training together.
        </p>

        {/* Stats */}
        <div className="flex justify-center gap-6 mb-6">
          <div className="text-center">
            <p className="text-2xl font-black text-brand">{allUsers.length}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-green-400">{friendsList.size}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold">Friends</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-yellow-400">{sentRequests.size}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold">Pending</p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-background rounded-2xl p-2 border border-border flex items-center max-w-md w-full mx-auto shadow-sm">
          <Search className="w-5 h-5 text-zinc-500 ml-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="bg-transparent border-none focus:outline-none px-4 w-full text-sm h-10"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {[
          { key: "all", label: "All Variants", icon: Users },
          { key: "friends", label: "My Friends", icon: UserCheck },
          { key: "suggested", label: "Suggested", icon: Sparkles },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
              activeFilter === tab.key
                ? "bg-brand/10 border-brand/40 text-brand"
                : "bg-surface border-border text-zinc-400 hover:border-zinc-500"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {loadingUsers ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-16 opacity-50">
          <Users className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No users found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredUsers.map(u => {
            const name = u.username || u.displayName || u.email?.split("@")[0] || "Variant";
            const isFriend = friendsList.has(u.id);
            const isPending = sentRequests.has(u.id);
            const userStreak = streaks[u.id] || 0;

            return (
              <div key={u.id} className={`bg-surface border rounded-2xl p-4 flex items-center justify-between gap-3 transition-all hover:shadow-md ${
                isFriend ? "border-green-500/20 hover:border-green-500/40" : "border-border hover:border-brand/30"
              }`}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <UserAvatar userId={u.id} username={name} size="md" showName={false} />
                  <div className="overflow-hidden flex-1">
                    <Link href={`/profile/${u.id}`} className="font-bold text-sm truncate block hover:text-brand transition-colors">{name}</Link>
                    {u.bio && <p className="text-[10px] text-zinc-500 truncate">{u.bio}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      {userStreak > 0 && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded-full">
                          <Flame className="w-2.5 h-2.5" /> {userStreak}
                        </span>
                      )}
                      {isFriend && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full">
                          <UserCheck className="w-2.5 h-2.5" /> Friend
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isFriend ? (
                    <Link href="/messages">
                      <Button variant="outline" size="sm" className="gap-1 text-brand border-brand/30 hover:bg-brand hover:text-black h-8 text-xs">
                        <MessageCircle className="w-3.5 h-3.5" /> Chat
                      </Button>
                    </Link>
                  ) : isPending ? (
                    <Button variant="outline" disabled size="sm" className="gap-1 opacity-60 h-8 text-xs">
                      <Clock className="w-3.5 h-3.5" /> Sent
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendFriendRequest(u.id, name)}
                      className="gap-1 text-brand border-brand/30 hover:bg-brand hover:text-black h-8 text-xs"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Add
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
