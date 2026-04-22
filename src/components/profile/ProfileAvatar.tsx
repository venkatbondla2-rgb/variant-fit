"use client";

import { useState, useRef } from "react";
import { User as UserIcon, Upload, Loader2 } from "lucide-react";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function ProfileAvatar({ user, profileData, onUpdate }: { user: any; profileData: any; onUpdate: () => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkUploadLimit = (updates: any[]) => {
    if (!updates || updates.length < 2) return true;
    const now = Date.now();
    const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
    // Count how many updates happened in the last 15 days
    const recentUpdates = updates.filter((t: number) => now - t < fifteenDaysMs);
    return recentUpdates.length < 2;
  };

  const handleUploadClick = () => {
    if (!profileData) return;
    const updates = profileData.profilePicUpdates || [];
    if (!checkUploadLimit(updates)) {
      alert("You can only change your profile picture 2 times in 15 days.");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
      formData.append("cloud_name", process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Cloudinary upload failed");

      const imageUrl = data.secure_url;

      // Update Firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        profilePic: imageUrl,
        profilePicUpdates: arrayUnion(Date.now()),
      });

      onUpdate(); // refresh caller data
    } catch (err) {
      console.error(err);
      alert("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const currentImage = profileData?.profilePic || user?.photoURL;

  return (
    <div className="relative group">
      <div className="w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border-4 border-brand/20 shrink-0 relative">
        {currentImage ? (
          <img src={currentImage} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <UserIcon className="w-16 h-16 text-zinc-500" />
        )}
        
        <div 
          onClick={handleUploadClick}
          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
        >
          {isUploading ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <Upload className="w-8 h-8 text-white" />}
        </div>
      </div>
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
    </div>
  );
}
