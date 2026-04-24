"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Shield, LayoutDashboard, Target, Trash2, Eye, Flame, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
  const { user, userRole, loading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"dashboard" | "ads" | "challenges">("dashboard");
  const [ads, setAds] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);

  // Forms
  const [adImageUrl, setAdImageUrl] = useState("");
  const [adLink, setAdLink] = useState("");
  const [adTitle, setAdTitle] = useState("");
  const [challengeTitle, setChallengeTitle] = useState("");
  const [challengeDesc, setChallengeDesc] = useState("");
  const [challengeDuration, setChallengeDuration] = useState("");

  useEffect(() => {
    if (userRole !== "admin") return;
    const unsubAds = onSnapshot(collection(db, "ads"), snap => {
      setAds(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });
    const unsubChal = onSnapshot(collection(db, "challenges"), snap => {
      setChallenges(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });

    return () => {
      unsubAds();
      unsubChal();
    };
  }, [userRole]);

  const handleCreateAd = async () => {
    if (!adImageUrl || !adLink) return;
    try {
      await addDoc(collection(db, "ads"), {
         title: adTitle || "Advertisement",
         imageUrl: adImageUrl,
         link: adLink,
         views: 0,
         reactions: 0,
         createdAt: serverTimestamp()
      });
      setAdImageUrl("");
      setAdLink("");
      setAdTitle("");
    } catch (err) {
      console.error(err);
      alert("Failed to create ad. Check console for details.");
    }
  };

  const handleCreateChallenge = async () => {
    if (!challengeTitle) return;
    try {
      await addDoc(collection(db, "challenges"), {
         title: challengeTitle,
         description: challengeDesc,
         duration: challengeDuration || "7 days",
         participantsCount: 0,
         createdAt: serverTimestamp()
      });
      setChallengeTitle("");
      setChallengeDesc("");
      setChallengeDuration("");
    } catch (err) {
      console.error(err);
      alert("Failed to create challenge. Check console for details.");
    }
  };

  const deleteAd = async (id: string) => {
    if (!confirm("Delete this ad campaign?")) return;
    try {
      await deleteDoc(doc(db, "ads", id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete ad.");
    }
  };
  
  const deleteChallenge = async (id: string) => {
    if (!confirm("Delete this challenge?")) return;
    try {
      await deleteDoc(doc(db, "challenges", id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete challenge.");
    }
  };

  if (loading || !user) return <div className="text-center pt-20">Loading...</div>;

  if (userRole !== "admin") {
     return (
       <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
         <Shield className="w-16 h-16 text-red-500" />
         <h1 className="text-2xl font-bold">Access Denied</h1>
         <p className="text-zinc-400">You must be an admin to view this panel.</p>
       </div>
     );
  }

  // Dashboard stats
  const totalAdViews = ads.reduce((acc, ad) => acc + (ad.views || 0), 0);
  const totalAdReactions = ads.reduce((acc, ad) => acc + (ad.reactions || 0), 0);
  const totalParticipants = challenges.reduce((acc, c) => acc + (c.participantsCount || 0), 0);

  return (
    <div className="flex flex-col gap-6 pt-6 mb-20 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-4 mb-4">
         <Shield className="w-8 h-8 text-brand" />
         <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      <div className="flex gap-2 pb-2 overflow-x-auto">
        <Button 
          variant={activeTab === "dashboard" ? "default" : "outline"} 
          onClick={() => setActiveTab("dashboard")}
          className="rounded-full gap-2 whitespace-nowrap"
        >
          <TrendingUp className="w-4 h-4" /> Dashboard
        </Button>
        <Button 
          variant={activeTab === "ads" ? "default" : "outline"} 
          onClick={() => setActiveTab("ads")}
          className="rounded-full gap-2 whitespace-nowrap"
        >
          <LayoutDashboard className="w-4 h-4" /> Manage Ads
        </Button>
        <Button 
          variant={activeTab === "challenges" ? "default" : "outline"} 
          onClick={() => setActiveTab("challenges")}
          className="rounded-full gap-2 whitespace-nowrap"
        >
          <Target className="w-4 h-4" /> Manage Challenges
        </Button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div className="flex flex-col gap-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface rounded-2xl p-5 border border-border text-center">
              <Eye className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-black text-white">{totalAdViews}</p>
              <p className="text-xs text-zinc-500 font-bold uppercase mt-1">Total Ad Views</p>
            </div>
            <div className="bg-surface rounded-2xl p-5 border border-border text-center">
              <Flame className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <p className="text-2xl font-black text-white">{totalAdReactions}</p>
              <p className="text-xs text-zinc-500 font-bold uppercase mt-1">Total Reactions</p>
            </div>
            <div className="bg-surface rounded-2xl p-5 border border-border text-center">
              <LayoutDashboard className="w-6 h-6 text-brand mx-auto mb-2" />
              <p className="text-2xl font-black text-white">{ads.length}</p>
              <p className="text-xs text-zinc-500 font-bold uppercase mt-1">Active Ads</p>
            </div>
            <div className="bg-surface rounded-2xl p-5 border border-border text-center">
              <Target className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-black text-white">{challenges.length}</p>
              <p className="text-xs text-zinc-500 font-bold uppercase mt-1">Challenges</p>
            </div>
          </div>

          {/* Per-Ad Breakdown */}
          <div className="bg-surface rounded-2xl p-6 border border-border">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Eye className="w-5 h-5 text-blue-400" /> Ad Performance</h3>
            {ads.length === 0 ? (
              <p className="text-zinc-500 text-sm">No ads yet. Create one from the Manage Ads tab.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {ads.map(ad => (
                  <div key={ad.id} className="bg-background rounded-xl p-4 border border-border/50 flex items-center gap-4">
                    {ad.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ad.imageUrl} alt="ad" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{ad.title}</p>
                      <p className="text-xs text-brand truncate">{ad.link}</p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-center">
                        <p className="text-lg font-black text-blue-400">{ad.views || 0}</p>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Views</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-black text-orange-400">{ad.reactions || 0}</p>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">🔥</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ads Tab */}
      {activeTab === "ads" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-surface rounded-2xl p-6 border border-border">
              <h3 className="font-bold mb-4">Create New Ad Campaign</h3>
              <div className="flex flex-col gap-3">
                 <input type="text" value={adTitle} onChange={e=>setAdTitle(e.target.value)} placeholder="Ad Title" className="bg-background rounded-lg px-4 py-2 border border-border focus:outline-none focus:border-brand" />
                 <input type="text" value={adImageUrl} onChange={e=>setAdImageUrl(e.target.value)} placeholder="Image URL (square optimal)" className="bg-background rounded-lg px-4 py-2 border border-border focus:outline-none focus:border-brand" />
                 <input type="text" value={adLink} onChange={e=>setAdLink(e.target.value)} placeholder="Destination Link URL" className="bg-background rounded-lg px-4 py-2 border border-border focus:outline-none focus:border-brand" />
                 <Button onClick={handleCreateAd} disabled={!adImageUrl || !adLink} className="bg-brand text-black font-bold">Publish Ad</Button>
              </div>
           </div>
           <div className="flex flex-col gap-4">
              <h3 className="font-bold">Active Campaigns ({ads.length})</h3>
              {ads.map(ad => (
                 <div key={ad.id} className="bg-background rounded-xl p-3 border border-border flex items-center justify-between gap-4">
                    {ad.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ad.imageUrl} alt="ad img" className="w-12 h-12 rounded object-cover" />
                    )}
                    <div className="flex-1 truncate">
                       <p className="font-bold text-sm truncate">{ad.title}</p>
                       <p className="text-xs text-brand truncate max-w-[200px]">{ad.link}</p>
                       <div className="flex gap-3 mt-1">
                         <span className="text-[10px] text-blue-400 font-bold">{ad.views || 0} views</span>
                         <span className="text-[10px] text-orange-400 font-bold">{ad.reactions || 0} 🔥</span>
                       </div>
                    </div>
                    <button onClick={() => deleteAd(ad.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full">
                       <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
              ))}
           </div>
        </div>
      )}

      {/* Challenges Tab */}
      {activeTab === "challenges" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-surface rounded-2xl p-6 border border-border">
              <h3 className="font-bold mb-4">Launch New Challenge</h3>
              <div className="flex flex-col gap-3">
                 <input type="text" value={challengeTitle} onChange={e=>setChallengeTitle(e.target.value)} placeholder="Challenge Title (e.g. 100k Steps Monthly)" className="bg-background rounded-lg px-4 py-2 border border-border focus:outline-none focus:border-brand" />
                 <textarea value={challengeDesc} onChange={e=>setChallengeDesc(e.target.value)} placeholder="Description" className="bg-background rounded-lg px-4 py-2 border border-border resize-none h-20 focus:outline-none focus:border-brand" />
                 <input type="text" value={challengeDuration} onChange={e=>setChallengeDuration(e.target.value)} placeholder="Duration (e.g. 7 days, 30 days)" className="bg-background rounded-lg px-4 py-2 border border-border focus:outline-none focus:border-brand" />
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
                       {c.duration && <p className="text-[10px] text-brand mt-0.5">{c.duration}</p>}
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
