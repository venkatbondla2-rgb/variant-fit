"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Video, Send } from "lucide-react";

export function CreatePost() {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handlePost = async () => {
    if (!content.trim() && !file) return;
    setIsPosting(true);

    try {
      let mediaUrl = null;
      let mediaType = null;

      if (file) {
        // Prepare Cloudinary Upload
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "variantfit_unsigned";
        
        if (!cloudName) {
            alert("Cloudinary Cloud Name is missing in .env configuration");
            setIsPosting(false);
            return;
        }

        const isVideo = file.type.startsWith("video/");
        mediaType = isVideo ? "video" : "image";
        
        const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${mediaType}/upload`;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);

        // Upload to Cloudinary
        const response = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (data.secure_url) {
          mediaUrl = data.secure_url;
        } else {
          console.error("Cloudinary Error:", data);
          alert(`Cloudinary Error: ${data.error?.message || "Unknown error"}`);
          throw new Error(data.error?.message || "Cloudinary upload failed");
        }
      }

      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        username: user.displayName || "User",
        userEmail: user.email,
        content,
        mediaUrl,
        mediaType,
        likesCount: 0,
        createdAt: serverTimestamp(),
      });

      setContent("");
      setFile(null);
    } catch (error) {
      console.error("Error creating post", error);
      alert("Something went wrong uploading the post.");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="bg-surface rounded-3xl p-4 sm:p-6 mb-6 border border-border shadow-md">
      <div className="flex gap-4">
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0" />
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's your workout today?"
            className="w-full bg-transparent border-none focus:outline-none resize-none text-foreground placeholder:text-zinc-500 mb-2 h-auto min-h-[60px]"
          />
          
          {file && (
            <div className="mb-4 relative w-full sm:w-1/2 overflow-hidden rounded-xl">
              {file.type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={URL.createObjectURL(file)} alt="Upload preview" className="w-full h-auto object-cover" />
              ) : (
                <video src={URL.createObjectURL(file)} className="w-full h-auto object-cover" />
              )}
              <button onClick={() => setFile(null)} className="absolute top-2 right-2 bg-black/50 p-1 rounded-full text-white text-xs">✕</button>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-3">
            <div className="flex gap-2 text-zinc-400">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => setFile(e.target.files?.[0] || null)} 
                accept="image/*,video/*" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="p-2 hover:bg-surface-hover rounded-full transition-colors hover:text-brand"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="p-2 hover:bg-surface-hover rounded-full transition-colors hover:text-brand"
              >
                <Video className="w-5 h-5" />
              </button>
            </div>
            
            <Button size="sm" onClick={handlePost} disabled={isPosting || (!content.trim() && !file)}>
              <Send className="w-4 h-4 mr-2" />
              {isPosting ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
