"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Send, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDocs } from "firebase/firestore";
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

  // Load Chats
  useEffect(() => {
    if (!user) return;
    
    // Use a simpler query without orderBy to avoid index requirements
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort client-side to avoid needing a composite index
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
    const q = query(
      collection(db, "chats", activeChat.id, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Messages loading error:", error);
    });
    return () => unsubscribe();
  }, [activeChat, user]);

  const handleSendMessage = async () => {
    if (!message.trim() || !activeChat || !user) return;
    setIsSending(true);
    try {
      await addDoc(collection(db, "chats", activeChat.id, "messages"), {
        text: message,
        senderId: user.uid,
        createdAt: serverTimestamp()
      });
      setMessage("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] sm:h-[calc(100vh-80px)] pt-2 sm:pt-4">
      <div className="bg-surface border border-border rounded-3xl overflow-hidden flex flex-1 shadow-md">
        
        {/* Left Side: Conversations List */}
        <div className="w-1/3 min-w-[120px] max-w-[250px] border-r border-border border-dashed flex flex-col bg-background/50">
           <div className="p-4 border-b border-border/50">
             <div className="flex items-center justify-between mb-3 hidden sm:flex">
                <h2 className="font-bold">Messages</h2>
             </div>
             
             <div className="flex bg-surface rounded-lg p-1 mb-4 hidden sm:flex">
               <button 
                 onClick={() => setChatTab("primary")}
                 className={`flex-1 text-xs py-1.5 font-bold rounded-md transition-colors ${chatTab === "primary" ? "bg-background text-brand shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
               >
                 Primary
               </button>
               <button 
                 onClick={() => setChatTab("requests")}
                 className={`flex-1 text-xs py-1.5 font-bold rounded-md transition-colors ${chatTab === "requests" ? "bg-background text-brand shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
               >
                 Requests
               </button>
             </div>

             <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 hidden sm:block" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="w-full bg-background border border-border rounded-full pl-3 sm:pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-brand transition-colors"
                />
             </div>
           </div>
           
           <div className="flex-1 overflow-y-auto">
             {displayedChats.length === 0 && (
               <p className="text-xs text-zinc-500 p-4 text-center">No {chatTab} chats found.</p>
             )}
             {displayedChats.map((c) => {
               const otherUserId = c.participants?.find((p: string) => p !== user.uid);
               const otherUserName = c.participantNames ? c.participantNames.find((n: string) => n !== user.displayName) : "Variant";
               const isActive = activeChat?.id === c.id;
               
               return (
               <div key={c.id} onClick={() => setActiveChat(c)} className={`p-4 border-b border-border/20 cursor-pointer transition-colors ${isActive ? "bg-brand/10 border-l-2 border-l-brand" : "hover:bg-surface-hover"}`}>
                 <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
                   {otherUserId ? (
                     <UserAvatar userId={otherUserId} username={otherUserName || "Variant"} size="sm" showName={false} />
                   ) : (
                     <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0 relative">
                       <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-surface"></div>
                     </div>
                   )}
                   <div className="hidden sm:block overflow-hidden">
                     <h4 className="font-bold text-sm truncate">{otherUserName}</h4>
                     <p className="text-xs text-zinc-500 truncate">{c.lastMessageText || "New Chat"}</p>
                   </div>
                 </div>
               </div>
             )})}
           </div>
        </div>

        {/* Right Side: Chat Area */}
        <div className="flex-1 flex flex-col bg-background relative">
           {!activeChat ? (
             <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                Select a chat to start messaging
             </div>
           ) : (
             <>
               {/* Chat Header */}
               <div className="p-4 border-b border-border/50 flex items-center justify-between bg-surface/50 backdrop-blur">
                 <div className="flex items-center gap-3">
                    {(() => {
                      const otherUserId = activeChat.participants?.find((p: string) => p !== user.uid);
                      const otherName = activeChat.participantNames?.find((n: string) => n !== user.displayName) || "Variant";
                      return otherUserId ? (
                        <UserAvatar userId={otherUserId} username={otherName} size="sm" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-zinc-800" />
                          <span className="font-bold text-sm">{otherName}</span>
                        </div>
                      );
                    })()}
                 </div>
               </div>

               {/* Messages Feed */}
               <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
                  {messages.map(m => {
                    const isMe = m.senderId === user.uid;
                    return (
                    <div key={m.id} className={`max-w-[80%] shadow-sm px-4 py-2 ${isMe ? "self-end bg-brand text-black rounded-2xl rounded-tr-sm" : "self-start bg-surface border border-border rounded-2xl rounded-tl-sm"}`}>
                       <p className="text-sm">{m.text}</p>
                       <span className={`text-[10px] mt-1 block ${isMe ? "text-black/60 text-right right-0" : "text-zinc-500"}`}>
                         {m.createdAt?.toDate?.()?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || "Just now"}
                       </span>
                    </div>
                  )})}
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
                    <Button onClick={handleSendMessage} disabled={isSending || !message.trim()} className="rounded-full bg-brand text-black hover:brightness-110 flex-shrink-0 h-10 w-10 p-0 sm:h-10 sm:w-10">
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
