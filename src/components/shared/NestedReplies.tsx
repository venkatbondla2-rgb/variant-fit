"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Send, Trash2, CornerDownRight } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";

interface NestedRepliesProps {
  collectionPath: string; // e.g. "posts/abc/comments" or "questions/xyz/replies"
  notifyUserId?: string;  // owner to notify on reply
  notifyType?: string;
  notifyLink?: string;
  placeholder?: string;
}

// Single reply that can have nested sub-replies infinitely
function ReplyItem({ reply, collectionPath, depth = 0 }: { reply: any; collectionPath: string; depth?: number }) {
  const { user } = useAuth();
  const [showSubReplies, setShowSubReplies] = useState(false);
  const [subReplies, setSubReplies] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);

  const subPath = `${collectionPath}/${reply.id}/replies`;

  useEffect(() => {
    if (!showSubReplies) return;
    const q = query(collection(db, subPath), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, snap => {
      setSubReplies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [showSubReplies, subPath]);

  const handleReply = async () => {
    if (!replyText.trim() || !user) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, subPath), {
        userId: user.uid,
        username: user.displayName || "Variant",
        content: replyText,
        text: replyText, // support both field names
        createdAt: serverTimestamp(),
      });
      setReplyText("");
      setShowReplyInput(false);
      setShowSubReplies(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this reply?")) return;
    try {
      await deleteDoc(doc(db, collectionPath, reply.id));
    } catch (err) {
      console.error(err);
    }
  };

  const maxIndent = Math.min(depth, 4); // cap visual nesting at 4 levels

  return (
    <div className={`${maxIndent > 0 ? "ml-4 sm:ml-6 pl-3 sm:pl-4 border-l-2 border-border/30" : ""}`}>
      <div className="flex gap-2 group py-1.5">
        <UserAvatar userId={reply.userId} username={reply.username} size="sm" showName={false} />
        <div className="flex-1 min-w-0">
          <div className="bg-background rounded-2xl rounded-tl-sm px-3 py-2 border border-border/30 inline-block max-w-full">
            <span className="font-bold text-xs text-brand">{reply.username}</span>
            <p className="text-xs text-zinc-300 mt-0.5">{reply.content || reply.text}</p>
          </div>
          <div className="flex items-center gap-3 mt-0.5 ml-1">
            <span className="text-[10px] text-zinc-600">
              {reply.createdAt?.toDate?.()?.toLocaleDateString() || "Just now"}
            </span>
            <button onClick={() => setShowReplyInput(!showReplyInput)} className="text-[10px] text-zinc-500 hover:text-brand font-bold">
              Reply
            </button>
            {user?.uid === reply.userId && (
              <button onClick={handleDelete} className="text-[10px] text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Delete
              </button>
            )}
          </div>

          {showReplyInput && (
            <div className="flex gap-2 items-center mt-2">
              <CornerDownRight className="w-3 h-3 text-zinc-600 flex-shrink-0" />
              <input
                type="text" value={replyText} onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleReply()}
                placeholder="Write a reply..." autoFocus
                className="flex-1 bg-background border border-border rounded-full px-3 py-1.5 text-xs focus:outline-none focus:border-brand"
              />
              <button onClick={handleReply} disabled={isSubmitting || !replyText.trim()}
                className="text-brand text-xs font-bold hover:underline disabled:opacity-50">
                {isSubmitting ? "..." : "Send"}
              </button>
            </div>
          )}

          {/* Toggle sub-replies */}
          {subReplies.length > 0 && !showSubReplies && (
            <button onClick={() => setShowSubReplies(true)} className="text-[10px] text-brand hover:underline mt-1 ml-1">
              View {subReplies.length} {subReplies.length === 1 ? "reply" : "replies"}
            </button>
          )}

          {/* Render sub-replies recursively */}
          {showSubReplies && subReplies.map(sr => (
            <ReplyItem key={sr.id} reply={sr} collectionPath={subPath} depth={depth + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function NestedReplies({ collectionPath, notifyUserId, notifyType, notifyLink, placeholder }: NestedRepliesProps) {
  const { user } = useAuth();
  const [replies, setReplies] = useState<any[]>([]);
  const [newReply, setNewReply] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isExpanded) return;
    const q = query(collection(db, collectionPath), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, snap => {
      setReplies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [collectionPath, isExpanded]);

  const handlePost = async () => {
    if (!newReply.trim() || !user) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, collectionPath), {
        userId: user.uid,
        username: user.displayName || "Variant",
        content: newReply,
        text: newReply,
        createdAt: serverTimestamp(),
      });

      if (notifyUserId && user.uid !== notifyUserId) {
        await addDoc(collection(db, "notifications"), {
          userId: notifyUserId,
          type: notifyType || "reply",
          message: `${user.displayName || "Someone"} replied.`,
          link: notifyLink || "/feed",
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      setNewReply("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <button onClick={() => setIsExpanded(!isExpanded)} className="text-xs font-medium text-brand hover:underline mb-2">
        {isExpanded ? "Hide replies" : `View / Write replies${replies.length > 0 ? ` (${replies.length})` : ""}`}
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-1">
          {replies.length === 0 && <p className="text-[10px] text-zinc-500 py-1">No replies yet.</p>}
          {replies.map(r => (
            <ReplyItem key={r.id} reply={r} collectionPath={collectionPath} depth={0} />
          ))}

          <div className="flex gap-2 items-center mt-2">
            <input
              type="text"
              value={newReply} onChange={e => setNewReply(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handlePost()}
              placeholder={placeholder || "Add a reply..."}
              className="flex-1 bg-background border border-border rounded-full px-3 py-2 text-xs focus:outline-none focus:border-brand"
            />
            <button onClick={handlePost} disabled={isSubmitting || !newReply.trim()}
              className="bg-brand text-black px-3 py-1.5 rounded-full text-xs font-bold disabled:opacity-50">
              {isSubmitting ? "..." : "Reply"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
