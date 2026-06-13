// src/lib/useTrackEngine.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { EXERCISE_DB, SPLIT_TEMPLATES, getVariationForDate, generateWorkoutForRegions, type ExerciseDef } from '@/lib/exerciseDB';
import { generateSmartSplit, generateSplitOptions, calculateNextWeight } from '@/lib/aiPlanner';
import { SplitOption, UserProfile } from '@/lib/types';
import { recordExerciseFeedback, addWeightHistory, getNextRecommendedWeight } from '@/lib/progression';

interface WorkoutItem {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  unit: string;
  completed: boolean;
}

export function useTrackEngine() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [allTimeWorkouts, setAllTimeWorkouts] = useState<any[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);

  // User profile & plan
  const [bodyWeight, setBodyWeight] = useState<number>(0);
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  const [fitnessGoal, setFitnessGoal] = useState<string>('Muscle Gain');
  const [gymExperience, setGymExperience] = useState<string>('Intermediate');
  const [workoutDays, setWorkoutDays] = useState<number>(4);
  const [muscleGroupsPerDay, setMuscleGroupsPerDay] = useState<string>('1 Muscle');
  const [musclePriorities, setMusclePriorities] = useState<string[]>([]);
  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [height, setHeight] = useState<number>(170);
  const [showSetup, setShowSetup] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [split, setSplit] = useState<string[][]>([]);
  const [weekSplit, setWeekSplit] = useState<string[][]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [dayExercises, setDayExercises] = useState<WorkoutItem[]>([]);

  // Load user plan
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data() as any;
          setBodyWeight(data.bodyWeight || 0);
          setWeightUnit(data.weightUnit || 'lbs');
          setFitnessGoal(data.fitnessGoal || 'Muscle Gain');
          setGymExperience(data.gymExperience || 'Intermediate');
          setWorkoutDays(data.workoutDays || 4);
          setMuscleGroupsPerDay(data.muscleGroupsPerDay || '1 Muscle');
          setMusclePriorities(data.musclePriorities || []);
          setGoalWeight(data.goalWeight || null);
          setHeight(data.height || 170);
          if (data.workoutSplit) {
            const parsed = typeof data.workoutSplit === 'string' ? JSON.parse(data.workoutSplit) : data.workoutSplit;
            setSplit(parsed);
            const restPlaceholders = Array.from({ length: 7 - parsed.length }, () => ['Rest']);
            setWeekSplit([...parsed, ...restPlaceholders]);
          }
        }
      } catch (e) {
        console.error('Load user error', e);
      } finally {
        setLoadingUser(false);
      }
    };
    load();
  }, [user]);

  // Load workouts for selected date
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'workouts'),
      where('userId', '==', user.uid),
      where('dateString', '==', selectedDate),
      orderBy('createdAt', 'desc')
    );
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
        const q = query(collection(db, 'workouts'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setAllTimeWorkouts(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      } catch {};
    };
    fetchAll();
  }, [user]);

  // Load or generate day exercises
  useEffect(() => {
    if (!user || split.length === 0) return;
    const loadDay = async () => {
      const dayDoc = doc(db, 'users', user.uid, 'workout_plan', `day_${selectedDay}`);
      const snap = await getDoc(dayDoc);
      if (snap.exists()) {
        setDayExercises(snap.data().exercises || []);
      } else {
        const isRest = weekSplit[selectedDay]?.[0] === 'Rest';
        if (isRest) {
          setDayExercises([{ name: 'Running', sets: 1, reps: 1, weight: 0, unit: 'km', completed: false }]);
          await setDoc(dayDoc, { exercises: [{ name: 'Running', sets: 1, reps: 1, weight: 0, unit: 'km', completed: false }] }, { merge: true });
        } else {
          // generate exercises using the region-based planning engine
          const muscles = split[selectedDay] || [];
          const execs = generateWorkoutForRegions(
            muscles,
            'gym',
            gymExperience as "Beginner" | "Intermediate" | "Advanced",
            selectedDate
          );
          setDayExercises(execs as any);
          await setDoc(dayDoc, { exercises: execs }, { merge: true });
        }
      }
    };
    loadDay();
  }, [user, selectedDay, split, selectedDate, weekSplit, gymExperience]);

  // Derive selectedDay from date (simple 7‑day cycle)
  useEffect(() => {
    if (weekSplit.length > 0) {
      const d = new Date(selectedDate);
      const epochDay = Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / (1000 * 60 * 60 * 24));
      setSelectedDay(epochDay % 7);
    }
  }, [selectedDate, weekSplit]);

  // Helpers for editing exercises
  const updateExercise = (idx: number, field: keyof WorkoutItem, value: any) => {
    const updated = [...dayExercises];
    (updated[idx] as any)[field] = value;
    setDayExercises(updated);
  };

  const saveDayExercises = async (exs: WorkoutItem[]) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid, 'workout_plan', `day_${selectedDay}`), { exercises: exs }, { merge: true });
  };

  const toggleExerciseComplete = async (idx: number) => {
    if (!user) return;
    const ex = dayExercises[idx];
    const already = workouts.some(w => w.exerciseName === ex.name);
    if (!already) {
      await addDoc(collection(db, 'workouts'), {
        userId: user.uid,
        exerciseName: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        unit: ex.unit,
        dateString: selectedDate,
        createdAt: serverTimestamp(),
      });
      // record weight history and default feedback (moderate)
      await addWeightHistory(user.uid, ex.name, ex.weight, ex.reps, selectedDate);
      await recordExerciseFeedback(user.uid, ex.name, 'moderate', selectedDate);
    }
    // Refresh day exercises after any change
    const refreshed = await getDoc(doc(db, 'users', user.uid, 'workout_plan', `day_${selectedDay}`));
    if (refreshed.exists()) setDayExercises(refreshed.data().exercises || []);
  };

  // New: handle completion with rating to adapt weight
  const handleExerciseComplete = async (idx: number, rating: 'easy' | 'moderate' | 'hard' | 'failed') => {
    if (!user) return;
    const ex = dayExercises[idx];
    // Record feedback & weight history
    await recordExerciseFeedback(user.uid, ex.name, rating, selectedDate);
    await addWeightHistory(user.uid, ex.name, ex.weight, ex.reps, selectedDate);
    // Compute next recommended weight
    const nextWeight = calculateNextWeight(ex.weight, rating);
    // Update local exercise weight
    const updated = [...dayExercises];
    updated[idx] = { ...ex, weight: nextWeight };
    setDayExercises(updated);
    // Persist updated exercise list
    await setDoc(doc(db, 'users', user.uid, 'workout_plan', `day_${selectedDay}`), { exercises: updated }, { merge: true });
  };

  // --- Phase 1 extensions ---
  // Generate smart split (used on onboarding completion)
  const generateSplit = async () => {
    const params = {
      weight: bodyWeight,
      fitnessGoal,
      gymExperience,
      daysPerWeek: workoutDays,
      muscleGroupsPerDay,
      musclePriorities,
    } as any;
    const newSplit = await generateSmartSplit(params);
    setSplit(newSplit);
    const restPlaceholders = Array.from({ length: 7 - newSplit.length }, () => ['Rest']);
    setWeekSplit([...newSplit, ...restPlaceholders]);
    await setDoc(doc(db, 'users', user!.uid), {
      workoutSplit: JSON.stringify(newSplit),
      fitnessGoal,
      gymExperience,
      workoutDays,
      muscleGroupsPerDay,
      musclePriorities,
    }, { merge: true });
  };

  // New: generate intelligent split options for AI recommendation page
  const [splitOptions, setSplitOptions] = useState<SplitOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const selectOption = (id: string) => setSelectedOptionId(id);

  const generateRecommendations = async () => {
    const profile: UserProfile = {
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
    setSplitOptions(options);
  };

  // Retrieve the full selected option object
  const selectedOption = splitOptions.find(o => o.id === selectedOptionId) || null;

  // When user confirms a split, persist it and close setup UI
  const confirmSplit = async (option: SplitOption) => {
    setSplit(option.days);
    const restPlaceholders = Array.from({ length: 7 - option.days.length }, () => ['Rest']);
    setWeekSplit([...option.days, ...restPlaceholders]);
    await setDoc(doc(db, 'users', user!.uid), {
      workoutSplit: JSON.stringify(option.days),
      fitnessGoal,
      gymExperience,
      workoutDays,
      muscleGroupsPerDay,
      musclePriorities,
    }, { merge: true });
    setShowSetup(false);
    setSetupStep(1);
    setSelectedDay(0);
  };

    return {
    loadingUser,
    selectedDate,
    setSelectedDate,
    workouts,
    allTimeWorkouts,
    bodyWeight,
    weightUnit,
    fitnessGoal,
    gymExperience,
    workoutDays,
    muscleGroupsPerDay,
    musclePriorities,
    split,
    weekSplit,
    selectedDay,
    dayExercises,
    updateExercise,
    saveDayExercises,
    toggleExerciseComplete,
    generateSplit,
    // AI recommendation API
    generateRecommendations,
    splitOptions,
    selectedOptionId,
    selectOption,
    confirmSplit,
    selectedOption,
    // Adaptive learning
    handleExerciseComplete,
    setFitnessGoal,
    setGymExperience,
    setWorkoutDays,
    setMuscleGroupsPerDay,
    setMusclePriorities,
    setBodyWeight,
    setWeightUnit,
    showSetup,
    setShowSetup,
    setupStep,
    setSetupStep,
  };
}
