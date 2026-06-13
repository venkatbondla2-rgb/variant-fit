import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export interface StreakData {
  workoutStreak: number;
  proteinStreak: number;
  loginStreak: number;
  lastWorkoutDate: string;
  lastProteinDate: string;
  lastLoginDate: string;
  longestWorkoutStreak: number;
  longestProteinStreak: number;
  longestLoginStreak: number;
  updatedAt?: any;
}

const DEFAULT_STREAK: StreakData = {
  workoutStreak: 0,
  proteinStreak: 0,
  loginStreak: 0,
  lastWorkoutDate: "",
  lastProteinDate: "",
  lastLoginDate: "",
  longestWorkoutStreak: 0,
  longestProteinStreak: 0,
  longestLoginStreak: 0,
};

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export async function getStreakData(userId: string): Promise<StreakData> {
  try {
    const snap = await getDoc(doc(db, "streaks", userId));
    if (snap.exists()) {
      return { ...DEFAULT_STREAK, ...snap.data() } as StreakData;
    }
    return { ...DEFAULT_STREAK };
  } catch {
    return { ...DEFAULT_STREAK };
  }
}

export async function recordLoginStreak(userId: string): Promise<StreakData> {
  const data = await getStreakData(userId);
  const today = getToday();
  const yesterday = getYesterday();

  if (data.lastLoginDate === today) {
    // Already recorded today
    return data;
  }

  if (data.lastLoginDate === yesterday) {
    // Continue streak
    data.loginStreak += 1;
  } else {
    // Reset streak
    data.loginStreak = 1;
  }

  data.lastLoginDate = today;
  data.longestLoginStreak = Math.max(data.longestLoginStreak, data.loginStreak);

  await saveStreakData(userId, data);
  return data;
}

export async function recordWorkoutStreak(userId: string): Promise<StreakData> {
  const data = await getStreakData(userId);
  const today = getToday();
  const yesterday = getYesterday();

  if (data.lastWorkoutDate === today) {
    // Already recorded today
    return data;
  }

  if (data.lastWorkoutDate === yesterday) {
    data.workoutStreak += 1;
  } else if (data.lastWorkoutDate !== today) {
    data.workoutStreak = 1;
  }

  data.lastWorkoutDate = today;
  data.longestWorkoutStreak = Math.max(data.longestWorkoutStreak, data.workoutStreak);

  await saveStreakData(userId, data);
  return data;
}

export async function recordProteinStreak(userId: string): Promise<StreakData> {
  const data = await getStreakData(userId);
  const today = getToday();
  const yesterday = getYesterday();

  if (data.lastProteinDate === today) {
    return data;
  }

  if (data.lastProteinDate === yesterday) {
    data.proteinStreak += 1;
  } else {
    data.proteinStreak = 1;
  }

  data.lastProteinDate = today;
  data.longestProteinStreak = Math.max(data.longestProteinStreak, data.proteinStreak);

  await saveStreakData(userId, data);
  return data;
}

async function saveStreakData(userId: string, data: StreakData): Promise<void> {
  try {
    await setDoc(doc(db, "streaks", userId), {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error("Failed to save streak:", err);
  }
}

// Check if a streak is at risk (worked out yesterday but not today yet)
export function isStreakAtRisk(data: StreakData): {
  workout: boolean;
  protein: boolean;
  login: boolean;
} {
  const today = getToday();
  const yesterday = getYesterday();
  return {
    workout: data.lastWorkoutDate === yesterday && data.workoutStreak > 0,
    protein: data.lastProteinDate === yesterday && data.proteinStreak > 0,
    login: data.lastLoginDate === yesterday && data.loginStreak > 0,
  };
}

// Check if streak is broken (missed 2+ days)
export function isStreakBroken(lastDate: string): boolean {
  if (!lastDate) return false;
  const today = getToday();
  const yesterday = getYesterday();
  return lastDate !== today && lastDate !== yesterday;
}
