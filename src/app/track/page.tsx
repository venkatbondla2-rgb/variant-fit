"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { WorkoutLogger } from "@/components/track/WorkoutLogger";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Calendar } from "lucide-react";

export default function TrackPage() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<any[]>([]);
  // Store currently selected date
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    if (!user) return;
    
    // Fetch workouts for the selected date
    const q = query(
      collection(db, "workouts"), 
      where("userId", "==", user.uid),
      where("dateString", "==", selectedDate),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setWorkouts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [user, selectedDate]);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="bg-surface rounded-3xl p-8 border border-border text-center">
        <h1 className="text-3xl font-bold mb-4">Track with Variant</h1>
        <p className="text-zinc-400 mb-6 max-w-md mx-auto">
          Log your daily workouts, track your weight, and see your progress over time—all for free.
        </p>

        {/* Date Picker */}
        <div className="flex justify-center mb-8">
          <div className="relative inline-flex items-center">
            <Calendar className="w-5 h-5 text-brand absolute left-4 pointer-events-none" />
            <input 
               type="date"
               value={selectedDate}
               onChange={(e) => setSelectedDate(e.target.value)}
               className="bg-background border border-border rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-brand font-bold text-center appearance-none cursor-pointer"
               style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>
        
        {/* Workout Logger & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left max-w-4xl mx-auto w-full">
          
          <WorkoutLogger selectedDate={selectedDate} />

          <div className="flex flex-col gap-6">
            <div className="bg-surface rounded-xl p-6 border border-border shadow-sm flex flex-col h-full">
              <h3 className="font-bold mb-2">Logged Sets</h3>
              <div className="flex flex-col gap-2 mt-4 max-h-64 overflow-y-auto pr-2 flex-grow">
                 {workouts.length === 0 ? (
                    <p className="text-sm text-zinc-500 italic mt-2">No sets logged on this date.</p>
                 ) : (
                    workouts.map(w => (
                      <div key={w.id} className="flex items-center justify-between text-sm p-3 bg-background rounded-lg border border-border/50">
                        <span className="font-medium text-brand">{w.exerciseName}</span>
                        <span className="text-zinc-300">{w.sets} x {w.reps} @ {w.weight} lbs</span>
                      </div>
                    ))
                 )}
              </div>
            </div>
            
            <div className="bg-brand/10 rounded-xl p-6 border border-brand/20 shadow-sm flex items-center justify-between mt-auto shrink-0">
              <div>
                <h3 className="font-bold text-brand mb-1">Body Weight</h3>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-black text-white">180</span>
                  <span className="text-sm text-zinc-400 mb-1">lbs</span>
                </div>
              </div>
              <button className="bg-surface text-white font-medium py-2 px-4 rounded-full text-xs hover:bg-surface-hover border border-border transition-all">
                Update
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
