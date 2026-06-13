"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { VitesViewer } from "@/components/feed/VitesViewer";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VitesContent() {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const searchParams = useSearchParams();
  const postId = searchParams.get("post");

  useEffect(() => {
    if (authLoading || !user) return;
    const fetchVites = async () => {
      try {
        const q = query(
          collection(db, "posts"),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const allPosts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        // Only keep posts that are videos
        const vitePosts = allPosts.filter(p => p.mediaType && p.mediaType.startsWith("video"));
        setPosts(vitePosts);
      } catch (err) {
        console.error("Error fetching vites:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVites();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-center px-4">
        <h2 className="text-2xl font-bold text-white mb-2">No Vites Yet</h2>
        <p className="text-zinc-500">Be the first to upload a video!</p>
      </div>
    );
  }

  let startIndex = 0;
  if (postId) {
    const idx = posts.findIndex(p => p.id === postId);
    if (idx !== -1) startIndex = idx;
  }

  return (
    <div className="w-full">
      <VitesViewer 
        posts={posts} 
        startIndex={startIndex} 
        standalone={true} 
      />
    </div>
  );
}

export default function VitesPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>}>
      <VitesContent />
    </Suspense>
  );
}
