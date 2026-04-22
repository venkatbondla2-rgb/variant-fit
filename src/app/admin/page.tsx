"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, onSnapshot, addDoc, serverTimestamp, getDocs, doc, deleteDoc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Shield, Plus, Trash2, LayoutDashboard, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  
  const [activeTab, setActiveTab] = useState<"ads" | "challenges">("ads");
  const [ads, setAds] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);

  // Forms
  const [adImageUrl, setAdImageUrl] = useState("");
  const [adLink, setAdLink] = useState("");
  const [adTitle, setAdTitle] = useState("");
  const [challengeTitle, setChallengeTitle] = useState("");
  const [challengeDesc, setChallengeDesc] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchRole = async () => {
       const userDoc = await getDoc(doc(db, "users", user.uid));
       setIsAdmin(userDoc.data()?.role === "admin");
    };
    fetchRole();
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubAds = onSnapshot(collection(db, "ads"), snap => {
      setAds(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubChal = onSnapshot(collection(db, "challenges"), snap => {
      setChallenges(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubAds();
      unsubChal();
    };
  }, [isAdmin]);

  const makeMeAdmin = async () => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), { role: "admin" });
    setIsAdmin(true);
  };

  const handleCreateAd = async () => {
    if (!adImageUrl || !adLink) return;
    await addDoc(collection(db, "ads"), {
       title: adTitle || "Advertisement",
       imageUrl: adImageUrl,
       link: adLink,
       createdAt: serverTimestamp()
    });
    setAdImageUrl("");
    setAdLink("");
    setAdTitle("");
  };

  const handleCreateChallenge = async () => {
    if (!challengeTitle) return;
    await addDoc(collection(db, "challenges"), {
       title: challengeTitle,
       description: challengeDesc,
       participantsCount: 0,
       createdAt: serverTimestamp()
    });
    setChallengeTitle("");
    setChallengeDesc("");
  };

  const deleteAd = async (id: string) => {
    await deleteDoc(doc(db, "ads", id));
  };
  
  const deleteChallenge = async (id: string) => {
    await deleteDoc(doc(db, "challenges", id));
  };

  if (!user || isAdmin === null) return <div className="text-center pt-20">Loading...</div>;

  if (isAdmin === false) {
     return (
       <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
         <Shield className="w-16 h-16 text-red-500" />
         <h1 className="text-2xl font-bold">Access Denied</h1>
         <p className="text-zinc-400">You must be an admin to view this panel.</p>
         <Button onClick={makeMeAdmin} className="mt-4 bg-brand text-black">Dev Tool: Make Me Admin</Button>
       </div>
     );
  }

  return (
    <div className="flex flex-col gap-6 pt-6 mb-20 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-4 mb-4">
         <Shield className="w-8 h-8 text-brand" />
         <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      <div className="flex gap-2 pb-2">
        <Button 
          variant={activeTab === "ads" ? "default" : "outline"} 
          onClick={() => setActiveTab("ads")}
          className="rounded-full gap-2"
        >
          <LayoutDashboard className="w-4 h-4" /> Manage Ads
        </Button>
        <Button 
          variant={activeTab === "challenges" ? "default" : "outline"} 
          onClick={() => setActiveTab("challenges")}
          className="rounded-full gap-2"
        >
          <Target className="w-4 h-4" /> Manage Challenges
        </Button>
      </div>

      {activeTab === "ads" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-surface rounded-2xl p-6 border border-border">
              <h3 className="font-bold mb-4">Create New Ad Campaign</h3>
              <div className="flex flex-col gap-3">
                 <input type="text" value={adTitle} onChange={e=>setAdTitle(e.target.value)} placeholder="Ad Title" className="bg-background rounded-lg px-4 py-2 border border-border" />
                 <input type="text" value={adImageUrl} onChange={e=>setAdImageUrl(e.target.value)} placeholder="Image URL (square optimal)" className="bg-background rounded-lg px-4 py-2 border border-border" />
                 <input type="text" value={adLink} onChange={e=>setAdLink(e.target.value)} placeholder="Destination Link URL" className="bg-background rounded-lg px-4 py-2 border border-border" />
                 <Button onClick={handleCreateAd} disabled={!adImageUrl || !adLink} className="bg-brand text-black font-bold">Publish Ad</Button>
              </div>
           </div>
           <div className="flex flex-col gap-4">
              <h3 className="font-bold">Active Campaigns ({ads.length})</h3>
              {ads.map(ad => (
                 <div key={ad.id} className="bg-background rounded-xl p-3 border border-border flex items-center justify-between gap-4">
                    <img src={ad.imageUrl} alt="ad img" className="w-12 h-12 rounded object-cover" />
                    <div className="flex-1 truncate">
                       <p className="font-bold text-sm truncate">{ad.title}</p>
                       <p className="text-xs text-brand truncate max-w-[200px]">{ad.link}</p>
                    </div>
                    <button onClick={() => deleteAd(ad.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full">
                       <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === "challenges" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-surface rounded-2xl p-6 border border-border">
              <h3 className="font-bold mb-4">Launch New Challenge</h3>
              <div className="flex flex-col gap-3">
                 <input type="text" value={challengeTitle} onChange={e=>setChallengeTitle(e.target.value)} placeholder="Challenge Title (e.g. 100k Steps Monthly)" className="bg-background rounded-lg px-4 py-2 border border-border" />
                 <textarea value={challengeDesc} onChange={e=>setChallengeDesc(e.target.value)} placeholder="Description" className="bg-background rounded-lg px-4 py-2 border border-border resize-none h-20" />
                 <Button onClick={handleCreateChallenge} disabled={!challengeTitle} className="bg-brand text-black font-bold">Publish Challenge</Button>
              </div>
           </div>
           <div className="flex flex-col gap-4">
              <h3 className="font-bold">Active Challenges ({challenges.length})</h3>
              {challenges.map(c => (
                 <div key={c.id} className="bg-background rounded-xl p-4 border border-border flex items-center justify-between gap-4">
                    <div className="flex-1 truncate">
                       <p className="font-bold text-sm truncate">{c.title}</p>
                       <p className="text-xs text-zinc-400 mt-1">{c.participantsCount || 0} participants enrolled</p>
                    </div>
                    <button onClick={() => deleteChallenge(c.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full">
                       <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
              ))}
           </div>
        </div>
      )}

    </div>
  );
}
