"use client";

import { X, Sparkles, Zap, Image as ImageIcon, Video, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export function UpgradeModal({ 
  isOpen, 
  onClose,
  title = "Unlock Unlimited Uploads",
  description = "You've reached your daily free upload limit. Upgrade to Premium to keep sharing your fitness journey!"
}: UpgradeModalProps) {
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10005] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-3xl border border-border max-w-md w-full overflow-hidden flex flex-col relative shadow-[0_0_50px_rgba(234,255,102,0.1)]">
        
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand via-orange-400 to-brand" />
        
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-zinc-400 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-brand/10 border-2 border-brand/20 flex items-center justify-center mb-6">
            <Sparkles className="w-8 h-8 text-brand" />
          </div>
          
          <h2 className="text-2xl font-black mb-3">{title}</h2>
          <p className="text-sm text-zinc-400 mb-8 max-w-sm leading-relaxed">
            {description}
          </p>

          <div className="w-full bg-background/50 rounded-2xl p-5 border border-border mb-6">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider text-left mb-4">Premium Benefits</p>
            <div className="flex flex-col gap-3 text-sm text-left">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-green-400" />
                </div>
                <span className="text-zinc-200">Unlimited Image & Reel Uploads</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-green-400" />
                </div>
                <span className="text-zinc-200">Advanced AI Dietitian & Meal Plans</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-green-400" />
                </div>
                <span className="text-zinc-200">Custom Rotating Workout Splits</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-green-400" />
                </div>
                <span className="text-zinc-200">Priority Support</span>
              </div>
            </div>
          </div>

          <Link href="/diet" className="w-full" onClick={onClose}>
            <Button className="w-full h-14 bg-brand text-black font-black text-lg hover:brightness-110 shadow-[0_0_20px_rgba(234,255,102,0.3)]">
              <Zap className="w-5 h-5 mr-2" /> Upgrade Now
            </Button>
          </Link>
          
          <button onClick={onClose} className="mt-4 text-xs font-bold text-zinc-500 hover:text-white transition-colors">
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
