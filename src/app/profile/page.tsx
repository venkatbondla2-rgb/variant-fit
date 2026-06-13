"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, collection, query, where, orderBy, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LogOut, Grid3X3, Users, LayoutList, X, Save, User as UserIcon, Globe, Lock, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { PostCard } from "@/components/feed/PostCard";
import Link from "next/link";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { BadgeShowcase } from "@/components/profile/BadgeShowcase";
import { VitesViewer } from "@/components/feed/VitesViewer";

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [profileData, setProfileData] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userCommunities, setUserCommunities] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [activeTab, setActiveTab] = useState<"posts" | "communities" | "progress">("posts");
  
  // Edit profile state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Friends / Communities modals
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showCommunitiesModal, setShowCommunitiesModal] = useState(false);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  
  // Continuous feed viewer
  const [activeFeedStartIndex, setActiveFeedStartIndex] = useState<number | null>(null);

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
        setEditIsPrivate(data.isPrivate || false);
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
        isPrivate: editIsPrivate,
      });
      setShowEditModal(false);
      fetchProfile();
    } catch (err) {
      console.error(err);
      alert("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const openFriendsModal = async () => {
    setShowFriendsModal(true);
    setLoadingFriends(true);
    const friendIds = profileData?.friends || [];
    if (friendIds.length === 0) { setLoadingFriends(false); return; }
    try {
      const results: any[] = [];
      for (const fid of friendIds) {
        const snap = await getDoc(doc(db, "users", fid));
        if (snap.exists()) results.push({ id: fid, ...snap.data() });
      }
      setFriendsList(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFriends(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen p-4 sm:p-8 max-w-4xl mx-auto w-full pb-20">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Profile</h1>
        <Button variant="outline" onClick={logout} className="gap-2">
          <LogOut className="w-4 h-4" />
          Log Out
        </Button>
      </header>

      {/* Profile Header Card */}
      <div className="flex items-start gap-6 sm:gap-8 bg-surface p-6 sm:p-8 rounded-3xl border border-border flex-col md:flex-row mb-8">
        <ProfileAvatar user={user} profileData={profileData} onUpdate={fetchProfile} />
        
        <div className="flex flex-col flex-1 w-full">
          <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
            {profileData?.username || user.displayName || "Athlete"}
            {profileData?.isPrivate ? (
              <span className="inline-flex items-center gap-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                <Lock className="w-3 h-3" /> Private
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-brand/10 border border-brand/20 text-brand text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                <Globe className="w-3 h-3" /> Public
              </span>
            )}
          </h2>
          <p className="text-zinc-400 mb-2">{user.email}</p>
          {profileData?.bio && <p className="text-sm text-zinc-300 mb-4">{profileData.bio}</p>}
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-background rounded-2xl p-3 sm:p-4 border border-border text-center">
              <p className="text-lg font-bold text-brand">{userPosts.length}</p>
              <p className="text-[10px] sm:text-xs text-zinc-400 mt-1">Posts</p>
            </div>
            <button onClick={openFriendsModal} className="bg-background rounded-2xl p-3 sm:p-4 border border-border text-center hover:border-brand/50 transition-colors">
              <p className="text-lg font-bold">{profileData?.friends?.length || 0}</p>
              <p className="text-[10px] sm:text-xs text-zinc-400 mt-1">Variants</p>
            </button>
            <div className="bg-background rounded-2xl p-3 sm:p-4 border border-border text-center">
              <p className="text-lg font-bold text-brand">{profileData?.workoutCount || 0}</p>
              <p className="text-[10px] sm:text-xs text-zinc-400 mt-1">Workouts</p>
            </div>
            <button onClick={() => setShowCommunitiesModal(true)} className="bg-background rounded-2xl p-3 sm:p-4 border border-border text-center hover:border-brand/50 transition-colors">
              <p className="text-lg font-bold">{userCommunities.length}</p>
              <p className="text-[10px] sm:text-xs text-zinc-400 mt-1">Communities</p>
            </button>
          </div>

          <Button variant="outline" className="self-start" onClick={() => setShowEditModal(true)}>Edit Profile</Button>
        </div>
      </div>

      {/* Achievement Badges */}
      <div className="mb-8">
        <BadgeShowcase />
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
        <button
          onClick={() => setActiveTab("progress")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === "progress"
              ? "bg-brand text-black"
              : "text-zinc-400 hover:text-white hover:bg-surface-hover"
          }`}
        >
          <Camera className="w-4 h-4" /> Progress
        </button>
      </div>

      {/* Posts Grid Tab */}
      {activeTab === "posts" && (
        <div>
          {loadingPosts ? (
            <p className="text-zinc-500">Loading posts...</p>
          ) : userPosts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {userPosts.map((post, idx) => (
                <div key={post.id} onClick={() => setActiveFeedStartIndex(idx)} className="cursor-pointer">
                  <PostCard post={post} compact />
                </div>
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

      {/* Progress Tab */}
      {activeTab === "progress" && (
        <div className="flex flex-col items-center justify-center py-12">
          <Camera className="w-12 h-12 text-zinc-600 mb-3" />
          <p className="text-zinc-400 mb-3">Track your transformation journey</p>
          <a href="/progress" className="bg-brand text-black text-sm font-bold px-5 py-2.5 rounded-full hover:brightness-110 transition-all">
            View Progress Photos
          </a>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Edit Profile</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 rounded-full hover:bg-surface-hover"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Username</label>
                <input type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Bio</label>
                <textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Tell everyone about yourself..." className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand resize-none h-24" />
              </div>
              <p className="text-[10px] text-zinc-500">To change profile photo, hover over the avatar on the profile page.</p>

              {/* Privacy Toggle */}
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Account Visibility</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditIsPrivate(false)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                      !editIsPrivate ? "bg-brand/10 border-brand text-brand" : "bg-background border-border text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    <Globe className="w-4 h-4" /> Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditIsPrivate(true)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                      editIsPrivate ? "bg-orange-500/10 border-orange-500 text-orange-400" : "bg-background border-border text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    <Lock className="w-4 h-4" /> Private
                  </button>
                </div>
                <p className="text-[10px] text-zinc-600 mt-1">
                  {editIsPrivate ? "Only friends can see your posts and stats." : "Everyone can see your profile."}
                </p>
              </div>
              <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full bg-brand text-black font-bold rounded-xl gap-2">
                <Save className="w-4 h-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Friends Modal */}
      {showFriendsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowFriendsModal(false)}>
          <div className="bg-surface border border-border rounded-3xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><Users className="w-5 h-5 text-brand" /> Friends</h2>
              <button onClick={() => setShowFriendsModal(false)} className="p-2 rounded-full hover:bg-surface-hover"><X className="w-5 h-5" /></button>
            </div>
            {loadingFriends ? (
              <p className="text-zinc-500 text-center py-8">Loading...</p>
            ) : friendsList.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No friends yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {friendsList.map(f => (
                  <Link key={f.id} href={`/profile/${f.id}`} onClick={() => setShowFriendsModal(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-background transition-colors">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {f.profilePic ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.profilePic} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-5 h-5 text-zinc-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{f.username || "Athlete"}</p>
                      <p className="text-xs text-zinc-500">{f.email}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Communities Modal */}
      {showCommunitiesModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCommunitiesModal(false)}>
          <div className="bg-surface border border-border rounded-3xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><Users className="w-5 h-5 text-brand" /> Communities</h2>
              <button onClick={() => setShowCommunitiesModal(false)} className="p-2 rounded-full hover:bg-surface-hover"><X className="w-5 h-5" /></button>
            </div>
            {userCommunities.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No communities joined.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {userCommunities.map(c => (
                  <Link key={c.id} href="/community" onClick={() => setShowCommunitiesModal(false)} className="flex items-center justify-between p-3 rounded-xl hover:bg-background transition-colors">
                    <div>
                      <p className="font-bold text-sm">{c.name}</p>
                      <p className="text-xs text-zinc-500">{c.members?.length || 1} members</p>
                    </div>
                    {c.ownerId === user.uid && <span className="text-[10px] text-brand font-bold bg-brand/20 px-2 py-0.5 rounded">Owner</span>}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Continuous Feed Viewer */}
      {activeFeedStartIndex !== null && (
        <VitesViewer 
          posts={userPosts}
          startIndex={activeFeedStartIndex}
          onClose={() => setActiveFeedStartIndex(null)}
        />
      )}
    </div>
  );
}
