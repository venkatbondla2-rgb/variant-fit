"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { PostCard } from "@/components/feed/PostCard";

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [profileData, setProfileData] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

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
        setProfileData(docSnap.data());
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

  useEffect(() => {
    fetchProfile();
    fetchPosts();
  }, [user]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen p-8 max-w-4xl mx-auto w-full">
      <header className="flex items-center justify-between mb-12">
        <h1 className="text-3xl font-bold">Profile</h1>
        <Button variant="outline" onClick={logout} className="gap-2">
          <LogOut className="w-4 h-4" />
          Log Out
        </Button>
      </header>

      <div className="flex items-start gap-8 bg-surface p-8 rounded-3xl border border-border flex-col md:flex-row mb-12">
        <ProfileAvatar user={user} profileData={profileData} onUpdate={fetchProfile} />
        
        <div className="flex flex-col flex-1 w-full">
          <h2 className="text-2xl font-bold mb-1">{profileData?.username || user.displayName || "Athlete"}</h2>
          <p className="text-zinc-400 mb-6">{user.email}</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-background rounded-2xl p-4 border border-border">
              <p className="text-sm text-zinc-400">Workouts</p>
              <p className="text-2xl font-bold text-brand">{profileData?.workoutCount || 0}</p>
            </div>
            <div className="bg-background rounded-2xl p-4 border border-border">
              <p className="text-sm text-zinc-400">Followers</p>
              <p className="text-2xl font-bold">{profileData?.followers?.length || 0}</p>
            </div>
            <div className="bg-background rounded-2xl p-4 border border-border">
              <p className="text-sm text-zinc-400">Following</p>
              <p className="text-2xl font-bold">{profileData?.following?.length || 0}</p>
            </div>
          </div>

          <Button variant="outline" className="self-start">Edit Profile</Button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <h3 className="text-xl font-bold">Your Posts</h3>
        {loadingPosts ? (
           <p className="text-zinc-500">Loading posts...</p>
        ) : userPosts.length > 0 ? (
           <div className="flex flex-col gap-6 w-full max-w-2xl">
             {userPosts.map(post => (
               <PostCard key={post.id} post={post} />
             ))}
           </div>
        ) : (
           <p className="text-zinc-500">You haven't made any posts yet.</p>
        )}
      </div>
    </div>
  );
}
