"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { WorkoutLogger } from "@/components/track/WorkoutLogger";
import { MuscleMatrix, getMusclesFromWorkouts } from "@/components/track/MuscleMatrix";
import { collection, query, where, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Calendar, Trophy, TrendingUp, Flame } from "lucide-react";

export default function TrackPage() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [allTimeWorkouts, setAllTimeWorkouts] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Today's workouts (live)
  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, "workouts"), 
      where("userId", "==", user.uid),
      where("dateString", "==", selectedDate),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setWorkouts(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
    });

    return () => unsubscribe();
  }, [user, selectedDate]);

  // All-time workouts (for PR detection)
  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      try {
        const q = query(
          collection(db, "workouts"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        setAllTimeWorkouts(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      } catch (err) {
        console.error("Error fetching all workouts:", err);
      }
    };
    fetchAll();
  }, [user, workouts.length]); // Refetch when today's workouts change

  if (!user) return null;

  const activeMuscles = getMusclesFromWorkouts(workouts);

  // PR Detection: find new PRs logged today
  const getPRs = () => {
    const prs: { exerciseName: string; weight: number; unit: string; isPR: boolean }[] = [];
    
    workouts.forEach(todayW => {
      // Find all-time max for this exercise (excluding today)
      const pastMax = allTimeWorkouts
        .filter(w => 
          w.exerciseName === todayW.exerciseName && 
          w.dateString !== selectedDate &&
          w.unit === todayW.unit
        )
        .reduce((max, w) => Math.max(max, w.weight || 0), 0);
      
      if (todayW.weight > pastMax && pastMax > 0) {
        // Check if already added
        if (!prs.find(p => p.exerciseName === todayW.exerciseName)) {
          prs.push({
            exerciseName: todayW.exerciseName,
            weight: todayW.weight,
            unit: todayW.unit || "lbs",
            isPR: true
          });
        }
      }
    });
    
    return prs;
  };

  const todayPRs = getPRs();
  const totalVolume = workouts.reduce((acc, w) => acc + (w.sets * w.reps * w.weight || 0), 0);

  return (
    <div className="flex flex-col gap-6 pt-6 pb-20">
      <div className="bg-surface rounded-3xl p-8 border border-border text-center">
        <h1 className="text-3xl font-bold mb-4">Track with Variant</h1>
        <p className="text-zinc-400 mb-6 max-w-md mx-auto">
          Log your daily workouts, track your weight, and see your progress over time—all for free.
        </p>

        {/* Date Picker */}
        <div className="flex justify-center mb-4">
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
      </div>

      {/* PR Milestone Cards */}
      {todayPRs.length > 0 && (
        <div className="flex flex-col gap-3">
          {todayPRs.map((pr, i) => (
            <div 
              key={i}
              className="relative bg-gradient-to-r from-brand/20 via-surface to-brand/20 rounded-2xl p-5 border-2 border-brand/60 flex items-center gap-4 overflow-hidden shadow-[0_0_30px_rgba(234,255,102,0.15)]"
              style={{
                animation: "shimmer 2s ease-in-out infinite alternate"
              }}
            >
              {/* Shimmer overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand/10 to-transparent animate-pulse" />
              
              <div className="relative z-10 w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0 border-2 border-brand">
                <Trophy className="w-6 h-6 text-brand" />
              </div>
              <div className="relative z-10 flex-1">
                <div className="flex items-center gap-2">
                  <span className="bg-brand text-black text-[10px] uppercase font-black px-2 py-0.5 rounded-full tracking-wider">New PR!</span>
                </div>
                <p className="font-bold text-lg mt-1">{pr.exerciseName}</p>
                <p className="text-sm text-zinc-400">New personal record: <span className="text-brand font-bold text-lg">{pr.weight} {pr.unit}</span></p>
              </div>
              <Flame className="w-8 h-8 text-brand animate-pulse relative z-10" />
            </div>
          ))}
        </div>
      )}
      
      {/* Main Grid: Logger + Heatmap + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Workout Logger */}
        <div className="lg:col-span-1">
          <WorkoutLogger selectedDate={selectedDate} />
        </div>

        {/* Muscle Matrix Heatmap */}
        <div className="lg:col-span-1">
          <MuscleMatrix activeMuscles={activeMuscles} />
        </div>

        {/* Logged Sets + Stats */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Today's Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface rounded-xl p-4 border border-border text-center">
              <TrendingUp className="w-5 h-5 text-brand mx-auto mb-1" />
              <p className="text-xl font-black text-brand">{workouts.length}</p>
              <p className="text-[10px] text-zinc-500 uppercase font-bold">Sets Today</p>
            </div>
            <div className="bg-surface rounded-xl p-4 border border-border text-center">
              <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />
              <p className="text-xl font-black text-white">{totalVolume.toLocaleString()}</p>
              <p className="text-[10px] text-zinc-500 uppercase font-bold">Total Volume</p>
            </div>
          </div>

          {/* Logged Sets List */}
          <div className="bg-surface rounded-xl p-6 border border-border shadow-sm flex flex-col flex-1">
            <h3 className="font-bold mb-3">Logged Sets</h3>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-2 flex-grow">
               {workouts.length === 0 ? (
                  <p className="text-sm text-zinc-500 italic mt-2">No sets logged on this date.</p>
               ) : (
                  workouts.map(w => {
                    // Check if this specific set is a PR
                    const isPRSet = todayPRs.some(pr => pr.exerciseName === w.exerciseName && pr.weight === w.weight);
                    
                    return (
                      <div key={w.id} className={`flex items-center justify-between text-sm p-3 rounded-lg border ${
                        isPRSet 
                          ? "bg-brand/10 border-brand/30" 
                          : "bg-background border-border/50"
                      }`}>
                        <div className="flex items-center gap-2">
                          {isPRSet && <Trophy className="w-3 h-3 text-brand" />}
                          <span className="font-medium text-brand">{w.exerciseName}</span>
                        </div>
                        <span className="text-zinc-300">{w.sets} x {w.reps} @ {w.weight} {w.unit || "lbs"}</span>
                      </div>
                    );
                  })
               )}
            </div>
          </div>

          {/* Body Weight Card */}
          <div className="bg-brand/10 rounded-xl p-5 border border-brand/20 shadow-sm flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-bold text-brand mb-1 text-sm">Body Weight</h3>
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
  );
}
