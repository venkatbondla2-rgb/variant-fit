"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReplySection({ questionId, questionUserId }: { questionId: string; questionUserId: string }) {
  const { user } = useAuth();
  const [replies, setReplies] = useState<any[]>([]);
  const [newReply, setNewReply] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isExpanded) return;

    const q = query(
      collection(db, `questions/${questionId}/replies`),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReplies(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [questionId, isExpanded]);

  const handlePostReply = async () => {
    if (!newReply.trim() || !user) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, `questions/${questionId}/replies`), {
        userId: user.uid,
        username: user.displayName || "Variant",
        content: newReply,
        createdAt: serverTimestamp(),
      });

      // Send a notification if the replier is not the question owner
      if (user.uid !== questionUserId) {
        await addDoc(collection(db, "notifications"), {
          userId: questionUserId,
          type: "reply",
          message: `${user.displayName || "Someone"} replied to your question.`,
          link: `/help`, 
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      setNewReply("");
    } catch (err) {
      console.error("Failed to post reply:", err);
      alert("Failed to post reply.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm("Are you sure you want to delete this reply?")) return;
    try {
      await deleteDoc(doc(db, `questions/${questionId}/replies`, replyId));
    } catch (err) {
      console.error("Failed to delete reply:", err);
      alert("Failed to delete reply.");
    }
  };

  return (
    <div className="mt-4 pt-3 border-t border-border/50">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs font-medium text-brand hover:underline mb-3"
      >
        {isExpanded ? "Hide replies" : "Write a response / View replies"}
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-3">
          {replies.length > 0 && (
            <div className="flex flex-col gap-3 bg-background/50 rounded-lg p-3">
              {replies.map((reply) => (
                <div key={reply.id} className="flex gap-2 group">
                  <div className="w-6 h-6 rounded-full bg-zinc-800 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-xs">{reply.username}</span>
                      <span className="text-[10px] text-zinc-500">
                        {reply.createdAt?.toDate().toLocaleDateString() || "Just now"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-0.5">{reply.content}</p>
                  </div>
                  {user?.uid === reply.userId && (
                    <button 
                       onClick={() => handleDeleteReply(reply.id)}
                       className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <div className="flex gap-2 items-center mt-1">
            <input 
              type="text"
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              placeholder="Add a reply..."
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand"
              onKeyDown={(e) => e.key === "Enter" && handlePostReply()}
            />
            <Button 
              onClick={handlePostReply} 
              disabled={isSubmitting || !newReply.trim()} 
              className="bg-brand text-black hover:brightness-110 h-8 px-3 rounded-lg text-xs font-bold shrink-0"
            >
              {isSubmitting ? "..." : "Reply"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
