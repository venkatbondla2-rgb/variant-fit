"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User as UserIcon, UserPlus, UserCheck, Clock, ArrowLeft, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/feed/PostCard";
import Link from "next/link";

export default function PublicProfilePage() {
  const params = useParams();
  const uid = params.uid as string;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [profileData, setProfileData] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [friendStatus, setFriendStatus] = useState<"none" | "pending_sent" | "pending_received" | "friends">("none");
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [processingRequest, setProcessingRequest] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (!authLoading && user && uid === user.uid) {
      router.replace("/profile");
      return;
    }
  }, [user, authLoading, uid, router]);

  useEffect(() => {
    if (!uid || !user) return;

    const fetchAll = async () => {
      // Fetch profile
      try {
        const docSnap = await getDoc(doc(db, "users", uid));
        if (docSnap.exists()) {
          setProfileData(docSnap.data());
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoadingProfile(false);
      }

      // Fetch posts
      try {
        const q = query(
          collection(db, "posts"),
          where("userId", "==", uid),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        setUserPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error fetching posts:", err);
      } finally {
        setLoadingPosts(false);
      }

      // Check friend status
      try {
        const myDoc = await getDoc(doc(db, "users", user.uid));
        if (myDoc.exists() && myDoc.data().friends?.includes(uid)) {
          setFriendStatus("friends");
          return;
        }

        // Check sent requests
        const sentQuery = query(
          collection(db, "friend_requests"),
          where("fromId", "==", user.uid),
          where("toId", "==", uid),
          where("status", "==", "pending")
        );
        const sentSnap = await getDocs(sentQuery);
        if (!sentSnap.empty) {
          setFriendStatus("pending_sent");
          return;
        }

        // Check received requests
        const recvQuery = query(
          collection(db, "friend_requests"),
          where("fromId", "==", uid),
          where("toId", "==", user.uid),
          where("status", "==", "pending")
        );
        const recvSnap = await getDocs(recvQuery);
        if (!recvSnap.empty) {
          setFriendStatus("pending_received");
          setPendingRequestId(recvSnap.docs[0].id);
          return;
        }

        setFriendStatus("none");
      } catch (err) {
        console.error("Error checking friend status:", err);
      }
    };

    fetchAll();
  }, [uid, user]);

  const sendFriendRequest = async () => {
    if (!user || !profileData) return;
    setSendingRequest(true);
    try {
      await addDoc(collection(db, "friend_requests"), {
        fromId: user.uid,
        fromName: user.displayName || "Variant",
        toId: uid,
        toName: profileData.username || "Variant",
        status: "pending",
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "notifications"), {
        userId: uid,
        type: "friend_request",
        message: `${user.displayName || "Someone"} sent you a friend request!`,
        link: `/profile/${user.uid}`,
        read: false,
        createdAt: serverTimestamp(),
      });

      setFriendStatus("pending_sent");
    } catch (err) {
      console.error(err);
      alert("Failed to send friend request.");
    } finally {
      setSendingRequest(false);
    }
  };

  const acceptFriendRequest = async () => {
    if (!user || !pendingRequestId) return;
    setProcessingRequest(true);
    try {
      // Update request status
      await updateDoc(doc(db, "friend_requests", pendingRequestId), {
        status: "accepted"
      });

      // Add each other to friends arrays
      const myRef = doc(db, "users", user.uid);
      const theirRef = doc(db, "users", uid);
      
      await updateDoc(myRef, {
        friends: arrayUnion(uid)
      });
      await updateDoc(theirRef, {
        friends: arrayUnion(user.uid)
      });

      // Notify sender that request was accepted
      await addDoc(collection(db, "notifications"), {
        userId: uid,
        type: "friend_accepted",
        message: `${user.displayName || "Someone"} accepted your friend request!`,
        link: `/profile/${user.uid}`,
        read: false,
        createdAt: serverTimestamp(),
      });

      setFriendStatus("friends");
    } catch (err) {
      console.error(err);
      alert("Failed to accept friend request.");
    } finally {
      setProcessingRequest(false);
    }
  };

  const declineFriendRequest = async () => {
    if (!user || !pendingRequestId) return;
    setProcessingRequest(true);
    try {
      await updateDoc(doc(db, "friend_requests", pendingRequestId), {
        status: "declined"
      });
      setFriendStatus("none");
      setPendingRequestId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to decline friend request.");
    } finally {
      setProcessingRequest(false);
    }
  };

  if (authLoading || loadingProfile) {
    return <div className="min-h-screen flex items-center justify-center text-zinc-500">Loading profile...</div>;
  }

  if (!profileData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <UserIcon className="w-16 h-16 text-zinc-600" />
        <h1 className="text-2xl font-bold">User Not Found</h1>
        <Link href="/feed" className="text-brand hover:underline text-sm">Go back to feed</Link>
      </div>
    );
  }

  const currentImage = profileData?.profilePic;

  return (
    <div className="flex flex-col min-h-screen p-8 max-w-4xl mx-auto w-full">
      <Link href="/feed" className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 text-sm transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Feed
      </Link>

      <div className="flex items-start gap-8 bg-surface p-8 rounded-3xl border border-border flex-col md:flex-row mb-12">
        {/* Avatar */}
        <div className="w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border-4 border-brand/20 shrink-0">
          {currentImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentImage} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="w-16 h-16 text-zinc-500" />
          )}
        </div>

        <div className="flex flex-col flex-1 w-full">
          <h2 className="text-2xl font-bold mb-1">{profileData?.username || "Athlete"}</h2>
          <p className="text-zinc-400 mb-6">{profileData?.email}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-background rounded-2xl p-4 border border-border">
              <p className="text-sm text-zinc-400">Workouts</p>
              <p className="text-2xl font-bold text-brand">{profileData?.workoutCount || 0}</p>
            </div>
            <div className="bg-background rounded-2xl p-4 border border-border">
              <p className="text-sm text-zinc-400">Friends</p>
              <p className="text-2xl font-bold">{profileData?.friends?.length || 0}</p>
            </div>
            <div className="bg-background rounded-2xl p-4 border border-border">
              <p className="text-sm text-zinc-400">Posts</p>
              <p className="text-2xl font-bold">{userPosts.length}</p>
            </div>
          </div>

          {/* Friend action buttons */}
          {friendStatus === "none" && (
            <Button onClick={sendFriendRequest} disabled={sendingRequest} className="self-start gap-2">
              <UserPlus className="w-4 h-4" />
              {sendingRequest ? "Sending..." : "Add Friend"}
            </Button>
          )}
          {friendStatus === "pending_sent" && (
            <Button variant="outline" disabled className="self-start gap-2 opacity-70">
              <Clock className="w-4 h-4" /> Request Sent
            </Button>
          )}
          {friendStatus === "pending_received" && (
            <div className="flex items-center gap-3">
              <div className="bg-brand/10 border border-brand/30 rounded-xl px-4 py-2 text-sm text-brand font-medium">
                This user sent you a friend request
              </div>
              <Button
                onClick={acceptFriendRequest}
                disabled={processingRequest}
                className="gap-1 bg-brand text-black hover:brightness-110"
              >
                <Check className="w-4 h-4" /> Accept
              </Button>
              <Button
                onClick={declineFriendRequest}
                disabled={processingRequest}
                variant="outline"
                className="gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10"
              >
                <X className="w-4 h-4" /> Decline
              </Button>
            </div>
          )}
          {friendStatus === "friends" && (
            <Button variant="outline" disabled className="self-start gap-2 text-green-500 border-green-500/30">
              <UserCheck className="w-4 h-4" /> Friends
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <h3 className="text-xl font-bold">Posts</h3>
        {loadingPosts ? (
          <p className="text-zinc-500">Loading posts...</p>
        ) : userPosts.length > 0 ? (
          <div className="flex flex-col gap-6 w-full max-w-2xl">
            {userPosts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <p className="text-zinc-500">This user hasn&apos;t posted anything yet.</p>
        )}
      </div>
    </div>
  );
}
