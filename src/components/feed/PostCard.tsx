"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Play, ZoomIn, Dumbbell, Trophy, Clock, Flame, Share2, Bookmark, MoreVertical, Edit2, Trash2, Info, BarChart2, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, collection, getCountFromServer, arrayUnion, arrayRemove, getDoc, deleteDoc, setDoc } from "firebase/firestore";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { NestedReplies } from "@/components/shared/NestedReplies";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { ShareModal } from "@/components/shared/ShareModal";

interface PostCardProps {
  post: any;
  compact?: boolean;
  onOpenVites?: () => void;
}

function getTimeAgo(createdAt: any): string {
  if (!createdAt?.toDate) return "Just now";
  const diff = Date.now() - createdAt.toDate().getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "Just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return createdAt.toDate().toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const POST_TYPE_CONFIG: Record<string, { icon: any; label: string; gradient: string; border: string }> = {
  workout_completed: {
    icon: Dumbbell,
    label: "Workout Completed",
    gradient: "from-green-500/20 via-green-500/5 to-transparent",
    border: "border-green-500/30",
  },
  pr_achieved: {
    icon: Trophy,
    label: "New PR!",
    gradient: "from-yellow-500/20 via-yellow-500/5 to-transparent",
    border: "border-yellow-500/30",
  },
  transformation: {
    icon: Flame,
    label: "Transformation",
    gradient: "from-orange-500/20 via-orange-500/5 to-transparent",
    border: "border-orange-500/30",
  },
};

export function PostCard({ post, compact = false, onOpenVites }: PostCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(post.likesCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState<number>(post.commentsCount || 0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || "");
  const [saved, setSaved] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [ownerData, setOwnerData] = useState<any>(null);
  const [crewStatus, setCrewStatus] = useState<"none" | "pending" | "friends">("none");
  const [crewLoading, setCrewLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(window.location.origin + `/feed?post=${post.id}`);
    }
  }, [post.id]);

  // Load owner data to determine crew status
  useEffect(() => {
    const loadOwnerAndRequest = async () => {
      if (!user || !post.userId) return;
      try {
        const snap = await getDoc(doc(db, "users", post.userId));
        if (snap.exists()) {
          const data = snap.data();
          setOwnerData(data);
          const friends = data?.friends || [];
          if (friends.includes(user.uid)) {
            setCrewStatus("friends");
            return;
          }
        }

        const { getDocs, collection, query, where } = await import("firebase/firestore");
        
        // Check if pending sent request exists
        const qSent = query(
          collection(db, "friend_requests"),
          where("fromId", "==", user.uid),
          where("toId", "==", post.userId),
          where("status", "==", "pending")
        );
        const snapSent = await getDocs(qSent);
        if (!snapSent.empty) {
          setCrewStatus("pending");
          return;
        }

        // Check if pending received request exists
        const qRecv = query(
          collection(db, "friend_requests"),
          where("fromId", "==", post.userId),
          where("toId", "==", user.uid),
          where("status", "==", "pending")
        );
        const snapRecv = await getDocs(qRecv);
        if (!snapRecv.empty) {
          setCrewStatus("pending");
          return;
        }

        setCrewStatus("none");
      } catch (err) {
        console.error("Error loading crew status:", err);
      }
    };
    loadOwnerAndRequest();
  }, [user, post.userId]);

  const handleCrewRequest = async () => {
    if (!user) return;
    setCrewLoading(true);
    try {
      const { addDoc, collection, serverTimestamp } = await import("firebase/firestore");
      const targetName = ownerData?.username || ownerData?.displayName || "Variant";

      // 1. Send friend request document
      await addDoc(collection(db, "friend_requests"), {
        fromId: user.uid,
        fromName: user.displayName || user.email?.split("@")[0] || "Variant",
        toId: post.userId,
        toName: targetName,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      // 2. Send notification document
      await addDoc(collection(db, "notifications"), {
        userId: post.userId,
        type: "friend_request",
        message: `${user.displayName || user.email?.split("@")[0] || "Someone"} sent you a friend request!`,
        link: `/profile/${user.uid}`,
        read: false,
        createdAt: serverTimestamp(),
      });

      setCrewStatus("pending");
      alert("Crew request sent!");
    } catch (err) {
      console.error(err);
      alert("Failed to send crew request.");
    } finally {
      setCrewLoading(false);
    }
  };

  // Check if current user already liked this post or saved it
  useEffect(() => {
    if (!user || !post.id) return;
    const fetchData = async () => {
      try {
        const postRef = doc(db, "posts", post.id);
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
          const data = postSnap.data();
          if (data.likedBy?.includes(user.uid)) {
            setLiked(true);
          }
          setLocalLikes(data.likesCount || 0);
        }
        
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().savedPosts?.includes(post.id)) {
          setSaved(true);
        }
      } catch {}
    };
    fetchData();
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

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      await deleteDoc(doc(db, "posts", post.id));
      setShowMoreMenu(false);
      alert("Post deleted.");
    } catch (err) {
      console.error(err);
      alert("Failed to delete post.");
    }
  };

  const handleEditSubmit = async () => {
    try {
      await updateDoc(doc(db, "posts", post.id), {
        content: editContent
      });
      setIsEditing(false);
      setShowMoreMenu(false);
      alert("Post updated.");
    } catch (err) {
      console.error(err);
      alert("Failed to update post.");
    }
  };

  const handleSavePost = async () => {
    if (!user) return;
    try {
      if (saved) {
        setSaved(false);
        await setDoc(doc(db, "users", user.uid), {
          savedPosts: arrayRemove(post.id)
        }, { merge: true });
      } else {
        setSaved(true);
        await setDoc(doc(db, "users", user.uid), {
          savedPosts: arrayUnion(post.id)
        }, { merge: true });
      }
    } catch (err) {
      console.error("Failed to save post", err);
      setSaved(!saved);
    }
  };

  const isVideo = post.mediaType?.startsWith("video");
  const isImage = post.mediaUrl && !isVideo;
  const postType = post.postType ? POST_TYPE_CONFIG[post.postType] : null;

  // Compact grid card (for profile page)
  if (compact) {
    return (
      <>
        <div
          className="relative aspect-square bg-zinc-900 rounded-2xl overflow-hidden border border-border hover:border-brand/50 transition-all cursor-pointer group"
          onClick={() => {
            if (isVideo && onOpenVites) onOpenVites();
            else if (isImage) setLightboxOpen(true);
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
              <img src={getOptimizedImageUrl(post.mediaUrl, 400)} alt="Post" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center p-4 bg-surface">
              <p className="text-xs text-zinc-400 line-clamp-4 text-center">{post.content}</p>
            </div>
          )}
          {/* Post type badge */}
          {postType && (
            <div className="absolute top-2 left-2 z-10">
              <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white`}>
                <postType.icon className="w-2.5 h-2.5" />
                {postType.label}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex items-center gap-4 text-white font-bold text-sm">
              <span className="flex items-center gap-1"><Heart className="w-4 h-4 fill-white" /> {localLikes}</span>
              <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> {commentCount}</span>
            </div>
          </div>
        </div>
        {lightboxOpen && isImage && (
          <ImageLightbox src={post.mediaUrl} alt="Post" onClose={() => setLightboxOpen(false)} />
        )}
      </>
    );
  }

  // ======== FULL CARD (Feed) ========
  return (
    <>
      <div className={`relative bg-surface rounded-3xl border transition-all duration-300 overflow-hidden ${
        postType ? `${postType.border} card-glow` : "border-border card-glow"
      }`}>
        {/* Post type banner for special posts */}
        {postType && (
          <div className={`bg-gradient-to-r ${postType.gradient} px-5 py-2.5 flex items-center gap-2`}>
            <postType.icon className="w-4 h-4 text-white" />
            <span className="text-xs font-black uppercase tracking-wider text-white/90">{postType.label}</span>
          </div>
        )}

        <div className="p-4 sm:p-5">
          {/* Header: Avatar + Name + Time */}
          <div className="flex items-center gap-3 mb-3">
            <UserAvatar userId={post.userId} username={post.username} size="md" showName={false} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <UserAvatar userId={post.userId} username={post.username} size="md" showName={true} className="[&>div]:hidden" />
                {user && user.uid !== post.userId && crewStatus === "none" && (
                  <button
                    onClick={handleCrewRequest}
                    disabled={crewLoading}
                    className="mt-2 px-3 py-1 bg-brand text-black rounded-full text-sm font-bold hover:brightness-110 disabled:opacity-50 transition transform duration-200 ease-out hover:scale-105 active:scale-95 flex items-center justify-center"
                  >
                    {crewLoading ? (
                      <>
                        <Loader2 className="animate-spin mr-1 w-4 h-4 text-black" />
                        Sending...
                      </>
                    ) : (
                      "+ Crew"
                    )}
                  </button>
                )}
                {crewStatus === "pending" && (
                  <span className="mt-2 flex items-center gap-1 text-sm text-zinc-500 font-bold">
                    Sent...
                  </span>
                )}
                {crewStatus === "friends" && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-green-400 font-bold">Crew ✓</span>
                    <button
                      onClick={() => router.push(`/messages?userId=${post.userId}`)}
                      className="px-2.5 py-1 bg-brand text-black rounded-full text-xs font-bold hover:brightness-110 flex items-center gap-1"
                    >
                      <MessageCircle className="w-3 h-3" />
                      Message
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Clock className="w-3 h-3 text-zinc-600" />
                <p className="text-[11px] text-zinc-500 font-medium">
                  {getTimeAgo(post.createdAt)}
                </p>
              </div>
            </div>
            
            {/* 3-dots Menu */}
            {user && (
              <div className="relative">
                <button 
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                
                {showMoreMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-zinc-900 border border-border rounded-xl shadow-xl p-2 flex flex-col min-w-[150px] z-[50]">
                    <button 
                      onClick={() => { handleSavePost(); setShowMoreMenu(false); }}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-zinc-800 rounded-lg w-full text-left"
                    >
                      <Bookmark className={`w-4 h-4 ${saved ? "fill-brand text-brand" : ""}`} /> {saved ? "Unsave Post" : "Save Post"}
                    </button>
                    {user?.uid === post.userId && (
                      <>
                        <button 
                          onClick={() => {
                            setIsEditing(true);
                            setShowMoreMenu(false);
                          }}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-zinc-800 rounded-lg w-full text-left"
                        >
                          <Edit2 className="w-4 h-4" /> Edit
                        </button>
                        <button 
                          onClick={handleDelete}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-zinc-800 rounded-lg w-full text-left"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                        <button 
                          onClick={() => { alert('Analytics not implemented yet'); }}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-yellow-400 hover:bg-zinc-800 rounded-lg w-full text-left"
                        >
                          <BarChart2 className="w-4 h-4" /> Analytics
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Workout tags */}
          {post.workoutTags && post.workoutTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {post.workoutTags.map((tag: string) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] font-bold uppercase tracking-wide"
                >
                  <Dumbbell className="w-2.5 h-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Workout stats for completed workout posts */}
          {post.postType === "workout_completed" && post.workoutStats && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-background rounded-xl p-2.5 text-center border border-border/50">
                <p className="text-lg font-black text-brand">{post.workoutStats.exercises || 0}</p>
                <p className="text-[9px] text-zinc-500 uppercase font-bold">Exercises</p>
              </div>
              <div className="bg-background rounded-xl p-2.5 text-center border border-border/50">
                <p className="text-lg font-black text-orange-400">{post.workoutStats.calories || 0}</p>
                <p className="text-[9px] text-zinc-500 uppercase font-bold">Cal Burned</p>
              </div>
              <div className="bg-background rounded-xl p-2.5 text-center border border-border/50">
                <p className="text-lg font-black text-blue-400">{post.workoutStats.duration || "—"}</p>
                <p className="text-[9px] text-zinc-500 uppercase font-bold">Minutes</p>
              </div>
            </div>
          )}

          {/* PR achievement banner */}
          {post.postType === "pr_achieved" && post.prData && (
            <div className="relative bg-gradient-to-r from-yellow-500/20 via-surface to-yellow-500/20 rounded-2xl p-4 mb-3 border border-yellow-500/30 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/5 to-transparent animate-pulse" />
              <div className="relative z-10 flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-400 flex-shrink-0" />
                <div>
                  <p className="font-black text-white">{post.prData.exercise}</p>
                  <p className="text-sm text-yellow-400 font-bold">{post.prData.weight} {post.prData.unit} — New Personal Record!</p>
                </div>
              </div>
            </div>
          )}

          {/* Content text */}
          {post.content && !isEditing && (
            <p className="mb-3 text-[15px] leading-relaxed text-zinc-200">{post.content}</p>
          )}

          {isEditing && (
            <div className="mb-3 border border-border p-3 rounded-xl bg-background/50">
              <textarea 
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="w-full bg-transparent border-none text-white focus:outline-none resize-none min-h-[60px]"
                placeholder="Update caption..."
              />
              <div className="flex gap-2 justify-end mt-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 rounded-lg text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleEditSubmit}
                  className="px-3 py-1 rounded-lg text-xs bg-brand text-black font-bold hover:brightness-110"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Media — larger previews */}
          {post.mediaUrl && (
            <div
              className={`rounded-2xl overflow-hidden mb-3 bg-black/50 relative group cursor-pointer`}
              onClick={isVideo && onOpenVites ? onOpenVites : isImage ? () => setLightboxOpen(true) : undefined}
            >
              {!isVideo ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getOptimizedImageUrl(post.mediaUrl, 800)}
                    alt="Post media"
                    className="w-full max-h-[600px] object-contain bg-black group-hover:scale-[1.02] transition-transform duration-500"
                    loading="lazy"
                  />
                  {/* Zoom overlay hint */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center">
                      <ZoomIn className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="relative bg-black rounded-xl" style={{ aspectRatio: "9/16", maxHeight: "600px", margin: "0 auto" }}>
                  <video
                    src={post.mediaUrl}
                    className="w-full h-full object-contain rounded-xl"
                    muted loop playsInline
                    onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                    onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                      <Play className="w-7 h-7 text-white fill-white ml-1" />
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wider">
                    Vite
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions bar */}
          <div className="flex items-center justify-between mt-1 pt-2 border-t border-border/30">
            <div className="flex items-center gap-5">
              <button onClick={handleLike}
                className={`flex items-center gap-2 transition-all text-sm font-semibold group ${liked ? "text-red-500" : "text-zinc-400 hover:text-red-400"}`}>
                <Heart className={`w-[22px] h-[22px] transition-all duration-200 ${liked ? "fill-red-500 text-red-500 scale-110" : "group-hover:scale-110"}`} />
                <span>{localLikes}</span>
              </button>
              <button onClick={() => setShowComments(!showComments)}
                className="flex items-center gap-2 text-zinc-400 hover:text-brand transition-all text-sm font-semibold group">
                <MessageCircle className="w-[22px] h-[22px] group-hover:scale-110 transition-transform" />
                <span>{commentCount > 0 ? commentCount : ""}</span>
              </button>
              <button 
                onClick={() => setShareModalOpen(true)}
                className="text-zinc-400 hover:text-brand transition-all group"
              >
                <Share2 className="w-[20px] h-[20px] group-hover:scale-110 transition-transform" />
              </button>
            </div>
            <button onClick={handleSavePost} className={`text-sm transition-all group ${saved ? "text-brand" : "text-zinc-500 hover:text-brand"}`}>
              <Bookmark className={`w-[20px] h-[20px] transition-transform ${saved ? "fill-brand" : "group-hover:scale-110"}`} />
            </button>
          </div>
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-border/30 pt-3">
            <NestedReplies
              collectionPath={`posts/${post.id}/comments`}
              notifyUserId={post.userId}
              notifyType="comment"
              notifyLink="/feed"
              placeholder="Add a comment..."
            />
          </div>
        )}

        {/* Share Modal Overlay on Post */}
        {shareModalOpen && (
          <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in">
            <ShareModal 
              isOpen={shareModalOpen}
              onClose={() => setShareModalOpen(false)}
              urlToShare={shareUrl}
              inline={true}
            />
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      {lightboxOpen && isImage && (
        <ImageLightbox src={post.mediaUrl} alt="Post media" onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
}
