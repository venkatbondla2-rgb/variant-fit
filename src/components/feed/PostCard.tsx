"use client";

import { useState } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, increment } from "firebase/firestore";

export function PostCard({ post }: { post: any }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const handleLike = async () => {
    if (!user) return;
    setLiked(!liked);
    // Note: In production we'd track the specific user's like in a subcollection
    const postRef = doc(db, "posts", post.id);
    await updateDoc(postRef, {
      likesCount: increment(liked ? -1 : 1)
    });
  };

  return (
    <div className="bg-surface rounded-3xl p-6 border border-border">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-zinc-800" />
        <div>
          <h3 className="font-bold text-sm">{post.username}</h3>
          <p className="text-xs text-zinc-500">
            {post.createdAt?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || "Just now"}
          </p>
        </div>
      </div>

      {post.content && <p className="mb-4 text-sm">{post.content}</p>}

      {post.mediaUrl && (
        <div className="rounded-xl overflow-hidden mb-4 bg-black">
          {post.mediaType === "image" ? (
             // eslint-disable-next-line @next/next/no-img-element
            <img src={post.mediaUrl} alt="Post media" className="w-full h-auto object-cover max-h-[500px]" />
          ) : (
            <video src={post.mediaUrl} controls className="w-full h-auto object-cover max-h-[500px]" />
          )}
        </div>
      )}

      <div className="flex items-center gap-6 text-zinc-400 mt-2">
        <button 
          onClick={handleLike} 
          className={`flex items-center gap-2 hover:text-brand transition-colors text-sm font-medium ${liked ? "text-brand" : ""}`}
        >
          <Heart className={`w-5 h-5 ${liked ? "fill-brand" : ""}`} />
          {post.likesCount || 0}
        </button>
        
        <button 
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 hover:text-brand transition-colors text-sm font-medium"
        >
          <MessageCircle className="w-5 h-5" />
          Comments
        </button>
      </div>

      {showComments && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-zinc-500 text-center">Comments coming soon...</p>
        </div>
      )}
    </div>
  );
}
