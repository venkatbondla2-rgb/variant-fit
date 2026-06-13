"use client";

import { useState, useEffect } from "react";
import { X, Share2, Link as LinkIcon, Loader2, Search, Mail, MessageCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { collection, getDocs, getDoc, doc, query, limit, addDoc, where, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserAvatar } from "@/components/ui/UserAvatar";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  urlToShare: string;
  inline?: boolean;
}

export function ShareModal({ isOpen, onClose, urlToShare, inline }: ShareModalProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sentTo, setSentTo] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen || !user) return;
    
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const myDoc = await getDoc(doc(db, "users", user.uid));
        const myFriendsIds = myDoc.exists() ? (myDoc.data().friends || []) : [];
        
        const usersSnap = await getDocs(query(collection(db, "users"), limit(50)));
        const allUsersData = usersSnap.docs
          .map(d => ({ id: d.id, ...d.data() as any }))
          .filter(u => u.id !== user.uid);

        const friendsData = allUsersData.filter(u => myFriendsIds.includes(u.id));
        const otherUsersData = allUsersData.filter(u => !myFriendsIds.includes(u.id));

        setFriends(friendsData);
        setUsers(otherUsersData);
      } catch (error) {
        console.error("Error fetching users for share:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
    setSentTo({}); // reset
    setSearchQuery("");
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(urlToShare);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Check this out on VariantFit",
          url: urlToShare
        });
      } catch (err) {
        console.error("Error sharing:", err);
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const handleSendToUser = async (targetUser: any) => {
    if (!user || sentTo[targetUser.id]) return;
    
    // Optimistic UI update
    setSentTo(prev => ({ ...prev, [targetUser.id]: true }));
    
    try {
      // 1. Check if chat exists
      const q = query(
        collection(db, "chats"), 
        where("participants", "array-contains", user.uid)
      );
      const snap = await getDocs(q);
      const chats = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      const chat = chats.find(c => c.participants.includes(targetUser.id));
      
      let chatId = chat?.id;

      if (!chatId) {
        // 2. Create new chat if not exists
        const myDoc = await getDoc(doc(db, "users", user.uid));
        const myFriends: string[] = myDoc.exists() ? (myDoc.data().friends || []) : [];
        const isFriend = myFriends.includes(targetUser.id);
        
        const chatDoc = await addDoc(collection(db, "chats"), {
          participants: [user.uid, targetUser.id],
          participantNames: [user.displayName || "Variant", targetUser.username || targetUser.displayName || "Variant"],
          status: isFriend ? "active" : "pending",
          lastMessageText: `Check out this post: ${urlToShare}`,
          lastMessageTime: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
        chatId = chatDoc.id;
      } else {
        // Update last message
        await updateDoc(doc(db, "chats", chatId), {
          lastMessageText: `Check out this post: ${urlToShare}`,
          lastMessageTime: serverTimestamp(),
        });
      }

      // 3. Add message
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: `Check out this post: ${urlToShare}`,
        senderId: user.uid,
        createdAt: serverTimestamp()
      });
      
    } catch (err) {
      console.error("Error sending DM", err);
      // Revert if failed
      setSentTo(prev => ({ ...prev, [targetUser.id]: false }));
      alert("Failed to send message.");
    }
  };

  const allDisplayUsers = [...friends, ...users].filter(u => 
    (u.username || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.displayName || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const content = (
    <>
      <div 
        className={`bg-zinc-900 border border-zinc-800 w-full overflow-hidden flex flex-col shadow-2xl ${
          inline ? "rounded-2xl max-h-[400px] mt-2 mb-2" : "sm:rounded-3xl rounded-t-3xl max-w-sm h-[75vh] sm:h-auto sm:max-h-[85vh] animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col border-b border-zinc-800">
          {/* Mobile drag handle */}
          {!inline && <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3 mb-1 sm:hidden" />}
          
          <div className="flex items-center justify-between px-4 pb-2 sm:pt-4 sm:pb-3">
            <h3 className="font-bold text-lg text-white">Share</h3>
            <button onClick={onClose} className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 pb-4">
            <div className="bg-zinc-800/50 rounded-xl flex items-center px-3 py-2 border border-zinc-700/50">
              <Search className="w-4 h-4 text-zinc-400 mr-2" />
              <input 
                type="text" 
                placeholder="Search" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-white text-sm focus:outline-none w-full placeholder:text-zinc-500"
              />
            </div>
          </div>
        </div>

        {/* Users Grid */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
          ) : allDisplayUsers.length > 0 ? (
            <div className="grid grid-cols-4 gap-y-6 gap-x-2">
              {allDisplayUsers.map(u => {
                const isSent = sentTo[u.id];
                return (
                  <div key={u.id} className="flex flex-col items-center gap-2 group cursor-pointer" onClick={() => handleSendToUser(u)}>
                    <div className="relative">
                      <UserAvatar userId={u.id} username={u.username} size="md" showName={false} disableLink={true} />
                      {isSent && (
                        <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white uppercase bg-brand/80 px-1 rounded">Sent</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-300 text-center line-clamp-1 w-full px-1 group-hover:text-white transition-colors">
                      {u.username || u.displayName?.split(' ')[0] || "User"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-zinc-500 text-sm">
              No users found.
            </div>
          )}
        </div>

        {/* Bottom Actions Row */}
        <div className="bg-zinc-950 p-4 border-t border-zinc-800">
          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
            <button onClick={handleCopy} className="flex flex-col items-center gap-2 min-w-[64px] flex-shrink-0">
              <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors">
                <LinkIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-[11px] text-zinc-400">{copied ? "Copied!" : "Copy link"}</span>
            </button>

            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <button onClick={handleNativeShare} className="flex flex-col items-center gap-2 min-w-[64px] flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-[11px] text-zinc-400">Share via...</span>
              </button>
            )}
            
            <button onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(urlToShare)}`, '_blank')} className="flex flex-col items-center gap-2 min-w-[64px] flex-shrink-0">
              <div className="w-14 h-14 rounded-full bg-[#25D366]/20 flex items-center justify-center border border-[#25D366]/30 hover:bg-[#25D366]/30 transition-colors">
                <MessageCircle className="w-6 h-6 text-[#25D366]" />
              </div>
              <span className="text-[11px] text-zinc-400">WhatsApp</span>
            </button>



            <button onClick={() => window.open(`mailto:?subject=Check this out&body=${encodeURIComponent(urlToShare)}`, '_blank')} className="flex flex-col items-center gap-2 min-w-[64px] flex-shrink-0">
              <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors">
                <Mail className="w-6 h-6 text-zinc-300" />
              </div>
              <span className="text-[11px] text-zinc-400">Email</span>
            </button>
          </div>
        </div>
      </div>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
      `}</style>
    </>
  );

  if (inline) {
    return content;
  }

  return (
    <div 
      className="fixed inset-0 z-[10005] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      {content}
    </div>
  );
}
