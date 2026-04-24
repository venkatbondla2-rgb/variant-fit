"use client";

// Maps exercise names → muscle groups for the body heatmap
const EXERCISE_MUSCLE_MAP: Record<string, string[]> = {
  // Chest
  "bench press": ["chest", "triceps", "front-deltoid"],
  "incline bench press": ["chest", "front-deltoid", "triceps"],
  "dumbbell fly": ["chest"],
  "push up": ["chest", "triceps", "front-deltoid"],
  "cable crossover": ["chest"],
  "chest press": ["chest", "triceps"],
  
  // Back
  "deadlift": ["lower-back", "glutes", "hamstrings", "traps"],
  "barbell row": ["upper-back", "biceps", "rear-deltoid"],
  "pull up": ["lats", "biceps", "upper-back"],
  "lat pulldown": ["lats", "biceps"],
  "seated row": ["upper-back", "biceps", "rear-deltoid"],
  "t-bar row": ["upper-back", "lats"],
  
  // Shoulders   
  "overhead press": ["front-deltoid", "side-deltoid", "triceps"],
  "lateral raise": ["side-deltoid"],
  "front raise": ["front-deltoid"],
  "face pull": ["rear-deltoid", "traps"],
  "shoulder press": ["front-deltoid", "side-deltoid", "triceps"],
  
  // Arms
  "dumbbell curl": ["biceps"],
  "barbell curl": ["biceps"],
  "hammer curl": ["biceps", "forearms"],
  "tricep extension": ["triceps"],
  "tricep pushdown": ["triceps"],
  "skull crusher": ["triceps"],
  
  // Legs
  "squat": ["quads", "glutes", "hamstrings"],
  "leg press": ["quads", "glutes"],
  "lunges": ["quads", "glutes", "hamstrings"],
  "leg curl": ["hamstrings"],
  "leg extension": ["quads"],
  "calf raise": ["calves"],
  
  // Core
  "crunch": ["abs"],
  "plank": ["abs", "lower-back"],
  "sit up": ["abs"],
  "russian twist": ["abs", "obliques"],
  "cable crunch": ["abs"],
};

function getMusclesForExercise(exerciseName: string): string[] {
  const lower = exerciseName.toLowerCase();
  for (const [key, muscles] of Object.entries(EXERCISE_MUSCLE_MAP)) {
    if (lower.includes(key)) return muscles;
  }
  return [];
}

export function getMusclesFromWorkouts(workouts: any[]): Set<string> {
  const activeMuscles = new Set<string>();
  workouts.forEach(w => {
    const muscles = getMusclesForExercise(w.exerciseName || "");
    muscles.forEach(m => activeMuscles.add(m));
  });
  return activeMuscles;
}

interface MuscleMatrixProps {
  activeMuscles: Set<string>;
}

export function MuscleMatrix({ activeMuscles }: MuscleMatrixProps) {
  const getColor = (group: string) => {
    return activeMuscles.has(group) ? "#EAFF66" : "#27272a";
  };
  
  const getGlow = (group: string) => {
    return activeMuscles.has(group) ? "drop-shadow(0 0 6px rgba(234,255,102,0.6))" : "none";
  };

  const totalGroups = 14;
  const activeCount = activeMuscles.size;
  const percentage = Math.round((activeCount / totalGroups) * 100);

  return (
    <div className="bg-surface rounded-xl p-6 border border-border shadow-sm flex flex-col items-center">
      <h3 className="font-bold mb-1 text-sm">Muscle Matrix</h3>
      <p className="text-[10px] text-zinc-500 mb-4">{activeCount}/{totalGroups} groups activated</p>
      
      <svg viewBox="0 0 200 380" className="w-full max-w-[180px] mx-auto" xmlns="http://www.w3.org/2000/svg">
        {/* Head */}
        <circle cx="100" cy="28" r="18" fill="#3f3f46" stroke="#52525b" strokeWidth="1" />
        
        {/* Neck / Traps */}
        <rect x="90" y="46" width="20" height="12" rx="4" fill={getColor("traps")} style={{filter: getGlow("traps")}} className="transition-all duration-500" />
        
        {/* Front Deltoids */}
        <ellipse cx="68" cy="70" rx="14" ry="10" fill={getColor("front-deltoid")} style={{filter: getGlow("front-deltoid")}} className="transition-all duration-500" />
        <ellipse cx="132" cy="70" rx="14" ry="10" fill={getColor("front-deltoid")} style={{filter: getGlow("front-deltoid")}} className="transition-all duration-500" />
        
        {/* Side Deltoids */}
        <ellipse cx="56" cy="74" rx="8" ry="8" fill={getColor("side-deltoid")} style={{filter: getGlow("side-deltoid")}} className="transition-all duration-500" />
        <ellipse cx="144" cy="74" rx="8" ry="8" fill={getColor("side-deltoid")} style={{filter: getGlow("side-deltoid")}} className="transition-all duration-500" />
        
        {/* Chest */}
        <path d="M72 66 Q100 60 128 66 Q130 90 100 94 Q70 90 72 66Z" fill={getColor("chest")} style={{filter: getGlow("chest")}} className="transition-all duration-500" />
        
        {/* Biceps */}
        <ellipse cx="50" cy="100" rx="8" ry="20" fill={getColor("biceps")} style={{filter: getGlow("biceps")}} className="transition-all duration-500" />
        <ellipse cx="150" cy="100" rx="8" ry="20" fill={getColor("biceps")} style={{filter: getGlow("biceps")}} className="transition-all duration-500" />
        
        {/* Triceps */}
        <ellipse cx="52" cy="102" rx="5" ry="16" fill={getColor("triceps")} style={{filter: getGlow("triceps")}} className="transition-all duration-500" opacity="0.7" />
        <ellipse cx="148" cy="102" rx="5" ry="16" fill={getColor("triceps")} style={{filter: getGlow("triceps")}} className="transition-all duration-500" opacity="0.7" />
        
        {/* Forearms */}
        <ellipse cx="44" cy="136" rx="6" ry="18" fill={getColor("forearms")} style={{filter: getGlow("forearms")}} className="transition-all duration-500" />
        <ellipse cx="156" cy="136" rx="6" ry="18" fill={getColor("forearms")} style={{filter: getGlow("forearms")}} className="transition-all duration-500" />
        
        {/* Abs */}
        <rect x="85" y="96" width="30" height="40" rx="6" fill={getColor("abs")} style={{filter: getGlow("abs")}} className="transition-all duration-500" />
        
        {/* Obliques */}
        <rect x="74" y="100" width="10" height="32" rx="4" fill={getColor("obliques")} style={{filter: getGlow("obliques")}} className="transition-all duration-500" />
        <rect x="116" y="100" width="10" height="32" rx="4" fill={getColor("obliques")} style={{filter: getGlow("obliques")}} className="transition-all duration-500" />
        
        {/* Lats (behind, visible at sides) */}
        <path d="M68 80 Q60 110 70 136 L76 100Z" fill={getColor("lats")} style={{filter: getGlow("lats")}} className="transition-all duration-500" />
        <path d="M132 80 Q140 110 130 136 L124 100Z" fill={getColor("lats")} style={{filter: getGlow("lats")}} className="transition-all duration-500" />
        
        {/* Lower Back (subtle indicator) */}
        <rect x="88" y="130" width="24" height="14" rx="5" fill={getColor("lower-back")} style={{filter: getGlow("lower-back")}} className="transition-all duration-500" opacity="0.7" />
        
        {/* Glutes */}
        <ellipse cx="88" cy="158" rx="14" ry="10" fill={getColor("glutes")} style={{filter: getGlow("glutes")}} className="transition-all duration-500" />
        <ellipse cx="112" cy="158" rx="14" ry="10" fill={getColor("glutes")} style={{filter: getGlow("glutes")}} className="transition-all duration-500" />
        
        {/* Upper Back / Rear Deltoid indicator */}
        <ellipse cx="100" cy="80" rx="16" ry="8" fill={getColor("upper-back")} style={{filter: getGlow("upper-back")}} className="transition-all duration-500" opacity="0.4" />
        
        {/* Quads */}
        <rect x="74" y="170" width="18" height="48" rx="8" fill={getColor("quads")} style={{filter: getGlow("quads")}} className="transition-all duration-500" />
        <rect x="108" y="170" width="18" height="48" rx="8" fill={getColor("quads")} style={{filter: getGlow("quads")}} className="transition-all duration-500" />
        
        {/* Hamstrings (behind quads, shown offset) */}
        <rect x="76" y="180" width="14" height="36" rx="6" fill={getColor("hamstrings")} style={{filter: getGlow("hamstrings")}} className="transition-all duration-500" opacity="0.5" />
        <rect x="110" y="180" width="14" height="36" rx="6" fill={getColor("hamstrings")} style={{filter: getGlow("hamstrings")}} className="transition-all duration-500" opacity="0.5" />
        
        {/* Calves */}
        <rect x="76" y="226" width="14" height="36" rx="6" fill={getColor("calves")} style={{filter: getGlow("calves")}} className="transition-all duration-500" />
        <rect x="110" y="226" width="14" height="36" rx="6" fill={getColor("calves")} style={{filter: getGlow("calves")}} className="transition-all duration-500" />
        
        {/* Hands (non-interactive) */}
        <circle cx="40" cy="162" r="5" fill="#3f3f46" />
        <circle cx="160" cy="162" r="5" fill="#3f3f46" />
        
        {/* Feet (non-interactive) */}
        <ellipse cx="83" cy="268" rx="8" ry="4" fill="#3f3f46" />
        <ellipse cx="117" cy="268" rx="8" ry="4" fill="#3f3f46" />
      </svg>

      {/* Progress Bar */}
      <div className="w-full mt-4">
        <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
          <span>Coverage</span>
          <span className="text-brand font-bold">{percentage}%</span>
        </div>
        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-brand rounded-full transition-all duration-700 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
