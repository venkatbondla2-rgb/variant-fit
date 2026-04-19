"use client";

import { useAuth } from "@/context/AuthContext";
import { Trophy } from "lucide-react";

export default function ChallengePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="bg-surface rounded-3xl p-8 border border-border text-center min-h-[60vh] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand/10 rounded-full blur-3xl -z-10" />
        
        <Trophy className="w-16 h-16 text-brand mb-6" />
        <h1 className="text-3xl font-bold mb-4">Challenge Variants</h1>
        <p className="text-zinc-400 mb-8 max-w-md">
          Compete with your Variants in weekly step challenges, lifting competitions, and consistency streaks.
        </p>

        <div className="w-full max-w-md space-y-4 text-left">
          <div className="bg-background rounded-xl p-4 border border-border flex items-center justify-between">
             <div>
                <h4 className="font-bold text-sm">10k Steps Weekly</h4>
                <p className="text-xs text-zinc-500">Starts in 2 days</p>
             </div>
             <button className="text-brand font-medium text-sm px-4 py-1.5 rounded-full border border-brand/30 hover:bg-brand/10">Join</button>
          </div>
          <div className="bg-background rounded-xl p-4 border border-border flex items-center justify-between">
             <div>
                <h4 className="font-bold text-sm">Squat PR Challenge</h4>
                <p className="text-xs text-zinc-500">Ongoing (3 Variants)</p>
             </div>
             <button className="text-brand font-medium text-sm px-4 py-1.5 rounded-full border border-brand/30 hover:bg-brand/10">View</button>
          </div>
        </div>
      </div>
    </div>
  );
}
