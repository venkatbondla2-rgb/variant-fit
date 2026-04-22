"use client";

import { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function AdCard() {
  const [ad, setAd] = useState<any>(null);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const q = query(collection(db, "ads"), limit(10));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const ads = snap.docs.map(d => d.data());
          // Pick a random ad
          setAd(ads[Math.floor(Math.random() * ads.length)]);
        }
      } catch(err) {
        console.error("Ads fetch error", err);
      }
    };
    fetchAd();
  }, []);

  if (!ad) return null;

  return (
    <div className="bg-surface rounded-3xl p-6 border border-border mt-6 relative overflow-hidden transition-all hover:border-brand/40">
      <div className="absolute top-4 right-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-background/80 px-2 py-1 rounded">
        Sponsored
      </div>

      <div className="flex items-center justify-between mb-4 mt-2">
         <h3 className="font-bold text-lg">{ad.title}</h3>
      </div>

      <div className="rounded-xl overflow-hidden mb-4 bg-zinc-900 border border-border border flex items-center justify-center relative min-h-[250px]">
         <img src={ad.imageUrl} alt={ad.title} className="absolute inset-0 w-full h-full object-cover opacity-80" />
      </div>

      <div className="flex flex-col gap-3">
        <a href={ad.link} target="_blank" rel="noopener noreferrer" className="w-full">
           <Button className="w-full bg-brand text-black hover:brightness-110 font-bold">
             Open Link <ExternalLink className="w-4 h-4 ml-1" />
           </Button>
        </a>
      </div>
    </div>
  );
}
