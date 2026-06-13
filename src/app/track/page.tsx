"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { MuscleMatrix, getMusclesFromWorkouts } from "@/components/track/MuscleMatrix";
import { VolumeTracker } from "@/components/track/VolumeTracker";
import { collection, query, where, orderBy, onSnapshot, getDocs, doc, getDoc, updateDoc, setDoc, addDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { OnboardingForm } from "@/components/track/OnboardingForm";
import { db } from "@/lib/firebase";
import { Calendar, Trophy, Flame, Scale, Edit3, Check, X, Plus, Trash2, ChevronDown, Dumbbell, TrendingUp, Settings, Footprints, Home, ChevronLeft, ChevronRight, RefreshCw, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AITrainerBanner } from "@/components/track/AITrainerBanner";
import { EXERCISE_DB, SPLIT_TEMPLATES, estimateCalories, getVariationForDate, generateWorkoutForRegions, getMuscleRegionAlternatives, MUSCLE_REGION_EXERCISES, REGION_DISPLAY_NAMES, type WorkoutType, type ExerciseDef } from "@/lib/exerciseDB";
import { generateSplitOptions } from "@/lib/aiPlanner";
import { recordWorkoutStreak } from "@/lib/streaks";
import { recordExerciseFeedback, addWeightHistory } from "@/lib/progression";
import { RestTimer } from "@/components/track/RestTimer";
import { MuscleRecoveryIndicator } from "@/components/track/MuscleRecovery";
import { ShareCard } from "@/components/share/ShareCard";
import { AIInsights } from "@/components/track/AIInsights";
import { Share2, Sparkles, Loader2 as Loader2Icon } from "lucide-react";

interface ExerciseSet {
  setNumber: number;
  reps: number;
  weight: number;
}

interface WorkoutItem {
  id?: string;
  name: string;
  sets: ExerciseSet[];
  unit: string;
  completed: boolean;
  primaryRegions?: string[];
  secondaryRegions?: string[];
}

export default function TrackPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [allTimeWorkouts, setAllTimeWorkouts] = useState<any[]>([]);
  
  // Split planner & personalization
  const [loadingUser, setLoadingUser] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [setupStep, setSetupStep] = useState<1 | 2>(1);
  const [workoutType, setWorkoutType] = useState<WorkoutType>("gym");
  const [workoutDays, setWorkoutDays] = useState(4);
  const [fitnessGoal, setFitnessGoal] = useState<string>('Muscle Gain');
  const [gymExperience, setGymExperience] = useState<string>('Intermediate');
  const [muscleGroupsPerDay, setMuscleGroupsPerDay] = useState<string>('1 Muscle');
  const [goalWeight, setGoalWeight] = useState<number | null>(null);

  const [musclePriorities, setMusclePriorities] = useState<string[]>([]);
  const [height, setHeight] = useState<number>(0);
  const [bodyWeight, setBodyWeight] = useState(0);
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");
  const [split, setSplit] = useState<string[][]>([]);
  // weekSplit includes workout days followed by rest placeholders for a full 7‑day week
  const [weekSplit, setWeekSplit] = useState<string[][]>([]);
  const getSelectedDayFromDate = (dateStr: string) => {
    if (!dateStr) return 0;
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return (date.getDay() + 6) % 7; // shift Sunday=6
  };
  const selectedDay = getSelectedDayFromDate(selectedDate);
  const [dayExercises, setDayExercises] = useState<WorkoutItem[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [swapIdx, setSwapIdx] = useState<number | null>(null);
  const [addingExercise, setAddingExercise] = useState(false);
  const [newExName, setNewExName] = useState("");
  
  // Body weight
  const [editingWeight, setEditingWeight] = useState(false);
  const [tempWeight, setTempWeight] = useState("");

  // Step counter / activity
  const [steps, setSteps] = useState(0);
  const [editingSteps, setEditingSteps] = useState(false);
  const [tempSteps, setTempSteps] = useState("");
  const [showShareCard, setShowShareCard] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGoal, setAiGoal] = useState("muscle gain");

  // Live session state
  const [activeSession, setActiveSession] = useState<any>(null);
  const [partnerWorkouts, setPartnerWorkouts] = useState<any[]>([]);
  const [sessionTimer, setSessionTimer] = useState("00:00");
  const lastWrittenExercisesRef = useRef<string>("");

  const router = useRouter();
  const [activePlan, setActivePlan] = useState<"free" | "pro" | "elite">("free");
  const [alternativeSwapsUsed, setAlternativeSwapsUsed] = useState(0);

  const getAlternativeLimit = () => {
    if (activePlan === "elite") return Infinity;
    if (activePlan === "pro") return 30;
    return 5; // free limit
  };

  // Persist selected date in localStorage to prevent reset on page reload
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedDate = localStorage.getItem("variantfit_selected_date");
      if (savedDate) {
        setSelectedDate(savedDate);
      }
    }
  }, []);

  const changeSelectedDate = (newDate: string) => {
    setSelectedDate(newDate);
    if (typeof window !== "undefined") {
      localStorage.setItem("variantfit_selected_date", newDate);
    }
  };

  // Load user plan from Firestore
  useEffect(() => {
    if (!user) return;
    const loadUser = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setBodyWeight(data.bodyWeight || 0);
          setWeightUnit(data.weightUnit || "lbs");
          setWorkoutType(data.workoutType || "gym");
          setFitnessGoal(data.fitnessGoal || "Muscle Gain");
          setGymExperience(data.gymExperience || "Intermediate");
          setWorkoutDays(data.workoutDays || 4);
          setMuscleGroupsPerDay(data.muscleGroupsPerDay || '1 Muscle');
          setGoalWeight(data.goalWeight || null);
          setMusclePriorities(data.musclePriorities || []);
          setHeight(data.height || 0);

          // Load subscription & alternative count
          let plan = "free";
          if (data.subscription && data.subscription.expiresAt) {
            const expires = data.subscription.expiresAt.toDate ? data.subscription.expiresAt.toDate() : new Date(data.subscription.expiresAt);
            if (expires > new Date()) {
              plan = data.subscription.plan || "free";
            }
          }
          setActivePlan(plan as any);

          const currentMonth = new Date().toISOString().slice(0, 7);
          if (data.exerciseAlternativeCount && data.exerciseAlternativeCount.month === currentMonth) {
            setAlternativeSwapsUsed(data.exerciseAlternativeCount.count || 0);
          } else {
            setAlternativeSwapsUsed(0);
          }
          
          let parsedSplit = null;
          if (data.workoutSplit) {
            try {
              parsedSplit = typeof data.workoutSplit === 'string' ? JSON.parse(data.workoutSplit) : data.workoutSplit;
            } catch (e) {
              console.error("Failed to parse workout split", e);
            }
          }

          if (parsedSplit && parsedSplit.length > 0) {
            setSplit(parsedSplit);
            setWorkoutDays(parsedSplit.length);
            // Build a full 7‑day week split, filling missing days with Rest placeholders and normalizing
            const fullWeek = parsedSplit.map((day: any) => {
              if (!day || day.length === 0 || (day.length === 1 && day[0] === "Rest")) {
                return ["Rest"];
              }
              return day;
            });
            while (fullWeek.length < 7) {
              fullWeek.push(["Rest"]);
            }
            setWeekSplit(fullWeek);
            setShowSetup(false);
          } else {
            setShowSetup(true);
          }
        } else {
          setShowSetup(true);
        }
      } catch (err) {
        console.error("Error loading user plan:", err);
      } finally {
        setLoadingUser(false);
      }
    };
    loadUser();
  }, [user]);

  // Load steps for selected date
  useEffect(() => {
    if (!user) return;
    const loadSteps = async () => {
      try {
        const actRef = doc(db, "activity_logs", `${user.uid}_${selectedDate}`);
        const actSnap = await getDoc(actRef);
        if (actSnap.exists()) {
          setSteps(actSnap.data().steps || 0);
        } else {
          setSteps(0);
        }
      } catch { setSteps(0); }
    };
    loadSteps();
  }, [user, selectedDate]);

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

  // Listen for active live session
  useEffect(() => {
    if (!user) return;
    const qHost = query(collection(db, "training_sessions"), where("hostId", "==", user.uid));
    const qGuest = query(collection(db, "training_sessions"), where("guestId", "==", user.uid));

    const handleSnap = (snapshot: any) => {
      const sessions = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      const active = sessions.find((s: any) => s.status === "active");
      setActiveSession(active || null);
    };

    const unsub1 = onSnapshot(qHost, handleSnap);
    const unsub2 = onSnapshot(qGuest, handleSnap);
    return () => { unsub1(); unsub2(); };
  }, [user]);

  // Listen for partner workouts if in active session
  useEffect(() => {
    if (!activeSession || !user) return;
    const partnerId = activeSession.hostId === user.uid ? activeSession.guestId : activeSession.hostId;
    
    // We listen to partner's workouts for TODAY.
    const q = query(
      collection(db, "workouts"), 
      where("userId", "==", partnerId), 
      where("dateString", "==", selectedDate)
    );
    const unsub = onSnapshot(q, snap => {
      setPartnerWorkouts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Also handle timer
    const interval = setInterval(() => {
      if (activeSession.createdAt) {
        const start = activeSession.createdAt.toDate().getTime();
        const diff = Math.floor((Date.now() - start) / 1000);
        const m = Math.floor(diff / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        setSessionTimer(`${m}:${s}`);
      }
    }, 1000);

    return () => { unsub(); clearInterval(interval); };
  }, [activeSession, user, selectedDate]);

  // Sync Live Session dayExercises
  useEffect(() => {
    if (!activeSession || !user || !activeSession.id) return;
    
    // Host initializes exercises in the session document if not set yet
    if (activeSession.hostId === user.uid && (!activeSession.exercises || activeSession.exercises.length === 0) && dayExercises.length > 0) {
      updateDoc(doc(db, "training_sessions", activeSession.id), { exercises: dayExercises }).catch(() => {});
      return;
    }

    // Pull exercises from active session if they differ from local state
    const sessionExercises = activeSession.exercises || [];
    if (sessionExercises.length > 0) {
      const sessionStr = JSON.stringify(sessionExercises);
      const localStr = JSON.stringify(dayExercises);
      if (localStr !== sessionStr) {
        // If the difference is because we just wrote this change locally, do NOT overwrite it
        if (lastWrittenExercisesRef.current === localStr) {
          return;
        }
        setDayExercises(sessionExercises);
      }
    }
  }, [activeSession?.exercises, user, dayExercises]);

  // Load exercises for selected day using rotating variations and date-specific scheduling
  useEffect(() => {
    if (!user || split.length === 0) return;
    let active = true;
    const loadDayExercises = async () => {
      try {
        if (activeSession && activeSession.guestId === user.uid && activeSession.exercises) {
          if (active) setDayExercises(activeSession.exercises);
          return;
        }
        
        const dateDocRef = doc(db, "users", user.uid, "dated_workouts", selectedDate);
        const snap = await getDoc(dateDocRef);
        
        if (!active) return;

        if (snap.exists()) {
          const rawExercises = snap.data().exercises || [];
          const migrated: WorkoutItem[] = rawExercises.map((ex: any) => {
            if (typeof ex.sets === 'number') {
              const setArray: ExerciseSet[] = [];
              const baseWeight = ex.weight || 0;
              for (let s = 1; s <= ex.sets; s++) {
                let setWeight = baseWeight;
                if (baseWeight > 0) {
                  const factor = 0.85 + ((s - 1) / Math.max(1, ex.sets - 1)) * 0.25;
                  setWeight = Math.round((baseWeight * factor) / 2.5) * 2.5;
                  if (setWeight < 2.5) setWeight = 2.5;
                }
                setArray.push({
                  setNumber: s,
                  reps: ex.reps || 10,
                  weight: setWeight
                });
              }
              return {
                name: ex.name,
                sets: setArray,
                unit: ex.unit || "kg",
                completed: ex.completed || false
              };
            }
            return ex;
          });
          if (active) setDayExercises(migrated);
        } else {
          // Check if there is a saved workout plan template for this specific day of the split
          const planDocRef = doc(db, "users", user.uid, "workout_plan", `day_${selectedDay}`);
          const planSnap = await getDoc(planDocRef);
          
          if (!active) return;
          
          if (planSnap.exists() && planSnap.data().exercises && planSnap.data().exercises.length > 0) {
            const planExercises = planSnap.data().exercises;
            if (active) {
              setDayExercises(planExercises);
              await setDoc(dateDocRef, { exercises: planExercises }, { merge: true });
            }
          } else {
            const isRest = weekSplit[selectedDay] && weekSplit[selectedDay][0] === "Rest";
            if (isRest) {
              // Simple placeholder for a rest day (light cardio)
              const restExercise: WorkoutItem = {
                name: "Running",
                sets: [{ setNumber: 1, reps: 10, weight: 0 }],
                unit: "km",
                completed: false,
              };
              if (active) {
                setDayExercises([restExercise]);
                await setDoc(dateDocRef, { exercises: [restExercise] }, { merge: true });
              }
            } else {
              // Auto‑generate from the new muscle region engine with rotation
              const muscles = split[selectedDay] || [];
              const exercises = generateWorkoutForRegions(
                muscles,
                workoutType,
                gymExperience as "Beginner" | "Intermediate" | "Advanced",
                selectedDate
              );
              if (active) {
                setDayExercises(exercises);
                await setDoc(dateDocRef, { exercises }, { merge: true });
                // Save to workout_plan template so it acts as default split persistence
                await setDoc(planDocRef, { exercises }, { merge: true });
              }
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadDayExercises();
    return () => {
      active = false;
    };
  }, [user, selectedDay, split, workoutType, selectedDate, activeSession, weekSplit]);

  const generateSplit = async () => {
    if (!user) return;
    // Use the already generated smart split (stored in state)
    const newSplit = split.length > 0 ? split : (SPLIT_TEMPLATES[workoutDays.toString()] || SPLIT_TEMPLATES["4"]);
    
    // Optimistically update UI
    setSplit(newSplit);
    const restPlaceholders = Array.from({ length: 7 - newSplit.length }, () => ["Rest"]);
    setWeekSplit([...newSplit, ...restPlaceholders]);
    setShowSetup(false);
    setSetupStep(1);
    
    try {
      await setDoc(doc(db, "users", user.uid), {
        workoutSplit: JSON.stringify(newSplit),
        workoutType,
        fitnessGoal,
        gymExperience,
        musclePriorities,
        height,
        bodyWeight,
      }, { merge: true });
      const deletePromises = [];
      for (let i = 0; i < 6; i++) {
        deletePromises.push(deleteDoc(doc(db, "users", user.uid, "workout_plan", `day_${i}`)).catch(() => {}));
      }
      await Promise.all(deletePromises);
    } catch (err) {
      console.error("Failed to generate split:", err);
    }
  };

  const generateSmartSplit = async ({
    daysPerWeek,
    workoutType,
    goal,
    experience,
    musclePriorities,
    height,
    bodyWeight,
    muscleGroupsPerDay
  }: {
    daysPerWeek: number;
    workoutType: WorkoutType;
    goal: string;
    experience: string;
    musclePriorities: string[];
    height: number;
    bodyWeight: number;
    muscleGroupsPerDay: string;
  }) => {
    const baseTemplate = SPLIT_TEMPLATES[daysPerWeek.toString()] || SPLIT_TEMPLATES["4"];
    const groupsMap = {
      '1 Muscle': 1,
      '2 Muscles': 2,
      'Full Body': musclePriorities.length || 4,
    };
    const musclesPerDay = groupsMap[muscleGroupsPerDay as keyof typeof groupsMap] || 1;
    const result = [];
    const priorities = musclePriorities.length ? musclePriorities : Object.keys(EXERCISE_DB[workoutType] || {});
    let idx = 0;
    for (let i = 0; i < daysPerWeek; i++) {
      const dayMuscles = [];
      for (let j = 0; j < musclesPerDay; j++) {
        dayMuscles.push(priorities[idx % priorities.length]);
        idx++;
      }
      result.push(dayMuscles);
    }
    // Pad remaining days with base template if needed
    while (result.length < daysPerWeek) {
      result.push(baseTemplate[result.length % baseTemplate.length] || []);
    }
    return result;
  };

  const swapExercise = async (idx: number, newName: string) => {
    if (!user) return;
    const limit = getAlternativeLimit();
    if (alternativeSwapsUsed >= limit) {
      alert(`You have reached the monthly limit for exercise alternatives (${alternativeSwapsUsed}/${limit === Infinity ? "Unlimited" : limit}) on your ${activePlan.toUpperCase()} plan. Please upgrade to Pro or Elite to get more swaps!`);
      router.push("/premium");
      return;
    }

    const typeDB = EXERCISE_DB[workoutType] || EXERCISE_DB.gym;
    let baseEx: ExerciseDef | null = null;
    
    for (const muscle of Object.keys(typeDB)) {
      const mData = typeDB[muscle];
      const found = [...mData.varA, ...mData.varB, ...mData.varC].find(e => e.name === newName);
      if (found) {
        baseEx = found;
        break;
      }
    }

    const newExObj = MUSCLE_REGION_EXERCISES.find(e => e.name.toLowerCase() === newName.toLowerCase());
    const updated = [...dayExercises];
    if (baseEx) {
      const setArray: ExerciseSet[] = [];
      const baseWeight = baseEx.weight || 0;
      for (let s = 1; s <= baseEx.sets; s++) {
        let setWeight = baseWeight;
        if (baseWeight > 0) {
          const factor = 0.85 + ((s - 1) / Math.max(1, baseEx.sets - 1)) * 0.25;
          setWeight = Math.round((baseWeight * factor) / 2.5) * 2.5;
          if (setWeight < 2.5) setWeight = 2.5;
        }
        setArray.push({
          setNumber: s,
          reps: baseEx.reps,
          weight: setWeight
        });
      }
      updated[idx] = {
        name: newName,
        sets: setArray,
        unit: baseEx.unit || weightUnit,
        completed: false,
        primaryRegions: newExObj?.primaryRegions || [],
        secondaryRegions: newExObj?.secondaryRegions || []
      };
    } else {
      const currentSets = updated[idx].sets?.length || 3;
      const setArray: ExerciseSet[] = [];
      for (let s = 1; s <= currentSets; s++) {
        setArray.push({
          setNumber: s,
          reps: updated[idx].sets?.[s-1]?.reps || 10,
          weight: 0
        });
      }
      updated[idx] = {
        ...updated[idx],
        name: newName,
        sets: setArray,
        completed: false,
        primaryRegions: newExObj?.primaryRegions || updated[idx].primaryRegions || [],
        secondaryRegions: newExObj?.secondaryRegions || updated[idx].secondaryRegions || []
      };
    }
    setDayExercises(updated);
    setSwapIdx(null);
    await saveDayExercises(updated);

    // Increment alternatives count
    const currentMonth = new Date().toISOString().slice(0, 7);
    const newCount = alternativeSwapsUsed + 1;
    setAlternativeSwapsUsed(newCount);
    try {
      await setDoc(doc(db, "users", user.uid), {
        exerciseAlternativeCount: { month: currentMonth, count: newCount }
      }, { merge: true });
    } catch {}
  };

  const regenerateDay = async () => {
    if (!user) return;
    const muscles = split[selectedDay] || [];
    const exercises = generateWorkoutForRegions(
      muscles,
      workoutType,
      gymExperience as "Beginner" | "Intermediate" | "Advanced",
      selectedDate
    );
    setDayExercises(exercises);
    await saveDayExercises(exercises);
  };

  const navigateDate = (dir: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + dir);
    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, '0');
    const nd = String(date.getDate()).padStart(2, '0');
    changeSelectedDate(`${ny}-${nm}-${nd}`);
  };

  const getTodayStr = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const todayStr = getTodayStr();
  const isToday = selectedDate === todayStr;
  const isPastDay = selectedDate < todayStr;
  const isFutureDay = selectedDate > todayStr;
  const canTick = isToday;

  const saveDayExercises = async (exercises: WorkoutItem[]) => {
    if (!user) return;
    lastWrittenExercisesRef.current = JSON.stringify(exercises);
    try {
      await setDoc(doc(db, "users", user.uid, "workout_plan", `day_${selectedDay}`), { exercises }, { merge: true });
      await setDoc(doc(db, "users", user.uid, "dated_workouts", selectedDate), { exercises }, { merge: true });
      if (activeSession && activeSession.id) {
        await updateDoc(doc(db, "training_sessions", activeSession.id), { exercises });
      }
    } catch {}
  };

  const toggleSetComplete = async (exIdx: number, setIdx: number) => {
    if (!user) return;
    const ex = dayExercises[exIdx];
    const set = ex.sets[setIdx];
    const loggedSet = workouts.find(w => w.exerciseName === ex.name && w.setNumber === set.setNumber);

    if (!loggedSet) {
      try {
        await addDoc(collection(db, "workouts"), {
          userId: user.uid,
          exerciseName: ex.name,
          setNumber: set.setNumber,
          sets: 1,
          reps: set.reps,
          weight: set.weight,
          unit: ex.unit,
          goal: "maintain",
          dateString: selectedDate,
          createdAt: serverTimestamp(),
        });
        await addWeightHistory(user.uid, ex.name, set.weight, set.reps, selectedDate);
        await recordExerciseFeedback(user.uid, ex.name, 'moderate', selectedDate);
      } catch (err) {
        console.error("Error logging set:", err);
      }

      // Check if all sets across all exercises are now completed
      const allOthersCompleted = dayExercises.every((e, eIdx) => {
        return e.sets.every((s, sIdx) => {
          if (eIdx === exIdx && sIdx === setIdx) return true;
          return workouts.some(w => w.exerciseName === e.name && w.setNumber === s.setNumber);
        });
      });

      if (allOthersCompleted && dayExercises.length > 0) {
        try { await recordWorkoutStreak(user.uid); } catch {}
        const dayLabel = weekSplit[selectedDay]?.[0] !== "Rest" ? weekSplit[selectedDay].join(" + ") : "Rest Day";
        const cal = dayExercises.reduce((acc, e) => {
          return acc + (e.sets || []).reduce((setAcc, s) => setAcc + estimateCalories(e.name, 1, s.reps, s.weight), 0);
        }, 0);

        try {
          await addDoc(collection(db, "posts"), {
            userId: user.uid,
            username: user.displayName || "Variant",
            userEmail: user.email,
            content: `Just crushed ${dayLabel}! 💪 All sets completed.`,
            postType: "workout_completed",
            workoutTags: weekSplit[selectedDay]?.[0] !== "Rest" ? weekSplit[selectedDay] : [],
            workoutStats: {
              exercises: dayExercises.length,
              calories: cal,
              duration: "—",
            },
            mediaUrl: null,
            mediaType: null,
            likesCount: 0,
            createdAt: serverTimestamp(),
          });
        } catch {}
      }
    } else {
      try {
        await deleteDoc(doc(db, "workouts", loggedSet.id));
      } catch (err) {
        console.error("Error deleting logged set:", err);
      }
    }
  };

  const updateSetField = async (exIdx: number, setIdx: number, field: "reps" | "weight", value: number) => {
    const updated = [...dayExercises];
    if (updated[exIdx]?.sets?.[setIdx]) {
      updated[exIdx].sets[setIdx][field] = value;
      setDayExercises(updated);
      await saveDayExercises(updated);
    }
  };

  const adjustSetWeight = async (exIdx: number, setIdx: number, amount: number) => {
    const updated = [...dayExercises];
    if (updated[exIdx]?.sets?.[setIdx]) {
      const currentWeight = updated[exIdx].sets[setIdx].weight;
      updated[exIdx].sets[setIdx].weight = Math.max(0, currentWeight + amount);
      setDayExercises(updated);
      await saveDayExercises(updated);
    }
  };

  const addSetToExercise = async (exIdx: number) => {
    const updated = [...dayExercises];
    const ex = updated[exIdx];
    if (ex) {
      const newSetNumber = (ex.sets?.length || 0) + 1;
      const lastSet = ex.sets?.[ex.sets.length - 1];
      const reps = lastSet ? lastSet.reps : 10;
      const weight = lastSet ? lastSet.weight : 0;
      if (!ex.sets) ex.sets = [];
      ex.sets.push({ setNumber: newSetNumber, reps, weight });
      setDayExercises(updated);
      await saveDayExercises(updated);
    }
  };

  const removeSetFromExercise = async (exIdx: number) => {
    const updated = [...dayExercises];
    const ex = updated[exIdx];
    if (ex && ex.sets && ex.sets.length > 1) {
      ex.sets.pop();
      setDayExercises(updated);
      await saveDayExercises(updated);
    }
  };

  const updateExercise = async (idx: number, field: string, value: any) => {
    const updated = [...dayExercises];
    (updated[idx] as any)[field] = value;
    setDayExercises(updated);
    await saveDayExercises(updated);
  };

  const removeExercise = async (idx: number) => {
    const updated = dayExercises.filter((_, i) => i !== idx);
    setDayExercises(updated);
    await saveDayExercises(updated);
  };

  const addExercise = async () => {
    if (!newExName.trim()) return;
    const defaultSets: ExerciseSet[] = [
      { setNumber: 1, reps: 10, weight: 0 },
      { setNumber: 2, reps: 10, weight: 0 },
      { setNumber: 3, reps: 10, weight: 0 }
    ];
    const updated = [...dayExercises, {
      name: newExName,
      sets: defaultSets,
      unit: weightUnit,
      completed: false
    }];
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

  const saveSteps = async () => {
    if (!user || !tempSteps) return;
    const val = parseInt(tempSteps);
    if (isNaN(val) || val < 0) return;
    setSteps(val);
    setEditingSteps(false);
    try {
      await setDoc(doc(db, "activity_logs", `${user.uid}_${selectedDate}`), {
        userId: user.uid,
        dateString: selectedDate,
        steps: val,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  const endLiveSession = async () => {
    if (!activeSession) return;
    try {
      await updateDoc(doc(db, "training_sessions", activeSession.id), {
        status: "ended"
      });
      setActiveSession(null);
    } catch (err) { console.error(err); }
  };

  const walkingDistanceKm = (steps * 0.000762).toFixed(2);
  const walkingDistanceMi = (steps * 0.000762 * 0.621371).toFixed(2);
  const stepCalories = Math.round(steps * 0.04);

  if (!user) return null;

  const activeMuscles = getMusclesFromWorkouts(workouts);
  const totalCalories = workouts.reduce((acc, w) => acc + estimateCalories(w.exerciseName || "", w.sets || 0, w.reps || 0, w.weight || 0), 0);
  const completedCount = dayExercises.filter(ex => ex.sets && ex.sets.length > 0 && ex.sets.every(s => workouts.some(w => w.exerciseName === ex.name && w.setNumber === s.setNumber))).length;

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

  // Get alternatives for an exercise based on the muscle being worked
  // Get alternatives for an exercise based on the muscle region being worked
  const getAlternatives = (exerciseName: string): string[] => {
    return getMuscleRegionAlternatives(exerciseName, workoutType, gymExperience);
  };

  // Setup screen
  if (loadingUser) {
    return (
      <div className="flex items-center justify-center pt-20 pb-20">
        <Loader2Icon className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (showSetup) {
    if (setupStep === 1) {
      return (
        <OnboardingForm
          userId={user?.uid || ''}
          onComplete={async (data) => {
            setBodyWeight(data.bodyWeight);
            setHeight(data.height || 170);
            setFitnessGoal(data.goal);
            setGymExperience(data.experience);
            setWorkoutDays(data.frequency);
            setMuscleGroupsPerDay(data.splitPattern);
            setGoalWeight(data.goal.toLowerCase().includes('cut') || data.goal.toLowerCase().includes('fat loss') ? Math.round(data.bodyWeight * 0.9) : Math.round(data.bodyWeight * 1.1));
            setMusclePriorities(data.musclePriorities || []);
            setSetupStep(2);
          }}
        />
      );
    }

    // Step 2: Show generated Split Options!
    const profile = {
      bodyWeight,
      goalWeight,
      height,
      fitnessGoal,
      gymExperience: gymExperience as 'Beginner' | 'Intermediate' | 'Advanced',
      workoutDays,
      muscleGroupsPerDay: muscleGroupsPerDay as '1 Muscle' | '2 Muscles' | 'Full Body',
      musclePriorities,
    };
    
    const options = generateSplitOptions(profile);

    return (
      <div className="flex flex-col gap-6 p-6 sm:p-8 bg-background border border-border max-w-5xl mx-auto my-6 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 blur-3xl rounded-full pointer-events-none" />
        
        <div>
          <button
            onClick={() => setSetupStep(1)}
            className="text-xs text-zinc-400 hover:text-brand flex items-center gap-1 mb-4"
          >
            <ChevronLeft className="w-4 h-4" /> Edit Profile Metrics
          </button>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-brand animate-pulse" /> Choose Your AI Workout Split
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Based on your fitness level and preferences, our AI coach has designed 3 optimal splits for you. Select one to apply.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {options.map((opt) => (
            <div
              key={opt.id}
              className="flex flex-col bg-surface rounded-3xl border border-border hover:border-brand/40 transition-all p-5 relative group overflow-hidden"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] uppercase font-black bg-brand/10 text-brand px-2 py-0.5 rounded-full">
                  {opt.difficulty}
                </span>
                <span className="text-[10px] uppercase font-black text-zinc-500">
                  {opt.volumeInfo}
                </span>
              </div>
              
              <h3 className="font-extrabold text-white text-lg group-hover:text-brand transition-colors mb-2">
                {opt.name}
              </h3>
              
              <p className="text-xs text-zinc-400 leading-relaxed mb-4 flex-1">
                {opt.explanation}
              </p>

              {/* Weekly schedule preview */}
              <div className="bg-background/50 rounded-2xl p-4 border border-border mb-4">
                <p className="text-[10px] uppercase text-zinc-500 font-bold mb-2 tracking-wider">Weekly Schedule</p>
                <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {opt.days.map((dayMuscles, dIdx) => (
                    <div key={dIdx} className="flex justify-between text-xs">
                      <span className="text-zinc-500 font-medium">Day {dIdx + 1}:</span>
                      <span className="text-zinc-300 font-bold">{dayMuscles.join(' + ')}</span>
                    </div>
                  ))}
                  {Array.from({ length: 7 - opt.days.length }).map((_, rIdx) => (
                    <div key={rIdx} className="flex justify-between text-xs">
                      <span className="text-zinc-500 font-medium">Day {opt.days.length + rIdx + 1}:</span>
                      <span className="text-emerald-400/80 font-bold">Rest Day</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cardio & calorie recommendation */}
              <div className="bg-brand/5 rounded-2xl p-4 border border-brand/20 mb-5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Footprints className="w-4 h-4 text-brand animate-pulse" />
                  <p className="text-[10px] uppercase text-brand font-black tracking-wider">AI Cardio Recommendation</p>
                </div>
                <p className="text-xs text-white font-bold">{opt.cardioInfo}</p>
                <p className="text-[10px] text-zinc-400 mt-1">Target Burn: <span className="text-brand font-bold">{opt.calorieTarget} kcal</span></p>
              </div>

              <Button
                onClick={async () => {
                  setSplit(opt.days);
                  const restPlaceholders = Array.from({ length: 7 - opt.days.length }, () => ["Rest"]);
                  setWeekSplit([...opt.days, ...restPlaceholders]);
                  
                  try {
                    await setDoc(doc(db, "users", user.uid), {
                      workoutSplit: JSON.stringify(opt.days),
                      workoutType,
                      fitnessGoal,
                      gymExperience,
                      workoutDays,
                      muscleGroupsPerDay,
                      goalWeight,
                      musclePriorities,
                      height,
                      bodyWeight,
                    }, { merge: true });
                    
                    const deletePromises = [];
                    for (let i = 0; i < 7; i++) {
                      deletePromises.push(deleteDoc(doc(db, "users", user.uid, "workout_plan", `day_${i}`)).catch(() => {}));
                    }
                    await Promise.all(deletePromises);
                  } catch (e) {
                    console.error("Error saving chosen split:", e);
                  }
                  
                  setShowSetup(false);
                  setSetupStep(1);
                }}
                className="w-full bg-brand text-black font-extrabold hover:bg-brand/90 transition-all py-2.5 rounded-xl text-xs"
              >
                Apply This Split
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col gap-4 sm:gap-6 pt-4 sm:pt-6 pb-20 px-2 sm:px-0">
      {/* Header */}
      <div className="bg-surface rounded-3xl p-5 sm:p-8 border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-3xl font-black tracking-tight">Track with Variant</h1>
            <span className="text-[10px] uppercase font-bold bg-brand/10 text-brand px-2 py-0.5 rounded-full">{workoutType}</span>
          </div>
          <button onClick={() => { setShowSetup(true); setSetupStep(1); }} className="text-xs text-zinc-400 hover:text-brand flex items-center gap-1">
            <Settings className="w-3 h-3" /> Change Plan
          </button>
        </div>

        {/* Date picker with arrows */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <button onClick={() => navigateDate(-1)} className="p-2 rounded-xl bg-background border border-border hover:border-brand/50 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="relative inline-flex items-center">
            <Calendar className="w-5 h-5 text-brand absolute left-4 pointer-events-none" />
            <input type="date" value={selectedDate} onChange={e => changeSelectedDate(e.target.value)}
              className="bg-background border border-border rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-brand font-bold text-center appearance-none cursor-pointer"
              style={{ colorScheme: 'dark' }} />
          </div>
          <button onClick={() => navigateDate(1)} className="p-2 rounded-xl bg-background border border-border hover:border-brand/50 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          {!isToday && (
            <button onClick={() => changeSelectedDate(new Date().toISOString().split('T')[0])} className="text-xs text-brand font-bold px-3 py-2 rounded-xl bg-brand/10 border border-brand/20 hover:bg-brand/20 transition-colors">
              Today
            </button>
          )}
        </div>
      </div>

      {/* Live Session Overlay */}
      {activeSession && (
        <div className="bg-gradient-to-r from-brand/20 via-surface to-brand/20 rounded-3xl p-5 sm:p-6 border-2 border-brand shadow-[0_0_30px_rgba(234,255,102,0.1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 blur-3xl rounded-full" />
          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h3 className="font-bold text-white uppercase text-xs tracking-wider">Live Training Sync</h3>
              </div>
              <p className="text-sm font-medium text-zinc-300">
                Connected with <span className="text-brand font-bold text-lg">{activeSession.hostId === user?.uid ? activeSession.guestName : activeSession.hostName}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="font-black text-2xl sm:text-3xl text-brand font-mono">{sessionTimer}</p>
              <button onClick={endLiveSession} className="text-xs text-red-400 hover:text-red-500 font-bold underline mt-1 px-2 py-1 hover:bg-red-500/10 rounded">End Session</button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-brand/20 relative z-10">
            <div className="bg-background/50 rounded-2xl p-4 border border-border">
              <p className="text-[10px] uppercase text-zinc-400 font-bold mb-1">Your Sets Today</p>
              <p className="text-3xl font-black text-white">{workouts.length}</p>
            </div>
            <div className="bg-brand/5 rounded-2xl p-4 border border-brand/30 shadow-inner">
              <p className="text-[10px] uppercase text-brand font-bold mb-1">Partner's Sets</p>
              <p className="text-3xl font-black text-brand">{partnerWorkouts.length}</p>
            </div>
          </div>
          
          {partnerWorkouts.length > 0 && (
            <div className="mt-4 text-xs text-zinc-400 flex flex-wrap gap-2 items-center relative z-10">
              <span className="font-bold bg-brand/10 text-brand px-2 py-1 rounded">Partner Activity:</span> 
              {partnerWorkouts.slice(0, 3).map(w => w.exerciseName).join(", ")}
              {partnerWorkouts.length > 3 && " ..."}
            </div>
          )}
        </div>
      )}

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
        <div className="bg-surface rounded-xl p-3 border border-border text-center">
          <p className="text-lg font-black text-green-400">{steps.toLocaleString()}</p>
          <p className="text-[10px] text-zinc-500 uppercase font-bold">Steps</p>
        </div>
      </div>

      {/* Share button when all exercises completed */}
      {completedCount > 0 && completedCount === dayExercises.length && dayExercises.length > 0 && (
        <button
          onClick={() => setShowShareCard(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-brand/20 to-green-500/20 border border-brand/30 rounded-2xl p-4 text-sm font-bold text-brand hover:from-brand/30 hover:to-green-500/30 transition-all"
        >
          <Share2 className="w-4 h-4" />
          Share Your Workout Card 📸
        </button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workout Plan (main column) */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">
              Day {selectedDay + 1}: {weekSplit[selectedDay] && weekSplit[selectedDay][0] === "Rest" ? "Rest Day" : weekSplit[selectedDay]?.join(" + ") || "Workout"}
            </h2>
            <div className="flex items-center gap-2">
              <RestTimer />
              {!isPastDay && (
                <>
                  <button onClick={regenerateDay} className="flex items-center gap-1 text-zinc-400 text-xs font-bold hover:text-brand transition-colors" title="Regenerate exercises">
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                  <button onClick={() => setAddingExercise(true)} className="flex items-center gap-1 text-brand text-xs font-bold hover:underline">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </>
              )}
            </div>
          </div>
          {/* AI Coach Banner */}
          <AITrainerBanner fitnessGoal={fitnessGoal} gymExperience={gymExperience} bodyWeight={bodyWeight} day={selectedDay} split={weekSplit[selectedDay] || []} />

          {(!canTick && selectedDate !== todayStr) && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl p-3 text-xs font-bold text-center">
              {isPastDay ? "You are viewing a past date. Editing workouts is disabled." : "You are viewing a future date. Workouts cannot be checked off yet."}
            </div>
          )}

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
          {dayExercises.map((ex, idx) => {
            const isCompleted = ex.sets && ex.sets.length > 0 && ex.sets.every(s => workouts.some(w => w.exerciseName === ex.name && w.setNumber === s.setNumber));
            const isCardio = ex.name.toLowerCase().includes("run") || ex.name.toLowerCase().includes("walk") || ex.name.toLowerCase().includes("treadmill");
            
            const exObj = MUSCLE_REGION_EXERCISES.find(e => e.name.toLowerCase() === ex.name.toLowerCase());
            const primaryRegion = ex.primaryRegions?.[0] || exObj?.primaryRegions?.[0];
            const targetRegionName = primaryRegion ? (REGION_DISPLAY_NAMES[primaryRegion] || primaryRegion) : "";

            return (
            <div key={idx} className={`bg-surface rounded-3xl border overflow-hidden transition-all ${isCompleted ? "border-brand/40 bg-brand/5" : "border-border"} p-4 sm:p-5 flex flex-col gap-4`}>
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand/10 rounded-xl text-brand">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <p className={`font-black text-sm text-white ${isCompleted ? "line-through text-zinc-500" : ""}`}>{ex.name}</p>
                      {targetRegionName && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-brand/10 text-brand border border-brand/20">
                          {targetRegionName}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">{(ex.sets || []).length} Sets • Unit: {ex.unit}</p>
                  </div>
                </div>

                {!isPastDay && (
                  <div className="flex gap-1.5">
                    <button onClick={() => setSwapIdx(swapIdx === idx ? null : idx)} className="p-2 rounded-xl bg-background border border-border hover:border-brand/50 text-zinc-400 hover:text-white transition-all" title="Swap exercise">
                      <ArrowLeftRight className="w-4 h-4" />
                    </button>
                    {editingIdx === idx ? (
                      <button onClick={saveEditedExercise} className="p-2 rounded-xl bg-brand text-black hover:bg-brand/90 font-bold transition-all"><Check className="w-4 h-4" /></button>
                    ) : (
                      <button onClick={() => setEditingIdx(idx)} className="p-2 rounded-xl bg-background border border-border hover:border-brand/50 text-zinc-400 hover:text-white transition-all" title="Configure Sets"><Edit3 className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => removeExercise(idx)} className="p-2 rounded-xl bg-background border border-border hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-all" title="Remove Exercise"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>

              {/* Set-by-set Checklist */}
              <div className="flex flex-col gap-2.5">
                {(ex.sets || []).map((set, sIdx) => {
                  const setCompleted = workouts.some(w => w.exerciseName === ex.name && w.setNumber === set.setNumber);
                  return (
                    <div key={sIdx} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl transition-all border ${setCompleted ? "bg-brand/10 border-brand/30 shadow-[0_0_15px_rgba(234,255,102,0.05)]" : "bg-background/40 border-border/60"}`}>
                      {/* Checkbox and Label */}
                      <div className="flex items-center gap-3 mb-2 sm:mb-0">
                        <button
                          onClick={() => canTick && toggleSetComplete(idx, sIdx)}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${setCompleted ? "bg-brand border-brand" : "border-zinc-600 hover:border-brand"} ${!canTick ? "opacity-50 cursor-not-allowed" : ""}`}
                          disabled={!canTick}
                        >
                          {setCompleted && <Check className="w-4 h-4 text-black font-extrabold" />}
                        </button>
                        <span className="text-xs font-black tracking-wider text-zinc-400 uppercase">Set {set.setNumber}</span>
                      </div>

                      {/* Reps and weight controls */}
                      <div className="flex items-center gap-4 self-end sm:self-auto">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step={isCardio ? "0.1" : "1"}
                            value={set.reps}
                            onChange={(e) => updateSetField(idx, sIdx, "reps", Number(e.target.value))}
                            disabled={isPastDay || setCompleted}
                            className="w-12 bg-background border border-border rounded-lg text-center text-xs py-1.5 font-black text-white focus:outline-none focus:border-brand"
                          />
                          <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono">{isCardio ? "kilometers" : "Reps"}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={set.weight}
                            onChange={(e) => updateSetField(idx, sIdx, "weight", Number(e.target.value))}
                            disabled={isPastDay || setCompleted}
                            className="w-14 bg-background border border-border rounded-lg text-center text-xs py-1.5 font-black text-white focus:outline-none focus:border-brand"
                          />
                          <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono">{ex.unit}</span>
                        </div>

                        {!isPastDay && !setCompleted && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => adjustSetWeight(idx, sIdx, -2.5)}
                              className="bg-surface hover:bg-zinc-800 text-[10px] font-black text-zinc-400 hover:text-white px-2 py-1 rounded-lg border border-border transition-colors"
                              title="Decrease Weight"
                            >
                              -2.5
                            </button>
                            <button
                              onClick={() => adjustSetWeight(idx, sIdx, 2.5)}
                              className="bg-surface hover:bg-zinc-800 text-[10px] font-black text-zinc-400 hover:text-white px-2 py-1 rounded-lg border border-border transition-colors"
                              title="Increase Weight"
                            >
                              +2.5
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Set Builder config view (shows when editingIdx === idx) */}
              {editingIdx === idx && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background/25 border border-border/60 rounded-2xl p-3.5 mt-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Configure Sets:</span>
                    <button
                      onClick={() => removeSetFromExercise(idx)}
                      disabled={(ex.sets || []).length <= 1}
                      className="p-1.5 rounded-lg bg-surface border border-border text-zinc-400 hover:text-white disabled:opacity-50 hover:bg-red-500/10 transition-colors"
                      title="Remove Set"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black text-white">{(ex.sets || []).length} Sets</span>
                    <button
                      onClick={() => addSetToExercise(idx)}
                      className="p-1.5 rounded-lg bg-surface border border-border text-zinc-400 hover:text-white hover:bg-brand/10 transition-colors"
                      title="Add Set"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Exercise Unit:</span>
                    <button
                      onClick={() => updateExercise(idx, "unit", ex.unit === "lbs" ? "kg" : "lbs")}
                      className="bg-surface text-brand font-black py-1.5 px-3.5 rounded-xl text-xs border border-border hover:border-brand/40 transition-all uppercase"
                    >
                      {ex.unit}
                    </button>
                  </div>
                </div>
              )}

              {/* Swap alternatives panel */}
              {swapIdx === idx && (
                <div className="bg-background/20 border border-border/60 rounded-2xl p-4 mt-2">
                  <p className="text-[10px] text-zinc-400 uppercase font-black tracking-wider mb-2.5">Swap with AI Alternative</p>
                  <div className="flex flex-wrap gap-2">
                    {getAlternatives(ex.name).map((alt, ai) => {
                      const altObj = MUSCLE_REGION_EXERCISES.find(e => e.name.toLowerCase() === alt.toLowerCase());
                      const altRegion = altObj?.primaryRegions?.[0];
                      const altRegionDisplayName = altRegion ? (REGION_DISPLAY_NAMES[altRegion] || altRegion) : "";
                      return (
                        <button key={ai} onClick={() => swapExercise(idx, alt)}
                          className="px-3.5 py-2 bg-background hover:bg-brand/5 border border-border hover:border-brand/40 rounded-xl text-xs font-bold text-zinc-300 hover:text-brand transition-all flex flex-col items-start gap-1">
                          <span>{alt}</span>
                          {altRegionDisplayName && (
                            <span className="text-[9px] text-zinc-500 font-medium">Hits: {altRegionDisplayName}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )})}

          {dayExercises.length === 0 && (
            <div className="bg-surface rounded-2xl border border-border border-dashed p-8 text-center text-zinc-500 text-sm">
              No exercises for this day yet. <button onClick={() => setAddingExercise(true)} className="text-brand font-bold">Add one</button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <AIInsights />
          <MuscleRecoveryIndicator />
          <MuscleMatrix activeMuscles={activeMuscles} />
          <VolumeTracker allTimeWorkouts={allTimeWorkouts} />

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

          {/* Daily Activity - Step Counter */}
          <div className="bg-green-500/10 rounded-xl p-5 border border-green-500/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Footprints className="w-5 h-5 text-green-400" />
                <h3 className="font-bold text-green-400 text-sm">Daily Activity</h3>
              </div>
            </div>

            {editingSteps ? (
              <div className="flex items-center gap-2 mb-4">
                <input type="number" value={tempSteps} onChange={e => setTempSteps(e.target.value)} autoFocus placeholder="e.g. 8000"
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400 text-center font-bold" />
                <button onClick={saveSteps} className="p-2 rounded-full bg-green-500 text-black"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditingSteps(false)} className="p-2 rounded-full bg-surface border border-border"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-black text-white">{steps.toLocaleString()}</span>
                  <span className="text-sm text-zinc-400 mb-1">steps</span>
                </div>
                <button onClick={() => { setTempSteps(steps.toString()); setEditingSteps(true); }}
                  className="bg-surface text-white font-medium py-2 px-4 rounded-full text-xs hover:bg-surface-hover border border-border transition-all flex items-center gap-1">
                  <Edit3 className="w-3 h-3" /> Log Steps
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-green-400">{weightUnit === "kg" ? walkingDistanceKm : walkingDistanceMi}</p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">{weightUnit === "kg" ? "km" : "miles"}</p>
              </div>
              <div className="bg-background rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-orange-400">{stepCalories}</p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Cal from steps</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      {showShareCard && (
        <ShareCard
          type="workout"
          data={{
            username: user?.displayName || "Variant",
            title: `Day ${selectedDay + 1}: ${weekSplit[selectedDay] && weekSplit[selectedDay][0] === "Rest" ? "Rest Day" : weekSplit[selectedDay]?.join(" + ") || "Workout"}`,
            stat: `${completedCount}`,
            statLabel: "Exercises Completed",
            exercises: completedCount,
            calories: totalCalories,
          }}
          onClose={() => setShowShareCard(false)}
        />
      )}
    </>
  );
}
