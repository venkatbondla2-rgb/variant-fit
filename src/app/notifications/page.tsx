"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch, getDocs, addDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Bell, CheckCircle2, MessageCircle, Heart, BellRing, Activity, UserPlus, UserCheck, Dumbbell } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Load pending friend requests
  useEffect(() => {
    if (!user) return;
    
    const loadRequests = async () => {
      try {
        const q = query(
          collection(db, "friend_requests"),
          where("toId", "==", user.uid),
          where("status", "==", "pending")
        );
        const snap = await getDocs(q);
        setPendingRequests(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      } catch (err) {
        console.error("Error loading friend requests:", err);
      }
    };

    loadRequests();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, "notifications", n.id), { read: true });
    });
    try {
      await batch.commit();
    } catch (err) {
      console.error(err);
    }
  };

  const acceptFriendRequest = async (request: any) => {
    if (!user) return;
    setAcceptingId(request.id);
    try {
      // Update request status
      await updateDoc(doc(db, "friend_requests", request.id), {
        status: "accepted"
      });

      // Add each other to friends arrays
      await updateDoc(doc(db, "users", user.uid), {
        friends: arrayUnion(request.fromId)
      });
      await updateDoc(doc(db, "users", request.fromId), {
        friends: arrayUnion(user.uid)
      });

      // Notify sender
      await addDoc(collection(db, "notifications"), {
        userId: request.fromId,
        type: "friend_accepted",
        message: `${user.displayName || "Someone"} accepted your friend request!`,
        link: `/profile/${user.uid}`,
        read: false,
        createdAt: serverTimestamp(),
      });

      // Remove from local list
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (err) {
      console.error(err);
      alert("Failed to accept request.");
    } finally {
      setAcceptingId(null);
    }
  };

  const declineFriendRequest = async (request: any) => {
    if (!user) return;
    setAcceptingId(request.id);
    try {
      await updateDoc(doc(db, "friend_requests", request.id), {
        status: "declined"
      });
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (err) {
      console.error(err);
    } finally {
      setAcceptingId(null);
    }
  };

  if (!user) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case "comment": return <MessageCircle className="w-5 h-5 text-blue-400" />;
      case "reply": return <MessageCircle className="w-5 h-5 text-green-400" />;
      case "like": return <Heart className="w-5 h-5 text-red-500" />;
      case "friend_request": return <UserPlus className="w-5 h-5 text-brand" />;
      case "friend_accepted": return <UserCheck className="w-5 h-5 text-green-500" />;
      case "train_request": return <Dumbbell className="w-5 h-5 text-brand" />;
      default: return <BellRing className="w-5 h-5 text-brand" />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen pt-8 px-4 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Activity className="w-8 h-8 text-brand" />
          Activity
        </h1>
        {notifications.some(n => !n.read) && (
           <Button variant="outline" size="sm" onClick={markAllAsRead} className="text-xs">
             <CheckCircle2 className="w-4 h-4 mr-2" /> Mark all read
           </Button>
        )}
      </div>

      {/* Pending Friend Requests Section */}
      {pendingRequests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-brand" /> Friend Requests ({pendingRequests.length})
          </h2>
          <div className="flex flex-col gap-3">
            {pendingRequests.map(req => (
              <div key={req.id} className="flex items-center justify-between p-4 bg-brand/10 border border-brand/30 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface border-2 border-brand flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <Link href={`/profile/${req.fromId}`} className="font-bold text-sm hover:text-brand transition-colors">
                      {req.fromName || "Someone"}
                    </Link>
                    <p className="text-xs text-zinc-400">Wants to be your friend</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => acceptFriendRequest(req)} 
                    disabled={acceptingId === req.id}
                    size="sm"
                    className="bg-brand text-black hover:brightness-110 font-bold gap-1"
                  >
                    <UserCheck className="w-4 h-4" /> Accept
                  </Button>
                  <Button 
                    onClick={() => declineFriendRequest(req)} 
                    disabled={acceptingId === req.id}
                    size="sm"
                    variant="outline" 
                    className="text-zinc-400 border-border hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50"
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-zinc-500 text-center py-10">Loading activity...</p>
      ) : notifications.length === 0 && pendingRequests.length === 0 ? (
        <div className="flex flex-col flex-1 items-center justify-center opacity-50 py-20">
           <Bell className="w-16 h-16 mb-4 text-zinc-600" />
           <p className="text-zinc-400 text-center">You have no new notifications.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
           {notifications.map(n => (
              <div 
                key={n.id} 
                onClick={() => !n.read && markAsRead(n.id)}
                className={`flex gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                  n.read ? "bg-background border-border/50 opacity-70" : "bg-surface border-brand/50 shadow-[0_0_15px_rgba(234,255,102,0.1)]"
                }`}
              >
                 <div className="mt-1 flex-shrink-0">
                    {getIcon(n.type)}
                 </div>
                 <div className="flex-1 flex flex-col items-start gap-1">
                    <p className={`text-sm ${n.read ? "text-zinc-300" : "text-white font-medium"}`}>
                       {n.message}
                    </p>
                    <span className="text-[10px] text-zinc-500">
                       {n.createdAt?.toDate?.()?.toLocaleString(undefined, {
                         month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                       }) || "Just now"}
                    </span>
                 </div>
                 {n.link && (
                    <Link href={n.link} className="self-center bg-brand/10 hover:bg-brand hover:text-black text-brand text-xs font-bold px-3 py-1.5 rounded-full transition-colors whitespace-nowrap">
                       View
                    </Link>
                 )}
              </div>
           ))}
        </div>
      )}
    </div>
  );
}
