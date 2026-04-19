"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { CreatePost } from "@/components/feed/CreatePost";
import { PostList } from "@/components/feed/PostList";

export default function FeedPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className="flex flex-col min-h-screen pt-8 px-4 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">Home Feed</h1>
      <CreatePost />
      <PostList />
    </div>
  );
}
