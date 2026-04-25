"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, onSnapshot, updateDoc, doc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trophy, Users, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/UserAvatar";

export default function ChallengePage() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "challenges"), snap => {
       setChallenges(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [user]);

  const joinChallenge = async (id: string) => {
    if (!user) return;
    setJoiningId(id);
    try {
       await updateDoc(doc(db, "challenges", id), {
          participants: arrayUnion(user.uid),
       });
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

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6 pt-6 pb-20 max-w-2xl mx-auto w-full px-4">
      <div className="bg-surface rounded-3xl p-8 border border-border text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand/10 rounded-full blur-3xl -z-10" />
        
        <Trophy className="w-16 h-16 text-brand mb-6 mx-auto" />
        <h1 className="text-3xl font-bold mb-4">Challenge Variants</h1>
        <p className="text-zinc-400 mb-4 max-w-md mx-auto">
          Compete with your Variants in weekly step challenges, lifting competitions, and consistency streaks.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {challenges.length === 0 ? (
           <p className="text-center text-zinc-500 italic py-10">No active challenges right now.</p>
        ) : (
           challenges.map(c => {
              const participants: string[] = c.participants || [];
              const isJoined = participants.includes(user.uid);
              const participantCount = participants.length;
              
              return (
                <div key={c.id} className={`bg-surface rounded-2xl border overflow-hidden transition-all ${isJoined ? "border-brand/40 shadow-[0_0_15px_rgba(234,255,102,0.08)]" : "border-border"}`}>
                  <div className="p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 mr-4">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-lg">{c.title}</h4>
                          {isJoined && (
                            <span className="bg-brand/20 text-brand text-[10px] uppercase font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Joined
                            </span>
                          )}
                        </div>
                        {c.description && <p className="text-sm text-zinc-400 mt-2">{c.description}</p>}
                      </div>
                      
                      {isJoined ? (
                        <Button 
                          onClick={() => leaveChallenge(c.id)} 
                          disabled={joiningId === c.id}
                          size="sm" 
                          variant="outline" 
                          className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                        >
                          Leave
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => joinChallenge(c.id)} 
                          disabled={joiningId === c.id}
                          size="sm" 
                          className="bg-brand text-black hover:brightness-110 font-bold"
                        >
                          {joiningId === c.id ? "Joining..." : "Join"}
                        </Button>
                      )}
                    </div>
                    
                    {/* Participants */}
                    <div className="flex items-center gap-3 pt-2 border-t border-border/30">
                      <div className="flex items-center gap-1 text-sm text-zinc-400">
                        <Users className="w-4 h-4" />
                        <span className="font-bold text-white">{participantCount}</span> enrolled
                      </div>
                      
                      {/* Participant avatars */}
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
                  </div>
                </div>
              );
           })
        )}
      </div>
    </div>
  );
}
