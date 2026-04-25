"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { HelpCircle, Send } from "lucide-react";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { ReplySection } from "@/components/help/ReplySection";
import { UserAvatar } from "@/components/ui/UserAvatar";

export default function HelpPage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "questions"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handlePostQuestion = async () => {
    if (!newQuestion.trim() || !user) return;
    setIsPosting(true);
    try {
      await addDoc(collection(db, "questions"), {
        userId: user.uid,
        username: user.displayName || "Variant",
        content: newQuestion,
        createdAt: serverTimestamp(),
      });
      setNewQuestion("");
    } catch (err) {
      console.error(err);
      alert("Failed to ask question.");
    } finally {
      setIsPosting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6 pt-6 max-w-2xl mx-auto w-full px-4">
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-border flex flex-col items-center justify-center shadow-md">
        <HelpCircle className="w-12 h-12 text-brand mb-4 flex-shrink-0" />
        <h1 className="text-2xl font-bold mb-2">Help me Variant</h1>
        <p className="text-zinc-400 mb-6 text-center text-sm">
          Post questions, check your form, or get advice from the community.
        </p>

        <div className="w-full flex gap-2">
           <textarea 
             value={newQuestion}
             onChange={(e) => setNewQuestion(e.target.value)}
             placeholder="How do I improve my squat depth?"
             className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand resize-none h-12 min-h-[48px]"
           />
           <Button onClick={handlePostQuestion} disabled={isPosting || !newQuestion.trim()} className="bg-brand text-black hover:brightness-110 h-12 px-6 rounded-xl font-bold">
              <Send className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{isPosting ? "..." : "Ask"}</span>
           </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
         <h3 className="font-bold text-zinc-300 ml-2">Recent Questions</h3>
         {questions.length === 0 ? (
            <p className="text-center text-zinc-500 py-10">No questions yet. Be the first!</p>
         ) : (
            questions.map(q => (
              <div key={q.id} className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
                 <div className="flex items-center gap-3 mb-3">
                    <UserAvatar userId={q.userId} username={q.username} size="sm" showName={false} />
                    <div>
                      <UserAvatar userId={q.userId} username={q.username} size="sm" showName={true} className="[&>div]:hidden" />
                      <p className="text-[10px] text-zinc-500">
                        {q.createdAt?.toDate?.()?.toLocaleDateString() || "Just now"}
                      </p>
                    </div>
                 </div>
                 <p className="text-sm text-zinc-200">{q.content}</p>
                 <ReplySection questionId={q.id} questionUserId={q.userId} />
              </div>
            ))
         )}
      </div>
    </div>
  );
}
