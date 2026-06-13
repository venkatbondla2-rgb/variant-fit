// src/lib/aiPlanner.ts

/**
 * Types for the AI planner utilities.
 */
export interface PlannerParams {
  weight: number; // current body weight (kg or lbs – unit handling is done upstream)
  goalWeight?: number | null;
  height?: number;
  fitnessGoal: string; // e.g., 'Muscle Gain', 'Fat Loss'
  gymExperience: string; // Beginner | Intermediate | Advanced
  daysPerWeek: number; // number of workout days
  muscleGroupsPerDay: string; // '1 Muscle' | '2 Muscles' | 'Full Body'
  musclePriorities: string[]; // list of preferred muscles
}

/**
 * Generate a smart split based on user preferences.
 * Returns an array where each element represents a day and contains an array of muscle groups.
 */
export async function generateSmartSplit(params: PlannerParams): Promise<string[][]> {
  const { daysPerWeek, muscleGroupsPerDay, musclePriorities, gymExperience } = params;

  // Map preference to number of muscles per day
  const groupsMap: Record<string, number> = {
    '1 Muscle': 1,
    '2 Muscles': 2,
    'Full Body': musclePriorities.length || 4,
  };
  const musclesPerDay = groupsMap[muscleGroupsPerDay] || 1;

  // Use the provided priorities; fall back to a generic list if none supplied
  const allMuscles = musclePriorities.length
    ? musclePriorities
    : ['Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core'];

  const result: string[][] = [];
  let idx = 0;
  for (let i = 0; i < daysPerWeek; i++) {
    const day: string[] = [];
    for (let j = 0; j < musclesPerDay; j++) {
      day.push(allMuscles[idx % allMuscles.length]);
      idx++;
    }
    result.push(day);
  }

  // Simple heuristic: beginners get fewer muscles per day to reduce fatigue
  if (gymExperience === 'Beginner') {
    return result.map(day => day.slice(0, Math.min(day.length, 3)));
  }

  return result;
}

/**
 * Recommend a starting weight for a given exercise based on user metrics and history.
 * This is a placeholder implementation – real logic would look at past performance.
 */
export function recommendWeight(
  exerciseName: string,
  params: PlannerParams,
  history?: { weight: number; reps: number }[]
): number {
  const baseFactor = params.gymExperience === 'Advanced' ? 0.35 : params.gymExperience === 'Intermediate' ? 0.30 : 0.25;
  const baseWeight = params.weight * baseFactor;

  if (history && history.length) {
    const avg = history.reduce((a, h) => a + h.weight, 0) / history.length;
    return Math.round((avg + baseWeight) / 2);
  }

  return Math.round(baseWeight);
}

/**
 * Update progressive overload based on user‑provided difficulty rating.
 * rating: 'easy' | 'moderate' | 'hard' | 'failed'
 */
export function calculateNextWeight(current: number, rating: string): number {
  switch (rating) {
    case 'easy':
      return Math.round(current * 1.05 + 1e-9);
    case 'moderate':
      return Math.round(current * 1.025 + 1e-9);
    case 'hard':
      return current;
    case 'failed':
      return Math.round(current * 0.95 + 1e-9);
    default:
      return current;
  }
}

import { UserProfile, SplitOption, CardioPlan } from './types';

/** Simple TDEE calculator (Mifflin‑St Jeor). */
function calculateTDEE(profile: UserProfile): number {
  const { bodyWeight: weight, height = 170 } = profile;
  const age = 30;
  const s = 5; // male constant
  const bmr = 10 * weight + 6.25 * height - 5 * age + s;
  const activityFactor = profile.workoutDays >= 5 ? 1.55 : 1.375;
  return Math.round(bmr * activityFactor);
}

/** Generate cardio recommendation based on weight, goal weight, and fitness goal. */
function buildCardioRecommendation(profile: UserProfile): { type: string; durationMin: number; caloriesToBurn: number; intensity: string; reason: string } {
  const { bodyWeight, goalWeight, fitnessGoal } = profile;
  const isCut = fitnessGoal.toLowerCase().includes('cut') || fitnessGoal.toLowerCase().includes('fat loss');
  const isBulk = fitnessGoal.toLowerCase().includes('bulk') || fitnessGoal.toLowerCase().includes('muscle') || fitnessGoal.toLowerCase().includes('gain');
  
  const weightDiff = goalWeight ? bodyWeight - goalWeight : 0;
  
  if (isCut || weightDiff > 2) {
    const kcal = Math.round(bodyWeight * 5.5);
    const duration = Math.max(25, Math.min(45, Math.round(kcal / 10)));
    return {
      type: "Treadmill Run",
      durationMin: duration,
      caloriesToBurn: kcal,
      intensity: "Speed: 8.5 km/h, Incline: 1.5%",
      reason: `Targeting a calorie burn of ${kcal} kcal to support your fat loss goal and help transition from ${bodyWeight}kg to your target of ${goalWeight || Math.round(bodyWeight - 5)}kg.`
    };
  } else if (isBulk || weightDiff < -2) {
    const kcal = Math.round(bodyWeight * 2.0);
    const duration = 15;
    return {
      type: "Incline Treadmill Walk",
      durationMin: duration,
      caloriesToBurn: kcal,
      intensity: "Speed: 4.5 km/h, Incline: 6.0%",
      reason: `Targeting a light cardio burn of ${kcal} kcal. Low intensity walk preserves muscle mass while keeping your heart healthy.`
    };
  } else {
    const kcal = Math.round(bodyWeight * 3.5);
    const duration = 25;
    return {
      type: "Brisk Treadmill Walk",
      durationMin: duration,
      caloriesToBurn: kcal,
      intensity: "Speed: 5.5 km/h, Incline: 3.5%",
      reason: `Targeting a calorie burn of ${kcal} kcal to optimize metabolic health and muscle maintenance.`
    };
  }
}

/** Generate multiple intelligent split options based strictly on muscleGroupsPerDay and goals. */
export function generateSplitOptions(profile: UserProfile): SplitOption[] {
  const cardio = buildCardioRecommendation(profile);
  const tdee = calculateTDEE(profile);
  const options: SplitOption[] = [];

  const daysPerWeek = profile.workoutDays;
  const groupsPerDay = profile.muscleGroupsPerDay; // "1 Muscle" | "2 Muscles" | "Full Body"
  
  const priorities = profile.musclePriorities.length > 0 
    ? profile.musclePriorities 
    : ['Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core'];

  if (groupsPerDay === '2 Muscles') {
    // Option 1: Agonist / Antagonist Pairings
    const pairing1 = [
      ['Chest', 'Back'],
      ['Legs', 'Core'],
      ['Shoulders', 'Arms'],
      ['Chest', 'Back'],
      ['Legs', 'Core'],
      ['Shoulders', 'Arms'],
      ['Core', 'Arms']
    ];
    const days1 = pairing1.slice(0, daysPerWeek);
    options.push({
      id: 'opt1_2muscles',
      name: `Antagonist Pairing Split (${daysPerWeek}-day)`,
      days: days1,
      volumeInfo: profile.fitnessGoal.toLowerCase().includes('bulk') ? '4 sets × 10 reps (hypertrophy focus)' : '3 sets × 8 reps',
      cardioInfo: `${cardio.type} (${cardio.durationMin}m @ ${cardio.intensity})`,
      calorieTarget: cardio.caloriesToBurn,
      difficulty: 'Medium',
      explanation: `Recommended 2 muscles per day using antagonist pairings (Chest+Back, Shoulders+Arms). Maximizes pump and recovery. Cardio goal: ${cardio.reason}`
    });

    // Option 2: Classic Synergistic Pairings
    const pairing2 = [
      ['Chest', 'Triceps'],
      ['Back', 'Biceps'],
      ['Legs', 'Shoulders'],
      ['Core', 'Arms'],
      ['Chest', 'Triceps'],
      ['Back', 'Biceps'],
      ['Legs', 'Shoulders']
    ];
    const days2 = pairing2.slice(0, daysPerWeek);
    options.push({
      id: 'opt2_2muscles',
      name: `Synergistic Split (${daysPerWeek}-day)`,
      days: days2,
      volumeInfo: '3-4 sets × 10-12 reps',
      cardioInfo: `${cardio.type} (${cardio.durationMin}m @ ${cardio.intensity})`,
      calorieTarget: cardio.caloriesToBurn,
      difficulty: 'Medium',
      explanation: `Recommended 2 muscles per day by pairing major groups with secondary movers (Chest+Triceps, Back+Biceps). Cardio goal: ${cardio.reason}`
    });

    // Option 3: Priority Muscle Hybrid
    const days3: string[][] = [];
    let priorityIdx = 0;
    const secondaryList = ['Shoulders', 'Core', 'Arms', 'Legs', 'Back', 'Chest'];
    for (let i = 0; i < daysPerWeek; i++) {
      const p1 = priorities[priorityIdx % priorities.length];
      let p2 = priorities[(priorityIdx + 1) % priorities.length];
      if (p1 === p2) {
        p2 = secondaryList.find(s => s !== p1) || 'Core';
      }
      days3.push([p1, p2]);
      priorityIdx += 2;
    }
    options.push({
      id: 'opt3_2muscles',
      name: `AI Custom Priority Split (${daysPerWeek}-day)`,
      days: days3,
      volumeInfo: '4 sets × 8-12 reps',
      cardioInfo: `${cardio.type} (${cardio.durationMin}m @ ${cardio.intensity})`,
      calorieTarget: cardio.caloriesToBurn,
      difficulty: profile.gymExperience === 'Advanced' ? 'Hard' : 'Medium',
      explanation: `Tailored specifically around your priorities: ${priorities.join(', ')}. Pairs your top groups with supporting muscles. Cardio goal: ${cardio.reason}`
    });
  } else if (groupsPerDay === '1 Muscle') {
    // 1 Muscle Option 1: Classic Bro-Split
    const broSequence = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Chest'];
    const days1 = broSequence.slice(0, daysPerWeek).map(m => [m]);
    options.push({
      id: 'opt1_1muscle',
      name: `Classic Bro Split (${daysPerWeek}-day)`,
      days: days1,
      volumeInfo: '5 sets × 8-10 reps (strength/size focus)',
      cardioInfo: `${cardio.type} (${cardio.durationMin}m @ ${cardio.intensity})`,
      calorieTarget: cardio.caloriesToBurn,
      difficulty: 'Hard',
      explanation: `Targets exactly 1 muscle group per day to allow for maximum volume and absolute isolation. Cardio goal: ${cardio.reason}`
    });

    // 1 Muscle Option 2: Priority Group Focus
    const days2: string[][] = [];
    for (let i = 0; i < daysPerWeek; i++) {
      days2.push([priorities[i % priorities.length]]);
    }
    options.push({
      id: 'opt2_1muscle',
      name: `Priority Target Split (${daysPerWeek}-day)`,
      days: days2,
      volumeInfo: '4 sets × 10-12 reps',
      cardioInfo: `${cardio.type} (${cardio.durationMin}m @ ${cardio.intensity})`,
      calorieTarget: cardio.caloriesToBurn,
      difficulty: 'Medium',
      explanation: `Focuses exclusively on your priority groups: ${priorities.slice(0, daysPerWeek).join(', ')}. Cardio goal: ${cardio.reason}`
    });

    // 1 Muscle Option 3: Heavy Compounds
    const heavySequence = ['Chest', 'Back', 'Legs', 'Shoulders', 'Back', 'Chest', 'Legs'];
    const days3 = heavySequence.slice(0, daysPerWeek).map(m => [m]);
    options.push({
      id: 'opt3_1muscle',
      name: `Heavy Compound Focus (${daysPerWeek}-day)`,
      days: days3,
      volumeInfo: '4 sets × 6-8 reps (heavy strength)',
      cardioInfo: `${cardio.type} (${cardio.durationMin}m @ ${cardio.intensity})`,
      calorieTarget: cardio.caloriesToBurn,
      difficulty: 'Hard',
      explanation: `Targets a single major compound muscle group per day with heavy resistance, rotating through chest, back, and legs. Cardio goal: ${cardio.reason}`
    });
  } else {
    // Full Body Options
    // Option 1: Full Body Compound
    const fbMuscles = ['Chest', 'Back', 'Legs', 'Shoulders', 'Core'];
    const days1 = Array.from({ length: daysPerWeek }, () => fbMuscles);
    options.push({
      id: 'opt1_fb',
      name: `Full Body Strength (${daysPerWeek}-day)`,
      days: days1,
      volumeInfo: '3 sets × 5-8 reps (compound lifts)',
      cardioInfo: `${cardio.type} (${cardio.durationMin}m @ ${cardio.intensity})`,
      calorieTarget: cardio.caloriesToBurn,
      difficulty: 'Medium',
      explanation: `Hits all major muscle groups every session. Excellent for building solid strength and boosting metabolic burn. Cardio goal: ${cardio.reason}`
    });

    // Option 2: Full Body Hypertrophy
    const fbHypertrophy = ['Chest', 'Back', 'Legs', 'Arms', 'Shoulders'];
    const days2 = Array.from({ length: daysPerWeek }, () => fbHypertrophy);
    options.push({
      id: 'opt2_fb',
      name: `Full Body Hypertrophy (${daysPerWeek}-day)`,
      days: days2,
      volumeInfo: '3 sets × 10-12 reps (higher volume)',
      cardioInfo: `${cardio.type} (${cardio.durationMin}m @ ${cardio.intensity})`,
      calorieTarget: cardio.caloriesToBurn,
      difficulty: 'Hard',
      explanation: `Emphasizes muscle size and high blood flow, hitting every group in the hypertrophic rep range. Cardio goal: ${cardio.reason}`
    });

    // Option 3: Full Body Conditioning
    const fbCond = ['Chest', 'Back', 'Legs', 'Core', 'Cardio'];
    const days3 = Array.from({ length: daysPerWeek }, () => fbCond);
    options.push({
      id: 'opt3_fb',
      name: `Full Body Metabolic Conditioning (${daysPerWeek}-day)`,
      days: days3,
      volumeInfo: '3 sets × 15 reps (high pace, low rest)',
      cardioInfo: `${cardio.type} (${cardio.durationMin}m @ ${cardio.intensity})`,
      calorieTarget: cardio.caloriesToBurn + 100,
      difficulty: 'Hard',
      explanation: `Designed to burn fat and build cardiovascular endurance while preserving muscle tissue. Cardio goal: ${cardio.reason}`
    });
  }

  return options;
}
