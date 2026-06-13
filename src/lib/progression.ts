// src/lib/progression.ts
import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PlannerParams, recommendWeight, calculateNextWeight } from '@/lib/aiPlanner';

/**
 * Record user feedback for an exercise.
 * rating: 'easy' | 'moderate' | 'hard' | 'failed'
 */
export async function recordExerciseFeedback(
  userId: string,
  exerciseName: string,
  rating: 'easy' | 'moderate' | 'hard' | 'failed',
  date: string // YYYY-MM-DD
) {
  const feedbackRef = doc(db, 'users', userId, 'feedback', `${exerciseName}_${date}`);
  await setDoc(feedbackRef, {
    exerciseName,
    rating,
    date,
    createdAt: new Date().toISOString(),
  }, { merge: true });
}

/**
 * Store performed set data for weight progression analysis.
 */
export async function addWeightHistory(
  userId: string,
  exerciseName: string,
  weight: number,
  reps: number,
  date: string // YYYY-MM-DD
) {
  const historyRef = doc(db, 'users', userId, 'weightHistory', exerciseName);
  const existing = await getDoc(historyRef);
  const entry = { weight, reps, date };
  if (existing.exists()) {
    // Append to array, keep only recent 20 entries
    const data = existing.data() as any;
    const updated = (data.entries || []).concat(entry).slice(-20);
    await setDoc(historyRef, { entries: updated }, { merge: true });
  } else {
    await setDoc(historyRef, { entries: [entry] }, { merge: true });
  }
}

/**
 * Compute the next recommended weight for an exercise based on past history
 * and user‑provided difficulty rating.
 */
export async function getNextRecommendedWeight(
  userId: string,
  exerciseName: string,
  plannerParams: PlannerParams,
  rating: 'easy' | 'moderate' | 'hard' | 'failed'
): Promise<number> {
  // Retrieve recent weight history (last 5 entries)
  const historyRef = doc(db, 'users', userId, 'weightHistory', exerciseName);
  const snap = await getDoc(historyRef);
  const recent = snap.exists() ? (snap.data() as any).entries?.slice(-5) || [] : [];

  // Base recommendation based on body weight and experience
  const base = recommendWeight(exerciseName, plannerParams, recent);

  // Adjust based on rating
  const next = calculateNextWeight(base, rating);
  return next;
}

/**
 * Hook to manage progression for a single exercise within a component.
 * Provides currentRecommendedWeight and handlers to submit feedback.
 */
import { useState, useEffect } from 'react';
export function useProgression(
  userId: string,
  exerciseName: string,
  plannerParams: PlannerParams
) {
  const [recommendedWeight, setRecommendedWeight] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const fetchRecommendation = async (rating?: 'easy' | 'moderate' | 'hard' | 'failed') => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const weight = await getNextRecommendedWeight(userId, exerciseName, plannerParams, rating || 'moderate');
    setRecommendedWeight(weight);
    setLoading(false);
  };

  useEffect(() => {
    // Initial load with default rating
    fetchRecommendation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitFeedback = async (rating: 'easy' | 'moderate' | 'hard' | 'failed', performedWeight: number, reps: number) => {
    const today = new Date().toISOString().split('T')[0];
    await recordExerciseFeedback(userId, exerciseName, rating, today);
    await addWeightHistory(userId, exerciseName, performedWeight, reps, today);
    // Re‑calculate recommendation based on new feedback
    await fetchRecommendation(rating);
  };

  return { recommendedWeight, loading, submitFeedback, refresh: fetchRecommendation };
}
