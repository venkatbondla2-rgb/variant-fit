"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, Heart, MessageCircle, Volume2, VolumeX, Share2, MoreVertical, Edit2, Trash2, Info, BarChart2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, arrayUnion, arrayRemove, getDoc, deleteDoc } from "firebase/firestore";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ShareModal } from "@/components/shared/ShareModal";
import { NestedReplies } from "@/components/shared/NestedReplies";

interface ReelPost {
  id: string;
  userId: string;
  username: string;
  content?: string;
  mediaUrl: string;
  mediaType: string;
  likesCount?: number;
  likedBy?: string[];
  createdAt?: any;
}

interface VitesViewerProps {
  posts: ReelPost[];
  startIndex: number;
  onClose?: () => void;
  standalone?: boolean;
}

export function VitesViewer({ posts, startIndex, onClose, standalone = false }: VitesViewerProps) {
  const { user } = useAuth();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [isMuted, setIsMuted] = useState(true);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const [showHeart, setShowHeart] = useState<number | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<Record<number, { w: number; h: number }>>({});

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  const [showMoreMenu, setShowMoreMenu] = useState<string | null>(null);
  const [crewLoading, setCrewLoading] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showCommentsFor, setShowCommentsFor] = useState<string | null>(null);

  // New state for crew request handling
  const [ownerData, setOwnerData] = useState<any>(null);
  const [crewStatus, setCrewStatus] = useState<"none" | "pending" | "friends">("none");

  // Initialize like counts
  useEffect(() => {
    const counts: Record<string, number> = {};
    posts.forEach(p => { counts[p.id] = p.likesCount || 0; });
    setLikeCounts(counts);
  }, [posts]);

  // Check which posts user has liked
  useEffect(() => {
    if (!user) return;
    const checkLikes = async () => {
      const liked: Record<string, boolean> = {};
      for (const post of posts) {
        try {
          const snap = await getDoc(doc(db, "posts", post.id));
          if (snap.exists()) {
            const data = snap.data();
            liked[post.id] = data.likedBy?.includes(user.uid) || false;
          }
        } catch {}
      }
      setLikedPosts(liked);
    };
    checkLikes();
  }, [user, posts]);

  // Scroll to starting vite
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const timer = setTimeout(() => {
        container.scrollTop = startIndex * container.clientHeight;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [startIndex]);

  // Intersection observer for auto-play/pause
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number(entry.target.getAttribute("data-index"));
          const video = videoRefs.current[index];
          if (entry.isIntersecting) {
            setCurrentIndex(index);
            if (video) {
              video.currentTime = 0;
              video.play().catch(() => {});
            }
          } else {
            if (video) {
              video.pause();
            }
          }
        });
      },
      { root: container, threshold: 0.7 }
    );

    const vites = container.querySelectorAll("[data-index]");
    vites.forEach((vite) => observer.observe(vite));

    return () => observer.disconnect();
  }, [posts]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Lock body scroll & hide all UI
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    const scrollY = window.scrollY;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      window.scrollTo(0, scrollY);
    };
  }, []);

  const handleLike = useCallback(
    async (postId: string) => {
      if (!user) return;
      const isLiked = likedPosts[postId];
      setLikedPosts((prev) => ({ ...prev, [postId]: !isLiked }));
      setLikeCounts((prev) => ({
        ...prev,
        [postId]: (prev[postId] || 0) + (isLiked ? -1 : 1),
      }));

      const postRef = doc(db, "posts", postId);
      try {
        if (isLiked) {
          await updateDoc(postRef, {
            likesCount: increment(-1),
            likedBy: arrayRemove(user.uid),
          });
        } else {
          await updateDoc(postRef, {
            likesCount: increment(1),
            likedBy: arrayUnion(user.uid),
          });
        }
      } catch (err) {
        console.error(err);
        // Revert
        setLikedPosts((prev) => ({ ...prev, [postId]: isLiked }));
        setLikeCounts((prev) => ({
          ...prev,
          [postId]: (prev[postId] || 0) + (isLiked ? 1 : -1),
        }));
      }
    },
    [user, likedPosts]
  );

  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this vite?")) return;
    try {
      await deleteDoc(doc(db, "posts", postId));
      setShowMoreMenu(null);
      alert("Vite deleted.");
      if (onClose) onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to delete vite.");
    }
  };

  const handleEditSubmit = async (postId: string) => {
    try {
      await updateDoc(doc(db, "posts", postId), {
        content: editContent
      });
      setEditingPostId(null);
      setShowMoreMenu(null);
      alert("Vite updated.");
    } catch (err) {
      console.error(err);
      alert("Failed to update vite.");
    }
  };

  // Double tap to like
  const lastTap = useRef<number>(0);
  const handleDoubleTap = useCallback(
    (postId: string, index: number) => {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        if (!likedPosts[postId]) {
          handleLike(postId);
        }
        setShowHeart(index);
        setTimeout(() => setShowHeart(null), 800);
      } else {
        const video = videoRefs.current[index];
        if (video) {
          if (video.paused) video.play().catch(() => {});
          else video.pause();
        }
      }
      lastTap.current = now;
    },
    [likedPosts, handleLike]
  );

  const getTimeAgo = (createdAt: any) => {
    if (!createdAt?.toDate) return "";
    const diff = Date.now() - createdAt.toDate().getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return `${Math.floor(days / 7)}w`;
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Fetch owner data for crew request button
  useEffect(() => {
    const loadOwnerAndRequest = async () => {
      if (!user) return;
      const post = posts[currentIndex];
      if (!post) return;
      try {
        const snap = await getDoc(doc(db, "users", post.userId));
        if (snap.exists()) {
          const owner = snap.data();
          setOwnerData(owner);
          const friends = owner?.friends || [];
          if (friends.includes(user.uid)) {
            setCrewStatus("friends");
            return;
          }
        }

        const { getDocs, collection, query, where } = await import("firebase/firestore");
        
        // Check pending sent requests
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

        // Check pending received requests
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
        console.error(err);
      }
    };
    loadOwnerAndRequest();
  }, [user, posts, currentIndex]);

  const handleCrewRequest = async () => {
    if (!user) return;
    const post = posts[currentIndex];
    if (!post) return;
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

  const content = (
    <div className={
      standalone 
        ? "fixed inset-0 z-[49] bg-black h-[calc(100dvh-64px)] sm:static sm:w-full sm:h-[100dvh] sm:rounded-3xl sm:border sm:border-zinc-800 overflow-hidden"
        : "fixed inset-0 z-[9999] bg-black h-[100dvh]"
    }>
      {/* Close Button */}
      {!standalone && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[10001] w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors"
          aria-label="Close vites"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Vite counter */}
      <div className="absolute top-4 left-4 z-[10001] bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full">
        <span className="text-white text-xs font-bold">
          {currentIndex + 1} / {posts.length}
        </span>
      </div>

      {/* Vites scroll container — snap to each vite */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      >
        {posts.map((post, index) => {
          const isLiked = likedPosts[post.id] || false;
          const likeCount = likeCounts[post.id] || 0;

          return (
            <div
              key={post.id}
              data-index={index}
              className="relative w-full h-full max-w-[420px] mx-auto flex-shrink-0 flex items-center justify-center bg-black snap-start snap-always"
            >
              {/* Media — covers full screen */}
              {post.mediaType?.startsWith("image") ? (
                <>
                  <img 
                    src={post.mediaUrl} 
                    alt="Post"
                    className="absolute inset-0 w-full h-full object-contain bg-black"
                  />
                  <img
                    src={post.mediaUrl}
                    className="absolute inset-0 w-full h-full blur-3xl opacity-30 scale-110 object-cover"
                    aria-hidden="true"
                  />
                </>
              ) : (
                <>
                  <video
                    ref={(el) => {
                      videoRefs.current[index] = el;
                    }}
                    src={post.mediaUrl}
                    className="absolute inset-0 w-full h-full"
                    style={{ objectFit: "contain", backgroundColor: "#000" }}
                    loop
                    playsInline
                    muted={isMuted}
                    autoPlay={currentIndex === index}
                    preload="auto"
                    onClick={() => handleDoubleTap(post.id, index)}
                    onLoadedMetadata={(e) => {
                      const v = e.target as HTMLVideoElement;
                      setVideoDimensions(prev => ({
                        ...prev,
                        [index]: { w: v.videoWidth, h: v.videoHeight }
                      }));
                    }}
                  />
                  {videoDimensions[index] && videoDimensions[index].w > videoDimensions[index].h && (
                    <video
                      src={post.mediaUrl}
                      className="absolute inset-0 w-full h-full blur-3xl opacity-30 scale-110 object-cover"
                      muted
                      loop
                      playsInline
                      aria-hidden="true"
                    />
                  )}
                </>
              )}

              {/* Gradient overlays for text readability */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/50 to-transparent" />
              </div>

              {/* Double-tap heart animation */}
              {showHeart === index && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[10002]">
                  <Heart
                    className="w-24 h-24 text-red-500 fill-red-500 animate-[heartPop_0.8s_ease-out_forwards]"
                  />
                </div>
              )}

              {/* Right-side actions */}
              <div className="absolute right-2 bottom-24 sm:right-4 sm:bottom-28 flex flex-col items-center gap-5 z-[100]">
                <button onClick={() => handleLike(post.id)} className="flex flex-col items-center gap-1 group">
                  <Heart className={`w-8 h-8 transition-all duration-200 drop-shadow-md ${isLiked ? "fill-red-500 text-red-500 scale-110" : "text-white hover:scale-110"}`} />
                  <span className="text-white text-xs font-bold drop-shadow-md">{likeCount}</span>
                </button>
                <button onClick={() => setShowCommentsFor(post.id)} className="flex flex-col items-center gap-1 group hover:scale-110 transition-transform">
                  <MessageCircle className="w-8 h-8 text-white drop-shadow-md" />
                  <span className="text-white text-xs font-bold drop-shadow-md">Comments</span>
                </button>
                <button onClick={() => { setShareUrl(window.location.origin + `/vites?post=${post.id}`); setShareModalOpen(true); }} className="flex flex-col items-center gap-1 group hover:scale-110 transition-transform">
                  <Share2 className="w-8 h-8 text-white drop-shadow-md" />
                  <span className="text-white text-xs font-bold drop-shadow-md">Share</span>
                </button>
                {user?.uid === post.userId && (
                  <div className="relative">
                    <button onClick={() => setShowMoreMenu(showMoreMenu === post.id ? null : post.id)} className="flex flex-col items-center gap-1 group hover:scale-110 transition-transform">
                      <MoreVertical className="w-8 h-8 text-white drop-shadow-md" />
                    </button>
                    {showMoreMenu === post.id && (
                      <div className="absolute right-12 bottom-0 bg-zinc-900 border border-border rounded-xl shadow-xl p-2 flex flex-col min-w-[150px] z-[10005]">
                        <button 
                          onClick={() => { setEditContent(post.content || ""); setEditingPostId(post.id); setShowMoreMenu(null); }}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-zinc-800 rounded-lg w-full text-left"
                        >
                          <Edit2 className="w-4 h-4" /> Edit
                        </button>
                        <button 
                          onClick={() => { alert('Analytics not implemented yet'); }}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-yellow-400 hover:bg-zinc-800 rounded-lg w-full text-left"
                        >
                          <BarChart2 className="w-4 h-4" /> Analytics
                        </button>
                        <button 
                          onClick={() => handleDelete(post.id)}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-zinc-800 rounded-lg w-full text-left"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <button onClick={() => setIsMuted(!isMuted)} className="flex flex-col items-center gap-1 group hover:scale-110 transition-transform mt-2">
                  {isMuted ? <VolumeX className="w-6 h-6 text-white/80 drop-shadow-md" /> : <Volume2 className="w-6 h-6 text-white/80 drop-shadow-md" />}
                </button>
              </div>

              {/* Bottom info overlay */}
              <div className="absolute bottom-6 sm:bottom-8 left-4 right-20 z-[100]">
                <div className="flex items-center gap-3 mb-3">
                  <UserAvatar userId={post.userId} username={post.username} size="sm" showName={false} />
                  <span className="text-white font-bold text-sm drop-shadow-lg">{post.username}</span>
                  <span className="text-white/50 text-xs">{getTimeAgo(post.createdAt)}</span>
                </div>
                {post.content && (
                  <p className="text-white/90 text-sm line-clamp-2 drop-shadow-lg leading-relaxed">{post.content}</p>
                )}
                {user && user.uid !== post.userId && crewStatus === "none" && (
                  <button
                    onClick={handleCrewRequest}
                    disabled={crewLoading}
                    className="mt-2 px-3 py-1 bg-brand text-black rounded-full text-sm font-bold hover:brightness-110 disabled:opacity-50"
                  >
                    {crewLoading ? "Sending..." : "+ Crew"}
                  </button>
                )}
                {crewStatus === "pending" && (
                  <span className="mt-2 text-xs text-zinc-500 font-bold block">
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

              {currentIndex === index && (
                <div className="absolute top-0 left-0 right-0 h-[3px] z-[10001] bg-white/10"><div className="h-full bg-brand rounded-full" style={{ animation: "reelProgress 30s linear forwards" }} /></div>
              )}

              {editingPostId === post.id && (
                <div className="absolute inset-0 z-[10006] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-surface border border-border p-5 rounded-2xl w-full max-w-sm">
                    <h3 className="font-bold mb-4 text-white text-lg">Edit Vite</h3>
                    <textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="w-full bg-background border border-border rounded-xl p-3 text-white focus:border-brand focus:outline-none mb-4 min-h-[100px] resize-none" placeholder="Update caption..." />
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => setEditingPostId(null)} className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white">Cancel</button>
                      <button onClick={() => handleEditSubmit(post.id)} className="px-4 py-2 rounded-xl bg-brand text-black font-bold hover:brightness-110">Save</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ShareModal isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} urlToShare={shareUrl} />

      {showCommentsFor && (
        <div className="absolute inset-0 z-[10006] bg-black/60 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-surface border-t border-border rounded-t-3xl h-[70vh] flex flex-col relative w-full overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-border">
              <h3 className="text-lg font-bold">Comments</h3>
              <button onClick={() => setShowCommentsFor(null)} className="p-2 bg-background rounded-full hover:bg-zinc-800"><X className="w-5 h-5 text-zinc-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto"><NestedReplies collectionPath={`posts/${showCommentsFor}/comments`} /></div>
          </div>
        </div>
      )}

      <style jsx>{`\n        @keyframes reelProgress {\n          from { width: 0%; }\n          to { width: 100%; }\n        }\n        @keyframes heartPop {\n          0% { transform: scale(0); opacity: 0; }\n          20% { transform: scale(1.2); opacity: 1; }\n          50% { transform: scale(1); opacity: 1; }\n          80% { transform: scale(1.1); opacity: 1; }\n          100% { transform: scale(1); opacity: 0; }\n        }\n      `}</style>
    </div>
  );

  if (!standalone && !mounted) {
    const { createPortal } = require("react-dom");
    return createPortal(content, document.body);
  }
  return content;
}
