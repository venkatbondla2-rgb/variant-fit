"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { UserPlus, Search, Loader2, Clock, UserCheck } from "lucide-react";
import { collection, query, limit, onSnapshot, getDocs, addDoc, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { AdCard } from "@/components/feed/AdCard";
import Link from "next/link";

export function RightSidebar() {
  const { user } = useAuth();
  
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [friends, setFriends] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users"), limit(10));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList = snapshot.docs
         .map(doc => ({ id: doc.id, ...doc.data() }))
         .filter((u: any) => u.id !== user.uid)
         .slice(0, 5);
      setSuggestions(usersList);
    });

    return () => unsubscribe();
  }, [user]);

  // Load sent requests and friend list on mount
  useEffect(() => {
    if (!user) return;

    const loadFriendData = async () => {
      try {
        // Get sent pending requests  
        const sentQuery = query(
          collection(db, "friend_requests"),
          where("fromId", "==", user.uid),
          where("status", "==", "pending")
        );
        const sentSnap = await getDocs(sentQuery);
        const sentIds = new Set(sentSnap.docs.map(d => (d.data() as any).toId));
        setSentRequests(sentIds);
      } catch (err) {
        console.error("Error loading friend data:", err);
      }
    };

    loadFriendData();
  }, [user]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    setIsSearching(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const results = snap.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as any) }))
        .filter(u => u.id !== user.uid && (
          u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchQuery.toLowerCase())
        ))
        .slice(0, 5);
      setSearchResults(results);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

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
      console.error("Failed to send friend request:", err);
      alert("Failed to send friend request.");
    }
  };

  const getFriendButton = (userId: string, userName: string) => {
    if (friends.has(userId)) {
      return (
        <div className="flex items-center gap-1 text-green-500 text-[10px] font-bold">
          <UserCheck className="w-3 h-3" /> Friends
        </div>
      );
    }
    if (sentRequests.has(userId)) {
      return (
        <div className="flex items-center gap-1 text-zinc-500 text-[10px] font-bold">
          <Clock className="w-3 h-3" /> Sent
        </div>
      );
    }
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => { e.stopPropagation(); sendFriendRequest(userId, userName); }}
        className="h-8 w-8 p-0 rounded-full hover:bg-brand hover:text-black hover:border-brand transition-all flex-shrink-0"
      >
        <UserPlus className="w-4 h-4" />
      </Button>
    );
  };

  if (!user) return null;

  return (
    <div className="hidden xl:flex flex-col w-80 h-screen fixed right-0 top-0 border-l border-border p-6 bg-background/95 backdrop-blur z-40 overflow-y-auto">
      
      {/* Search Bar */}
      <div className="mb-8">
        <div className="flex items-center bg-surface border border-border rounded-full overflow-hidden">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search Variants..." 
            className="flex-1 bg-transparent border-none px-4 py-2 text-sm focus:outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="p-2 pr-3 text-zinc-400 hover:text-brand transition-colors"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-3 bg-surface border border-border rounded-2xl p-3 flex flex-col gap-2">
            <p className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Results</p>
            {searchResults.map(s => (
              <div key={s.id} className="flex items-center justify-between group">
                <UserAvatar userId={s.id} username={s.username || s.email?.split("@")[0]} size="sm" />
                {getFriendButton(s.id, s.username || s.email?.split("@")[0] || "Variant")}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggested Variants (Friend Recommendations) */}
      <div className="mb-8 p-5 bg-surface rounded-3xl border border-border shadow-sm">
        <h3 className="font-bold text-sm mb-4">Live Variants</h3>
        <div className="flex flex-col gap-4">
          {suggestions.length === 0 && <p className="text-xs text-zinc-500">No other variants yet.</p>}
          {suggestions.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <UserAvatar userId={s.id} username={s.displayName || s.email?.split("@")[0]} size="sm" showName={false} />
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-surface"></div>
                </div>
                <div className="overflow-hidden">
                  <Link href={`/profile/${s.id}`} className="text-sm font-medium truncate block hover:text-brand transition-colors">
                    {s.displayName || s.username || s.email?.split("@")[0] || "Variant"}
                  </Link>
                </div>
              </div>
              {getFriendButton(s.id, s.displayName || s.username || s.email?.split("@")[0] || "Variant")}
            </div>
          ))}
        </div>
        <Link href="/variants" className="block w-full text-brand text-xs font-medium mt-4 hover:underline text-center">
          View all variants
        </Link>
      </div>

      {/* Dynamic Ad from Firestore */}
      <AdCard />
      
      <div className="mt-auto pt-6 text-xs text-zinc-600 flex flex-wrap gap-x-3 gap-y-1">
        <a href="#" className="hover:text-zinc-400">About</a>
        <a href="#" className="hover:text-zinc-400">Help Center</a>
        <a href="#" className="hover:text-zinc-400">Terms</a>
        <a href="#" className="hover:text-zinc-400">Privacy Policy</a>
        <a href="#" className="hover:text-zinc-400">Ads Info</a>
        <span className="text-zinc-700 w-full mt-2">© 2026 Variant Fit</span>
      </div>
    </div>
  );
}
