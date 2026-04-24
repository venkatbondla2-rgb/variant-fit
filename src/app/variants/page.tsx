"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, addDoc, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Search, Loader2, UserPlus, Clock, UserCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/UserAvatar";

export default function VariantsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [friendsList, setFriendsList] = useState<Set<string>>(new Set());

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
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(allUsers);
      return;
    }
    const q = searchQuery.toLowerCase();
    setFilteredUsers(
      allUsers.filter(u =>
        u.username?.toLowerCase().includes(q) ||
        u.displayName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      )
    );
  }, [searchQuery, allUsers]);

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
    <div className="flex flex-col gap-6 pt-6 pb-20">
      <div className="bg-surface rounded-3xl p-8 border border-border text-center">
        <Users className="w-12 h-12 text-brand mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">All Variants</h1>
        <p className="text-zinc-400 mb-6 max-w-md mx-auto">
          Discover and connect with the VariantFit community. Send friend requests and start training together.
        </p>

        {/* Search */}
        <div className="bg-background rounded-2xl p-2 border border-border flex items-center max-w-md w-full mx-auto mb-4 shadow-sm">
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

      {loadingUsers ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <p className="text-center text-zinc-500 py-10">No users found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredUsers.map(u => {
            const name = u.username || u.displayName || u.email?.split("@")[0] || "Variant";
            const isFriend = friendsList.has(u.id);
            const isPending = sentRequests.has(u.id);

            return (
              <div key={u.id} className="bg-surface border border-border rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-brand/30 transition-colors">
                <UserAvatar userId={u.id} username={name} size="md" />
                <div className="flex-shrink-0">
                  {isFriend ? (
                    <Button variant="outline" disabled size="sm" className="gap-1 text-green-500 border-green-500/30">
                      <UserCheck className="w-4 h-4" /> Friends
                    </Button>
                  ) : isPending ? (
                    <Button variant="outline" disabled size="sm" className="gap-1 opacity-60">
                      <Clock className="w-4 h-4" /> Sent
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendFriendRequest(u.id, name)}
                      className="gap-1 text-brand border-brand/30 hover:bg-brand hover:text-black"
                    >
                      <UserPlus className="w-4 h-4" /> Add
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
