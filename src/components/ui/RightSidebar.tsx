"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { collection, query, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function RightSidebar() {
  const { user } = useAuth();
  
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users"), limit(10));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList = snapshot.docs
         .map(doc => ({ id: doc.id, ...doc.data() }))
         .filter(u => u.id !== user.uid)
         .slice(0, 5);
      setSuggestions(usersList);
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) return null;

  return (
    <div className="hidden xl:flex flex-col w-80 h-screen fixed right-0 top-0 border-l border-border p-6 bg-background/95 backdrop-blur z-40 overflow-y-auto">
      
      {/* Search Bar Placeholder */}
      <div className="mb-8">
        <input 
          type="text" 
          placeholder="Search Variants..." 
          className="w-full bg-surface border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:border-brand transition-colors"
        />
      </div>

      {/* Suggested Variants (Friend Recommendations) */}
      <div className="mb-8 p-5 bg-surface rounded-3xl border border-border shadow-sm">
        <h3 className="font-bold text-sm mb-4">Live Variants</h3>
        <div className="flex flex-col gap-4">
          {suggestions.length === 0 && <p className="text-xs text-zinc-500">No other variants yet.</p>}
          {suggestions.map((s) => (
            <div key={s.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-zinc-800 flex-shrink-0 relative">
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-surface"></div>
                </div>
                <div className="overflow-hidden">
                  <span className="text-sm font-medium truncate block">{s.displayName || s.email?.split('@')[0] || "Variant"}</span>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-full group-hover:bg-brand group-hover:text-black group-hover:border-brand transition-all flex-shrink-0">
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        <button className="w-full text-brand text-xs font-medium mt-4 hover:underline">
          View all variants
        </button>
      </div>

      {/* Static Ad Banner Placeholder */}
      <div className="p-4 bg-zinc-900 border border-border rounded-xl text-center relative max-w-full overflow-hidden">
        <div className="absolute top-2 right-2 text-[9px] uppercase tracking-widest text-zinc-500 font-bold bg-black/60 px-2 py-0.5 rounded-sm">AD</div>
        <div className="w-full h-32 bg-zinc-800 rounded-lg mb-3 flex items-center justify-center">
            {/* Real ads would go here. */}
            <span className="text-zinc-600 font-bold tracking-widest uppercase">Sponsored</span>
        </div>
        <h4 className="font-bold text-sm mb-1 text-white">Buy VariantFit Pro</h4>
        <p className="text-xs text-zinc-400">Unlock advanced tracking and analytics today.</p>
      </div>
      
      <div className="mt-auto pt-6 text-xs text-zinc-600 flex flex-wrap gap-x-3 gap-y-1">
        <a href="#" className="hover:text-zinc-400">About</a>
        <a href="#" className="hover:text-zinc-400">Help Center</a>
        <a href="#" className="hover:text-zinc-400">Terms</a>
        <a href="#" className="hover:text-zinc-400">Privacy Policy</a>
        <a href="#" className="hover:text-zinc-400">Ads Info</a>
        <span className="text-zinc-700 w-full mt-2">© 2026 Variant Fit</span>
      </div>
    </div>
  );
}
