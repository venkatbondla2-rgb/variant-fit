"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, collection, query, where, orderBy, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LogOut, Grid3X3, Users, LayoutList, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { PostCard } from "@/components/feed/PostCard";
import Link from "next/link";

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [profileData, setProfileData] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userCommunities, setUserCommunities] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [activeTab, setActiveTab] = useState<"posts" | "communities">("posts");
  
  // Edit profile state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const fetchProfile = async () => {
    if (user?.uid) {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfileData(data);
        setEditUsername(data.username || user.displayName || "");
        setEditBio(data.bio || "");
      }
    }
  };

  const fetchPosts = async () => {
    if (!user?.uid) return;
    try {
      const q = query(
        collection(db, "posts"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserPosts(posts);
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchCommunities = async () => {
    if (!user?.uid) return;
    try {
      const snapshot = await getDocs(collection(db, "communities"));
      const allCommunities = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      const mine = allCommunities.filter(c => 
        c.members?.includes(user.uid) || c.ownerId === user.uid
      );
      setUserCommunities(mine);
    } catch (err) {
      console.error("Error fetching communities:", err);
    } finally {
      setLoadingCommunities(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchPosts();
    fetchCommunities();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        username: editUsername,
        bio: editBio,
      });
      setShowEditModal(false);
      fetchProfile(); // refresh
    } catch (err) {
      console.error(err);
      alert("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen p-4 sm:p-8 max-w-4xl mx-auto w-full pb-20">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Profile</h1>
        <Button variant="outline" onClick={logout} className="gap-2">
          <LogOut className="w-4 h-4" />
          Log Out
        </Button>
      </header>

      {/* Profile Header Card */}
      <div className="flex items-start gap-6 sm:gap-8 bg-surface p-6 sm:p-8 rounded-3xl border border-border flex-col md:flex-row mb-8">
        <ProfileAvatar user={user} profileData={profileData} onUpdate={fetchProfile} />
        
        <div className="flex flex-col flex-1 w-full">
          <h2 className="text-2xl font-bold mb-1">{profileData?.username || user.displayName || "Athlete"}</h2>
          <p className="text-zinc-400 mb-2">{user.email}</p>
          {profileData?.bio && <p className="text-sm text-zinc-300 mb-4">{profileData.bio}</p>}
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-background rounded-2xl p-3 sm:p-4 border border-border text-center">
              <p className="text-xl sm:text-2xl font-bold text-brand">{userPosts.length}</p>
              <p className="text-[10px] sm:text-xs text-zinc-400 mt-1">Posts</p>
            </div>
            <div className="bg-background rounded-2xl p-3 sm:p-4 border border-border text-center">
              <p className="text-xl sm:text-2xl font-bold">{profileData?.friends?.length || 0}</p>
              <p className="text-[10px] sm:text-xs text-zinc-400 mt-1">Friends</p>
            </div>
            <div className="bg-background rounded-2xl p-3 sm:p-4 border border-border text-center">
              <p className="text-xl sm:text-2xl font-bold text-brand">{profileData?.workoutCount || 0}</p>
              <p className="text-[10px] sm:text-xs text-zinc-400 mt-1">Workouts</p>
            </div>
            <div className="bg-background rounded-2xl p-3 sm:p-4 border border-border text-center">
              <p className="text-xl sm:text-2xl font-bold">{userCommunities.length}</p>
              <p className="text-[10px] sm:text-xs text-zinc-400 mt-1">Communities</p>
            </div>
          </div>

          <Button variant="outline" className="self-start" onClick={() => setShowEditModal(true)}>Edit Profile</Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-surface rounded-xl p-1 border border-border w-fit">
        <button
          onClick={() => setActiveTab("posts")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === "posts"
              ? "bg-brand text-black"
              : "text-zinc-400 hover:text-white hover:bg-surface-hover"
          }`}
        >
          <Grid3X3 className="w-4 h-4" /> Posts
        </button>
        <button
          onClick={() => setActiveTab("communities")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === "communities"
              ? "bg-brand text-black"
              : "text-zinc-400 hover:text-white hover:bg-surface-hover"
          }`}
        >
          <Users className="w-4 h-4" /> Communities
        </button>
      </div>

      {/* Posts Grid Tab */}
      {activeTab === "posts" && (
        <div>
          {loadingPosts ? (
            <p className="text-zinc-500">Loading posts...</p>
          ) : userPosts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {userPosts.map(post => (
                <PostCard key={post.id} post={post} compact />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 opacity-50">
              <LayoutList className="w-12 h-12 text-zinc-600 mb-3" />
              <p className="text-zinc-400">You haven&apos;t made any posts yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Communities Tab */}
      {activeTab === "communities" && (
        <div>
          {loadingCommunities ? (
            <p className="text-zinc-500">Loading communities...</p>
          ) : userCommunities.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {userCommunities.map(c => (
                <Link
                  key={c.id}
                  href="/community"
                  className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-2 hover:border-brand/40 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg group-hover:text-brand transition-colors">{c.name}</h3>
                    {c.ownerId === user.uid && (
                      <span className="bg-brand/20 text-brand text-[10px] uppercase font-bold px-2 py-1 rounded">Owner</span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 line-clamp-2">{c.description}</p>
                  <p className="text-xs text-zinc-500 mt-1">{c.members?.length || 1} Members</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 opacity-50">
              <Users className="w-12 h-12 text-zinc-600 mb-3" />
              <p className="text-zinc-400">You haven&apos;t joined any communities yet.</p>
              <Link href="/community" className="text-brand text-sm hover:underline mt-2">Discover communities</Link>
            </div>
          )}
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Edit Profile</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 rounded-full hover:bg-surface-hover">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Username</label>
                <input 
                  type="text" 
                  value={editUsername} 
                  onChange={e => setEditUsername(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Bio</label>
                <textarea 
                  value={editBio} 
                  onChange={e => setEditBio(e.target.value)}
                  placeholder="Tell everyone about yourself..."
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand resize-none h-24"
                />
              </div>
              <p className="text-[10px] text-zinc-500">To change profile photo, hover over the avatar on the profile page.</p>
              <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full bg-brand text-black font-bold rounded-xl gap-2">
                <Save className="w-4 h-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
