"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.uid) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfileData(docSnap.data());
        }
      }
    };
    fetchProfile();
  }, [user]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen p-8 max-w-4xl mx-auto w-full">
      <header className="flex items-center justify-between mb-12">
        <h1 className="text-3xl font-bold">Profile</h1>
        <Button variant="outline" onClick={logout} className="gap-2">
          <LogOut className="w-4 h-4" />
          Log Out
        </Button>
      </header>

      <div className="flex items-start gap-8 bg-surface p-8 rounded-3xl border border-border flex-col md:flex-row">
        <div className="w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border-4 border-brand/20 shrink-0">
          <UserIcon className="w-16 h-16 text-zinc-500" />
        </div>
        
        <div className="flex flex-col flex-1 w-full">
          <h2 className="text-2xl font-bold mb-1">{profileData?.username || user.displayName || "Athlete"}</h2>
          <p className="text-zinc-400 mb-6">{user.email}</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-background rounded-2xl p-4 border border-border">
              <p className="text-sm text-zinc-400">Workouts</p>
              <p className="text-2xl font-bold text-brand">0</p>
            </div>
            <div className="bg-background rounded-2xl p-4 border border-border">
              <p className="text-sm text-zinc-400">Followers</p>
              <p className="text-2xl font-bold">0</p>
            </div>
            <div className="bg-background rounded-2xl p-4 border border-border">
              <p className="text-sm text-zinc-400">Following</p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </div>

          <Button variant="outline" className="self-start">Edit Profile</Button>
        </div>
      </div>
    </div>
  );
}
