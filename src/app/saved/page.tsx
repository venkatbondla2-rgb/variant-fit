"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PostCard } from "@/components/feed/PostCard";
import { Bookmark, Loader2 } from "lucide-react";
import Link from "next/link";

export default function SavedPostsPage() {
  const { user, loading: authLoading } = useAuth();
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchSavedPosts = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const savedIds = userSnap.data().savedPosts || [];
          if (savedIds.length === 0) {
            setSavedPosts([]);
            setLoading(false);
            return;
          }

          // Fetch all saved posts
          const postsData: any[] = [];
          for (const postId of savedIds) {
            const postSnap = await getDoc(doc(db, "posts", postId));
            if (postSnap.exists()) {
              postsData.push({ id: postSnap.id, ...postSnap.data() });
            }
          }
          // Sort by newest first (assuming createdAt is a timestamp)
          postsData.sort((a, b) => {
            const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
            const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
            return timeB - timeA;
          });
          setSavedPosts(postsData);
        }
      } catch (err) {
        console.error("Error fetching saved posts", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedPosts();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center py-20 gap-3 min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
        <p className="text-sm text-zinc-500">Loading saved posts...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-screen">
        <p className="text-zinc-500 mb-4">Please log in to view your saved posts.</p>
        <Link href="/login" className="bg-brand text-black font-bold px-6 py-2 rounded-full">Login</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full py-6 pb-20">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center border border-brand/30">
          <Bookmark className="w-6 h-6 text-brand" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Saved Posts</h1>
          <p className="text-sm text-zinc-500">{savedPosts.length} post{savedPosts.length !== 1 ? 's' : ''} saved</p>
        </div>
      </div>

      {savedPosts.length === 0 ? (
        <div className="bg-surface border border-border rounded-3xl p-10 text-center flex flex-col items-center">
          <Bookmark className="w-12 h-12 text-zinc-600 mb-4" />
          <h2 className="text-lg font-bold mb-2">No Saved Posts</h2>
          <p className="text-sm text-zinc-400 mb-6 max-w-sm">
            You haven&apos;t saved any posts yet. When you see a workout, PR, or transformation you want to keep, tap the save icon on the post!
          </p>
          <Link href="/feed" className="bg-brand text-black font-bold px-6 py-2.5 rounded-full hover:brightness-110 transition-all">
            Explore Feed
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {savedPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
