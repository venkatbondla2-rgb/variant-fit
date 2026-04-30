"use client";

import { useState, useEffect } from "react";
import { Heart, MessageCircle, Play } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, collection, getCountFromServer, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { NestedReplies } from "@/components/shared/NestedReplies";

interface PostCardProps {
  post: any;
  compact?: boolean;
  onOpenReels?: () => void;
}

export function PostCard({ post, compact = false, onOpenReels }: PostCardProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(post.likesCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState<number>(post.commentsCount || 0);

  // Check if current user already liked this post
  useEffect(() => {
    if (!user || !post.id) return;
    const checkLiked = async () => {
      try {
        const postRef = doc(db, "posts", post.id);
        const snap = await getDoc(postRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.likedBy?.includes(user.uid)) {
            setLiked(true);
          }
          setLocalLikes(data.likesCount || 0);
        }
      } catch {}
    };
    checkLiked();
  }, [user, post.id]);

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
    const postRef = doc(db, "posts", post.id);
    try {
      if (liked) {
        setLiked(false);
        setLocalLikes((prev: number) => Math.max(0, prev - 1));
        await updateDoc(postRef, {
          likesCount: increment(-1),
          likedBy: arrayRemove(user.uid),
        });
      } else {
        setLiked(true);
        setLocalLikes((prev: number) => prev + 1);
        await updateDoc(postRef, {
          likesCount: increment(1),
          likedBy: arrayUnion(user.uid),
        });
      }
    } catch (err) {
      console.error(err);
      setLiked(!liked);
    }
  };

  const isVideo = post.mediaType === "video";

  // Compact grid card (for profile page)
  if (compact) {
    return (
      <div
        className="relative aspect-square bg-zinc-900 rounded-2xl overflow-hidden border border-border hover:border-brand/50 transition-all cursor-pointer group"
        onClick={() => {
          if (isVideo && onOpenReels) onOpenReels();
          else setShowComments(!showComments);
        }}
      >
        {post.mediaUrl ? (
          isVideo ? (
            <div className="relative w-full h-full">
              <video src={post.mediaUrl} className="w-full h-full object-cover" muted />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                </div>
              </div>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.mediaUrl} alt="Post" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center p-4 bg-surface">
            <p className="text-xs text-zinc-400 line-clamp-4 text-center">{post.content}</p>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex items-center gap-4 text-white font-bold text-sm">
            <span className="flex items-center gap-1"><Heart className="w-4 h-4 fill-white" /> {localLikes}</span>
            <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> {commentCount}</span>
          </div>
        </div>
      </div>
    );
  }

  // Full card (for feed)
  return (
    <div className="bg-surface rounded-3xl p-4 sm:p-6 border border-border">
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

      {post.mediaUrl && (
        <div
          className={`rounded-xl overflow-hidden mb-4 bg-black relative ${isVideo ? "cursor-pointer" : ""}`}
          onClick={isVideo && onOpenReels ? onOpenReels : undefined}
        >
          {!isVideo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.mediaUrl} alt="Post media" className="w-full h-auto object-cover max-h-[500px]" />
          ) : (
            <div className="relative" style={{ aspectRatio: "9/16", maxHeight: "600px", margin: "0 auto" }}>
              <video
                src={post.mediaUrl}
                className="w-full h-full object-cover rounded-xl"
                muted loop playsInline
                onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-7 h-7 text-white fill-white ml-1" />
                </div>
              </div>
              <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold uppercase px-2 py-1 rounded-full tracking-wider">
                Reel
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-6 text-zinc-400 mt-2">
        <button onClick={handleLike}
          className={`flex items-center gap-2 hover:text-brand transition-colors text-sm font-medium ${liked ? "text-red-500" : ""}`}>
          <Heart className={`w-5 h-5 ${liked ? "fill-red-500 text-red-500" : ""}`} />
          {localLikes}
        </button>
        <button onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 hover:text-brand transition-colors text-sm font-medium">
          <MessageCircle className="w-5 h-5" />
          {commentCount > 0 ? `${commentCount} Comments` : "Comments"}
        </button>
      </div>

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
