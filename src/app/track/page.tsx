"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { MuscleMatrix, getMusclesFromWorkouts } from "@/components/track/MuscleMatrix";
import { collection, query, where, orderBy, onSnapshot, getDocs, doc, getDoc, updateDoc, setDoc, addDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Calendar, Trophy, Flame, Scale, Edit3, Check, X, Plus, Trash2, ChevronDown, Dumbbell, TrendingUp, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

// Workout splits
const SPLIT_TEMPLATES: Record<string, string[][]> = {
  "3": [["Chest", "Triceps"], ["Back", "Biceps"], ["Legs", "Shoulders"]],
  "4": [["Chest", "Triceps"], ["Back", "Biceps"], ["Legs"], ["Shoulders", "Arms"]],
  "5": [["Chest"], ["Back"], ["Shoulders"], ["Legs"], ["Arms", "Core"]],
  "6": [["Chest"], ["Back"], ["Shoulders"], ["Legs"], ["Arms"], ["Core", "Cardio"]],
};

const MUSCLE_EXERCISES: Record<string, string[]> = {
  "Chest": ["Bench Press", "Incline Dumbbell Press", "Cable Fly", "Dips", "Push Ups"],
  "Back": ["Deadlift", "Barbell Row", "Lat Pulldown", "Seated Row", "Pull Up"],
  "Shoulders": ["Overhead Press", "Lateral Raise", "Front Raise", "Face Pull", "Rear Delt Fly"],
  "Legs": ["Squat", "Leg Press", "Lunges", "Leg Curl", "Calf Raise"],
  "Biceps": ["Barbell Curl", "Dumbbell Curl", "Hammer Curl", "Preacher Curl"],
  "Triceps": ["Tricep Pushdown", "Skull Crusher", "Overhead Extension", "Close Grip Bench"],
  "Arms": ["Barbell Curl", "Tricep Pushdown", "Hammer Curl", "Skull Crusher"],
  "Core": ["Crunch", "Plank", "Russian Twist", "Leg Raise", "Cable Crunch"],
  "Cardio": ["Treadmill", "Jump Rope", "Stairmaster", "Cycling"],
};

const CALORIE_PER_REP: Record<string, number> = {
  "bench press": 0.4, "squat": 0.6, "deadlift": 0.7, "overhead press": 0.35,
  "barbell row": 0.4, "pull up": 0.5, "push up": 0.3, "dumbbell curl": 0.2,
  "tricep pushdown": 0.2, "leg press": 0.5, "lunges": 0.5, "lat pulldown": 0.35,
  "leg curl": 0.3, "calf raise": 0.2, "crunch": 0.15, "plank": 0.1,
};

function estimateCalories(name: string, sets: number, reps: number, weight: number): number {
  const lower = name.toLowerCase();
  let perRep = 0.3;
  for (const [key, val] of Object.entries(CALORIE_PER_REP)) {
    if (lower.includes(key)) { perRep = val; break; }
  }
  return Math.round(perRep * reps * sets * (1 + weight / 200));
}

interface WorkoutItem {
  id?: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  unit: string;
  completed: boolean;
}

export default function TrackPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [allTimeWorkouts, setAllTimeWorkouts] = useState<any[]>([]);
  
  // Split planner
  const [showSetup, setShowSetup] = useState(false);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [split, setSplit] = useState<string[][]>([]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [dayExercises, setDayExercises] = useState<WorkoutItem[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [addingExercise, setAddingExercise] = useState(false);
  const [newExName, setNewExName] = useState("");
  
  // Body weight
  const [bodyWeight, setBodyWeight] = useState(0);
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");
  const [editingWeight, setEditingWeight] = useState(false);
  const [tempWeight, setTempWeight] = useState("");

  // Load user plan from Firestore
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setBodyWeight(data.bodyWeight || 0);
          setWeightUnit(data.weightUnit || "lbs");
          if (data.workoutSplit) {
            setSplit(data.workoutSplit);
            setDaysPerWeek(data.workoutSplit.length);
          } else {
            setShowSetup(true);
          }
        } else {
          setShowSetup(true);
        }
      } catch { setShowSetup(true); }
    };
    load();
  }, [user]);

  // Load today's logged workouts
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "workouts"), where("userId", "==", user.uid), where("dateString", "==", selectedDate), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setWorkouts(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [user, selectedDate]);

  // Load all workouts for PR detection
  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      try {
        const q = query(collection(db, "workouts"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setAllTimeWorkouts(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      } catch {}
    };
    fetchAll();
  }, [user, workouts.length]);

  // Load exercises for selected day
  useEffect(() => {
    if (!user || split.length === 0) return;
    const loadDayExercises = async () => {
      try {
        const dayDocRef = doc(db, "users", user.uid, "workout_plan", `day_${selectedDay}`);
        const snap = await getDoc(dayDocRef);
        if (snap.exists()) {
          setDayExercises(snap.data().exercises || []);
        } else {
          // Auto-generate from split
          const muscles = split[selectedDay] || [];
          const exercises: WorkoutItem[] = [];
          muscles.forEach(m => {
            const exList = MUSCLE_EXERCISES[m] || [];
            exList.slice(0, 3).forEach(name => {
              exercises.push({ name, sets: 3, reps: 10, weight: 0, unit: "lbs", completed: false });
            });
          });
          setDayExercises(exercises);
          // Save auto-generated
          await setDoc(dayDocRef, { exercises }, { merge: true });
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadDayExercises();
  }, [user, selectedDay, split]);

  const generateSplit = async () => {
    if (!user) return;
    const newSplit = SPLIT_TEMPLATES[daysPerWeek.toString()] || SPLIT_TEMPLATES["4"];
    setSplit(newSplit);
    setShowSetup(false);
    setSelectedDay(0);
    try {
      await updateDoc(doc(db, "users", user.uid), { workoutSplit: newSplit });
    } catch {}
  };

  const saveDayExercises = async (exercises: WorkoutItem[]) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid, "workout_plan", `day_${selectedDay}`), { exercises }, { merge: true });
    } catch {}
  };

  const toggleExerciseComplete = async (idx: number) => {
    const updated = [...dayExercises];
    updated[idx].completed = !updated[idx].completed;
    setDayExercises(updated);
    
    // If completing, log to workouts collection
    const ex = updated[idx];
    if (ex.completed && user) {
      try {
        await addDoc(collection(db, "workouts"), {
          userId: user.uid, exerciseName: ex.name, sets: ex.sets, reps: ex.reps,
          weight: ex.weight, unit: ex.unit, goal: "maintain",
          dateString: selectedDate, createdAt: serverTimestamp(),
        });
      } catch {}
    }
    await saveDayExercises(updated);
  };

  const updateExercise = async (idx: number, field: string, value: any) => {
    const updated = [...dayExercises];
    (updated[idx] as any)[field] = value;
    setDayExercises(updated);
  };

  const removeExercise = async (idx: number) => {
    const updated = dayExercises.filter((_, i) => i !== idx);
    setDayExercises(updated);
    await saveDayExercises(updated);
  };

  const addExercise = async () => {
    if (!newExName.trim()) return;
    const updated = [...dayExercises, { name: newExName, sets: 3, reps: 10, weight: 0, unit: weightUnit, completed: false }];
    setDayExercises(updated);
    setNewExName("");
    setAddingExercise(false);
    await saveDayExercises(updated);
  };

  const saveEditedExercise = async () => {
    setEditingIdx(null);
    await saveDayExercises(dayExercises);
  };

  const saveBodyWeight = async () => {
    if (!user || !tempWeight) return;
    const val = parseFloat(tempWeight);
    if (isNaN(val)) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { bodyWeight: val, weightUnit });
      setBodyWeight(val);
      setEditingWeight(false);
    } catch { alert("Failed to save weight."); }
  };

  const toggleWeightUnit = () => {
    if (weightUnit === "lbs") { setWeightUnit("kg"); if (bodyWeight > 0) setBodyWeight(Math.round(bodyWeight * 0.4536)); }
    else { setWeightUnit("lbs"); if (bodyWeight > 0) setBodyWeight(Math.round(bodyWeight * 2.2046)); }
  };

  if (!user) return null;

  const activeMuscles = getMusclesFromWorkouts(workouts);
  const totalCalories = workouts.reduce((acc, w) => acc + estimateCalories(w.exerciseName || "", w.sets || 0, w.reps || 0, w.weight || 0), 0);
  const completedCount = dayExercises.filter(e => e.completed).length;

  // PR Detection
  const todayPRs = (() => {
    const prs: { exerciseName: string; weight: number; unit: string }[] = [];
    workouts.forEach(w => {
      const pastMax = allTimeWorkouts.filter(a => a.exerciseName === w.exerciseName && a.dateString !== selectedDate && a.unit === w.unit).reduce((max, a) => Math.max(max, a.weight || 0), 0);
      if (w.weight > pastMax && pastMax > 0 && !prs.find(p => p.exerciseName === w.exerciseName)) {
        prs.push({ exerciseName: w.exerciseName, weight: w.weight, unit: w.unit || "lbs" });
      }
    });
    return prs;
  })();

  // Setup screen
  if (showSetup) {
    return (
      <div className="flex flex-col gap-6 pt-6 pb-20 px-2 max-w-xl mx-auto">
        <div className="bg-surface rounded-3xl p-8 border border-border text-center">
          <Dumbbell className="w-16 h-16 text-brand mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Plan Your Split</h1>
          <p className="text-zinc-400 text-sm mb-8">How many days per week do you train?</p>
          
          <div className="flex justify-center gap-3 mb-8">
            {[3, 4, 5, 6].map(n => (
              <button key={n} onClick={() => setDaysPerWeek(n)}
                className={`w-14 h-14 rounded-2xl border-2 font-black text-lg transition-all ${daysPerWeek === n ? "bg-brand text-black border-brand" : "bg-background border-border text-zinc-400 hover:border-brand/50"}`}
              >{n}</button>
            ))}
          </div>

          <div className="text-left mb-6 bg-background rounded-2xl p-4 border border-border">
            <p className="text-xs font-bold text-zinc-500 uppercase mb-3">Your Split Preview</p>
            {(SPLIT_TEMPLATES[daysPerWeek.toString()] || []).map((muscles, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                <span className="w-8 h-8 rounded-lg bg-brand/20 text-brand font-bold text-sm flex items-center justify-center">{i + 1}</span>
                <span className="text-sm">{muscles.join(" + ")}</span>
              </div>
            ))}
          </div>

          <Button onClick={generateSplit} className="w-full bg-brand text-black font-bold rounded-xl h-12">
            Start Training →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 pt-4 sm:pt-6 pb-20 px-2 sm:px-0">
      {/* Header */}
      <div className="bg-surface rounded-3xl p-5 sm:p-8 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl sm:text-2xl font-bold">Track with Variant</h1>
          <button onClick={() => setShowSetup(true)} className="text-xs text-zinc-400 hover:text-brand flex items-center gap-1">
            <Settings className="w-3 h-3" /> Change Split
          </button>
        </div>

        {/* Date picker */}
        <div className="flex justify-center mb-4">
          <div className="relative inline-flex items-center">
            <Calendar className="w-5 h-5 text-brand absolute left-4 pointer-events-none" />
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="bg-background border border-border rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-brand font-bold text-center appearance-none cursor-pointer"
              style={{ colorScheme: 'dark' }} />
          </div>
        </div>

        {/* Day tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {split.map((muscles, i) => (
            <button key={i} onClick={() => setSelectedDay(i)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${selectedDay === i ? "bg-brand text-black" : "bg-background border border-border text-zinc-400 hover:border-brand/50"}`}
            >
              Day {i + 1}: {muscles.join(" + ")}
            </button>
          ))}
        </div>
      </div>

      {/* PR Cards */}
      {todayPRs.map((pr, i) => (
        <div key={i} className="relative bg-gradient-to-r from-brand/20 via-surface to-brand/20 rounded-2xl p-4 border-2 border-brand/60 flex items-center gap-3 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand/10 to-transparent animate-pulse" />
          <Trophy className="w-8 h-8 text-brand relative z-10 flex-shrink-0" />
          <div className="relative z-10">
            <span className="bg-brand text-black text-[10px] uppercase font-black px-2 py-0.5 rounded-full">New PR!</span>
            <p className="font-bold mt-1">{pr.exerciseName} — <span className="text-brand">{pr.weight} {pr.unit}</span></p>
          </div>
        </div>
      ))}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface rounded-xl p-3 border border-border text-center">
          <p className="text-lg font-black text-brand">{completedCount}/{dayExercises.length}</p>
          <p className="text-[10px] text-zinc-500 uppercase font-bold">Done</p>
        </div>
        <div className="bg-surface rounded-xl p-3 border border-border text-center">
          <p className="text-lg font-black text-orange-400">{totalCalories}</p>
          <p className="text-[10px] text-zinc-500 uppercase font-bold">Cal Burned</p>
        </div>
        <div className="bg-surface rounded-xl p-3 border border-border text-center">
          <p className="text-lg font-black text-white">{workouts.length}</p>
          <p className="text-[10px] text-zinc-500 uppercase font-bold">Sets Logged</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workout Plan (main column) */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">Day {selectedDay + 1}: {split[selectedDay]?.join(" + ")}</h2>
            <button onClick={() => setAddingExercise(true)} className="flex items-center gap-1 text-brand text-xs font-bold hover:underline">
              <Plus className="w-3 h-3" /> Add Exercise
            </button>
          </div>

          {/* Add exercise input */}
          {addingExercise && (
            <div className="flex gap-2 items-center bg-surface p-3 rounded-xl border border-brand/30">
              <input type="text" value={newExName} onChange={e => setNewExName(e.target.value)} placeholder="Exercise name..."
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand" autoFocus
                onKeyDown={e => e.key === "Enter" && addExercise()} />
              <Button onClick={addExercise} size="sm" className="bg-brand text-black">Add</Button>
              <button onClick={() => setAddingExercise(false)} className="p-1"><X className="w-4 h-4 text-zinc-400" /></button>
            </div>
          )}

          {/* Exercise cards */}
          {dayExercises.map((ex, idx) => (
            <div key={idx} className={`bg-surface rounded-2xl border overflow-hidden transition-all ${ex.completed ? "border-brand/40 bg-brand/5" : "border-border"}`}>
              <div className="flex items-center gap-3 p-4">
                {/* Checkbox */}
                <button onClick={() => toggleExerciseComplete(idx)}
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${ex.completed ? "bg-brand border-brand" : "border-zinc-600 hover:border-brand"}`}
                >
                  {ex.completed && <Check className="w-4 h-4 text-black" />}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${ex.completed ? "line-through text-zinc-500" : ""}`}>{ex.name}</p>
                  {editingIdx !== idx && (
                    <p className="text-xs text-zinc-400">{ex.sets} sets × {ex.reps} reps {ex.weight > 0 ? `@ ${ex.weight} ${ex.unit}` : ""}</p>
                  )}
                </div>

                <div className="flex gap-1 flex-shrink-0">
                  {editingIdx === idx ? (
                    <button onClick={saveEditedExercise} className="p-1.5 rounded-lg bg-brand text-black"><Check className="w-3 h-3" /></button>
                  ) : (
                    <button onClick={() => setEditingIdx(idx)} className="p-1.5 rounded-lg hover:bg-surface-hover"><Edit3 className="w-3 h-3 text-zinc-400" /></button>
                  )}
                  <button onClick={() => removeExercise(idx)} className="p-1.5 rounded-lg hover:bg-red-500/10"><Trash2 className="w-3 h-3 text-zinc-500 hover:text-red-400" /></button>
                </div>
              </div>

              {/* Editable row */}
              {editingIdx === idx && (
                <div className="px-4 pb-4 grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Sets</label>
                    <input type="number" value={ex.sets} onChange={e => updateExercise(idx, "sets", Number(e.target.value))}
                      className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-brand" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Reps</label>
                    <input type="number" value={ex.reps} onChange={e => updateExercise(idx, "reps", Number(e.target.value))}
                      className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-brand" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Weight</label>
                    <input type="number" value={ex.weight} onChange={e => updateExercise(idx, "weight", Number(e.target.value))}
                      className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-brand" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Unit</label>
                    <button onClick={() => updateExercise(idx, "unit", ex.unit === "lbs" ? "kg" : "lbs")}
                      className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-center font-bold text-brand">{ex.unit}</button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {dayExercises.length === 0 && (
            <div className="bg-surface rounded-2xl border border-border border-dashed p-8 text-center text-zinc-500 text-sm">
              No exercises for this day yet. <button onClick={() => setAddingExercise(true)} className="text-brand font-bold">Add one</button>
            </div>
          )}
        </div>

        {/* Right column: Heatmap + Weight */}
        <div className="flex flex-col gap-6">
          <MuscleMatrix activeMuscles={activeMuscles} />

          {/* Body Weight */}
          <div className="bg-brand/10 rounded-xl p-5 border border-brand/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-brand" />
                <h3 className="font-bold text-brand text-sm">Body Weight</h3>
              </div>
              <button onClick={toggleWeightUnit} className="text-[10px] font-bold text-brand uppercase bg-brand/20 px-2 py-1 rounded">{weightUnit}</button>
            </div>
            {editingWeight ? (
              <div className="flex items-center gap-2">
                <input type="number" value={tempWeight} onChange={e => setTempWeight(e.target.value)} autoFocus
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand text-center font-bold" />
                <span className="text-sm text-zinc-400 font-bold">{weightUnit}</span>
                <button onClick={saveBodyWeight} className="p-2 rounded-full bg-brand text-black"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditingWeight(false)} className="p-2 rounded-full bg-surface border border-border"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-black text-white">{bodyWeight || "—"}</span>
                  <span className="text-sm text-zinc-400 mb-1">{weightUnit}</span>
                </div>
                <button onClick={() => { setTempWeight(bodyWeight.toString()); setEditingWeight(true); }}
                  className="bg-surface text-white font-medium py-2 px-4 rounded-full text-xs hover:bg-surface-hover border border-border transition-all flex items-center gap-1">
                  <Edit3 className="w-3 h-3" /> Update
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
