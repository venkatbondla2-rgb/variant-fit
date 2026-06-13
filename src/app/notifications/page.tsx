"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch, getDocs, addDoc, serverTimestamp, arrayUnion, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Bell, CheckCircle2, MessageCircle, Heart, BellRing, Activity, UserPlus, UserCheck, Dumbbell, Trash2, X, Trophy, Flame, Camera, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [swipedId, setSwipedId] = useState<string | null>(null);

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

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, "notifications", id));
    } catch (err) {
      console.error(err);
    }
  };

  const clearAllNotifications = async () => {
    if (!confirm("Delete all notifications?")) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        batch.delete(doc(db, "notifications", n.id));
      });
      await batch.commit();
    } catch (err) {
      console.error(err);
    }
  };

  const acceptFriendRequest = async (request: any) => {
    if (!user) return;
    setAcceptingId(request.id);
    try {
      await updateDoc(doc(db, "friend_requests", request.id), { status: "accepted" });
      await updateDoc(doc(db, "users", user.uid), { friends: arrayUnion(request.fromId) });
      await updateDoc(doc(db, "users", request.fromId), { friends: arrayUnion(user.uid) });
      await addDoc(collection(db, "notifications"), {
        userId: request.fromId,
        type: "friend_accepted",
        message: `${user.displayName || "Someone"} accepted your friend request!`,
        link: `/profile/${user.uid}`,
        read: false,
        createdAt: serverTimestamp(),
      });
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
      await updateDoc(doc(db, "friend_requests", request.id), { status: "declined" });
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (err) {
      console.error(err);
    } finally {
      setAcceptingId(null);
    }
  };

  // Swipe-to-delete touch handlers
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent, id: string) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 80) {
      setSwipedId(id);
    } else if (diff < -40) {
      setSwipedId(null);
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
      case "challenge_join": return <Trophy className="w-5 h-5 text-yellow-400" />;
      case "streak_reminder": return <Flame className="w-5 h-5 text-orange-400" />;
      case "workout_share": return <Dumbbell className="w-5 h-5 text-green-400" />;
      case "message_request": return <MessageCircle className="w-5 h-5 text-blue-400" />;
      case "transformation": return <Camera className="w-5 h-5 text-purple-400" />;
      default: return <BellRing className="w-5 h-5 text-brand" />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen pt-8 px-4 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()} 
            className="p-2 -ml-2 rounded-xl bg-surface hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all border border-border/50"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-black flex items-center gap-2">
            <Activity className="w-7 h-7 text-brand" />
            Activity
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.read) && (
             <Button variant="outline" size="sm" onClick={markAllAsRead} className="text-xs">
               <CheckCircle2 className="w-4 h-4 mr-2" /> Mark all read
             </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAllNotifications} className="text-xs text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-400">
              <Trash2 className="w-4 h-4 mr-2" /> Clear All
            </Button>
          )}
        </div>
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
                  <Button onClick={() => acceptFriendRequest(req)} disabled={acceptingId === req.id} size="sm" className="bg-brand text-black hover:brightness-110 font-bold gap-1">
                    <UserCheck className="w-4 h-4" /> Accept
                  </Button>
                  <Button onClick={() => declineFriendRequest(req)} disabled={acceptingId === req.id} size="sm" variant="outline" className="text-zinc-400 border-border hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50">
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
        <div className="flex flex-col gap-3">
           {notifications.map(n => (
              <div
                key={n.id}
                className="relative overflow-hidden rounded-2xl"
                onTouchStart={(e) => handleTouchStart(e, n.id)}
                onTouchEnd={(e) => handleTouchEnd(e, n.id)}
              >
                {/* Delete button revealed on swipe */}
                <div className={`absolute right-0 top-0 bottom-0 flex items-center transition-all ${swipedId === n.id ? "w-20" : "w-0"} overflow-hidden`}>
                  <button
                    onClick={() => deleteNotification(n.id)}
                    className="w-full h-full bg-red-500 flex items-center justify-center"
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                </div>

                <div 
                  onClick={() => { if (!n.read) markAsRead(n.id); if (swipedId === n.id) setSwipedId(null); }}
                  className={`flex gap-4 p-4 border transition-all cursor-pointer relative bg-clip-padding ${
                    swipedId === n.id ? "-translate-x-20" : "translate-x-0"
                  } ${
                    n.read ? "bg-background border-border/50 opacity-70" : "bg-surface border-brand/50 shadow-[0_0_15px_rgba(234,255,102,0.1)]"
                  }`}
                  style={{ transition: "transform 0.2s ease" }}
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
                   <div className="flex items-center gap-2 self-center">
                     {n.link && (
                        <Link href={n.link} className="bg-brand/10 hover:bg-brand hover:text-black text-brand text-xs font-bold px-3 py-1.5 rounded-full transition-colors whitespace-nowrap">
                           View
                        </Link>
                     )}
                     {/* Desktop delete button */}
                     <button
                       onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                       className="hidden sm:flex w-7 h-7 rounded-lg items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                       title="Delete"
                     >
                       <X className="w-3.5 h-3.5" />
                     </button>
                   </div>
                </div>
              </div>
           ))}
        </div>
      )}
    </div>
  );
}
