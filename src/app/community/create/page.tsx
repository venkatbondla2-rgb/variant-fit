"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Users, Loader2 } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function CreateCommunityPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !user) return;
    setIsCreating(true);

    try {
      await addDoc(collection(db, "communities"), {
        name,
        description,
        ownerId: user.uid,
        ownerName: user.displayName || "Variant",
        members: [user.uid],
        membersCount: 1,
        createdAt: serverTimestamp(),
      });
      alert(`Community "${name}" created successfully!`);
      router.push("/feed");
    } catch (err) {
      console.error(err);
      alert("Failed to create community.");
    } finally {
      setIsCreating(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6 pt-6 px-4">
      <div className="bg-surface rounded-3xl p-8 border border-border text-center min-h-[60vh] flex flex-col items-center justify-center max-w-2xl mx-auto w-full shadow-md">
        <Users className="w-16 h-16 text-brand mb-6" />
        <h1 className="text-3xl font-bold mb-4">Create a Community</h1>
        <p className="text-zinc-400 mb-8 max-w-md">
          Start a new Variant group focused on a specific goal, gym, or training style. Invite other Variants to join.
        </p>

        <form onSubmit={handleCreateGroup} className="w-full max-w-md text-left flex flex-col gap-5">
            <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Community Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Downtown Powerlifters" 
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand transition-colors"
                  required
                />
            </div>
            <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this community about?" 
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand resize-none h-24 transition-colors" 
                  required
                />
            </div>
            <button 
              type="submit" 
              disabled={isCreating || !name.trim() || !description.trim()}
              className="bg-brand text-black font-bold py-3 px-8 rounded-xl text-sm hover:brightness-110 transition-all mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
            >
               {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
               {isCreating ? "Creating..." : "Create Group"}
            </button>
        </form>
      </div>
    </div>
  );
}
