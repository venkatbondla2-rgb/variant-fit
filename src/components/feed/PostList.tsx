"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PostCard } from "@/components/feed/PostCard";
import { AdCard } from "@/components/feed/AdCard";
import { ReelsViewer } from "@/components/feed/ReelsViewer";

export function PostList() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reelsOpen, setReelsOpen] = useState(false);
  const [reelsStartIndex, setReelsStartIndex] = useState(0);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter video-only posts for the reels viewer
  const videoPosts = posts.filter((p) => p.mediaType === "video" && p.mediaUrl);

  const handleOpenReels = (postId: string) => {
    const videoIndex = videoPosts.findIndex((p) => p.id === postId);
    if (videoIndex >= 0) {
      setReelsStartIndex(videoIndex);
      setReelsOpen(true);
    }
  };

  if (loading) return <div className="text-center py-10 text-zinc-500">Loading feed...</div>;
  if (posts.length === 0) return <div className="text-center py-10 text-zinc-500">No posts yet. Be the first to post!</div>;

  return (
    <>
      <div className="flex flex-col gap-6">
        {posts.map((post, index) => (
          <div key={post.id}>
            <PostCard
              post={post}
              onOpenReels={post.mediaType === "video" ? () => handleOpenReels(post.id) : undefined}
            />
            {/* Inject an Ad every 3 posts */}
            {(index + 1) % 3 === 0 && <AdCard />}
          </div>
        ))}
      </div>

      {/* Reels Viewer Overlay */}
      {reelsOpen && videoPosts.length > 0 && (
        <ReelsViewer
          posts={videoPosts}
          startIndex={reelsStartIndex}
          onClose={() => setReelsOpen(false)}
        />
      )}
    </>
  );
}
