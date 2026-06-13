"use client";

import { useState, useMemo } from "react";
import { EXERCISE_DB, type WorkoutType } from "@/lib/exerciseDB";
import { Search, Dumbbell, Home, Zap, Filter, ChevronDown, ChevronUp } from "lucide-react";

const TYPE_CONFIG: Record<WorkoutType, { label: string; icon: any; color: string }> = {
  gym: { label: "Gym", icon: Dumbbell, color: "text-blue-400" },
  home: { label: "Home", icon: Home, color: "text-green-400" },
  calisthenics: { label: "Calisthenics", icon: Zap, color: "text-purple-400" },
};

const MUSCLE_COLORS: Record<string, string> = {
  Chest: "bg-red-500/10 border-red-500/20 text-red-400",
  Back: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  Shoulders: "bg-orange-500/10 border-orange-500/20 text-orange-400",
  Legs: "bg-green-500/10 border-green-500/20 text-green-400",
  Biceps: "bg-purple-500/10 border-purple-500/20 text-purple-400",
  Triceps: "bg-pink-500/10 border-pink-500/20 text-pink-400",
  Arms: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
  Core: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
  Cardio: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
};

export default function ExerciseLibraryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeType, setActiveType] = useState<WorkoutType>("gym");
  const [activeMuscle, setActiveMuscle] = useState<string | null>(null);
  const [expandedMuscle, setExpandedMuscle] = useState<string | null>(null);

  const typeDB = EXERCISE_DB[activeType];
  const muscles = Object.keys(typeDB);

  // Build flat list of all exercises with metadata
  const allExercises = useMemo(() => {
    const exercises: { name: string; muscle: string; sets: number; reps: number; weight: number; unit: string; variation: string; isAlternative: boolean }[] = [];
    
    for (const muscle of muscles) {
      const muscleData = typeDB[muscle];
      // Main variations
      for (const [varKey, varExs] of Object.entries({ varA: muscleData.varA, varB: muscleData.varB, varC: muscleData.varC })) {
        for (const ex of varExs) {
          exercises.push({ ...ex, muscle, variation: varKey, isAlternative: false });
        }
      }
      // Alternatives
      for (const alt of muscleData.alternatives) {
        exercises.push({ name: alt, muscle, sets: 3, reps: 10, weight: 0, unit: "reps", variation: "alt", isAlternative: true });
      }
    }
    return exercises;
  }, [activeType, typeDB, muscles]);

  // Filtered exercises
  const filteredExercises = useMemo(() => {
    let result = allExercises;
    if (activeMuscle) {
      result = result.filter(e => e.muscle === activeMuscle);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q));
    }
    return result;
  }, [allExercises, activeMuscle, searchQuery]);

  // Group by muscle for card view
  const groupedByMuscle = useMemo(() => {
    const grouped: Record<string, typeof filteredExercises> = {};
    for (const ex of filteredExercises) {
      if (!grouped[ex.muscle]) grouped[ex.muscle] = [];
      grouped[ex.muscle].push(ex);
    }
    return grouped;
  }, [filteredExercises]);

  const totalExercises = allExercises.length;

  return (
    <div className="flex flex-col gap-6 pt-6 pb-20 max-w-3xl mx-auto w-full px-4">
      {/* Header */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-border relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand/10 rounded-full blur-3xl -z-10" />
        <Dumbbell className="w-12 h-12 text-brand mx-auto mb-4" />
        <h1 className="text-3xl sm:text-4xl font-black mb-2 tracking-tight text-center">Exercise Library</h1>
        <p className="text-zinc-400 text-center text-sm mb-6">
          Browse {totalExercises} exercises across gym, home, and calisthenics workouts.
        </p>

        {/* Search */}
        <div className="bg-background rounded-2xl p-2 border border-border flex items-center max-w-md w-full mx-auto shadow-sm">
          <Search className="w-5 h-5 text-zinc-500 ml-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exercises..."
            className="bg-transparent border-none focus:outline-none px-4 w-full text-sm h-10"
          />
          {searchQuery && (
            <span className="text-[10px] text-zinc-500 mr-3 whitespace-nowrap">
              {filteredExercises.length} results
            </span>
          )}
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 justify-center">
        {(Object.keys(TYPE_CONFIG) as WorkoutType[]).map(type => {
          const config = TYPE_CONFIG[type];
          return (
            <button
              key={type}
              onClick={() => { setActiveType(type); setActiveMuscle(null); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold border transition-all ${
                activeType === type
                  ? `bg-brand/10 border-brand/40 text-brand`
                  : "bg-surface border-border text-zinc-400 hover:border-zinc-500"
              }`}
            >
              <config.icon className="w-4 h-4" />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Muscle filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        <button
          onClick={() => setActiveMuscle(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
            !activeMuscle ? "bg-brand/10 border-brand/40 text-brand" : "bg-surface border-border text-zinc-400 hover:border-zinc-500"
          }`}
        >
          All Muscles
        </button>
        {muscles.map(muscle => (
          <button
            key={muscle}
            onClick={() => setActiveMuscle(activeMuscle === muscle ? null : muscle)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
              activeMuscle === muscle
                ? MUSCLE_COLORS[muscle] || "bg-brand/10 border-brand/40 text-brand"
                : "bg-surface border-border text-zinc-400 hover:border-zinc-500"
            }`}
          >
            {muscle}
          </button>
        ))}
      </div>

      {/* Exercise cards grouped by muscle */}
      <div className="flex flex-col gap-4">
        {Object.entries(groupedByMuscle).map(([muscle, exercises]) => {
          const isExpanded = expandedMuscle === muscle;
          const mainExercises = exercises.filter(e => !e.isAlternative);
          const altExercises = exercises.filter(e => e.isAlternative);
          const muscleColor = MUSCLE_COLORS[muscle] || "bg-surface border-border text-zinc-400";

          return (
            <div key={muscle} className="bg-surface rounded-2xl border border-border overflow-hidden">
              {/* Muscle header */}
              <button
                onClick={() => setExpandedMuscle(isExpanded ? null : muscle)}
                className="w-full px-5 py-3 flex items-center justify-between hover:bg-background/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${muscleColor}`}>
                    {muscle}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {mainExercises.length} exercises + {altExercises.length} alternatives
                  </span>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-border/30">
                  {/* Variation A/B/C */}
                  {["varA", "varB", "varC"].map(varKey => {
                    const varExs = mainExercises.filter(e => e.variation === varKey);
                    if (varExs.length === 0) return null;
                    const varLabel = varKey === "varA" ? "A" : varKey === "varB" ? "B" : "C";

                    return (
                      <div key={varKey} className="px-5 py-3 border-b border-border/20 last:border-0">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-brand/20 text-brand text-[9px] font-black flex items-center justify-center">{varLabel}</span>
                          Variation {varLabel}
                        </p>
                        <div className="flex flex-col gap-2">
                          {varExs.map((ex, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-background/50 transition-colors group">
                              <div className="flex items-center gap-3">
                                <Dumbbell className="w-3.5 h-3.5 text-zinc-600 group-hover:text-brand transition-colors" />
                                <span className="text-sm font-medium">{ex.name}</span>
                              </div>
                              <span className="text-xs text-zinc-500 tabular-nums">
                                {ex.sets}×{ex.reps} {ex.weight > 0 ? `@ ${ex.weight} ${ex.unit}` : ex.unit !== "reps" ? ex.unit : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Alternatives */}
                  {altExercises.length > 0 && (
                    <div className="px-5 py-3 bg-background/30">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Filter className="w-3 h-3" />
                        Alternatives
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {altExercises.map((ex, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-full bg-surface border border-border text-xs text-zinc-400">
                            {ex.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {Object.keys(groupedByMuscle).length === 0 && (
          <div className="text-center py-16 opacity-50">
            <Search className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400">No exercises found for &ldquo;{searchQuery}&rdquo;</p>
          </div>
        )}
      </div>
    </div>
  );
}
