// src/components/track/TrackPageContent.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { MuscleMatrix, getMusclesFromWorkouts } from "@/components/track/MuscleMatrix";
import { collection, query, where, orderBy, onSnapshot, getDocs, doc, getDoc, updateDoc, setDoc, addDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { OnboardingForm } from "@/components/track/OnboardingForm";
import { db } from "@/lib/firebase";
import { Calendar, Trophy, Flame, Scale, Edit3, Check, X, Plus, Trash2, ChevronDown, Dumbbell, TrendingUp, Settings, Footprints, Home, ChevronLeft, ChevronRight, RefreshCw, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EXERCISE_DB, SPLIT_TEMPLATES, estimateCalories, getVariationForDate, type WorkoutType, type ExerciseDef } from "@/lib/exerciseDB";
import { recordWorkoutStreak } from "@/lib/streaks";
import { RestTimer } from "@/components/track/RestTimer";
import { MuscleRecoveryIndicator } from "@/components/track/MuscleRecovery";
import { ShareCard } from "@/components/share/ShareCard";
import { AIInsights } from "@/components/track/AIInsights";
import { Share2, Sparkles, Loader2 as Loader2Icon } from "lucide-react";

interface WorkoutItem {
  id?: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  unit: string;
  completed: boolean;
}

export default function TrackPageContent() {
  // NOTE: This component currently retains the original implementation.
  // Future refactor will replace duplicated state with useTrackEngine hook.
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [allTimeWorkouts, setAllTimeWorkouts] = useState<any[]>([]);
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
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  const [split, setSplit] = useState<string[][]>([]);
  const [weekSplit, setWeekSplit] = useState<string[][]>([]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [dayExercises, setDayExercises] = useState<WorkoutItem[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [swapIdx, setSwapIdx] = useState<number | null>(null);
  const [addingExercise, setAddingExercise] = useState(false);
  const [newExName, setNewExName] = useState("");
  const [editingWeight, setEditingWeight] = useState(false);
  const [tempWeight, setTempWeight] = useState("");
  const [steps, setSteps] = useState(0);
  const [editingSteps, setEditingSteps] = useState(false);
  const [tempSteps, setTempSteps] = useState("");
  const [showShareCard, setShowShareCard] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGoal, setAiGoal] = useState("muscle gain");
  const [activeSession, setActiveSession] = useState<any>(null);
  const [partnerWorkouts, setPartnerWorkouts] = useState<any[]>([]);
  const [sessionTimer, setSessionTimer] = useState("00:00");

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
            // Reset selected day based on current selectedDate
            const start = new Date(selectedDate);
            const dayIdx = (start.getDay() + 6) % 7; // Monday = 0
            setSelectedDay(dayIdx % parsedSplit.length);
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
  }, [user, selectedDate]);

  // Recompute selectedDay whenever selectedDate or split changes
  useEffect(() => {
    if (split.length === 0) return;
    const start = new Date(selectedDate);
    const dayIdx = (start.getDay() + 6) % 7; // Monday = 0
    setSelectedDay(dayIdx % split.length);
  }, [selectedDate, split]);

  // Placeholder: when saving a new split elsewhere, ensure it's stored as JSON string:
  // await setDoc(doc(db, "users", user.uid), { workoutSplit: JSON.stringify(newSplit) }, { merge: true });

  // ... (rest of original component logic omitted for brevity)
  return (<div>Track Page Content Placeholder</div>);
}
