"use client";

import { useState, useEffect } from "react";
import { Heart, MessageCircle, Send } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/UserAvatar";

export function PostCard({ post }: { post: any }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);

  useEffect(() => {
    if (!showComments) return;
    const q = query(
      collection(db, "posts", post.id, "comments"), 
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [showComments, post.id]);

  const handleLike = async () => {
    if (!user) return;
    setLiked(!liked);
    const postRef = doc(db, "posts", post.id);
    await updateDoc(postRef, {
      likesCount: increment(liked ? -1 : 1)
    });
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !user) return;
    setIsPostingComment(true);
    try {
      await addDoc(collection(db, "posts", post.id, "comments"), {
        userId: user.uid,
        username: user.displayName || "Variant",
        text: newComment,
        createdAt: serverTimestamp()
      });

      // Send a notification if the commenter is not the post owner
      if (user.uid !== post.userId) {
        await addDoc(collection(db, "notifications"), {
          userId: post.userId,
          type: "comment",
          message: `${user.displayName || "Someone"} commented on your post.`,
          link: `/feed`,
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      setNewComment("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsPostingComment(false);
    }
  };

  return (
    <div className="bg-surface rounded-3xl p-6 border border-border">
      <div className="flex items-center gap-3 mb-4">
        <UserAvatar userId={post.userId} username={post.username} size="md" showName={false} />
        <div>
          <UserAvatar userId={post.userId} username={post.username} size="md" showName={true} className="[&>div]:hidden" />
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
        <div className="mt-4 pt-4 border-t border-border flex flex-col gap-4">
          
          <div className="flex flex-col gap-3 max-h-48 overflow-y-auto pr-2">
             {comments.length === 0 && <p className="text-xs text-zinc-500">No comments yet. Be the first!</p>}
             {comments.map(c => (
               <div key={c.id} className="flex gap-2">
                 <UserAvatar userId={c.userId} username={c.username} size="sm" showName={false} />
                 <div className="bg-background rounded-2xl rounded-tl-sm px-3 py-2 border border-border/50 text-sm">
                    <UserAvatar userId={c.userId} username={c.username} size="sm" showName={true} className="[&>div]:hidden inline-flex mb-0.5" />
                    <span className="text-zinc-300 ml-1">{c.text}</span>
                 </div>
               </div>
             ))}
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="text" 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
              placeholder="Add a comment..."
              className="flex-1 bg-background border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:border-brand"
            />
            <Button onClick={handlePostComment} disabled={!newComment.trim() || isPostingComment} size="sm" className="rounded-full bg-brand text-black">
               <Send className="w-4 h-4 ml-0.5" />
            </Button>
          </div>

        </div>
      )}
    </div>
  );
}
