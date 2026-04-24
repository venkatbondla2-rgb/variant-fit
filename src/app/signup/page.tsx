"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Activity, ArrowRight } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";

export default function SignUpPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && currentUser) {
      router.replace("/feed");
    }
  }, [currentUser, authLoading, router]);

  if (authLoading || currentUser) return null;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update Firebase Auth profile
      await updateProfile(user, { displayName: username });
      
      // Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username,
        email,
        bio: "",
        goals: "",
        createdAt: new Date().toISOString()
      });

      router.push("/profile");
    } catch (err: any) {
      setError(err.message || "Failed to create an account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-6 relative">
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand/10 rounded-full blur-[100px] -z-10" />
      
      <div className="w-full max-w-md bg-surface border border-border p-8 rounded-3xl shadow-xl flex flex-col items-center">
        <Link href="/" className="flex items-center justify-center w-12 h-12 bg-black rounded-full mb-6 relative group">
          <Activity className="w-6 h-6 text-brand group-hover:scale-110 transition-transform" />
        </Link>
        <h1 className="text-3xl font-bold mb-2">Join Variant</h1>
        <p className="text-zinc-400 mb-8 w-full text-center">Create an account to start tracking.</p>

        {error && <div className="w-full bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg mb-4">{error}</div>}

        <form onSubmit={handleSignUp} className="flex flex-col gap-4 w-full">
          <div>
            <label className="text-sm font-medium mb-1 block text-zinc-300">Username</label>
            <Input 
              type="text" 
              placeholder="e.g. gymbro99" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block text-zinc-300">Email</label>
            <Input 
              type="email" 
              placeholder="you@example.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="mb-2">
            <label className="text-sm font-medium mb-1 block text-zinc-300">Password</label>
            <Input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              minLength={6}
            />
          </div>
          
          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? "Creating account..." : "Sign Up"}
            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </form>

        <p className="text-sm text-zinc-400 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-brand hover:underline font-medium">Log In</Link>
        </p>
      </div>
    </div>
  );
}
