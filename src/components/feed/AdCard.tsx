"use client";

import { useState, useEffect, useRef } from "react";
import { ExternalLink, Flame, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { collection, getDocs, limit, query, doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export function AdCard() {
  const { user } = useAuth();
  const [ad, setAd] = useState<any>(null);
  const [reacted, setReacted] = useState(false);
  const viewTracked = useRef(false);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const q = query(collection(db, "ads"), limit(10));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const ads = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const selected = ads[Math.floor(Math.random() * ads.length)];
          setAd(selected);
        }
      } catch(err) {
        console.error("Ads fetch error", err);
      }
    };
    fetchAd();
  }, []);

  // Track view once per render
  useEffect(() => {
    if (!ad || viewTracked.current) return;
    viewTracked.current = true;
    
    const trackView = async () => {
      try {
        await updateDoc(doc(db, "ads", ad.id), {
          views: increment(1)
        });
      } catch (err) {
        console.error("View tracking failed:", err);
      }
    };
    trackView();
  }, [ad]);

  const handleReaction = async () => {
    if (!ad || reacted) return;
    setReacted(true);
    try {
      await updateDoc(doc(db, "ads", ad.id), {
        reactions: increment(1)
      });
    } catch (err) {
      console.error("Reaction failed:", err);
      setReacted(false);
    }
  };

  if (!ad) return null;

  // Styled like a normal feed PostCard
  return (
    <div className="bg-surface rounded-3xl p-4 sm:p-6 border border-border w-full">
      {/* Header - looks like a post author */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-brand to-green-600 flex items-center justify-center flex-shrink-0">
          <Megaphone className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{ad.title}</p>
          <p className="text-[10px] text-zinc-500">Sponsored</p>
        </div>
      </div>

      {/* Ad description if exists */}
      {ad.description && <p className="mb-3 text-sm text-zinc-300">{ad.description}</p>}

      {/* Image - same style as PostCard media */}
      {ad.imageUrl && (
        <div className="rounded-xl overflow-hidden mb-4 bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ad.imageUrl} alt={ad.title} className="w-full h-auto object-cover max-h-[500px]" />
        </div>
      )}

      {/* Actions - like a post */}
      <div className="flex items-center justify-between mt-2">
        <button
          onClick={handleReaction}
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${
            reacted 
              ? "text-orange-400" 
              : "text-zinc-400 hover:text-orange-400"
          }`}
        >
          <Flame className={`w-5 h-5 ${reacted ? "fill-orange-400" : ""}`} />
          {ad.reactions || 0}
        </button>
        
        <a href={ad.link} target="_blank" rel="noopener noreferrer">
          <Button size="sm" className="bg-brand text-black hover:brightness-110 font-bold rounded-full gap-1 text-xs">
            Learn More <ExternalLink className="w-3 h-3" />
          </Button>
        </a>
      </div>
    </div>
  );
}
