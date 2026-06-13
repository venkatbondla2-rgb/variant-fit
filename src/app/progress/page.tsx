"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, deleteDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Camera, Calendar, ChevronLeft, ChevronRight, X, Trash2, Loader2, ImageIcon, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageLightbox } from "@/components/ui/ImageLightbox";

interface ProgressPhoto {
  id: string;
  userId: string;
  imageUrl: string;
  label: string;
  notes: string;
  createdAt: any;
  monthKey: string;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function ProgressPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("Front");
  const [notes, setNotes] = useState("");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [comparePhotos, setComparePhotos] = useState<[ProgressPhoto | null, ProgressPhoto | null]>([null, null]);
  const [sliderPos, setSliderPos] = useState(50);
  const sliderRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activePlan, setActivePlan] = useState<"free" | "pro" | "elite">("free");
  const [photosThisMonth, setPhotosThisMonth] = useState(0);

  const getProgressReportLimit = () => {
    if (activePlan === "elite") return Infinity;
    if (activePlan === "pro") return 4;
    return 1; // free limit
  };

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          let plan = "free";
          if (data.subscription && data.subscription.expiresAt) {
            const expires = data.subscription.expiresAt.toDate ? data.subscription.expiresAt.toDate() : new Date(data.subscription.expiresAt);
            if (expires > new Date()) {
              plan = data.subscription.plan || "free";
            }
          }
          setActivePlan(plan as any);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadProfile();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchMonthlyCount = async () => {
      try {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const q = query(
          collection(db, "progress_photos"),
          where("userId", "==", user.uid),
          where("monthKey", "==", currentMonth)
        );
        const snap = await getDocs(q);
        setPhotosThisMonth(snap.size);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMonthlyCount();
  }, [user, photos]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const fetchPhotos = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, "progress_photos"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setPhotos(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPhotos(false);
    }
  };

  useEffect(() => { fetchPhotos(); }, [user]);

  const handleUpload = async () => {
    if (!file || !user) return;
    const limit = getProgressReportLimit();
    if (photosThisMonth >= limit) {
      alert(`You have reached the monthly limit for progress photo uploads (${photosThisMonth}/${limit === Infinity ? "Unlimited" : limit}) on your ${activePlan.toUpperCase()} plan. Please upgrade to Pro or Elite to add more photos!`);
      router.push("/premium");
      return;
    }
    setUploading(true);
    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "variantfit_unsigned";
      if (!cloudName) { alert("Cloudinary not configured."); setUploading(false); return; }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST", body: formData,
      });
      const data = await res.json();
      if (!data.secure_url) throw new Error("Upload failed");

      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      await addDoc(collection(db, "progress_photos"), {
        userId: user.uid,
        imageUrl: data.secure_url,
        label,
        notes,
        monthKey,
        createdAt: serverTimestamp(),
      });

      setFile(null); setLabel("Front"); setNotes(""); setShowUpload(false);
      fetchPhotos();
    } catch (err) {
      console.error(err);
      alert("Failed to upload photo.");
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (id: string) => {
    if (!confirm("Delete this progress photo?")) return;
    try {
      await deleteDoc(doc(db, "progress_photos", id));
      setPhotos(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Group photos by month
  const grouped = photos.reduce<Record<string, ProgressPhoto[]>>((acc, p) => {
    const key = p.monthKey || "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const sortedMonths = Object.keys(grouped).sort().reverse();

  // Comparison slider handlers
  const handleSliderMove = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  const selectForCompare = (photo: ProgressPhoto) => {
    if (!comparePhotos[0]) {
      setComparePhotos([photo, null]);
    } else if (!comparePhotos[1]) {
      setComparePhotos([comparePhotos[0], photo]);
    } else {
      setComparePhotos([photo, null]);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="flex flex-col gap-6 pt-6 pb-20 max-w-3xl mx-auto w-full px-4">
      {/* Header */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-border relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand/10 rounded-full blur-3xl -z-10" />
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Progress Photos</h1>
            <p className="text-sm text-zinc-400 mt-1">Track your transformation journey 📸</p>
          </div>
          <Button onClick={() => setShowUpload(!showUpload)} className="bg-brand text-black font-bold rounded-full gap-2">
            <Camera className="w-4 h-4" />
            Add Photo
          </Button>
        </div>

        {/* Compare toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setCompareMode(!compareMode); setComparePhotos([null, null]); }}
            className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
              compareMode ? "bg-brand/10 border-brand/40 text-brand" : "bg-background border-border text-zinc-400 hover:border-zinc-500"
            }`}
          >
            {compareMode ? "✕ Exit Compare" : "🔄 Compare Photos"}
          </button>
          {compareMode && (
            <p className="text-xs text-zinc-500">
              {!comparePhotos[0] ? "Select first photo" : !comparePhotos[1] ? "Now select second photo" : "Drag slider to compare!"}
            </p>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="bg-surface rounded-3xl p-5 border border-brand/30 shadow-lg">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <Camera className="w-4 h-4 text-brand" /> Upload Progress Photo
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-border hover:border-brand/50 flex flex-col items-center justify-center gap-3 transition-all bg-background group"
              >
                {file ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <>
                    <ImageIcon className="w-10 h-10 text-zinc-600 group-hover:text-brand transition-colors" />
                    <p className="text-xs text-zinc-500">Tap to select photo</p>
                  </>
                )}
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Pose / Label</label>
                <div className="flex gap-2 flex-wrap">
                  {["Front", "Back", "Side", "Flexing", "Other"].map(l => (
                    <button
                      key={l}
                      onClick={() => setLabel(l)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                        label === l ? "bg-brand/10 border-brand text-brand" : "bg-background border-border text-zinc-400"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Week 4 of cut, 75kg..."
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand resize-none h-20"
                />
              </div>
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="bg-brand text-black font-bold rounded-xl gap-2 mt-auto"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {uploading ? "Uploading..." : "Save Photo"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Slider */}
      {compareMode && comparePhotos[0] && comparePhotos[1] && (
        <div className="bg-surface rounded-3xl border border-border overflow-hidden p-5">
          <h3 className="font-bold text-sm mb-3 text-center">Before → After</h3>
          <div
            ref={sliderRef}
            className="relative w-full aspect-[3/4] max-w-md mx-auto rounded-2xl overflow-hidden cursor-col-resize select-none"
            onMouseMove={(e) => { if (e.buttons === 1) handleSliderMove(e.clientX); }}
            onTouchMove={(e) => handleSliderMove(e.touches[0].clientX)}
          >
            {/* After (full) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={comparePhotos[1].imageUrl} alt="After" className="absolute inset-0 w-full h-full object-cover" />
            {/* Before (clipped) */}
            <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={comparePhotos[0].imageUrl} alt="Before" className="absolute inset-0 w-full h-full object-cover" style={{ minWidth: sliderRef.current ? `${sliderRef.current.clientWidth}px` : "100%" }} />
            </div>
            {/* Slider handle */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10"
              style={{ left: `${sliderPos}%`, transform: "translateX(-50%)" }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                <ChevronLeft className="w-3 h-3 text-black" />
                <ChevronRight className="w-3 h-3 text-black" />
              </div>
            </div>
            {/* Labels */}
            <span className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full">Before</span>
            <span className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full">After</span>
          </div>
          <div className="flex justify-center mt-3">
            <button onClick={() => setComparePhotos([null, null])} className="text-xs text-zinc-500 hover:text-brand">
              Select different photos
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {loadingPhotos ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-50">
          <Camera className="w-16 h-16 text-zinc-600 mb-4" />
          <p className="text-zinc-400 text-center">No progress photos yet.<br/>Start documenting your transformation!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {sortedMonths.map(monthKey => {
            const [year, month] = monthKey.split("-");
            const monthName = MONTHS[parseInt(month) - 1] || month;
            const monthPhotos = grouped[monthKey];

            return (
              <div key={monthKey}>
                {/* Month header */}
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="w-4 h-4 text-brand" />
                  <h2 className="text-lg font-black">{monthName} {year}</h2>
                  <span className="text-xs text-zinc-500 bg-surface px-2 py-0.5 rounded-full border border-border">
                    {monthPhotos.length} photo{monthPhotos.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Photo grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {monthPhotos.map(photo => (
                    <div
                      key={photo.id}
                      className={`relative group rounded-2xl overflow-hidden border transition-all cursor-pointer ${
                        compareMode
                          ? (comparePhotos[0]?.id === photo.id || comparePhotos[1]?.id === photo.id)
                            ? "border-brand ring-2 ring-brand/50"
                            : "border-border hover:border-brand/50"
                          : "border-border hover:border-brand/30"
                      }`}
                      onClick={() => compareMode ? selectForCompare(photo) : setLightboxSrc(photo.imageUrl)}
                    >
                      <div className="aspect-[3/4]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.imageUrl}
                          alt={photo.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-3">
                        <span className="text-white text-xs font-bold">{photo.label}</span>
                        {photo.notes && <span className="text-white/70 text-[10px] line-clamp-2">{photo.notes}</span>}
                        <span className="text-white/50 text-[9px] mt-1">
                          {photo.createdAt?.toDate?.()?.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      {/* Compare badge */}
                      {compareMode && (comparePhotos[0]?.id === photo.id || comparePhotos[1]?.id === photo.id) && (
                        <div className="absolute top-2 left-2 bg-brand text-black text-[9px] font-black px-2 py-0.5 rounded-full">
                          {comparePhotos[0]?.id === photo.id ? "BEFORE" : "AFTER"}
                        </div>
                      )}
                      {/* Delete button */}
                      {!compareMode && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deletePhoto(photo.id); }}
                          className="absolute top-2 right-2 w-7 h-7 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} alt="Progress photo" onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  );
}
