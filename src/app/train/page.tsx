"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Search, Loader2, Dumbbell, UserPlus, Play, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/UserAvatar";

export default function TrainPage() {
  const { user } = useAuth();
  
  const [usersQuery, setUsersQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [activeSession, setActiveSession] = useState<any>(null);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const qHost = query(collection(db, "training_sessions"), where("hostId", "==", user.uid));
    const qGuest = query(collection(db, "training_sessions"), where("guestId", "==", user.uid));

    const unsubscribeHost = onSnapshot(qHost, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      const active = sessions.find(s => s.status !== "ended");
      if (active) setActiveSession(active);
      else if (activeSession?.hostId === user.uid) setActiveSession(null);
    });

    const unsubscribeGuest = onSnapshot(qGuest, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      const active = sessions.find(s => s.status === "active");
      const pending = sessions.filter(s => s.status === "pending");
      
      if (active) setActiveSession(active);
      else if (activeSession?.guestId === user.uid) setActiveSession(null);
      
      setIncomingRequests(pending);
    });

    return () => {
      unsubscribeHost();
      unsubscribeGuest();
    };
  }, [user, activeSession]);

  const handleSearchUsers = async () => {
    if (!usersQuery.trim() || !user) return;
    setIsSearching(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const users = snap.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as any) }))
        .filter(u => u.id !== user.uid && (
           u.username?.toLowerCase().includes(usersQuery.toLowerCase()) || 
           u.displayName?.toLowerCase().includes(usersQuery.toLowerCase()) ||
           u.email?.toLowerCase().includes(usersQuery.toLowerCase())
        )).slice(0, 5);
        
      setSearchResults(users);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const sendInvitation = async (targetUserId: string, targetName: string) => {
    if (!user || activeSession) return;
    try {
       await addDoc(collection(db, "training_sessions"), {
         hostId: user.uid,
         hostName: user.displayName || user.email,
         guestId: targetUserId,
         guestName: targetName || "A Variant",
         status: "pending",
         createdAt: serverTimestamp()
       });
       
       await addDoc(collection(db, "notifications"), {
         userId: targetUserId,
         type: "train_request",
         message: `${user.displayName || "Someone"} invited you to train live!`,
         link: `/train`,
         read: false,
         createdAt: serverTimestamp(),
       });
       
       alert("Invitation sent!");
    } catch (err) {
       console.error(err);
       alert("Failed to send invitation.");
    }
  };

  const acceptInvitation = async (sessionId: string) => {
    try {
      await updateDoc(doc(db, "training_sessions", sessionId), {
        status: "active"
      });
    } catch (err) {
      console.error(err);
    }
  };

  const declineInvitation = async (sessionId: string) => {
    try {
      await updateDoc(doc(db, "training_sessions", sessionId), {
        status: "ended"
      });
    } catch (err) {
      console.error(err);
    }
  };

  const endSession = async () => {
    if (!activeSession) return;
    if (confirm("Are you sure you want to end this live session?")) {
      try {
        await updateDoc(doc(db, "training_sessions", activeSession.id), {
          status: "ended"
        });
        setActiveSession(null);
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6 pt-6">
      
      {activeSession ? (
         <div className="bg-gradient-to-br from-brand/20 to-background rounded-3xl p-8 border border-brand/50 flex flex-col items-center justify-center min-h-[50vh] text-center shadow-[0_0_50px_rgba(234,255,102,0.15)] relative overflow-hidden">
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/20 text-red-500 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
               <div className="w-2 h-2 rounded-full bg-red-500" /> LIVE
            </div>
            
            <Dumbbell className="w-16 h-16 text-brand mb-6" />
            <h1 className="text-3xl font-bold mb-2 text-white">Live Training Session</h1>
            
            {activeSession.status === "pending" ? (
               <div className="flex flex-col gap-4 items-center">
                  <p className="text-zinc-400 mb-4">Waiting for <strong className="text-white">{activeSession.guestName}</strong> to join...</p>
                  <Loader2 className="w-8 h-8 animate-spin text-brand" />
                  <Button variant="outline" onClick={endSession} className="mt-8 border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white">Cancel Request</Button>
               </div>
            ) : (
               <div className="flex flex-col gap-6 w-full max-w-md">
                 <p className="text-zinc-400 mb-2">
                   You are currently training live with <strong className="text-brand">{activeSession.hostId === user.uid ? activeSession.guestName : activeSession.hostName}</strong>. 
                 </p>
                 
                 <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="bg-background/80 backdrop-blur border border-border p-4 rounded-xl">
                       <p className="text-xs text-zinc-500 font-bold uppercase mb-1">Session Timer</p>
                       <p className="text-2xl font-black text-white">00:00</p>
                    </div>
                    <div className="bg-background/80 backdrop-blur border border-border p-4 rounded-xl">
                       <p className="text-xs text-zinc-500 font-bold uppercase mb-1">Shared Sets</p>
                       <p className="text-2xl font-black text-brand">0</p>
                    </div>
                 </div>

                 <p className="text-xs text-zinc-500 italic flex text-center mt-4 justify-center">
                    (Live data syncing overlay is established. Log workouts in Track page to sync to partner)
                 </p>

                 <Button onClick={endSession} className="w-full bg-red-500 text-white hover:bg-red-600 font-bold">End Session</Button>
               </div>
            )}
         </div>
      ) : (
         <>
         <div className="bg-surface rounded-3xl p-8 border border-border text-center flex flex-col items-center">
           <h1 className="text-3xl font-bold mb-4">Train with Variant</h1>
           <p className="text-zinc-400 mb-8 max-w-md">
             Send a live training request to your friends or discover training partners. When connected, your reps and sets sync in real-time.
           </p>

           <div className="bg-background rounded-2xl p-2 border border-border flex items-center max-w-md w-full mx-auto mb-6 shadow-sm">
               <Search className="w-5 h-5 text-zinc-500 ml-3" />
               <input 
                 type="text" 
                 value={usersQuery}
                 onChange={(e) => setUsersQuery(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                 placeholder="Search user to invite..." 
                 className="bg-transparent border-none focus:outline-none px-4 w-full text-sm h-10" 
               />
               <Button onClick={handleSearchUsers} disabled={isSearching || !usersQuery.trim()} className="bg-brand text-black font-bold py-2 px-6 rounded-xl hover:brightness-110">
                 {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
               </Button>
           </div>
           
           {/* Search Results */}
           {searchResults.length > 0 && (
              <div className="w-full max-w-md flex flex-col gap-2 mt-2">
                 <p className="text-left text-xs font-bold text-zinc-500 uppercase ml-2 mb-1">Results</p>
                 {searchResults.map((su) => (
                    <div key={su.id} className="bg-background border border-border/50 rounded-xl p-3 flex items-center justify-between">
                       <UserAvatar userId={su.id} username={su.username || su.email} size="sm" />
                       <Button onClick={() => sendInvitation(su.id, su.username || su.email)} size="sm" variant="outline" className="text-xs h-8 border-brand/40 text-brand hover:bg-brand hover:text-black">
                          Invite
                       </Button>
                    </div>
                 ))}
              </div>
           )}
         </div>

         {/* Incoming Requests */}
         {incomingRequests.length > 0 && (
           <div className="flex flex-col gap-4">
              <h3 className="font-bold text-lg flex items-center gap-2"><UserPlus className="w-5 h-5 text-brand" /> Incoming Requests</h3>
              {incomingRequests.map(req => (
                 <div key={req.id} className="bg-brand/10 border border-brand/30 p-5 rounded-2xl flex items-center justify-between shadow-[0_0_15px_rgba(234,255,102,0.05)]">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-surface border-2 border-brand flex items-center justify-center">
                          <Play className="w-4 h-4 text-brand ml-0.5" />
                       </div>
                       <div>
                          <p className="font-bold">{req.hostName}</p>
                          <p className="text-xs text-zinc-400">Invited you to train live</p>
                       </div>
                    </div>
                    <div className="flex gap-2">
                       <Button onClick={() => acceptInvitation(req.id)} className="bg-brand text-black hover:brightness-110 font-bold">Accept</Button>
                       <Button onClick={() => declineInvitation(req.id)} variant="outline" className="text-zinc-400 border-border hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50">Decline</Button>
                    </div>
                 </div>
              ))}
           </div>
         )}
         </>
      )}

    </div>
  );
}
