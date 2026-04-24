"use client";

import { useState, useEffect, useRef } from "react";
import { ExternalLink, Flame } from "lucide-react";
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
          // Pick a random ad
          const selected = ads[Math.floor(Math.random() * ads.length)];
          setAd(selected);
        }
      } catch(err) {
        console.error("Ads fetch error", err);
      }
    };
    fetchAd();
  }, []);

  // Track view (impression) once per render
  useEffect(() => {
    if (!ad || viewTracked.current) return;
    viewTracked.current = true;
    
    const trackView = async () => {
      try {
        await updateDoc(doc(db, "ads", ad.id), {
          views: increment(1)
        });
      } catch (err) {
        // Silently fail - don't interrupt UX for analytics
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

  return (
    <div className="bg-surface rounded-3xl p-6 border border-border mt-6 relative overflow-hidden transition-all hover:border-brand/40">
      <div className="absolute top-4 right-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-background/80 px-2 py-1 rounded">
        Sponsored
      </div>

      <div className="flex items-center justify-between mb-4 mt-2">
         <h3 className="font-bold text-lg">{ad.title}</h3>
      </div>

      <div className="rounded-xl overflow-hidden mb-4 bg-zinc-900 border border-border flex items-center justify-center relative min-h-[250px]">
         {/* eslint-disable-next-line @next/next/no-img-element */}
         <img src={ad.imageUrl} alt={ad.title} className="absolute inset-0 w-full h-full object-cover opacity-80" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <a href={ad.link} target="_blank" rel="noopener noreferrer" className="flex-1 mr-2">
             <Button className="w-full bg-brand text-black hover:brightness-110 font-bold">
               Open Link <ExternalLink className="w-4 h-4 ml-1" />
             </Button>
          </a>
          <button
            onClick={handleReaction}
            className={`p-3 rounded-full border transition-all ${
              reacted 
                ? "bg-orange-500/20 border-orange-500/50 text-orange-400" 
                : "bg-background border-border text-zinc-400 hover:text-orange-400 hover:border-orange-500/50"
            }`}
          >
            <Flame className={`w-5 h-5 ${reacted ? "fill-orange-400" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
