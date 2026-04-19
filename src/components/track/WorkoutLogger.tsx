"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Plus, X, Search } from "lucide-react";

export function WorkoutLogger() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [exercises, setExercises] = useState<{ id: number; name: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<{ id: number; name: string } | null>(null);

  // Form states
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState<"lbs" | "kg">("lbs");
  const [goal, setGoal] = useState<"bulk" | "cut" | "maintain">("maintain");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setExercises([]);
      return;
    }
    const searchExercises = async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://wger.de/api/v2/exercise/search/?term=${query}&language=2`);
        if (!res.ok) throw new Error("API response not OK");
        const data = await res.json();
        
        if (data && data.suggestions && Array.isArray(data.suggestions)) {
          setExercises(data.suggestions.map((e: any) => ({ id: e.data.id, name: e.value })));
        } else {
          throw new Error("Unexpected API format");
        }
      } catch (err) {
        console.warn("API unavailable. Utilizing robust local database fallback.");
        const fallbackList = [
          "Bench Press", "Squat", "Deadlift", "Overhead Press", "Barbell Row", 
          "Pull Up", "Push Up", "Dumbbell Curl", "Tricep Extension", "Leg Press", 
          "Lunges", "Lat Pulldown"
        ];
        const filtered = fallbackList
          .filter(name => name.toLowerCase().includes(query.toLowerCase()))
          .map((name, i) => ({ id: 9000 + i, name }));
        setExercises(filtered);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(() => searchExercises(), 500);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSave = async () => {
    if (!selectedExercise || !user) return;
    setIsSaving(true);
    
    try {
      await addDoc(collection(db, "workouts"), {
        userId: user.uid,
        exerciseId: selectedExercise.id,
        exerciseName: selectedExercise.name,
        sets: Number(sets),
        reps: Number(reps),
        weight: Number(weight),
        unit,
        goal,
        createdAt: serverTimestamp(),
        // Simple date string for easy filtering "YYYY-MM-DD"
        dateString: new Date().toISOString().split('T')[0]
      });

      setSelectedExercise(null);
      setSets("");
      setReps("");
      setWeight("");
      setQuery("");
    } catch (error) {
      console.error("Error saving workout:", error);
      alert("Failed to save workout. Check your permissions.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-surface rounded-xl p-6 border border-border shadow-sm">
      <h3 className="font-bold mb-4">Log New Exercise</h3>
      
      {!selectedExercise ? (
        <div className="relative">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Search Database</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Bench Press" 
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-brand"
            />
          </div>
          {isSearching && <p className="text-xs text-brand mt-2 absolute">Searching...</p>}
          
          {exercises.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
               {exercises.map((ex) => (
                 <button 
                   key={ex.id}
                   onClick={() => setSelectedExercise(ex)}
                   className="w-full text-left px-4 py-3 text-sm hover:bg-background border-b border-border/50 last:border-0 transition-colors"
                 >
                   {ex.name}
                 </button>
               ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between bg-background p-3 rounded-xl border border-brand/30">
            <span className="font-medium text-brand">{selectedExercise.name}</span>
            <button onClick={() => setSelectedExercise(null)} className="p-1 hover:bg-surface-hover rounded-full">
              <X className="w-4 h-4 text-zinc-400 hover:text-white" />
            </button>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setGoal("bulk")} 
              className={`flex-1 py-1 text-xs rounded-lg font-bold border transition-colors ${goal === "bulk" ? "bg-brand text-black border-brand" : "bg-background border-border text-zinc-500"}`}
            >
              Bulk
            </button>
            <button 
              onClick={() => setGoal("maintain")} 
              className={`flex-1 py-1 text-xs rounded-lg font-bold border transition-colors ${goal === "maintain" ? "bg-brand text-black border-brand" : "bg-background border-border text-zinc-500"}`}
            >
              Maintain
            </button>
            <button 
              onClick={() => setGoal("cut")} 
              className={`flex-1 py-1 text-xs rounded-lg font-bold border transition-colors ${goal === "cut" ? "bg-brand text-black border-brand" : "bg-background border-border text-zinc-500"}`}
            >
              Cut
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
             <div>
                <label className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase flex mb-1">Sets</label>
                <input type="number" value={sets} onChange={e => setSets(e.target.value)} placeholder="3" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand text-center" />
             </div>
             <div>
                <label className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase flex mb-1">Reps</label>
                <input type="number" value={reps} onChange={e => setReps(e.target.value)} placeholder="10" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand text-center" />
             </div>
             <div>
                <div className="flex items-center justify-between mb-1">
                   <label className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase flex">Weight</label>
                   <button onClick={() => setUnit(unit === "lbs" ? "kg" : "lbs")} className="text-[10px] font-bold text-brand uppercase hover:underline">
                     {unit}
                   </button>
                </div>
                <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="135" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand text-center" />
             </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={!sets || !reps || !weight || isSaving}
            className="w-full bg-brand text-black font-bold py-2.5 rounded-xl text-sm mt-2 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Save Set
          </button>
        </div>
      )}
    </div>
  );
}
