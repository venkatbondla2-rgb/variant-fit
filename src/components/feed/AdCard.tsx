"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdCard() {
  return (
    <div className="bg-surface rounded-3xl p-6 border border-border mt-6 relative overflow-hidden transition-all hover:border-brand/40">
      <div className="absolute top-4 right-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-background/80 px-2 py-1 rounded">
        Sponsored
      </div>

      <div className="flex items-center gap-3 mb-4">
        {/* Placeholder Ad Brand Logo */}
        <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center font-bold text-brand">P</div>
        <div>
          <h3 className="font-bold text-sm">ProteinX Nutrition</h3>
          <p className="text-xs text-zinc-500">Promoted by VariantFit</p>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden mb-4 bg-zinc-900 border border-zinc-800 flex items-center justify-center min-h-[300px]">
        {/* Ad Image Placeholder */}
        <div className="flex flex-col items-center justify-center text-center p-6 text-zinc-500">
             <div className="w-32 h-32 mb-4 bg-gradient-to-br from-brand/40 to-transparent rounded-full blur-xl absolute" />
             <h2 className="text-2xl font-black text-white relative z-10 mb-2">Fuel Your Inner Variant</h2>
             <p className="text-sm relative z-10">Get 20% off all pre-workouts today!</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">ProteinX Pre-Workout Formula</p>
        <Button size="sm" className="bg-brand text-black hover:brightness-110">
          Shop Now <ExternalLink className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}
