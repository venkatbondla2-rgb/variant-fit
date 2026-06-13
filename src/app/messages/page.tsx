"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";
import { Send, Search, Loader2, Plus, ArrowLeft, MessageCircle, Dumbbell, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDocs, updateDoc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserAvatar } from "@/components/ui/UserAvatar";

import Link from "next/link";

const FITNESS_QUOTES = [
  { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
  { text: "Your body can stand almost anything. It's your mind you have to convince.", author: "Unknown" },
  { text: "Strength doesn't come from what you can do. It comes from overcoming the things you once thought you couldn't.", author: "Rikki Rogers" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Arnold Schwarzenegger" },
  { text: "Don't limit your challenges. Challenge your limits.", author: "Unknown" },
];

function Linkify({ text }: { text: string }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return (
    <>
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return (
            <Link key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline text-brand hover:brightness-110 break-all">
              {part}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function MessagesContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get("userId");
  const [loadingTargetUser, setLoadingTargetUser] = useState(false);

  const [message, setMessage] = useState("");
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [chatTab, setChatTab] = useState<"primary" | "requests">("primary");
  
  // New chat search
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Suggested friends
  const [suggestedFriends, setSuggestedFriends] = useState<any[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const randomQuote = FITNESS_QUOTES[Math.floor(Math.random() * FITNESS_QUOTES.length)];

  // Load Chats
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "chats"), where("participants", "array-contains", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      chatData.sort((a: any, b: any) => {
        const aTime = a.lastMessageTime?.toMillis?.() || 0;
        const bTime = b.lastMessageTime?.toMillis?.() || 0;
        return bTime - aTime;
      });
      setChats(chatData);
    }, (error) => {
      console.error("Chats loading error:", error);
    });
    return () => unsubscribe();
  }, [user]);

  // Handle userId parameter to open/create chat
  useEffect(() => {
    if (!user || !targetUserId || chats.length === 0) return;

    const initTargetChat = async () => {
      // 1. Check if chat already exists
      const existing = chats.find(c => c.participants?.includes(targetUserId));
      if (existing) {
        setActiveChat(existing);
        window.history.replaceState({}, "", "/messages");
        return;
      }

      if (loadingTargetUser) return;
      setLoadingTargetUser(true);

      try {
        // 2. Fetch target user info
        const targetSnap = await getDoc(doc(db, "users", targetUserId));
        if (!targetSnap.exists()) {
          setLoadingTargetUser(false);
          return;
        }
        const targetData = targetSnap.data();

        // 3. Check if friend
        const mySnap = await getDoc(doc(db, "users", user.uid));
        const myFriends = mySnap.exists() ? (mySnap.data()?.friends || []) : [];
        const isFriend = myFriends.includes(targetUserId);

        // 4. Create new chat doc
        const chatDocRef = await addDoc(collection(db, "chats"), {
          participants: [user.uid, targetUserId],
          participantNames: [
            user.displayName || user.email?.split("@")[0] || "Variant",
            targetData.username || targetData.displayName || "Variant"
          ],
          status: isFriend ? "active" : "pending",
          lastMessageText: "",
          lastMessageTime: serverTimestamp(),
          createdAt: serverTimestamp(),
          createdBy: user.uid
        });

        // 5. Send notification if not friends
        if (!isFriend) {
          await addDoc(collection(db, "notifications"), {
            userId: targetUserId,
            type: "message_request",
            message: `${user.displayName || user.email?.split("@")[0] || "Someone"} wants to message you.`,
            link: "/messages",
            read: false,
            createdAt: serverTimestamp(),
          });
        }

        const newChatObj = {
          id: chatDocRef.id,
          participants: [user.uid, targetUserId],
          participantNames: [
            user.displayName || user.email?.split("@")[0] || "Variant",
            targetData.username || targetData.displayName || "Variant"
          ],
          status: isFriend ? "active" : "pending",
          createdBy: user.uid
        };

        setActiveChat(newChatObj);
        window.history.replaceState({}, "", "/messages");
      } catch (err) {
        console.error("Error creating target chat:", err);
      } finally {
        setLoadingTargetUser(false);
      }
    };

    initTargetChat();
  }, [user, targetUserId, chats]);

  // Load suggested friends (friends not yet chatted with)
  useEffect(() => {
    if (!user) return;
    const loadSuggested = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const friends: string[] = userDoc.data()?.friends || [];
        if (friends.length === 0) return;

        // Get friends' data
        const friendData: any[] = [];
        for (const fid of friends.slice(0, 10)) {
          const snap = await getDoc(doc(db, "users", fid));
          if (snap.exists()) {
            friendData.push({ id: fid, ...snap.data() });
          }
        }
        setSuggestedFriends(friendData);
      } catch (err) {
        console.error(err);
      }
    };
    loadSuggested();
  }, [user]);

  // Filter chats by tab
  const displayedChats = chats.filter(c => {
    if (chatTab === "requests") return c.status === "pending";
    return c.status !== "pending";
  });

  // Load Messages for active chat
  useEffect(() => {
    if (!activeChat || !user) return;
    const q = query(collection(db, "chats", activeChat.id, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }, (error) => {
      console.error("Messages loading error:", error);
    });
    return () => unsubscribe();
  }, [activeChat, user]);

  // Search for users to chat with
  const handleUserSearch = async () => {
    if (!searchQuery.trim() || !user) return;
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
        .slice(0, 10);
      setSearchResults(results);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Start a new chat or open existing one
  const startChat = async (targetUser: any) => {
    if (!user) return;

    const existingChat = chats.find(c => c.participants?.includes(targetUser.id));
    if (existingChat) {
      setActiveChat(existingChat);
      setShowNewChat(false);
      setSearchQuery(""); setSearchResults([]);
      return;
    }

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const friends: string[] = userDoc.data()?.friends || [];
    const isFriend = friends.includes(targetUser.id);

    try {
      const chatDoc = await addDoc(collection(db, "chats"), {
        participants: [user.uid, targetUser.id],
        participantNames: [user.displayName || "Variant", targetUser.username || targetUser.displayName || "Variant"],
        status: isFriend ? "active" : "pending",
        lastMessageText: "",
        lastMessageTime: serverTimestamp(),
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      setActiveChat({
        id: chatDoc.id,
        participants: [user.uid, targetUser.id],
        participantNames: [user.displayName || "Variant", targetUser.username || targetUser.displayName || "Variant"],
        status: isFriend ? "active" : "pending",
        createdBy: user.uid,
      });
      setShowNewChat(false);
      setSearchQuery(""); setSearchResults([]);

      if (!isFriend) {
        await addDoc(collection(db, "notifications"), {
          userId: targetUser.id,
          type: "message_request",
          message: `${user.displayName || "Someone"} wants to message you.`,
          link: "/messages",
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create chat.");
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !activeChat || !user) return;
    setIsSending(true);
    try {
      await addDoc(collection(db, "chats", activeChat.id, "messages"), {
        text: message,
        senderId: user.uid,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, "chats", activeChat.id), {
        lastMessageText: message.substring(0, 50),
        lastMessageTime: serverTimestamp(),
      });
      setMessage("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const acceptMessageRequest = async (chatId: string) => {
    try {
      await updateDoc(doc(db, "chats", chatId), { status: "active" });
      setActiveChat((prev: any) => prev ? { ...prev, status: "active" } : null);
    } catch (err) {
      console.error(err);
    }
  };

  const declineMessageRequest = async (chatId: string) => {
    if (!confirm("Are you sure you want to ignore this message request?")) return;
    try {
      await deleteDoc(doc(db, "chats", chatId));
      setActiveChat(null);
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col fixed top-16 bottom-20 left-0 right-0 sm:static sm:h-[calc(100vh-4rem)] sm:w-full">
      <div className="bg-surface border-t-0 border-x-0 border-b border-border flex flex-1 overflow-hidden shadow-none">
        
        {/* Left Side: Conversations List */}
        <div className={`${activeChat ? "hidden sm:flex" : "flex"} w-full sm:w-1/3 sm:min-w-[120px] sm:max-w-[300px] border-r border-border border-dashed flex-col bg-background/50`}>
           <div className="p-4 border-b border-border/50">
             <div className="flex items-center justify-between mb-3">
                <h2 className="font-black text-lg">Messages</h2>
                <button onClick={() => setShowNewChat(!showNewChat)} 
                  className="p-1.5 rounded-lg hover:bg-surface-hover text-zinc-400 hover:text-brand transition-colors">
                  <Plus className="w-5 h-5" />
                </button>
             </div>

             {/* New chat search */}
             {showNewChat && (
               <div className="mb-3">
                 <div className="flex items-center bg-surface border border-brand/30 rounded-full overflow-hidden">
                   <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                     onKeyDown={e => e.key === "Enter" && handleUserSearch()}
                     placeholder="Search users..." autoFocus
                     className="flex-1 bg-transparent border-none px-4 py-2 text-sm focus:outline-none" />
                   <button onClick={handleUserSearch} disabled={isSearching} className="p-2 pr-3 text-brand">
                     {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                   </button>
                 </div>
                 {searchResults.length > 0 && (
                   <div className="mt-2 flex flex-col gap-1 bg-surface border border-border rounded-xl p-2 max-h-48 overflow-y-auto">
                     {searchResults.map(s => (
                       <button key={s.id} onClick={() => startChat(s)}
                         className="flex items-center gap-3 p-2 rounded-lg hover:bg-background transition-colors text-left w-full">
                         <UserAvatar userId={s.id} username={s.username || s.displayName || s.email?.split("@")[0]} size="sm" showName={false} />
                         <div className="overflow-hidden">
                           <p className="text-sm font-medium truncate">{s.username || s.displayName || s.email?.split("@")[0]}</p>
                           <p className="text-[10px] text-zinc-500 truncate">{s.email}</p>
                         </div>
                       </button>
                     ))}
                   </div>
                 )}
               </div>
             )}
             
             <div className="flex bg-surface rounded-lg p-1 mb-3">
               <button onClick={() => setChatTab("primary")}
                 className={`flex-1 text-xs py-1.5 font-bold rounded-md transition-colors ${chatTab === "primary" ? "bg-background text-brand shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}>
                 Primary
               </button>
               <button onClick={() => setChatTab("requests")}
                 className={`flex-1 text-xs py-1.5 font-bold rounded-md transition-colors ${chatTab === "requests" ? "bg-background text-brand shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}>
                 Requests
               </button>
             </div>

             <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input type="text" placeholder="Filter chats..." 
                  className="w-full bg-background border border-border rounded-full pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-brand transition-colors" />
             </div>
           </div>
           
           <div className="flex-1 overflow-y-auto">
             {displayedChats.length === 0 ? (
               <div className="p-4">
                 {/* Suggested Friends Section */}
                 {chatTab === "primary" && suggestedFriends.length > 0 && (
                   <div className="mb-4">
                     <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">Suggested Chats</p>
                     <div className="flex flex-col gap-2">
                       {suggestedFriends.slice(0, 5).map(f => (
                         <button
                           key={f.id}
                           onClick={() => startChat(f)}
                           className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface transition-colors text-left w-full border border-border/50 hover:border-brand/30"
                         >
                           <div className="relative">
                             <UserAvatar userId={f.id} username={f.username || f.displayName || "Variant"} size="sm" showName={false} />
                             <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
                           </div>
                           <div className="overflow-hidden flex-1">
                             <p className="text-sm font-medium truncate">{f.username || f.displayName || "Variant"}</p>
                             <p className="text-[10px] text-zinc-500">Friend</p>
                           </div>
                           <MessageCircle className="w-4 h-4 text-zinc-500" />
                         </button>
                       ))}
                     </div>
                   </div>
                 )}

                 {suggestedFriends.length === 0 && (
                   <div className="text-center py-6">
                     <MessageCircle className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                     <p className="text-xs text-zinc-500">No {chatTab} chats found.</p>
                     {chatTab === "primary" && (
                       <button onClick={() => setShowNewChat(true)} className="text-brand hover:underline font-bold text-xs mt-2">Start a new chat</button>
                     )}
                   </div>
                 )}
               </div>
             ) : (
               displayedChats.map((c) => {
                 const otherUserId = c.participants?.find((p: string) => p !== user.uid);
                 const otherUserName = c.participantNames ? c.participantNames.find((n: string) => n !== user.displayName) : "Variant";
                 const isActive = activeChat?.id === c.id;
                 
                 return (
                 <div key={c.id} onClick={() => setActiveChat(c)} className={`p-3 sm:p-4 border-b border-border/20 cursor-pointer transition-colors ${isActive ? "bg-brand/10 border-l-2 border-l-brand" : "hover:bg-surface-hover"}`}>
                   <div className="flex items-center gap-3">
                     {otherUserId ? (
                       <UserAvatar userId={otherUserId} username={otherUserName || "Variant"} size="sm" showName={false} />
                     ) : (
                       <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0" />
                     )}
                     <div className="overflow-hidden flex-1">
                       <h4 className="font-bold text-sm truncate">{otherUserName}</h4>
                       <p className="text-xs text-zinc-500 truncate">{c.lastMessageText || "New Chat"}</p>
                     </div>
                     {c.status === "pending" && (
                       <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-bold flex-shrink-0">Request</span>
                     )}
                   </div>
                 </div>
               );})
             )}
           </div>
        </div>

        {/* Right Side: Chat Area */}
        <div className={`${!activeChat ? "hidden sm:flex" : "flex"} flex-1 flex-col bg-background relative`}>
           {!activeChat ? (
             <div className="flex-1 flex items-center justify-center flex-col gap-6 p-8">
                {/* Fitness quote illustration */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center">
                    <Dumbbell className="w-10 h-10 text-brand/40" />
                  </div>
                  <Sparkles className="w-5 h-5 text-brand absolute -top-1 -right-1" />
                </div>
                
                <div className="text-center max-w-sm">
                  <p className="text-zinc-300 italic text-sm leading-relaxed mb-2">&ldquo;{randomQuote.text}&rdquo;</p>
                  <p className="text-[10px] text-zinc-500">— {randomQuote.author}</p>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <p className="text-zinc-500 text-xs">Select a chat or start a new conversation</p>
                  <Button onClick={() => setShowNewChat(true)} variant="outline" size="sm" className="gap-2 rounded-full">
                    <Plus className="w-4 h-4" /> New Chat
                  </Button>
                </div>
             </div>
           ) : (
             <>
               {/* Chat Header */}
               <div className="p-3 sm:p-4 border-b border-border/50 flex items-center gap-3 bg-surface/50 backdrop-blur">
                  <button onClick={() => setActiveChat(null)} className="sm:hidden p-1.5 rounded-lg hover:bg-surface-hover">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  {(() => {
                    const otherUserId = activeChat.participants?.find((p: string) => p !== user.uid);
                    const otherName = activeChat.participantNames?.find((n: string) => n !== user.displayName) || "Variant";
                    return otherUserId ? (
                      <UserAvatar userId={otherUserId} username={otherName} size="sm" />
                    ) : (
                      <span className="font-bold text-sm">{otherName}</span>
                    );
                  })()}

               </div>

               {/* Pending notice */}
               {activeChat.status === "pending" && (
                 <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 text-center">
                   <p className="text-xs text-yellow-400">This is a message request. Accept to continue the conversation.</p>
                 </div>
               )}

               {/* Messages Feed */}
               <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
                  {messages.length === 0 && (
                    <p className="text-center text-zinc-500 text-xs mt-8">No messages yet. Say hi! 👋</p>
                  )}
                  {messages.map(m => {
                    const isMe = m.senderId === user.uid;
                    return (
                    <div key={m.id} className={`max-w-[80%] shadow-sm px-4 py-2.5 ${isMe ? "self-end bg-brand text-black rounded-2xl rounded-tr-sm" : "self-start bg-surface border border-border rounded-2xl rounded-tl-sm"}`}>
                       <p className="text-sm whitespace-pre-wrap"><Linkify text={m.text} /></p>
                       <span className={`text-[10px] mt-1 block ${isMe ? "text-black/60 text-right" : "text-zinc-500"}`}>
                         {m.createdAt?.toDate?.()?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || "Just now"}
                       </span>
                    </div>
                  );})}
                  <div ref={messagesEndRef} />
               </div>

               {/* Message Input / Action Box based on request state */}
               {activeChat.status === "pending" ? (
                 (() => {
                   const otherName = activeChat.participantNames?.find((n: string) => n !== user.displayName) || "Variant";
                   const isInitiator = activeChat.createdBy ? activeChat.createdBy === user.uid : activeChat.participants[0] === user.uid;

                   if (isInitiator) {
                     return (
                       <div className="p-4 bg-surface/80 border-t border-border mt-auto text-center text-xs text-zinc-500 font-bold">
                         Message request sent. Waiting for {otherName} to accept.
                       </div>
                     );
                   }

                   return (
                     <div className="p-4 bg-surface border-t border-border mt-auto flex flex-col items-center gap-3">
                       <p className="text-sm text-zinc-400 text-center font-semibold">
                         Accept message request from <span className="text-brand">{otherName}</span> to start chatting.
                       </p>
                       <div className="flex gap-3 w-full max-w-xs">
                         <Button onClick={() => acceptMessageRequest(activeChat.id)} className="flex-1 bg-brand text-black font-bold hover:brightness-110">
                           Accept
                         </Button>
                         <Button onClick={() => declineMessageRequest(activeChat.id)} variant="outline" className="flex-1 text-red-500 border-red-500/20 hover:bg-red-500/10">
                           Ignore
                         </Button>
                       </div>
                     </div>
                   );
                 })()
               ) : (
                 <div className="p-3 bg-surface/50 backdrop-blur border-t border-border mt-auto">
                   <div className="flex items-center gap-2">
                     <input 
                       type="text" 
                       value={message}
                       onChange={(e) => setMessage(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                       placeholder="Type a message..."
                       className="flex-1 bg-background border border-border rounded-full px-4 py-2 sm:py-2.5 text-sm focus:outline-none focus:border-brand transition-colors"
                     />
                     <Button onClick={handleSendMessage} disabled={isSending || !message.trim()} className="rounded-full bg-brand text-black hover:brightness-110 flex-shrink-0 h-10 w-10 p-0">
                       <Send className="w-4 h-4 ml-0.5" />
                     </Button>
                   </div>
                 </div>
               )}
             </>
           )}
        </div>

      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-zinc-500">Loading messages...</div>}>
      <MessagesContent />
    </Suspense>
  );
}
