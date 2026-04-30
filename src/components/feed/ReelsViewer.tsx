"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Heart, MessageCircle, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, increment } from "firebase/firestore";
import { UserAvatar } from "@/components/ui/UserAvatar";

interface ReelPost {
  id: string;
  userId: string;
  username: string;
  content?: string;
  mediaUrl: string;
  mediaType: string;
  likesCount?: number;
  createdAt?: any;
}

interface ReelsViewerProps {
  posts: ReelPost[];
  startIndex: number;
  onClose: () => void;
}

export function ReelsViewer({ posts, startIndex, onClose }: ReelsViewerProps) {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [mutedPosts, setMutedPosts] = useState<Record<string, boolean>>({});
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});

  // Scroll to the starting reel on mount
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const reelHeight = window.innerHeight;
      container.scrollTop = startIndex * reelHeight;
    }
  }, [startIndex]);

  // Observe which reel is in view
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
      { root: container, threshold: 0.6 }
    );

    const reels = container.querySelectorAll("[data-index]");
    reels.forEach((reel) => observer.observe(reel));

    return () => observer.disconnect();
  }, [posts]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent body scroll while reels are open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleLike = useCallback(
    async (postId: string) => {
      if (!user) return;
      const isLiked = likedPosts[postId];
      setLikedPosts((prev) => ({ ...prev, [postId]: !isLiked }));
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, { likesCount: increment(isLiked ? -1 : 1) });
    },
    [user, likedPosts]
  );

  const toggleMute = useCallback(
    (postId: string) => {
      setMutedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
    },
    []
  );

  const handleVideoTap = useCallback(
    (index: number) => {
      const video = videoRefs.current[index];
      if (video) {
        if (video.paused) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    },
    []
  );

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[210] p-2 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Reels Container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-scroll"
        style={{
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
          scrollBehavior: "smooth",
        }}
      >
        {posts.map((post, index) => {
          const isLiked = likedPosts[post.id] || false;
          const isMuted = mutedPosts[post.id] ?? true;

          return (
            <div
              key={post.id}
              data-index={index}
              className="relative w-full flex items-center justify-center"
              style={{
                height: "100vh",
                scrollSnapAlign: "start",
                scrollSnapStop: "always",
              }}
            >
              {/* Video */}
              <video
                ref={(el) => {
                  videoRefs.current[index] = el;
                }}
                src={post.mediaUrl}
                className="absolute inset-0 w-full h-full object-cover"
                loop
                playsInline
                muted={isMuted}
                onClick={() => handleVideoTap(index)}
                style={{ objectFit: "cover" }}
              />

              {/* Gradient overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

              {/* Right-side actions (Instagram-style) */}
              <div className="absolute right-3 bottom-28 sm:right-4 sm:bottom-32 flex flex-col items-center gap-5 z-[205]">
                {/* Like */}
                <button
                  onClick={() => handleLike(post.id)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center ${isLiked ? "bg-red-500/20" : "bg-white/10 backdrop-blur-sm"} transition-all`}>
                    <Heart
                      className={`w-6 h-6 transition-all ${isLiked ? "fill-red-500 text-red-500 scale-110" : "text-white"}`}
                    />
                  </div>
                  <span className="text-white text-xs font-bold">
                    {(post.likesCount || 0) + (isLiked && !likedPosts[post.id] ? 1 : 0)}
                  </span>
                </button>

                {/* Comment */}
                <button className="flex flex-col items-center gap-1">
                  <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                </button>

                {/* Mute/Unmute */}
                <button
                  onClick={() => toggleMute(post.id)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    {isMuted ? (
                      <VolumeX className="w-5 h-5 text-white" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-white" />
                    )}
                  </div>
                </button>
              </div>

              {/* Bottom info overlay */}
              <div className="absolute bottom-6 left-4 right-20 z-[205]">
                <div className="flex items-center gap-3 mb-3">
                  <UserAvatar
                    userId={post.userId}
                    username={post.username}
                    size="sm"
                    showName={false}
                  />
                  <span className="text-white font-bold text-sm drop-shadow-lg">
                    {post.username}
                  </span>
                </div>
                {post.content && (
                  <p className="text-white/90 text-sm line-clamp-2 drop-shadow-lg">
                    {post.content}
                  </p>
                )}
              </div>

              {/* Reel progress indicator */}
              {currentIndex === index && (
                <div className="absolute top-0 left-0 right-0 h-[3px] z-[210]">
                  <div className="h-full bg-brand animate-[reelProgress_30s_linear_forwards]" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reel counter */}
      <div className="absolute top-4 left-4 z-[210] bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
        <span className="text-white text-xs font-bold">
          {currentIndex + 1} / {posts.length}
        </span>
      </div>

      <style jsx>{`
        @keyframes reelProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
