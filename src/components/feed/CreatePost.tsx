"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Video, Send, AlertCircle, Dumbbell, Trophy, Flame, X, Hash } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { compressImage } from "@/lib/imageUtils";
import { UpgradeModal } from "@/components/shared/UpgradeModal";
import { query, where, getDocs, Timestamp } from "firebase/firestore";

const MAX_VIDEO_DURATION = 30; // seconds

const POST_TYPES = [
  { key: "normal", label: "Post", icon: Hash, color: "text-zinc-400", bg: "bg-zinc-500/10 border-zinc-500/20" },
  { key: "workout_completed", label: "Workout", icon: Dumbbell, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  { key: "pr_achieved", label: "PR", icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  { key: "transformation", label: "Transform", icon: Flame, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
];

const WORKOUT_TAGS = [
  "Chest", "Back", "Shoulders", "Arms", "Legs", "Core", "Cardio",
  "Push", "Pull", "Upper", "Lower", "Full Body", "Calisthenics",
];

export function CreatePost() {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [postType, setPostType] = useState("normal");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTags, setShowTags] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalConfig, setUpgradeModalConfig] = useState({ title: "", description: "" });
  const [todayImagesCount, setTodayImagesCount] = useState(0);
  const [todayVitesCount, setTodayVitesCount] = useState(0);
  const [hasPremium, setHasPremium] = useState(false);

  // Fetch daily usage and subscription status
  useEffect(() => {
    if (!user) return;
    const fetchUsage = async () => {
      try {
        // Check premium status
        const userDoc = await getDocs(query(collection(db, "users"), where("__name__", "==", user.uid)));
        if (!userDoc.empty) {
          const uData = userDoc.docs[0].data();
          const isPremium = uData.subscription && 
            uData.subscription.expiresAt && 
            uData.subscription.expiresAt.toDate() > new Date();
          setHasPremium(isPremium);
        }

        // Get today's start
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch posts created today by this user
        const q = query(
          collection(db, "posts"),
          where("userId", "==", user.uid),
          where("createdAt", ">=", Timestamp.fromDate(today))
        );
        const snap = await getDocs(q);
        let images = 0;
        let vites = 0;
        snap.forEach(doc => {
          const data = doc.data();
          if (data.mediaType === "video") vites++;
          else if (data.mediaType === "image") images++;
        });
        setTodayImagesCount(images);
        setTodayVitesCount(vites);
      } catch (err) {
        console.error("Error fetching usage stats", err);
      }
    };
    fetchUsage();
  }, [user]);

  if (!user) return null;

  const validateVideo = (videoFile: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        if (video.duration > MAX_VIDEO_DURATION) {
          setVideoError(`Video must be ${MAX_VIDEO_DURATION} seconds or shorter. Your video is ${Math.round(video.duration)}s.`);
          resolve(false);
        } else {
          setVideoError(null);
          resolve(true);
        }
      };
      video.onerror = () => {
        setVideoError("Could not read video file.");
        resolve(false);
      };
      video.src = URL.createObjectURL(videoFile);
    });
  };

  const handleFileSelect = async (selectedFile: File | null) => {
    if (!selectedFile) {
      setFile(null);
      setVideoError(null);
      return;
    }

    if (selectedFile.type.startsWith("video/")) {
      const isValid = await validateVideo(selectedFile);
      if (!isValid) {
        setFile(null);
        return;
      }
    }

    setVideoError(null);
    setFile(selectedFile);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handlePost = async () => {
    if (!content.trim() && !file) return;
    
    // Check limits if not premium
    if (!hasPremium) {
      if (file) {
        const isVideo = file.type.startsWith("video/");
        if (isVideo && todayVitesCount >= 2) {
          setUpgradeModalConfig({
            title: "Vites Limit Reached",
            description: "You've reached your daily limit of 2 vites. Upgrade to Premium for unlimited uploads!"
          });
          setShowUpgradeModal(true);
          return;
        } else if (!isVideo && todayImagesCount >= 3) {
          setUpgradeModalConfig({
            title: "Images Limit Reached",
            description: "You've reached your daily limit of 3 images. Upgrade to Premium for unlimited uploads!"
          });
          setShowUpgradeModal(true);
          return;
        }
      }
    }

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
        
        // Compress image before upload
        const uploadFile = isVideo ? file : await compressImage(file);
        
        const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${mediaType}/upload`;

        const formData = new FormData();
        formData.append("file", uploadFile);
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

      const postData: any = {
        userId: user.uid,
        username: user.displayName || "User",
        userEmail: user.email,
        content,
        mediaUrl,
        mediaType,
        likesCount: 0,
        createdAt: serverTimestamp(),
      };

      // Add post type if not normal
      if (postType !== "normal") {
        postData.postType = postType;
      }

      // Add workout tags
      if (selectedTags.length > 0) {
        postData.workoutTags = selectedTags;
      }

      await addDoc(collection(db, "posts"), postData);

      setContent("");
      setFile(null);
      setVideoError(null);
      setPostType("normal");
      setSelectedTags([]);
      setShowTags(false);
      
      // Update local counts
      if (mediaType === "video") setTodayVitesCount(prev => prev + 1);
      else if (mediaType === "image") setTodayImagesCount(prev => prev + 1);

      // Show upgrade modal on success if not premium
      if (!hasPremium) {
        setUpgradeModalConfig({
          title: "Upload Successful! 🎉",
          description: "Your post is live! Upgrade to Premium to unlock unlimited daily uploads, AI plans, and more."
        });
        setShowUpgradeModal(true);
      }

    } catch (error) {
      console.error("Error creating post", error);
      alert("Something went wrong uploading the post.");
    } finally {
      setIsPosting(false);
    }
  };

  const activePostType = POST_TYPES.find(t => t.key === postType);

  return (
    <div className="bg-surface rounded-3xl p-4 sm:p-5 mb-5 border border-border shadow-md transition-all">
      {/* Post type selector */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide pb-1">
        {POST_TYPES.map((type) => (
          <button
            key={type.key}
            onClick={() => setPostType(type.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all whitespace-nowrap ${
              postType === type.key
                ? `${type.bg} ${type.color} border-current scale-105`
                : "bg-background border-border text-zinc-500 hover:text-zinc-300 hover:border-zinc-500"
            }`}
          >
            <type.icon className="w-3 h-3" />
            {type.label}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <UserAvatar userId={user.uid} username={user.displayName || "User"} showName={false} size="md" />
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              postType === "workout_completed"
                ? "How was your workout today? 💪"
                : postType === "pr_achieved"
                ? "What PR did you smash? 🏆"
                : postType === "transformation"
                ? "Share your transformation journey 🔥"
                : "What's your workout today?"
            }
            className="w-full bg-transparent border-none focus:outline-none resize-none text-foreground placeholder:text-zinc-600 mb-2 h-auto min-h-[50px] text-[15px]"
          />
          
          {/* Video Duration Error */}
          {videoError && (
            <div className="mb-3 flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {videoError}
            </div>
          )}

          {/* Selected tags */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedTags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] font-bold">
                  {tag}
                  <button onClick={() => toggleTag(tag)} className="hover:text-red-400">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Tag picker */}
          {showTags && (
            <div className="flex flex-wrap gap-1.5 mb-3 p-3 bg-background rounded-xl border border-border">
              <p className="w-full text-[10px] text-zinc-500 font-bold uppercase mb-1">Add workout tags</p>
              {WORKOUT_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                    selectedTags.includes(tag)
                      ? "bg-brand/20 border-brand/40 text-brand"
                      : "bg-surface border-border text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {file && (
            <div className="mb-3 relative overflow-hidden rounded-xl" style={{ maxWidth: "280px" }}>
              {file.type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={URL.createObjectURL(file)} alt="Upload preview" className="w-full h-auto object-cover rounded-xl" />
              ) : (
                <div style={{ aspectRatio: "9/16" }}>
                  <video src={URL.createObjectURL(file)} className="w-full h-full object-cover rounded-xl" />
                </div>
              )}
              <button onClick={() => { setFile(null); setVideoError(null); }} className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm p-1.5 rounded-full text-white hover:bg-black/80 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border/50 pt-3">
            <div className="flex gap-1 text-zinc-400">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)} 
                accept="image/*,video/*" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="p-2 hover:bg-surface-hover rounded-full transition-colors hover:text-brand"
                title="Add image"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="p-2 hover:bg-surface-hover rounded-full transition-colors hover:text-brand"
                title="Add video"
              >
                <Video className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowTags(!showTags)}
                className={`p-2 rounded-full transition-colors ${showTags ? "bg-brand/10 text-brand" : "hover:bg-surface-hover hover:text-brand"}`}
                title="Add tags"
              >
                <Dumbbell className="w-5 h-5" />
              </button>
              <span className="flex items-center text-[10px] text-zinc-600 ml-1">
                Max 30s video
              </span>
            </div>
            
            <Button
              size="sm"
              onClick={handlePost}
              disabled={isPosting || (!content.trim() && !file)}
              className="rounded-full bg-brand text-black font-bold hover:brightness-110 px-5"
            >
              <Send className="w-4 h-4 mr-1.5" />
              {isPosting ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      </div>
      
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
        title={upgradeModalConfig.title}
        description={upgradeModalConfig.description}
      />
    </div>
  );
}
