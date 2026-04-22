"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp, updateDoc, doc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Users, Plus, Globe, LayoutList } from "lucide-react";

export default function CommunityPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"posts" | "yours" | "discover" | "create">("discover");
  
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchCommunities();
  }, [activeTab]); // Refetch when changing tabs

  const fetchCommunities = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "communities"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setCommunities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCommunity = async () => {
    if (!name || !description || !user) return;
    setIsCreating(true);
    try {
      await addDoc(collection(db, "communities"), {
        name,
        description,
        ownerId: user.uid,
        ownerName: user.displayName || "User",
        members: [user.uid],
        createdAt: serverTimestamp(),
      });
      setName("");
      setDescription("");
      setActiveTab("yours");
    } catch (err) {
      console.error(err);
      alert("Failed to create community");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    if (!user) return;
    try {
      const ref = doc(db, "communities", communityId);
      await updateDoc(ref, {
        members: arrayUnion(user.uid)
      });
      fetchCommunities(); // refresh list
    } catch (err) {
      console.error(err);
      alert("Failed to join community");
    }
  };

  if (!user) return null;

  const yours = communities.filter(c => c.members?.includes(user.uid) || c.ownerId === user.uid);
  const discover = communities.filter(c => !c.members?.includes(user.uid) && c.ownerId !== user.uid);

  return (
    <div className="flex flex-col min-h-screen pt-8 px-4 max-w-4xl mx-auto w-full gap-8">
      <h1 className="text-3xl font-bold">Community Hub</h1>

      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
        <Button 
          variant={activeTab === "discover" ? "default" : "outline"} 
          onClick={() => setActiveTab("discover")}
          className="rounded-full gap-2 whitespace-nowrap"
        >
          <Globe className="w-4 h-4" /> Discover
        </Button>
        <Button 
          variant={activeTab === "yours" ? "default" : "outline"} 
          onClick={() => setActiveTab("yours")}
          className="rounded-full gap-2 whitespace-nowrap"
        >
          <Users className="w-4 h-4" /> Your Communities
        </Button>
        <Button 
          variant={activeTab === "posts" ? "default" : "outline"} 
          onClick={() => setActiveTab("posts")}
          className="rounded-full gap-2 whitespace-nowrap"
        >
          <LayoutList className="w-4 h-4" /> Posts
        </Button>
        <Button 
          variant={activeTab === "create" ? "default" : "outline"} 
          onClick={() => setActiveTab("create")}
          className="rounded-full gap-2 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Create
        </Button>
      </div>

      <div className="flex-1">
        {loading && <p className="text-zinc-500">Loading communities...</p>}
        
        {!loading && activeTab === "discover" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {discover.length === 0 ? (
              <p className="text-zinc-500">No new communities to discover.</p>
            ) : (
              discover.map(c => (
                <div key={c.id} className="bg-surface border border-border p-5 rounded-2xl flex flex-col gap-3">
                  <h3 className="font-bold text-lg">{c.name}</h3>
                  <p className="text-sm text-zinc-400 line-clamp-2 flex-1">{c.description}</p>
                  <p className="text-xs text-zinc-500">{c.members?.length || 1} Members</p>
                  <Button onClick={() => handleJoinCommunity(c.id)} className="w-full font-bold">Join Community</Button>
                </div>
              ))
            )}
          </div>
        )}

        {!loading && activeTab === "yours" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {yours.length === 0 ? (
              <p className="text-zinc-500">You haven't joined any communities yet.</p>
            ) : (
              yours.map(c => (
                <div key={c.id} className="bg-brand/10 border border-brand/30 p-5 rounded-2xl flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                     <h3 className="font-bold text-lg text-brand">{c.name}</h3>
                     {c.ownerId === user.uid && <span className="bg-brand/20 text-brand text-[10px] uppercase font-bold px-2 py-1 rounded">Owner</span>}
                  </div>
                  <p className="text-sm text-zinc-300 line-clamp-2 flex-1">{c.description}</p>
                  <p className="text-xs text-zinc-400">{c.members?.length || 1} Members</p>
                  <Button variant="outline" className="w-full border-brand/50 text-brand hover:bg-brand hover:text-black font-bold">View Community</Button>
                </div>
              ))
            )}
          </div>
        )}

        {!loading && activeTab === "create" && (
          <div className="bg-surface p-6 rounded-2xl border border-border max-w-md">
            <h2 className="text-xl font-bold mb-4">Create a New Community</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Community Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 focus:border-brand focus:outline-none"
                  placeholder="e.g. Iron Lifters"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 focus:border-brand focus:outline-none resize-none h-24"
                  placeholder="What is this community about?"
                />
              </div>
              <Button disabled={!name || !description || isCreating} onClick={handleCreateCommunity} className="w-full font-bold">
                {isCreating ? "Creating..." : "Create Community"}
              </Button>
            </div>
          </div>
        )}

        {!loading && activeTab === "posts" && (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <LayoutList className="w-16 h-16 mb-4 text-zinc-600" />
            <p className="text-zinc-400">Community posts are coming soon.</p>
          </div>
        )}

      </div>
    </div>
  );
}
