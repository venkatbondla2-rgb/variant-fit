"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { collection, query, orderBy, limit, onSnapshot, startAfter, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { PostCard } from "@/components/feed/PostCard";
import { AdCard } from "@/components/feed/AdCard";
import { Loader2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

const POSTS_PER_PAGE = 15;

export function PostList() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const sharedPostId = searchParams.get("post");

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  const lastDocRef = useRef<any>(null);
  const initialLoadDone = useRef(false);

  const { user } = useAuth();
  const [currentUserFriends, setCurrentUserFriends] = useState<string[]>([]);
  const [friendsLoaded, setFriendsLoaded] = useState(false);
  const userPrivacyCache = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;
    const fetchFriends = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          setCurrentUserFriends(snap.data().friends || []);
        }
      } catch (err) {
        console.error("Error fetching friends", err);
      } finally {
        setFriendsLoaded(true);
      }
    };
    fetchFriends();
  }, [user]);

  // Initial load with real-time updates
  useEffect(() => {
    const q = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(POSTS_PER_PAGE)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let postsData: any[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch missing privacy statuses
      const newUids = Array.from(new Set(postsData.map(p => p.userId).filter(uid => userPrivacyCache.current[uid] === undefined)));
      for (const uid of newUids) {
        try {
          const uSnap = await getDoc(doc(db, "users", uid));
          userPrivacyCache.current[uid] = uSnap.exists() ? (uSnap.data().isPrivate || false) : false;
        } catch(e) {
          userPrivacyCache.current[uid] = false;
        }
      }

      // Prepend shared post if not found in first page
      if (sharedPostId && !postsData.some(p => p.id === sharedPostId)) {
        try {
          const sharedSnap = await getDoc(doc(db, "posts", sharedPostId));
          if (sharedSnap.exists()) {
            postsData = [{ id: sharedSnap.id, ...sharedSnap.data() }, ...postsData];
            if (userPrivacyCache.current[sharedSnap.data().userId] === undefined) {
               const suSnap = await getDoc(doc(db, "users", sharedSnap.data().userId));
               userPrivacyCache.current[sharedSnap.data().userId] = suSnap.exists() ? (suSnap.data().isPrivate || false) : false;
            }
          }
        } catch(e) {}
      }

      setPosts(postsData);
      setLoading(false);
      initialLoadDone.current = true;

      if (snapshot.docs.length > 0) {
        lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
      }
      if (snapshot.docs.length < POSTS_PER_PAGE) {
        setHasMore(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load more posts
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !lastDocRef.current || !initialLoadDone.current) return;
    setLoadingMore(true);

    try {
      const q = query(
        collection(db, "posts"),
        orderBy("createdAt", "desc"),
        startAfter(lastDocRef.current),
        limit(POSTS_PER_PAGE)
      );

      const snapshot = await getDocs(q);
      const newPosts: any[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch missing privacy statuses
      const newUids = Array.from(new Set(newPosts.map(p => p.userId).filter(uid => userPrivacyCache.current[uid] === undefined)));
      for (const uid of newUids) {
        try {
          const uSnap = await getDoc(doc(db, "users", uid));
          userPrivacyCache.current[uid] = uSnap.exists() ? (uSnap.data().isPrivate || false) : false;
        } catch(e) {
          userPrivacyCache.current[uid] = false;
        }
      }

      if (newPosts.length > 0) {
        setPosts(prev => {
          // Deduplicate
          const existingIds = new Set(prev.map(p => p.id));
          const unique = newPosts.filter(p => !existingIds.has(p.id));
          return [...prev, ...unique];
        });
        lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
      }

      if (snapshot.docs.length < POSTS_PER_PAGE) {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { rootMargin: "400px" } // Start loading 400px before reaching bottom
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  // Filter video-only posts for the vites viewer
  const videoPosts = posts.filter((p) => p.mediaType?.startsWith("video") && p.mediaUrl);

  const handleOpenVites = (postId: string) => {
    router.push(`/vites?post=${postId}`);
  };

  const displayPosts = posts.filter(post => {
    if (!user) return false;
    if (post.userId === user.uid) return true;
    const isPrivate = userPrivacyCache.current[post.userId];
    if (isPrivate) {
       return currentUserFriends.includes(post.userId);
    }
    return true;
  });

  // Scroll to shared post once loaded
  useEffect(() => {
    if (!loading && sharedPostId) {
      setTimeout(() => {
        const el = document.getElementById(`post-${sharedPostId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-brand', 'ring-offset-4', 'ring-offset-background');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-brand', 'ring-offset-4', 'ring-offset-background');
          }, 3000);
        }
      }, 500);
    }
  }, [loading, sharedPostId, displayPosts]);

  if (loading || !friendsLoaded) {
    return (
      <div className="flex flex-col items-center py-16 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
        <p className="text-sm text-zinc-500">Loading feed...</p>
      </div>
    );
  }

  if (displayPosts.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500">
        <p className="text-lg font-bold mb-1">No posts yet</p>
        <p className="text-sm">Be the first to share your fitness journey! 💪</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {displayPosts.map((post, index) => (
          <div key={post.id} id={`post-${post.id}`} className="transition-all duration-1000 rounded-3xl">
            <PostCard
              post={post}
              onOpenVites={post.mediaType?.startsWith("video") ? () => handleOpenVites(post.id) : undefined}
            />
            {/* Inject an Ad every 5 posts */}
            {(index + 1) % 5 === 0 && <AdCard />}
          </div>
        ))}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-1" />

        {/* Loading more indicator */}
        {loadingMore && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-brand" />
          </div>
        )}

        {/* End of feed */}
        {!hasMore && posts.length > POSTS_PER_PAGE && (
          <div className="text-center py-8">
            <p className="text-xs text-zinc-600">You&apos;ve reached the end of the feed 🏁</p>
          </div>
        )}
      </div>

    </>
  );
}
