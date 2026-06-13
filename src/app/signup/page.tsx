"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Activity, ArrowRight, Globe, Lock } from "lucide-react";
import { auth, db, googleProvider } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";

export default function SignUpPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
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
        isPrivate,
        createdAt: new Date().toISOString()
      });

      router.push("/profile");
    } catch (err: any) {
      setError(err.message || "Failed to create an account.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if Firestore user doc exists; create one if not
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          username: user.displayName || "User",
          email: user.email,
          bio: "",
          goals: "",
          isPrivate: false,
          photoURL: user.photoURL || "",
          createdAt: new Date().toISOString(),
        });
      }

      router.push("/feed");
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user") {
        // User closed popup, not an error
      } else {
        setError(err.message || "Google sign-up failed.");
      }
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

          {/* Account Visibility */}
          <div>
            <label className="text-sm font-medium mb-2 block text-zinc-300">Account Visibility</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                  !isPrivate ? "bg-brand/10 border-brand text-brand" : "bg-background border-border text-zinc-400 hover:border-zinc-500"
                }`}
              >
                <Globe className="w-4 h-4" /> Public
              </button>
              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                  isPrivate ? "bg-orange-500/10 border-orange-500 text-orange-400" : "bg-background border-border text-zinc-400 hover:border-zinc-500"
                }`}
              >
                <Lock className="w-4 h-4" /> Private
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 mt-1.5">
              {isPrivate ? "Only friends can see your posts and stats." : "Everyone can see your profile, posts, and stats."}
            </p>
          </div>
          
          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? "Creating account..." : "Sign Up"}
            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 w-full my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-zinc-500 font-medium uppercase">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Google Sign-Up Button */}
        <button
          onClick={handleGoogleSignUp}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white text-zinc-800 font-semibold py-3 px-4 rounded-xl hover:bg-zinc-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign up with Google
        </button>

        <p className="text-sm text-zinc-400 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-brand hover:underline font-medium">Log In</Link>
        </p>
      </div>
    </div>
  );
}
