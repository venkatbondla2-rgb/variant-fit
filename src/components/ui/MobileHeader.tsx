"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Menu, X, Activity, Home, LineChart, Dumbbell, Trophy, HelpCircle, Users, Bell, User, MessageCircle, Shield, Search, UserPlus, Clock, UserCheck, Loader2 } from "lucide-react";
import { NotificationBadge } from "@/components/ui/NotificationBadge";
import { collection, getDocs, addDoc, serverTimestamp, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserAvatar } from "@/components/ui/UserAvatar";

export function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const pathname = usePathname();
  const { user, userRole } = useAuth();

  if (!user) return null;

  const links = [
    { href: "/feed", label: "Home Feed", icon: <Home className="w-5 h-5" /> },
    { href: "/messages", label: "Messages", icon: <MessageCircle className="w-5 h-5" /> },
    { href: "/track", label: "Track Progress", icon: <LineChart className="w-5 h-5" /> },
    { href: "/diet", label: "Diet & Nutrition", icon: <Activity className="w-5 h-5" /> },
    { href: "/train", label: "Train with Variant", icon: <Dumbbell className="w-5 h-5" /> },
    { href: "/challenge", label: "Challenge Variants", icon: <Trophy className="w-5 h-5" /> },
    { href: "/help", label: "Help me Variant", icon: <HelpCircle className="w-5 h-5" /> },
    { href: "/community", label: "Community", icon: <Users className="w-5 h-5" /> },
  ];

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const results = snap.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as any) }))
        .filter(u => u.id !== user.uid && (
          u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchQuery.toLowerCase())
        ))
        .slice(0, 5);
      setSearchResults(results);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (targetId: string, targetName: string) => {
    try {
      // Check if already sent
      const sentQ = query(
        collection(db, "friend_requests"),
        where("fromId", "==", user.uid),
        where("toId", "==", targetId),
        where("status", "==", "pending")
      );
      const sentSnap = await getDocs(sentQ);
      if (!sentSnap.empty) {
        setSentRequests(prev => new Set([...prev, targetId]));
        return;
      }

      await addDoc(collection(db, "friend_requests"), {
        fromId: user.uid,
        fromName: user.displayName || "Variant",
        toId: targetId,
        toName: targetName,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "notifications"), {
        userId: targetId,
        type: "friend_request",
        message: `${user.displayName || "Someone"} sent you a friend request!`,
        link: `/profile/${user.uid}`,
        read: false,
        createdAt: serverTimestamp(),
      });

      setSentRequests(prev => new Set([...prev, targetId]));
    } catch (err) {
      console.error(err);
      alert("Failed to send friend request.");
    }
  };

  return (
    <>
      {/* Mobile Top App Bar */}
      <div className="sm:hidden fixed top-0 left-0 w-full h-16 bg-background/95 backdrop-blur-md border-b border-border z-50 flex items-center justify-between px-4">
        <Link href="/feed" className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-brand" />
          <span className="font-bold text-lg tracking-tight">VariantFit</span>
        </Link>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 text-zinc-400 hover:text-brand transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsOpen(true)}
            className="p-2 -mr-2 bg-transparent border-none text-white hover:text-brand transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Search + Friend Request Panel */}
      {showSearch && (
        <div className="sm:hidden fixed top-16 left-0 w-full bg-background/95 backdrop-blur-md border-b border-border z-40 p-4">
          <div className="flex items-center bg-surface border border-border rounded-full overflow-hidden">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search & add friends..." 
              className="flex-1 bg-transparent border-none px-4 py-2.5 text-sm focus:outline-none"
              autoFocus
            />
            <button onClick={handleSearch} disabled={isSearching} className="p-2 pr-3 text-zinc-400 hover:text-brand">
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {searchResults.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border/50">
                  <UserAvatar userId={s.id} username={s.username || s.email?.split("@")[0]} size="sm" />
                  {sentRequests.has(s.id) ? (
                    <span className="flex items-center gap-1 text-zinc-500 text-[10px] font-bold">
                      <Clock className="w-3 h-3" /> Sent
                    </span>
                  ) : (
                    <button
                      onClick={() => sendFriendRequest(s.id, s.username || s.email?.split("@")[0] || "Variant")}
                      className="flex items-center gap-1 bg-brand text-black text-xs font-bold px-3 py-1.5 rounded-full"
                    >
                      <UserPlus className="w-3 h-3" /> Add
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Drawer Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-[60] sm:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer Menu */}
      <div 
         className={`fixed top-0 left-0 h-full w-[280px] bg-background border-r border-border z-[70] transform transition-transform duration-300 ease-in-out sm:hidden flex flex-col p-6 overflow-y-auto ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between mb-8">
            <Link href="/feed" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
              <Activity className="w-8 h-8 text-brand" />
              <span className="font-bold text-xl tracking-tight">VariantFit</span>
            </Link>
            <button onClick={() => setIsOpen(false)} className="p-2 text-zinc-400 hover:text-white bg-surface rounded-full">
              <X className="w-5 h-5" />
            </button>
        </div>

        <div className="flex flex-col gap-2 flex-grow">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Main Menu</div>
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive ? "bg-brand/10 text-brand font-medium" : "text-zinc-300 hover:text-white focus:bg-surface"
                }`}
              >
                {link.icon}
                <span className="text-sm shadow-black drop-shadow-sm">{link.label}</span>
              </Link>
            );
          })}

          {/* View All Variants link in mobile */}
          <Link
            href="/variants"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              pathname === "/variants" ? "bg-brand/10 text-brand font-medium" : "text-zinc-300 hover:text-white"
            }`}
          >
            <UserPlus className="w-5 h-5" />
            <span className="text-sm">Find Friends</span>
          </Link>
        </div>

        <div className="mt-6 border-t border-border pt-6 pb-20 flex flex-col gap-2">
           <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Account</div>
           <Link href="/notifications" onClick={() => setIsOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === "/notifications" ? "bg-brand/10 text-brand font-medium" : "text-zinc-300"}`}>
              <NotificationBadge>
                <Bell className="w-5 h-5"/>
              </NotificationBadge>
              <span className="text-sm">Activity</span>
           </Link>
           <Link href="/profile" onClick={() => setIsOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === "/profile" ? "bg-brand/10 text-brand font-medium" : "text-zinc-300 hover:text-white"}`}>
              <User className="w-5 h-5"/>
              <span className="text-sm">Profile</span>
           </Link>
           {userRole === "admin" && (
             <Link href="/admin" onClick={() => setIsOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === "/admin" ? "bg-brand/10 text-brand font-medium" : "text-zinc-300 hover:text-white"}`}>
                <Shield className="w-5 h-5"/>
                <span className="text-sm">Admin Panel</span>
             </Link>
           )}
        </div>
      </div>
    </>
  );
}
