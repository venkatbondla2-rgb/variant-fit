// src/components/track/VolumeTracker.tsx
"use client";

import React, { useState } from "react";
import { MUSCLE_REGION_EXERCISES, REGION_TO_GROUP } from "@/lib/exerciseDB";
import { BarChart3, AlertCircle, Dumbbell, Check, HelpCircle, Activity, Sparkles } from "lucide-react";

interface WorkoutLog {
  id?: string;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weight: number;
  dateString: string;
  createdAt?: any;
}

interface VolumeTrackerProps {
  allTimeWorkouts: WorkoutLog[];
}

function getRegionsForExercise(exerciseName: string) {
  const ex = MUSCLE_REGION_EXERCISES.find(e => e.name.toLowerCase() === exerciseName.toLowerCase());
  if (ex) {
    return { primary: ex.primaryRegions, secondary: ex.secondaryRegions };
  }
  // Fallback map for custom exercises or slight string mismatches
  const lower = exerciseName.toLowerCase();
  const primary: string[] = [];
  const secondary: string[] = [];
  
  if (lower.includes("incline") && (lower.includes("bench") || lower.includes("press") || lower.includes("fly"))) {
    primary.push("upper_chest");
  } else if (lower.includes("decline") && (lower.includes("bench") || lower.includes("press") || lower.includes("fly"))) {
    primary.push("lower_chest");
  } else if (lower.includes("bench") || lower.includes("press") || lower.includes("push up") || lower.includes("pushup")) {
    primary.push("mid_chest");
  } else if (lower.includes("fly") || lower.includes("crossover") || lower.includes("pec deck")) {
    primary.push("mid_chest");
  }

  if (lower.includes("pull up") || lower.includes("pulldown") || lower.includes("lat")) {
    primary.push("lat_width");
  } else if (lower.includes("row")) {
    primary.push("lat_thickness");
  } else if (lower.includes("deadlift")) {
    primary.push("upper_back");
    primary.push("lower_back");
  }

  if (lower.includes("lateral raise")) {
    primary.push("side_delts");
  } else if (lower.includes("rear delt") || lower.includes("face pull")) {
    primary.push("rear_delts");
  } else if (lower.includes("shoulder press") || lower.includes("overhead press") || lower.includes("arnold press")) {
    primary.push("front_delts");
  }

  if (lower.includes("squat") || lower.includes("leg press") || lower.includes("leg extension")) {
    primary.push("quads");
  } else if (lower.includes("curl") && lower.includes("leg")) {
    primary.push("hamstrings");
  } else if (lower.includes("thrust") || lower.includes("glute")) {
    primary.push("glutes");
  } else if (lower.includes("calf")) {
    primary.push("calves");
  }

  if (lower.includes("bicep") || lower.includes("curl")) {
    primary.push("biceps_long");
  }
  if (lower.includes("tricep") || lower.includes("pushdown") || lower.includes("skull") || lower.includes("extension")) {
    primary.push("triceps_long");
  }

  if (lower.includes("crunch") || lower.includes("plank") || lower.includes("leg raise")) {
    primary.push("abs");
  } else if (lower.includes("twist") || lower.includes("woodchop")) {
    primary.push("obliques");
  }

  return { primary, secondary };
}

// Pretty formatting for regions
const REGION_LABELS: Record<string, string> = {
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
  biceps_long: "Biceps (Long)",
  biceps_short: "Biceps (Short)",
  triceps_long: "Triceps (Long)",
  triceps_lateral: "Triceps (Lat/Med)",
  abs: "Abs",
  obliques: "Obliques",
  cardio: "Cardio",
};

export function VolumeTracker({ allTimeWorkouts }: VolumeTrackerProps) {
  const [activeGroup, setActiveGroup] = useState<string>("Chest");

  // Calculate past 7 days workouts
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const weeklyWorkouts = allTimeWorkouts.filter(w => {
    if (w.createdAt) {
      const d = w.createdAt.toDate ? w.createdAt.toDate() : new Date(w.createdAt);
      return d >= sevenDaysAgo;
    }
    if (w.dateString) {
      const d = new Date(w.dateString);
      return d >= sevenDaysAgo;
    }
    return false;
  });

  // Calculate volume per region
  const volumeMap: Record<string, number> = {};
  Object.keys(REGION_TO_GROUP).forEach(r => {
    volumeMap[r] = 0;
  });

  weeklyWorkouts.forEach(w => {
    const { primary, secondary } = getRegionsForExercise(w.exerciseName || "");
    primary.forEach(r => {
      volumeMap[r] = (volumeMap[r] || 0) + 1;
    });
    secondary.forEach(r => {
      volumeMap[r] = (volumeMap[r] || 0) + 0.5;
    });
  });

  // weak point analysis
  const weakPoints: { region: string; group: string; currentVolume: number; target: number; exercises: string[] }[] = [];
  const groupRegions: Record<string, string[]> = {};
  Object.entries(REGION_TO_GROUP).forEach(([r, g]) => {
    if (!groupRegions[g]) groupRegions[g] = [];
    groupRegions[g].push(r);
  });

  Object.entries(groupRegions).forEach(([group, regions]) => {
    const maxVol = Math.max(...regions.map(r => volumeMap[r]));
    const isGroupActive = maxVol > 0;
    
    if (isGroupActive) {
      regions.forEach(r => {
        const current = volumeMap[r];
        const target = 8;
        
        // Flag as weak point if volume is less than 4 sets, or less than 35% of the max worked region in the same group
        if (current < 4 || (maxVol > 5 && current < maxVol * 0.35)) {
          const suggested = MUSCLE_REGION_EXERCISES.filter(ex => ex.primaryRegions.includes(r)).map(ex => ex.name).slice(0, 2);
          weakPoints.push({
            region: r,
            group,
            currentVolume: current,
            target,
            exercises: suggested.length > 0 ? suggested : ["Universal Alternative"]
          });
        }
      });
    }
  });

  const muscleGroups = ["Chest", "Back", "Shoulders", "Legs", "Biceps", "Triceps", "Core"];

  return (
    <div className="bg-surface rounded-2xl border border-border p-5 flex flex-col gap-4 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 blur-3xl rounded-full pointer-events-none" />
      
      <div className="flex items-center justify-between border-b border-border/30 pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-brand" />
          <div>
            <h3 className="font-bold text-sm text-white">Muscle-Region Volume</h3>
            <p className="text-[10px] text-zinc-500">Weekly set counts & target progression</p>
          </div>
        </div>
        <span className="text-[9px] bg-brand/10 text-brand px-2 py-0.5 rounded-full uppercase font-black">
          7-Day Window
        </span>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border/20 pb-2">
        {muscleGroups.map(group => {
          const isActive = activeGroup === group;
          const groupVol = (groupRegions[group] || []).reduce((acc, r) => acc + (volumeMap[r] || 0), 0);
          return (
            <button
              key={group}
              onClick={() => setActiveGroup(group)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                isActive 
                  ? "bg-brand text-black shadow-md shadow-brand/10" 
                  : "bg-background/40 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-border/60"
              }`}
            >
              {group}
              {groupVol > 0 && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-black/20 text-black" : "bg-brand/20 text-brand"}`}>
                  {Math.round(groupVol)}s
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-region progress bars */}
      <div className="flex flex-col gap-3.5 my-2">
        {(groupRegions[activeGroup] || []).map(region => {
          const sets = volumeMap[region] || 0;
          const target = 10; // optimal weekly recommendation
          const pct = Math.min(100, (sets / target) * 100);
          const colorClass = sets === 0 ? "bg-zinc-800" : pct < 40 ? "bg-red-400" : pct < 80 ? "bg-yellow-400" : "bg-brand";
          const label = REGION_LABELS[region] || region;

          return (
            <div key={region} className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-zinc-300">{label}</span>
                <span className="text-zinc-400">
                  <span className="text-white font-black">{sets}</span> / {target} sets
                </span>
              </div>
              
              <div className="w-full h-2.5 bg-background rounded-full overflow-hidden border border-border/40">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ease-out ${colorClass}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Weak Point Analysis Card */}
      {weakPoints.length > 0 ? (
        <div className="bg-zinc-900/60 rounded-2xl border border-red-500/20 p-4 mt-2 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <h4 className="text-xs font-black uppercase tracking-wider">Weak-Point Analysis</h4>
          </div>
          
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            AI detected lagging volume in specific sub-regions. Target these areas to prevent training imbalances:
          </p>

          <div className="flex flex-col gap-2.5">
            {weakPoints.slice(0, 3).map((wp, idx) => {
              const label = REGION_LABELS[wp.region] || wp.region;
              return (
                <div key={idx} className="bg-background/40 border border-border/60 rounded-xl p-2.5 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white">{label}</span>
                    <span className="text-[10px] text-red-400 font-extrabold uppercase bg-red-500/10 px-2 py-0.5 rounded">
                      lagging • {wp.currentVolume} sets
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 flex-wrap">
                    <Sparkles className="w-3 h-3 text-brand" /> 
                    <span>Swap or add:</span>
                    {wp.exercises.map((ex, exIdx) => (
                      <span key={exIdx} className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-medium">
                        {ex}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900/60 rounded-2xl border border-brand/20 p-4 mt-2 flex items-center gap-3">
          <div className="p-2 bg-brand/10 rounded-xl text-brand flex-shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-brand uppercase tracking-wider">Perfect Symmetry</h4>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              All sub-regions are balanced perfectly. Keep executing your weekly plan!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
