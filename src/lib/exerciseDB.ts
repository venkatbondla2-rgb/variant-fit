// src/lib/exerciseDB.ts

export type WorkoutType = "home" | "calisthenics" | "gym";

export interface ExerciseDef {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  unit: string;
}

export interface ExerciseSet {
  setNumber: number;
  reps: number;
  weight: number;
}

export interface WorkoutItem {
  name: string;
  sets: ExerciseSet[];
  unit: string;
  completed: boolean;
  primaryRegions?: string[];
  secondaryRegions?: string[];
}

export interface MuscleRegionExercise {
  name: string;
  primaryRegions: string[];
  secondaryRegions: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  equipment: "barbell" | "dumbbell" | "machine" | "bodyweight" | "cables" | "band";
  defaultSets?: number;
  defaultReps?: number;
  defaultWeight?: number;
  defaultUnit?: string;
}

export const REGION_TO_GROUP: Record<string, string> = {
  upper_chest: "Chest",
  mid_chest: "Chest",
  lower_chest: "Chest",
  lat_width: "Back",
  lat_thickness: "Back",
  upper_back: "Back",
  lower_back: "Back",
  front_delts: "Shoulders",
  side_delts: "Shoulders",
  rear_delts: "Shoulders",
  quads: "Legs",
  hamstrings: "Legs",
  glutes: "Legs",
  calves: "Legs",
  biceps_long: "Biceps",
  biceps_short: "Biceps",
  triceps_long: "Triceps",
  triceps_lateral: "Triceps",
  abs: "Core",
  obliques: "Core",
  cardio: "Cardio",
};

export const GROUP_TO_REGIONS: Record<string, string[]> = {
  Chest: ["upper_chest", "mid_chest", "lower_chest"],
  Back: ["lat_width", "lat_thickness", "upper_back", "lower_back"],
  Shoulders: ["front_delts", "side_delts", "rear_delts"],
  Legs: ["quads", "hamstrings", "glutes", "calves"],
  Biceps: ["biceps_long", "biceps_short"],
  Triceps: ["triceps_long", "triceps_lateral"],
  Arms: ["biceps_long", "biceps_short", "triceps_long", "triceps_lateral"],
  Core: ["abs", "obliques"],
  Cardio: ["cardio"],
};

export const REGION_DISPLAY_NAMES: Record<string, string> = {
  upper_chest: "Upper Chest",
  mid_chest: "Mid Chest",
  lower_chest: "Lower Chest",
  lat_width: "Lats (Width)",
  lat_thickness: "Lats (Thickness)",
  upper_back: "Upper Back",
  lower_back: "Lower Back",
  front_delts: "Front Delts",
  side_delts: "Side Delts",
  rear_delts: "Rear Delts",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  biceps_long: "Biceps (Long Head)",
  biceps_short: "Biceps (Short Head)",
  triceps_long: "Triceps (Long Head)",
  triceps_lateral: "Triceps (Lateral Head)",
  abs: "Abs",
  obliques: "Obliques",
  cardio: "Cardio",
};

export const MUSCLE_REGION_EXERCISES: MuscleRegionExercise[] = [
  // Upper Chest
  {
    name: "Barbell Incline Bench Press",
    primaryRegions: ["upper_chest"],
    secondaryRegions: ["front_delts", "triceps_lateral"],
    difficulty: "intermediate",
    equipment: "barbell",
    defaultSets: 4, defaultReps: 8, defaultWeight: 50, defaultUnit: "kg"
  },
  {
    name: "Incline Dumbbell Press",
    primaryRegions: ["upper_chest"],
    secondaryRegions: ["front_delts", "triceps_lateral"],
    difficulty: "intermediate",
    equipment: "dumbbell",
    defaultSets: 3, defaultReps: 10, defaultWeight: 18, defaultUnit: "kg"
  },
  {
    name: "Incline Chest Press Machine",
    primaryRegions: ["upper_chest"],
    secondaryRegions: ["front_delts", "triceps_lateral"],
    difficulty: "beginner",
    equipment: "machine",
    defaultSets: 4, defaultReps: 10, defaultWeight: 30, defaultUnit: "kg"
  },
  {
    name: "Incline Cable Fly",
    primaryRegions: ["upper_chest"],
    secondaryRegions: ["front_delts"],
    difficulty: "intermediate",
    equipment: "cables",
    defaultSets: 3, defaultReps: 12, defaultWeight: 10, defaultUnit: "kg"
  },
  {
    name: "Low-to-High Cable Fly",
    primaryRegions: ["upper_chest"],
    secondaryRegions: ["front_delts"],
    difficulty: "intermediate",
    equipment: "cables",
    defaultSets: 3, defaultReps: 12, defaultWeight: 10, defaultUnit: "kg"
  },
  {
    name: "Pike Push Ups",
    primaryRegions: ["upper_chest", "front_delts"],
    secondaryRegions: ["triceps_lateral"],
    difficulty: "intermediate",
    equipment: "bodyweight",
    defaultSets: 3, defaultReps: 12, defaultWeight: 0, defaultUnit: "reps"
  },

  // Mid Chest
  {
    name: "Barbell Bench Press",
    primaryRegions: ["mid_chest"],
    secondaryRegions: ["front_delts", "triceps_lateral", "upper_chest"],
    difficulty: "intermediate",
    equipment: "barbell",
    defaultSets: 4, defaultReps: 8, defaultWeight: 60, defaultUnit: "kg"
  },
  {
    name: "Dumbbell Bench Press",
    primaryRegions: ["mid_chest"],
    secondaryRegions: ["front_delts", "triceps_lateral"],
    difficulty: "intermediate",
    equipment: "dumbbell",
    defaultSets: 4, defaultReps: 10, defaultWeight: 22, defaultUnit: "kg"
  },
  {
    name: "Chest Press Machine",
    primaryRegions: ["mid_chest"],
    secondaryRegions: ["front_delts", "triceps_lateral"],
    difficulty: "beginner",
    equipment: "machine",
    defaultSets: 3, defaultReps: 10, defaultWeight: 40, defaultUnit: "kg"
  },
  {
    name: "Cable Fly",
    primaryRegions: ["mid_chest"],
    secondaryRegions: ["front_delts"],
    difficulty: "intermediate",
    equipment: "cables",
    defaultSets: 3, defaultReps: 12, defaultWeight: 15, defaultUnit: "kg"
  },
  {
    name: "Push Ups",
    primaryRegions: ["mid_chest"],
    secondaryRegions: ["triceps_lateral", "front_delts"],
    difficulty: "beginner",
    equipment: "bodyweight",
    defaultSets: 4, defaultReps: 15, defaultWeight: 0, defaultUnit: "reps"
  },
  {
    name: "Ring Push Ups",
    primaryRegions: ["mid_chest"],
    secondaryRegions: ["triceps_lateral", "front_delts"],
    difficulty: "advanced",
    equipment: "bodyweight",
    defaultSets: 4, defaultReps: 10, defaultWeight: 0, defaultUnit: "reps"
  },

  // Lower Chest
  {
    name: "Decline Barbell Bench Press",
    primaryRegions: ["lower_chest"],
    secondaryRegions: ["triceps_lateral", "front_delts"],
    difficulty: "intermediate",
    equipment: "barbell",
    defaultSets: 4, defaultReps: 8, defaultWeight: 50, defaultUnit: "kg"
  },
  {
    name: "Decline Dumbbell Press",
    primaryRegions: ["lower_chest"],
    secondaryRegions: ["triceps_lateral"],
    difficulty: "intermediate",
    equipment: "dumbbell",
    defaultSets: 3, defaultReps: 10, defaultWeight: 18, defaultUnit: "kg"
  },
  {
    name: "Chest Dips",
    primaryRegions: ["lower_chest"],
    secondaryRegions: ["triceps_lateral", "front_delts"],
    difficulty: "advanced",
    equipment: "bodyweight",
    defaultSets: 3, defaultReps: 10, defaultWeight: 0, defaultUnit: "reps"
  },
  {
    name: "High-to-Low Cable Fly",
    primaryRegions: ["lower_chest"],
    secondaryRegions: ["front_delts"],
    difficulty: "intermediate",
    equipment: "cables",
    defaultSets: 3, defaultReps: 12, defaultWeight: 12, defaultUnit: "kg"
  },
  {
    name: "Pec Deck Machine",
    primaryRegions: ["lower_chest", "mid_chest"],
    secondaryRegions: ["front_delts"],
    difficulty: "beginner",
    equipment: "machine",
    defaultSets: 3, defaultReps: 12, defaultWeight: 25, defaultUnit: "kg"
  },

  // Lat Width
  {
    name: "Pull Ups",
    primaryRegions: ["lat_width"],
    secondaryRegions: ["biceps_long", "upper_back"],
    difficulty: "advanced",
    equipment: "bodyweight",
    defaultSets: 3, defaultReps: 8, defaultWeight: 0, defaultUnit: "reps"
  },
  {
    name: "Lat Pulldown",
    primaryRegions: ["lat_width"],
    secondaryRegions: ["biceps_long", "upper_back"],
    difficulty: "beginner",
    equipment: "machine",
    defaultSets: 3, defaultReps: 10, defaultWeight: 40, defaultUnit: "kg"
  },
  {
    name: "Straight Arm Pulldown",
    primaryRegions: ["lat_width"],
    secondaryRegions: ["triceps_long"],
    difficulty: "intermediate",
    equipment: "cables",
    defaultSets: 3, defaultReps: 12, defaultWeight: 15, defaultUnit: "kg"
  },
  {
    name: "Wide Grip Cable Row",
    primaryRegions: ["lat_width", "upper_back"],
    secondaryRegions: ["biceps_short"],
    difficulty: "intermediate",
    equipment: "cables",
    defaultSets: 3, defaultReps: 12, defaultWeight: 35, defaultUnit: "kg"
  },

  // Lat Thickness
  {
    name: "Barbell Row",
    primaryRegions: ["lat_thickness"],
    secondaryRegions: ["upper_back", "biceps_long", "lower_back"],
    difficulty: "intermediate",
    equipment: "barbell",
    defaultSets: 4, defaultReps: 8, defaultWeight: 50, defaultUnit: "kg"
  },
  {
    name: "One-Arm Dumbbell Row",
    primaryRegions: ["lat_thickness"],
    secondaryRegions: ["upper_back", "biceps_short"],
    difficulty: "beginner",
    equipment: "dumbbell",
    defaultSets: 4, defaultReps: 10, defaultWeight: 20, defaultUnit: "kg"
  },
  {
    name: "T-Bar Row",
    primaryRegions: ["lat_thickness", "upper_back"],
    secondaryRegions: ["biceps_long"],
    difficulty: "intermediate",
    equipment: "machine",
    defaultSets: 4, defaultReps: 8, defaultWeight: 30, defaultUnit: "kg"
  },
  {
    name: "Seated Cable Row",
    primaryRegions: ["lat_thickness"],
    secondaryRegions: ["upper_back", "biceps_long"],
    difficulty: "beginner",
    equipment: "cables",
    defaultSets: 3, defaultReps: 12, defaultWeight: 35, defaultUnit: "kg"
  },

  // Upper Back
  {
    name: "Deadlift",
    primaryRegions: ["upper_back", "lower_back", "glutes", "hamstrings"],
    secondaryRegions: ["forearms"],
    difficulty: "advanced",
    equipment: "barbell",
    defaultSets: 4, defaultReps: 6, defaultWeight: 80, defaultUnit: "kg"
  },
  {
    name: "Face Pulls",
    primaryRegions: ["upper_back", "rear_delts"],
    secondaryRegions: ["side_delts"],
    difficulty: "beginner",
    equipment: "cables",
    defaultSets: 3, defaultReps: 15, defaultWeight: 15, defaultUnit: "kg"
  },
  {
    name: "Reverse Snow Angels",
    primaryRegions: ["upper_back"],
    secondaryRegions: ["rear_delts"],
    difficulty: "beginner",
    equipment: "bodyweight",
    defaultSets: 3, defaultReps: 12, defaultWeight: 0, defaultUnit: "reps"
  },
  {
    name: "Chest Supported Row",
    primaryRegions: ["upper_back"],
    secondaryRegions: ["biceps_long"],
    difficulty: "beginner",
    equipment: "machine",
    defaultSets: 3, defaultReps: 10, defaultWeight: 25, defaultUnit: "kg"
  },

  // Lower Back
  {
    name: "Hyperextensions",
    primaryRegions: ["lower_back"],
    secondaryRegions: ["glutes", "hamstrings"],
    difficulty: "beginner",
    equipment: "machine",
    defaultSets: 3, defaultReps: 12, defaultWeight: 0, defaultUnit: "reps"
  },
  {
    name: "Superman Hold",
    primaryRegions: ["lower_back"],
    secondaryRegions: ["glutes"],
    difficulty: "beginner",
    equipment: "bodyweight",
    defaultSets: 3, defaultReps: 15, defaultWeight: 0, defaultUnit: "sec"
  },
  {
    name: "Good Mornings",
    primaryRegions: ["lower_back", "hamstrings"],
    secondaryRegions: ["glutes"],
    difficulty: "intermediate",
    equipment: "barbell",
    defaultSets: 3, defaultReps: 10, defaultWeight: 30, defaultUnit: "kg"
  },

  // Front Delts
  {
    name: "Overhead Barbell Press",
    primaryRegions: ["front_delts"],
    secondaryRegions: ["side_delts", "triceps_lateral"],
    difficulty: "intermediate",
    equipment: "barbell",
    defaultSets: 4, defaultReps: 8, defaultWeight: 40, defaultUnit: "kg"
  },
  {
    name: "Dumbbell Shoulder Press",
    primaryRegions: ["front_delts"],
    secondaryRegions: ["side_delts", "triceps_lateral"],
    difficulty: "intermediate",
    equipment: "dumbbell",
    defaultSets: 4, defaultReps: 10, defaultWeight: 16, defaultUnit: "kg"
  },
  {
    name: "Arnold Press",
    primaryRegions: ["front_delts"],
    secondaryRegions: ["side_delts", "triceps_lateral"],
    difficulty: "intermediate",
    equipment: "dumbbell",
    defaultSets: 3, defaultReps: 10, defaultWeight: 14, defaultUnit: "kg"
  },
  {
    name: "Front Raise",
    primaryRegions: ["front_delts"],
    secondaryRegions: ["side_delts"],
    difficulty: "beginner",
    equipment: "dumbbell",
    defaultSets: 3, defaultReps: 12, defaultWeight: 8, defaultUnit: "kg"
  },

  // Side Delts
  {
    name: "Lateral Raise",
    primaryRegions: ["side_delts"],
    secondaryRegions: ["front_delts"],
    difficulty: "beginner",
    equipment: "dumbbell",
    defaultSets: 4, defaultReps: 15, defaultWeight: 8, defaultUnit: "kg"
  },
  {
    name: "Cable Lateral Raise",
    primaryRegions: ["side_delts"],
    secondaryRegions: ["rear_delts"],
    difficulty: "intermediate",
    equipment: "cables",
    defaultSets: 3, defaultReps: 15, defaultWeight: 7, defaultUnit: "kg"
  },
  {
    name: "Machine Lateral Raise",
    primaryRegions: ["side_delts"],
    secondaryRegions: ["front_delts"],
    difficulty: "beginner",
    equipment: "machine",
    defaultSets: 3, defaultReps: 12, defaultWeight: 15, defaultUnit: "kg"
  },
  {
    name: "Upright Row",
    primaryRegions: ["side_delts", "upper_back"],
    secondaryRegions: ["front_delts", "biceps_long"],
    difficulty: "intermediate",
    equipment: "barbell",
    defaultSets: 3, defaultReps: 10, defaultWeight: 25, defaultUnit: "kg"
  },

  // Rear Delts
  {
    name: "Rear Delt Fly",
    primaryRegions: ["rear_delts"],
    secondaryRegions: ["upper_back"],
    difficulty: "beginner",
    equipment: "dumbbell",
    defaultSets: 3, defaultReps: 15, defaultWeight: 6, defaultUnit: "kg"
  },
  {
    name: "Reverse Pec Deck",
    primaryRegions: ["rear_delts"],
    secondaryRegions: ["upper_back"],
    difficulty: "beginner",
    equipment: "machine",
    defaultSets: 3, defaultReps: 12, defaultWeight: 20, defaultUnit: "kg"
  },

  // Quads
  {
    name: "Barbell Squat",
    primaryRegions: ["quads"],
    secondaryRegions: ["glutes", "hamstrings", "lower_back"],
    difficulty: "intermediate",
    equipment: "barbell",
    defaultSets: 4, defaultReps: 8, defaultWeight: 80, defaultUnit: "kg"
  },
  {
    name: "Leg Press",
    primaryRegions: ["quads"],
    secondaryRegions: ["glutes", "hamstrings"],
    difficulty: "beginner",
    equipment: "machine",
    defaultSets: 4, defaultReps: 12, defaultWeight: 100, defaultUnit: "kg"
  },
  {
    name: "Hack Squat",
    primaryRegions: ["quads"],
    secondaryRegions: ["glutes", "hamstrings"],
    difficulty: "intermediate",
    equipment: "machine",
    defaultSets: 4, defaultReps: 10, defaultWeight: 40, defaultUnit: "kg"
  },
  {
    name: "Leg Extension",
    primaryRegions: ["quads"],
    secondaryRegions: [],
    difficulty: "beginner",
    equipment: "machine",
    defaultSets: 3, defaultReps: 12, defaultWeight: 30, defaultUnit: "kg"
  },
  {
    name: "Bulgarian Split Squat",
    primaryRegions: ["quads", "glutes"],
    secondaryRegions: ["hamstrings"],
    difficulty: "intermediate",
    equipment: "dumbbell",
    defaultSets: 3, defaultReps: 10, defaultWeight: 12, defaultUnit: "kg"
  },
  {
    name: "Goblet Squat",
    primaryRegions: ["quads"],
    secondaryRegions: ["glutes"],
    difficulty: "beginner",
    equipment: "dumbbell",
    defaultSets: 3, defaultReps: 12, defaultWeight: 14, defaultUnit: "kg"
  },

  // Hamstrings
  {
    name: "Romanian Deadlift",
    primaryRegions: ["hamstrings", "glutes"],
    secondaryRegions: ["lower_back"],
    difficulty: "intermediate",
    equipment: "barbell",
    defaultSets: 4, defaultReps: 10, defaultWeight: 60, defaultUnit: "kg"
  },
  {
    name: "Lying Leg Curl",
    primaryRegions: ["hamstrings"],
    secondaryRegions: ["calves"],
    difficulty: "beginner",
    equipment: "machine",
    defaultSets: 3, defaultReps: 12, defaultWeight: 25, defaultUnit: "kg"
  },
  {
    name: "Seated Leg Curl",
    primaryRegions: ["hamstrings"],
    secondaryRegions: ["calves"],
    difficulty: "beginner",
    equipment: "machine",
    defaultSets: 3, defaultReps: 12, defaultWeight: 25, defaultUnit: "kg"
  },
  {
    name: "Nordic Hamstring Curl",
    primaryRegions: ["hamstrings"],
    secondaryRegions: ["glutes"],
    difficulty: "advanced",
    equipment: "bodyweight",
    defaultSets: 3, defaultReps: 6, defaultWeight: 0, defaultUnit: "reps"
  },

  // Glutes
  {
    name: "Hip Thrust",
    primaryRegions: ["glutes"],
    secondaryRegions: ["hamstrings"],
    difficulty: "intermediate",
    equipment: "barbell",
    defaultSets: 4, defaultReps: 10, defaultWeight: 50, defaultUnit: "kg"
  },
  {
    name: "Glute Bridge",
    primaryRegions: ["glutes"],
    secondaryRegions: ["hamstrings"],
    difficulty: "beginner",
    equipment: "bodyweight",
    defaultSets: 3, defaultReps: 15, defaultWeight: 0, defaultUnit: "reps"
  },
  {
    name: "Cable Kickback",
    primaryRegions: ["glutes"],
    secondaryRegions: ["hamstrings"],
    difficulty: "beginner",
    equipment: "cables",
    defaultSets: 3, defaultReps: 12, defaultWeight: 10, defaultUnit: "kg"
  },

  // Calves
  {
    name: "Standing Calf Raise",
    primaryRegions: ["calves"],
    secondaryRegions: [],
    difficulty: "beginner",
    equipment: "machine",
    defaultSets: 4, defaultReps: 15, defaultWeight: 40, defaultUnit: "kg"
  },
  {
    name: "Seated Calf Raise",
    primaryRegions: ["calves"],
    secondaryRegions: [],
    difficulty: "beginner",
    equipment: "machine",
    defaultSets: 3, defaultReps: 15, defaultWeight: 20, defaultUnit: "kg"
  },
  {
    name: "Calf Raise on Stairs",
    primaryRegions: ["calves"],
    secondaryRegions: [],
    difficulty: "beginner",
    equipment: "bodyweight",
    defaultSets: 4, defaultReps: 20, defaultWeight: 0, defaultUnit: "reps"
  },

  // Biceps Long Head
  {
    name: "Incline Dumbbell Curl",
    primaryRegions: ["biceps_long"],
    secondaryRegions: ["forearms"],
    difficulty: "intermediate",
    equipment: "dumbbell",
    defaultSets: 3, defaultReps: 10, defaultWeight: 10, defaultUnit: "kg"
  },
  {
    name: "Hammer Curl",
    primaryRegions: ["biceps_long"],
    secondaryRegions: ["forearms"],
    difficulty: "beginner",
    equipment: "dumbbell",
    defaultSets: 3, defaultReps: 12, defaultWeight: 12, defaultUnit: "kg"
  },
  {
    name: "Cable Curl",
    primaryRegions: ["biceps_long"],
    secondaryRegions: [],
    difficulty: "beginner",
    equipment: "cables",
    defaultSets: 3, defaultReps: 12, defaultWeight: 15, defaultUnit: "kg"
  },

  // Biceps Short Head
  {
    name: "Barbell Bicep Curl",
    primaryRegions: ["biceps_short"],
    secondaryRegions: ["forearms"],
    difficulty: "intermediate",
    equipment: "barbell",
    defaultSets: 3, defaultReps: 10, defaultWeight: 25, defaultUnit: "kg"
  },
  {
    name: "Preacher Curl",
    primaryRegions: ["biceps_short"],
    secondaryRegions: [],
    difficulty: "intermediate",
    equipment: "machine",
    defaultSets: 3, defaultReps: 12, defaultWeight: 20, defaultUnit: "kg"
  },
  {
    name: "Concentration Curl",
    primaryRegions: ["biceps_short"],
    secondaryRegions: [],
    difficulty: "beginner",
    equipment: "dumbbell",
    defaultSets: 3, defaultReps: 10, defaultWeight: 10, defaultUnit: "kg"
  },

  // Triceps Long Head
  {
    name: "Skull Crusher",
    primaryRegions: ["triceps_long"],
    secondaryRegions: ["triceps_lateral"],
    difficulty: "intermediate",
    equipment: "barbell",
    defaultSets: 3, defaultReps: 10, defaultWeight: 20, defaultUnit: "kg"
  },
  {
    name: "Overhead Cable Extension",
    primaryRegions: ["triceps_long"],
    secondaryRegions: [],
    difficulty: "intermediate",
    equipment: "cables",
    defaultSets: 3, defaultReps: 12, defaultWeight: 15, defaultUnit: "kg"
  },
  {
    name: "Dumbbell Overhead Extension",
    primaryRegions: ["triceps_long"],
    secondaryRegions: [],
    difficulty: "beginner",
    equipment: "dumbbell",
    defaultSets: 3, defaultReps: 12, defaultWeight: 12, defaultUnit: "kg"
  },

  // Triceps Lateral/Medial Head
  {
    name: "Tricep Rope Pushdown",
    primaryRegions: ["triceps_lateral"],
    secondaryRegions: [],
    difficulty: "beginner",
    equipment: "cables",
    defaultSets: 3, defaultReps: 12, defaultWeight: 15, defaultUnit: "kg"
  },
  {
    name: "Close Grip Bench Press",
    primaryRegions: ["triceps_lateral"],
    secondaryRegions: ["mid_chest", "front_delts"],
    difficulty: "intermediate",
    equipment: "barbell",
    defaultSets: 3, defaultReps: 10, defaultWeight: 40, defaultUnit: "kg"
  },
  {
    name: "Dips",
    primaryRegions: ["triceps_lateral", "lower_chest"],
    secondaryRegions: ["front_delts"],
    difficulty: "advanced",
    equipment: "bodyweight",
    defaultSets: 3, defaultReps: 12, defaultWeight: 0, defaultUnit: "reps"
  },
  {
    name: "Diamond Push Ups",
    primaryRegions: ["triceps_lateral", "mid_chest"],
    secondaryRegions: ["front_delts"],
    difficulty: "intermediate",
    equipment: "bodyweight",
    defaultSets: 3, defaultReps: 12, defaultWeight: 0, defaultUnit: "reps"
  },

  // Abs
  {
    name: "Cable Crunch",
    primaryRegions: ["abs"],
    secondaryRegions: [],
    difficulty: "intermediate",
    equipment: "cables",
    defaultSets: 3, defaultReps: 15, defaultWeight: 20, defaultUnit: "kg"
  },
  {
    name: "Hanging Leg Raise",
    primaryRegions: ["abs"],
    secondaryRegions: ["obliques"],
    difficulty: "advanced",
    equipment: "bodyweight",
    defaultSets: 3, defaultReps: 12, defaultWeight: 0, defaultUnit: "reps"
  },
  {
    name: "Crunches",
    primaryRegions: ["abs"],
    secondaryRegions: [],
    difficulty: "beginner",
    equipment: "bodyweight",
    defaultSets: 3, defaultReps: 20, defaultWeight: 0, defaultUnit: "reps"
  },
  {
    name: "Ab Wheel Rollout",
    primaryRegions: ["abs"],
    secondaryRegions: ["lower_back"],
    difficulty: "advanced",
    equipment: "bodyweight",
    defaultSets: 3, defaultReps: 10, defaultWeight: 0, defaultUnit: "reps"
  },

  // Obliques
  {
    name: "Russian Twist",
    primaryRegions: ["obliques"],
    secondaryRegions: ["abs"],
    difficulty: "beginner",
    equipment: "dumbbell",
    defaultSets: 3, defaultReps: 20, defaultWeight: 8, defaultUnit: "kg"
  },
  {
    name: "Woodchop",
    primaryRegions: ["obliques"],
    secondaryRegions: ["abs", "shoulders"],
    difficulty: "intermediate",
    equipment: "cables",
    defaultSets: 3, defaultReps: 12, defaultWeight: 15, defaultUnit: "kg"
  },
  {
    name: "Side Plank",
    primaryRegions: ["obliques"],
    secondaryRegions: ["abs"],
    difficulty: "beginner",
    equipment: "bodyweight",
    defaultSets: 3, defaultReps: 30, defaultWeight: 0, defaultUnit: "sec"
  },

  // Cardio
  {
    name: "Treadmill Run",
    primaryRegions: ["cardio"],
    secondaryRegions: ["quads", "calves"],
    difficulty: "beginner",
    equipment: "machine",
    defaultSets: 1, defaultReps: 20, defaultWeight: 0, defaultUnit: "min"
  },
  {
    name: "Jump Rope",
    primaryRegions: ["cardio"],
    secondaryRegions: ["calves"],
    difficulty: "beginner",
    equipment: "bodyweight",
    defaultSets: 3, defaultReps: 60, defaultWeight: 0, defaultUnit: "sec"
  },
  {
    name: "Cycling",
    primaryRegions: ["cardio"],
    secondaryRegions: ["quads"],
    difficulty: "beginner",
    equipment: "machine",
    defaultSets: 1, defaultReps: 20, defaultWeight: 0, defaultUnit: "min"
  },
  {
    name: "Stairmaster",
    primaryRegions: ["cardio"],
    secondaryRegions: ["quads", "glutes", "calves"],
    difficulty: "beginner",
    equipment: "machine",
    defaultSets: 1, defaultReps: 15, defaultWeight: 0, defaultUnit: "min"
  }
];

// Reconstruct the legacy EXERCISE_DB structure dynamically to maintain backward compatibility
const buildExerciseDB = () => {
  const dbObj: Record<string, Record<string, { varA: ExerciseDef[]; varB: ExerciseDef[]; varC: ExerciseDef[]; alternatives: string[] }>> = {
    gym: {},
    home: {},
    calisthenics: {},
  };

  const types: WorkoutType[] = ["gym", "home", "calisthenics"];
  const groups = ["Chest", "Back", "Shoulders", "Legs", "Biceps", "Triceps", "Arms", "Core", "Cardio"];

  types.forEach(t => {
    dbObj[t] = {};
    groups.forEach(g => {
      dbObj[t][g] = { varA: [], varB: [], varC: [], alternatives: [] };
    });
  });

  const getGroup = (ex: MuscleRegionExercise): string => {
    const primary = ex.primaryRegions[0];
    const group = REGION_TO_GROUP[primary];
    if (group === "Biceps" || group === "Triceps") return group;
    return group || "Chest";
  };

  types.forEach(workoutType => {
    groups.forEach(group => {
      // 1. Filter exercises matching the group and equipment type
      const groupExercises = MUSCLE_REGION_EXERCISES.filter(ex => {
        const exGroup = getGroup(ex);
        // Special case: Arms group includes biceps and triceps exercises
        if (group === "Arms") {
          if (exGroup !== "Biceps" && exGroup !== "Triceps" && exGroup !== "Arms") return false;
        } else {
          if (exGroup !== group) return false;
        }

        let matchesEquipment = false;
        if (workoutType === "gym") {
          matchesEquipment = ["barbell", "dumbbell", "machine", "cables"].includes(ex.equipment) || ex.equipment === "bodyweight";
        } else if (workoutType === "home") {
          matchesEquipment = ["dumbbell", "bodyweight", "band"].includes(ex.equipment);
        } else { // calisthenics
          matchesEquipment = ["bodyweight", "band", "cables"].includes(ex.equipment);
        }
        return matchesEquipment;
      });

      // 2. Group these candidate exercises by their primary regions
      const regionToExs: Record<string, MuscleRegionExercise[]> = {};
      groupExercises.forEach(ex => {
        const primary = ex.primaryRegions[0];
        if (!regionToExs[primary]) {
          regionToExs[primary] = [];
        }
        regionToExs[primary].push(ex);
      });

      // Get list of regions for this group
      // For "Arms" we combine Biceps and Triceps regions
      let regionsForGroup = GROUP_TO_REGIONS[group] || [];
      if (group === "Arms") {
        regionsForGroup = [...(GROUP_TO_REGIONS.Biceps || []), ...(GROUP_TO_REGIONS.Triceps || [])];
      }

      const activeRegions = regionsForGroup.filter(r => regionToExs[r] && regionToExs[r].length > 0);
      const regionPointers: Record<string, number> = {};
      activeRegions.forEach(r => {
        regionPointers[r] = 0;
      });

      const usedNames = new Set<string>();
      const variations: ("varA" | "varB" | "varC")[] = ["varA", "varB", "varC"];

      // 3. Populate varA, varB, varC
      variations.forEach(vName => {
        const variationList = dbObj[workoutType][group][vName];
        let regionCycleIdx = 0;

        // Try to add up to 3 exercises from alternating active regions
        for (let slot = 0; slot < 3; slot++) {
          let added = false;
          // Try to loop through regions to find one that has unused exercises
          for (let attempt = 0; attempt < activeRegions.length; attempt++) {
            const reg = activeRegions[regionCycleIdx % activeRegions.length];
            regionCycleIdx++;

            const list = regionToExs[reg] || [];
            const ptr = regionPointers[reg] || 0;
            if (ptr < list.length) {
              const ex = list[ptr];
              regionPointers[reg] = ptr + 1;

              const def: ExerciseDef = {
                name: ex.name,
                sets: ex.defaultSets || 3,
                reps: ex.defaultReps || 10,
                weight: ex.defaultWeight || 0,
                unit: ex.defaultUnit || "reps",
              };
              variationList.push(def);
              usedNames.add(ex.name);
              added = true;
              break;
            }
          }

          // Fallback: If we couldn't find any exercise from active regions (e.g. all exhausted),
          // search for any unused exercise in groupExercises
          if (!added) {
            const unusedEx = groupExercises.find(ex => !usedNames.has(ex.name));
            if (unusedEx) {
              const def: ExerciseDef = {
                name: unusedEx.name,
                sets: unusedEx.defaultSets || 3,
                reps: unusedEx.defaultReps || 10,
                weight: unusedEx.defaultWeight || 0,
                unit: unusedEx.defaultUnit || "reps",
              };
              variationList.push(def);
              usedNames.add(unusedEx.name);
            }
          }
        }
      });

      // 4. Any remaining exercises in groupExercises go to alternatives
      groupExercises.forEach(ex => {
        if (!usedNames.has(ex.name)) {
          dbObj[workoutType][group].alternatives.push(ex.name);
        }
      });
    });
  });

  return dbObj as unknown as Record<string, Record<string, { varA: ExerciseDef[]; varB: ExerciseDef[]; varC: ExerciseDef[]; alternatives: string[] }>>;
};

export const EXERCISE_DB = buildExerciseDB();

export const SPLIT_TEMPLATES: Record<string, string[][]> = {
  "3": [["Chest", "Triceps"], ["Back", "Biceps"], ["Legs", "Shoulders"]],
  "4": [["Chest", "Triceps"], ["Back", "Biceps"], ["Legs"], ["Shoulders", "Arms"]],
  "5": [["Chest"], ["Back"], ["Shoulders"], ["Legs"], ["Arms", "Core"]],
  "6": [["Chest"], ["Back"], ["Shoulders"], ["Legs"], ["Arms"], ["Core", "Cardio"]],
};

export const CALORIE_PER_REP: Record<string, number> = {
  "bench press": 0.4, "squat": 0.6, "deadlift": 0.7, "overhead press": 0.35,
  "barbell row": 0.4, "pull up": 0.5, "push up": 0.3, "dumbbell curl": 0.2,
  "tricep pushdown": 0.2, "leg press": 0.5, "lunges": 0.5, "lat pulldown": 0.35,
  "leg curl": 0.3, "calf raise": 0.2, "crunch": 0.15, "plank": 0.1,
  "dips": 0.4, "muscle up": 0.8, "pistol squat": 0.5, "burpees": 0.6,
  "jump squat": 0.5, "mountain climber": 0.3, "jumping jack": 0.2,
};

export function estimateCalories(name: string, sets: number, reps: number, weight: number): number {
  const lower = name.toLowerCase();
  let perRep = 0.3;
  for (const [key, val] of Object.entries(CALORIE_PER_REP)) {
    if (lower.includes(key)) { perRep = val; break; }
  }
  return Math.round(perRep * reps * sets * (1 + weight / 200));
}

// Generate high quality, region-specific workout with weekly rotation based on date
export function generateWorkoutForRegions(
  muscleGroups: string[],
  workoutType: WorkoutType,
  experience: "Beginner" | "Intermediate" | "Advanced",
  dateStr: string
): WorkoutItem[] {
  if (muscleGroups.length === 0 || (muscleGroups.length === 1 && muscleGroups[0] === "Rest")) {
    return [
      {
        name: "Running",
        sets: [{ setNumber: 1, reps: 10, weight: 0 }],
        unit: "km",
        completed: false,
      }
    ];
  }

  // Determine the week rotation index and day index to vary exercises on different days of the same week
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000);
  const weekIndex = Math.floor(dayOfYear / 7);
  const dayIndex = (date.getDay() + 6) % 7; // Monday = 0, Sunday = 6
  const rotationIndex = weekIndex + dayIndex;

  // Determine target regions for the given muscle groups
  const targetRegions: string[] = [];
  muscleGroups.forEach(group => {
    const regions = GROUP_TO_REGIONS[group] || [];
    targetRegions.push(...regions);
  });

  const exercises: WorkoutItem[] = [];

  targetRegions.forEach(region => {
    // Filter exercises targeting this region and compatible with the equipment type
    let candidates = MUSCLE_REGION_EXERCISES.filter(ex => {
      const matchesRegion = ex.primaryRegions.includes(region);
      let matchesEquipment = false;
      if (workoutType === "gym") {
        matchesEquipment = ["barbell", "dumbbell", "machine", "cables"].includes(ex.equipment) || ex.equipment === "bodyweight";
      } else if (workoutType === "home") {
        matchesEquipment = ["dumbbell", "bodyweight", "band"].includes(ex.equipment);
      } else { // calisthenics
        matchesEquipment = ["bodyweight", "band", "cables"].includes(ex.equipment);
      }
      return matchesRegion && matchesEquipment;
    });

    if (candidates.length === 0) {
      candidates = MUSCLE_REGION_EXERCISES.filter(ex => ex.primaryRegions.includes(region));
    }

    if (candidates.length > 0) {
      let matched = candidates.filter(c => c.difficulty === experience.toLowerCase());
      if (matched.length === 0 && experience === "Advanced") {
        matched = candidates.filter(c => c.difficulty === "intermediate");
      }
      if (matched.length === 0) {
        matched = candidates;
      }

      // Rotate exercises based on rotationIndex (week index + day of week)
      const selectedEx = matched[rotationIndex % matched.length];

      const setsCount = selectedEx.defaultSets || 3;
      const repsCount = selectedEx.defaultReps || 10;
      const baseWeight = selectedEx.defaultWeight || 0;
      const unit = selectedEx.defaultUnit || "kg";

      const setArray: ExerciseSet[] = [];
      for (let s = 1; s <= setsCount; s++) {
        let setWeight = baseWeight;
        if (baseWeight > 0) {
          const factor = 0.85 + ((s - 1) / Math.max(1, setsCount - 1)) * 0.25;
          setWeight = Math.round((baseWeight * factor) / 2.5) * 2.5;
          if (setWeight < 2.5) setWeight = 2.5;
        }
        setArray.push({
          setNumber: s,
          reps: repsCount,
          weight: setWeight
        });
      }

      exercises.push({
        name: selectedEx.name,
        sets: setArray,
        unit,
        completed: false,
        primaryRegions: selectedEx.primaryRegions,
        secondaryRegions: selectedEx.secondaryRegions
      });
    }
  });

  return exercises;
}

// Find alternatives targeting the exact same muscle region(s)
export function getMuscleRegionAlternatives(
  exerciseName: string,
  workoutType: WorkoutType,
  experience: string
): string[] {
  const exObj = MUSCLE_REGION_EXERCISES.find(e => e.name.toLowerCase() === exerciseName.toLowerCase());
  if (!exObj) {
    // Fallback 1: Try substring matching of the name
    const partialMatch = MUSCLE_REGION_EXERCISES.filter(e => 
      e.name.toLowerCase().includes(exerciseName.toLowerCase()) || 
      exerciseName.toLowerCase().includes(e.name.toLowerCase())
    );
    if (partialMatch.length > 0) {
      const target = partialMatch[0];
      const alts = MUSCLE_REGION_EXERCISES.filter(ex => 
        ex.name.toLowerCase() !== exerciseName.toLowerCase() &&
        ex.primaryRegions.some(r => target.primaryRegions.includes(r))
      );
      if (alts.length > 0) return alts.map(a => a.name).slice(0, 10);
    }
    // Fallback 2: Just return standard exercises
    return ["Push Ups", "Bench Press", "Dumbbell Curl", "Squat", "Plank", "Treadmill Run"].slice(0, 6);
  }

  let alts = MUSCLE_REGION_EXERCISES.filter(ex => {
    if (ex.name.toLowerCase() === exObj.name.toLowerCase()) return false;
    const sharesRegion = ex.primaryRegions.some(r => exObj.primaryRegions.includes(r));
    
    let matchesEquipment = false;
    if (workoutType === "gym") {
      matchesEquipment = ["barbell", "dumbbell", "machine", "cables"].includes(ex.equipment) || ex.equipment === "bodyweight";
    } else if (workoutType === "home") {
      matchesEquipment = ["dumbbell", "bodyweight", "band"].includes(ex.equipment);
    } else { // calisthenics
      matchesEquipment = ["bodyweight", "band", "cables"].includes(ex.equipment);
    }
    return sharesRegion && matchesEquipment;
  });

  // If no alternatives with equipment match, relax the equipment filter
  if (alts.length === 0) {
    alts = MUSCLE_REGION_EXERCISES.filter(ex => 
      ex.name.toLowerCase() !== exObj.name.toLowerCase() &&
      ex.primaryRegions.some(r => exObj.primaryRegions.includes(r))
    );
  }

  return alts.map(a => a.name).slice(0, 10);
}

// Helper to calculate legacy variation for backward compatibility
export function getVariationForDate(dateStr: string, dayIndex: number, daysPerWeek: number): "varA" | "varB" | "varC" {
  const startOfYear = new Date(new Date(dateStr).getFullYear(), 0, 1);
  const current = new Date(dateStr);
  const dayOfYear = Math.floor((current.getTime() - startOfYear.getTime()) / 86400000);
  const weekNumber = Math.floor(dayOfYear / 7);
  const sessionCount = weekNumber;
  const vars: ("varA" | "varB" | "varC")[] = ["varA", "varB", "varC"];
  return vars[(sessionCount + dayIndex) % 3];
}
