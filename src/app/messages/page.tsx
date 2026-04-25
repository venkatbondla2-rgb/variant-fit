"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { Send, Search, Loader2, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDocs, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserAvatar } from "@/components/ui/UserAvatar";

export default function MessagesPage() {
  const { user } = useAuth();
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      // Auto-scroll to bottom
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

    // Check if chat already exists
    const existingChat = chats.find(c => 
      c.participants?.includes(targetUser.id)
    );

    if (existingChat) {
      setActiveChat(existingChat);
      setShowNewChat(false);
      setSearchQuery("");
      setSearchResults([]);
      return;
    }

    // Check friend status
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
      });

      const newChat = {
        id: chatDoc.id,
        participants: [user.uid, targetUser.id],
        participantNames: [user.displayName || "Variant", targetUser.username || targetUser.displayName || "Variant"],
        status: isFriend ? "active" : "pending",
      };

      setActiveChat(newChat);
      setShowNewChat(false);
      setSearchQuery("");
      setSearchResults([]);

      if (!isFriend) {
        // Notify as message request
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
      
      // Update last message
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
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] sm:h-[calc(100vh-80px)] pt-2 sm:pt-4">
      <div className="bg-surface border border-border rounded-3xl overflow-hidden flex flex-1 shadow-md">
        
        {/* Left Side: Conversations List */}
        <div className={`${activeChat ? "hidden sm:flex" : "flex"} w-full sm:w-1/3 sm:min-w-[120px] sm:max-w-[280px] border-r border-border border-dashed flex-col bg-background/50`}>
           <div className="p-4 border-b border-border/50">
             <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold">Messages</h2>
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
             {displayedChats.length === 0 && (
               <div className="text-xs text-zinc-500 p-4 text-center flex flex-col items-center gap-2">
                 <p>No {chatTab} chats found.</p>
                 {chatTab === "primary" && (
                   <button onClick={() => setShowNewChat(true)} className="text-brand hover:underline font-bold">Start a new chat</button>
                 )}
               </div>
             )}
             {displayedChats.map((c) => {
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
             );})}
           </div>
        </div>

        {/* Right Side: Chat Area */}
        <div className={`${!activeChat ? "hidden sm:flex" : "flex"} flex-1 flex-col bg-background relative`}>
           {!activeChat ? (
             <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm flex-col gap-3">
                <p>Select a chat or start a new one</p>
                <Button onClick={() => setShowNewChat(true)} variant="outline" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" /> New Chat
                </Button>
             </div>
           ) : (
             <>
               {/* Chat Header */}
               <div className="p-3 sm:p-4 border-b border-border/50 flex items-center gap-3 bg-surface/50 backdrop-blur">
                  {/* Back button on mobile */}
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
                  {activeChat.status === "pending" && (
                    <div className="ml-auto flex gap-2">
                      <Button onClick={() => acceptMessageRequest(activeChat.id)} size="sm" className="bg-brand text-black text-xs font-bold">Accept</Button>
                    </div>
                  )}
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
                    <div key={m.id} className={`max-w-[80%] shadow-sm px-4 py-2 ${isMe ? "self-end bg-brand text-black rounded-2xl rounded-tr-sm" : "self-start bg-surface border border-border rounded-2xl rounded-tl-sm"}`}>
                       <p className="text-sm">{m.text}</p>
                       <span className={`text-[10px] mt-1 block ${isMe ? "text-black/60 text-right" : "text-zinc-500"}`}>
                         {m.createdAt?.toDate?.()?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || "Just now"}
                       </span>
                    </div>
                  );})}
                  <div ref={messagesEndRef} />
               </div>

               {/* Message Input */}
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
             </>
           )}
        </div>

      </div>
    </div>
  );
}
