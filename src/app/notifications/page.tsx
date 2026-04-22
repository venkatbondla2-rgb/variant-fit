"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Bell, CheckCircle2, MessageCircle, Heart, BellRing, Activity } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (!user) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case "comment": return <MessageCircle className="w-5 h-5 text-blue-400" />;
      case "reply": return <MessageCircle className="w-5 h-5 text-green-400" />;
      case "like": return <Heart className="w-5 h-5 text-red-500" />;
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

      {loading ? (
        <p className="text-zinc-500 text-center py-10">Loading activity...</p>
      ) : notifications.length === 0 ? (
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
                       {n.createdAt?.toDate().toLocaleString(undefined, {
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
