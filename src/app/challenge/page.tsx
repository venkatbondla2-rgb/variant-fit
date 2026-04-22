"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, onSnapshot, updateDoc, doc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ChallengePage() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "challenges"), snap => {
       setChallenges(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  const joinChallenge = async (id: string) => {
    try {
       await updateDoc(doc(db, "challenges", id), {
          participantsCount: increment(1)
       });
       alert("Joined challenge!");
    } catch (err) {
       console.error(err);
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="bg-surface rounded-3xl p-8 border border-border text-center min-h-[60vh] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand/10 rounded-full blur-3xl -z-10" />
        
        <Trophy className="w-16 h-16 text-brand mb-6" />
        <h1 className="text-3xl font-bold mb-4">Challenge Variants</h1>
        <p className="text-zinc-400 mb-8 max-w-md">
          Compete with your Variants in weekly step challenges, lifting competitions, and consistency streaks.
        </p>

        <div className="w-full max-w-md space-y-4 text-left">
          {challenges.length === 0 ? (
             <p className="text-center text-zinc-500 italic">No active challenges right now.</p>
          ) : (
             challenges.map(c => (
                <div key={c.id} className="bg-background rounded-xl p-4 border border-border flex items-center justify-between">
                   <div className="flex-1 mr-4">
                      <h4 className="font-bold text-sm truncate">{c.title}</h4>
                      <p className="text-xs text-zinc-500 mt-1">{c.participantsCount || 0} enrolled</p>
                      {c.description && <p className="text-[10px] text-zinc-400 mt-2 line-clamp-2">{c.description}</p>}
                   </div>
                   <Button onClick={() => joinChallenge(c.id)} size="sm" variant="outline" className="text-brand border-brand/30 hover:bg-brand hover:text-black">
                      Join
                   </Button>
                </div>
             ))
          )}
        </div>
      </div>
    </div>
  );
}
