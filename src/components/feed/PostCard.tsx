"use client";

import { useState, useEffect } from "react";
import { Heart, MessageCircle, X, Maximize2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, collection, getCountFromServer } from "firebase/firestore";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { NestedReplies } from "@/components/shared/NestedReplies";

interface PostCardProps {
  post: any;
  compact?: boolean;
}

export function PostCard({ post, compact = false }: PostCardProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showFullscreenVideo, setShowFullscreenVideo] = useState(false);
  const [commentCount, setCommentCount] = useState<number>(post.commentsCount || 0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const coll = collection(db, "posts", post.id, "comments");
        const snapshot = await getCountFromServer(coll);
        setCommentCount(snapshot.data().count);
      } catch {}
    };
    fetchCount();
  }, [post.id]);

  const handleLike = async () => {
    if (!user) return;
    setLiked(!liked);
    const postRef = doc(db, "posts", post.id);
    await updateDoc(postRef, { likesCount: increment(liked ? -1 : 1) });
  };

  // Compact grid card (for profile page)
  if (compact) {
    return (
      <div
        className="relative aspect-square bg-zinc-900 rounded-2xl overflow-hidden border border-border hover:border-brand/50 transition-all cursor-pointer group"
        onClick={() => setShowComments(!showComments)}
      >
        {post.mediaUrl ? (
          post.mediaType === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.mediaUrl} alt="Post" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <video src={post.mediaUrl} className="w-full h-full object-cover" muted />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center p-4 bg-surface">
            <p className="text-xs text-zinc-400 line-clamp-4 text-center">{post.content}</p>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex items-center gap-4 text-white font-bold text-sm">
            <span className="flex items-center gap-1"><Heart className="w-4 h-4 fill-white" /> {post.likesCount || 0}</span>
            <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> {commentCount}</span>
          </div>
        </div>
      </div>
    );
  }

  // Full card (for feed)
  return (
    <div className="bg-surface rounded-3xl p-4 sm:p-6 border border-border">
      {/* Author */}
      <div className="flex items-center gap-3 mb-4">
        <UserAvatar userId={post.userId} username={post.username} size="md" showName={false} />
        <div>
          <UserAvatar userId={post.userId} username={post.username} size="md" showName={true} className="[&>div]:hidden" />
          <p className="text-xs text-zinc-500">
            {post.createdAt?.toDate?.()?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || "Just now"}
          </p>
        </div>
      </div>

      {post.content && <p className="mb-4 text-sm">{post.content}</p>}

      {/* Media */}
      {post.mediaUrl && (
        <div className="rounded-xl overflow-hidden mb-4 bg-black relative">
          {post.mediaType === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.mediaUrl} alt="Post media" className="w-full h-auto object-cover max-h-[500px]" />
          ) : (
            <div className="relative">
              <video src={post.mediaUrl} controls className="w-full h-auto object-cover max-h-[500px]" />
              <button onClick={() => setShowFullscreenVideo(true)}
                className="absolute top-3 right-3 p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors sm:hidden">
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Video Overlay (Mobile) */}
      {showFullscreenVideo && post.mediaUrl && post.mediaType !== "image" && (
        <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center" onClick={() => setShowFullscreenVideo(false)}>
          <button onClick={() => setShowFullscreenVideo(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white z-10 hover:bg-white/20">
            <X className="w-6 h-6" />
          </button>
          <video src={post.mediaUrl} controls autoPlay className="w-full h-full object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-6 text-zinc-400 mt-2">
        <button onClick={handleLike}
          className={`flex items-center gap-2 hover:text-brand transition-colors text-sm font-medium ${liked ? "text-brand" : ""}`}>
          <Heart className={`w-5 h-5 ${liked ? "fill-brand" : ""}`} />
          {post.likesCount || 0}
        </button>
        <button onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 hover:text-brand transition-colors text-sm font-medium">
          <MessageCircle className="w-5 h-5" />
          {commentCount > 0 ? `${commentCount} Comments` : "Comments"}
        </button>
      </div>

      {/* Nested Comments */}
      {showComments && (
        <NestedReplies
          collectionPath={`posts/${post.id}/comments`}
          notifyUserId={post.userId}
          notifyType="comment"
          notifyLink="/feed"
          placeholder="Add a comment..."
        />
      )}
    </div>
  );
}
