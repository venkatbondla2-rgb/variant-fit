"use client";

import { useAuth } from "@/context/AuthContext";

export default function TrainPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="bg-surface rounded-3xl p-8 border border-border text-center min-h-[60vh] flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-4">Train with Variant</h1>
        <p className="text-zinc-400 mb-8 max-w-md">
          Discover workout programs built by top Variants, or create your own custom routines to share with the community.
        </p>
        <div className="bg-background rounded-full p-2 border border-border flex items-center max-w-sm w-full mx-auto mb-8">
            <input type="text" placeholder="Search workout programs..." className="bg-transparent border-none focus:outline-none px-4 w-full text-sm" />
            <button className="bg-brand text-black font-bold py-2 px-6 rounded-full text-sm">Search</button>
        </div>
        
        <p className="text-sm text-zinc-500 italic">Coming soon: Premium Training Plans</p>
      </div>
    </div>
  );
}
