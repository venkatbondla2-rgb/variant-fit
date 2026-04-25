"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Users, Plus, Globe, LayoutList, ArrowLeft, Send, MessageCircle } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { NestedReplies } from "@/components/shared/NestedReplies";

export default function CommunityPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"join" | "joined" | "create">("join");
  
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Community Feed State
  const [selectedCommunity, setSelectedCommunity] = useState<any>(null);
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [isPostingToCommunity, setIsPostingToCommunity] = useState(false);
  const [loadingCommunityPosts, setLoadingCommunityPosts] = useState(false);

  useEffect(() => {
    fetchCommunities();
  }, [activeTab]);

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
      setActiveTab("joined");
      fetchCommunities();
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
      fetchCommunities();
    } catch (err) {
      console.error(err);
      alert("Failed to join community");
    }
  };

  // Open community feed
  const openCommunity = (community: any) => {
    setSelectedCommunity(community);
    setLoadingCommunityPosts(true);
    setCommunityPosts([]);
  };

  // Load posts for selected community
  useEffect(() => {
    if (!selectedCommunity) return;
    
    const q = query(
      collection(db, "community_posts"),
      where("communityId", "==", selectedCommunity.id),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setCommunityPosts(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      setLoadingCommunityPosts(false);
    });

    return () => unsub();
  }, [selectedCommunity]);

  const handlePostToCommunity = async () => {
    if (!newPostContent.trim() || !user || !selectedCommunity) return;
    setIsPostingToCommunity(true);
    try {
      await addDoc(collection(db, "community_posts"), {
        communityId: selectedCommunity.id,
        communityName: selectedCommunity.name,
        userId: user.uid,
        username: user.displayName || "Variant",
        content: newPostContent,
        createdAt: serverTimestamp(),
      });
      setNewPostContent("");
    } catch (err) {
      console.error(err);
      alert("Failed to post");
    } finally {
      setIsPostingToCommunity(false);
    }
  };

  if (!user) return null;

  const yours = communities.filter(c => c.members?.includes(user.uid) || c.ownerId === user.uid);
  const discover = communities.filter(c => !c.members?.includes(user.uid) && c.ownerId !== user.uid);

  // If a community is selected, show its feed
  if (selectedCommunity) {
    return (
      <div className="flex flex-col min-h-screen pt-8 px-4 max-w-4xl mx-auto w-full gap-6">
        <button 
          onClick={() => setSelectedCommunity(null)} 
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Communities
        </button>

        {/* Community Header */}
        <div className="bg-gradient-to-br from-brand/10 to-surface rounded-3xl p-8 border border-brand/20">
          <h1 className="text-3xl font-bold text-brand mb-2">{selectedCommunity.name}</h1>
          <p className="text-zinc-400 text-sm mb-4">{selectedCommunity.description}</p>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {selectedCommunity.members?.length || 1} Members</span>
            <span>Created by {selectedCommunity.ownerName}</span>
          </div>
        </div>

        {/* Post to Community */}
        <div className="bg-surface rounded-2xl p-5 border border-border">
          <div className="flex gap-3">
            <UserAvatar userId={user.uid} username={user.displayName || "User"} showName={false} size="md" />
            <div className="flex-1 flex flex-col gap-3">
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder={`Share something with ${selectedCommunity.name}...`}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand resize-none min-h-[80px]"
              />
              <Button 
                onClick={handlePostToCommunity}
                disabled={!newPostContent.trim() || isPostingToCommunity}
                size="sm"
                className="self-end gap-2"
              >
                <Send className="w-4 h-4" />
                {isPostingToCommunity ? "Posting..." : "Post"}
              </Button>
            </div>
          </div>
        </div>

        {/* Community Posts Feed */}
        <div className="flex flex-col gap-4 pb-20">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-brand" /> Community Feed
          </h3>
          
          {loadingCommunityPosts ? (
            <p className="text-zinc-500 text-center py-10">Loading posts...</p>
          ) : communityPosts.length === 0 ? (
            <div className="text-center py-16 opacity-50">
              <LayoutList className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">No posts yet. Be the first to share!</p>
            </div>
          ) : (
            communityPosts.map(post => (
              <div key={post.id} className="bg-surface rounded-2xl p-5 border border-border">
                <div className="flex items-start gap-3">
                  <UserAvatar userId={post.userId} username={post.username} size="md" showName={false} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <UserAvatar userId={post.userId} username={post.username} size="sm" showName={true} className="[&>div]:hidden" />
                      <span className="text-[10px] text-zinc-500">
                        {post.createdAt?.toDate?.()?.toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) || "Just now"}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-200 mt-1">{post.content}</p>
                    
                    {/* Nested replies for community post */}
                    <NestedReplies
                      collectionPath={`communities/${selectedCommunity.id}/posts/${post.id}/replies`}
                      notifyUserId={post.userId}
                      notifyType="community_reply"
                      notifyLink="/community"
                      placeholder="Reply to this post..."
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pt-8 px-4 max-w-4xl mx-auto w-full gap-8">
      <h1 className="text-3xl font-bold">Community Hub</h1>

      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
        <Button 
          variant={activeTab === "join" ? "default" : "outline"} 
          onClick={() => setActiveTab("join")}
          className="rounded-full gap-2 whitespace-nowrap"
        >
          <Globe className="w-4 h-4" /> Join Community
        </Button>
        <Button 
          variant={activeTab === "create" ? "default" : "outline"} 
          onClick={() => setActiveTab("create")}
          className="rounded-full gap-2 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Create Community
        </Button>
        <Button 
          variant={activeTab === "joined" ? "default" : "outline"} 
          onClick={() => setActiveTab("joined")}
          className="rounded-full gap-2 whitespace-nowrap"
        >
          <Users className="w-4 h-4" /> Joined Communities
        </Button>
      </div>

      <div className="flex-1">
        {loading && <p className="text-zinc-500">Loading communities...</p>}
        
        {/* Join Community Tab (Discover) */}
        {!loading && activeTab === "join" && (
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

        {/* Create Community Tab */}
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

        {/* Joined Communities Tab */}
        {!loading && activeTab === "joined" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {yours.length === 0 ? (
              <p className="text-zinc-500">You haven&apos;t joined any communities yet.</p>
            ) : (
              yours.map(c => (
                <div key={c.id} className="bg-brand/10 border border-brand/30 p-5 rounded-2xl flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                     <h3 className="font-bold text-lg text-brand">{c.name}</h3>
                     {c.ownerId === user.uid && <span className="bg-brand/20 text-brand text-[10px] uppercase font-bold px-2 py-1 rounded">Owner</span>}
                  </div>
                  <p className="text-sm text-zinc-300 line-clamp-2 flex-1">{c.description}</p>
                  <p className="text-xs text-zinc-400">{c.members?.length || 1} Members</p>
                  <Button 
                    onClick={() => openCommunity(c)} 
                    variant="outline" 
                    className="w-full border-brand/50 text-brand hover:bg-brand hover:text-black font-bold"
                  >
                    View Community
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
