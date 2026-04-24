"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { User as UserIcon } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Simple in-memory cache so we don't re-fetch the same user on every render
const profileCache: Record<string, { profilePic?: string; username?: string }> = {};

interface UserAvatarProps {
  userId: string;
  username?: string;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  className?: string;
}

export function UserAvatar({ userId, username, size = "md", showName = true, className = "" }: UserAvatarProps) {
  const [profilePic, setProfilePic] = useState<string | null>(profileCache[userId]?.profilePic || null);
  const [displayName, setDisplayName] = useState<string>(profileCache[userId]?.username || username || "Variant");

  useEffect(() => {
    if (!userId) return;
    if (profileCache[userId]?.profilePic !== undefined) {
      setProfilePic(profileCache[userId].profilePic || null);
      if (profileCache[userId].username) setDisplayName(profileCache[userId].username!);
      return;
    }

    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          profileCache[userId] = {
            profilePic: data.profilePic || "",
            username: data.username || data.displayName || username || "Variant",
          };
          setProfilePic(data.profilePic || null);
          setDisplayName(data.username || data.displayName || username || "Variant");
        } else {
          profileCache[userId] = { profilePic: "", username: username || "Variant" };
        }
      } catch (err) {
        console.error("Failed to fetch user avatar:", err);
      }
    };

    fetchProfile();
  }, [userId, username]);

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-5 h-5",
    lg: "w-7 h-7",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <Link
      href={`/profile/${userId}`}
      className={`flex items-center gap-2 group cursor-pointer ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`${sizeClasses[size]} rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-transparent group-hover:border-brand/50 transition-all`}
      >
        {profilePic ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profilePic} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <UserIcon className={`${iconSizes[size]} text-zinc-500`} />
        )}
      </div>
      {showName && (
        <span className={`font-bold ${textSizes[size]} group-hover:text-brand transition-colors truncate max-w-[150px]`}>
          {displayName}
        </span>
      )}
    </Link>
  );
}
