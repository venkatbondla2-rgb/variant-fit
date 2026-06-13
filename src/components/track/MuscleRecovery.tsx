"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Activity, AlertTriangle, CheckCircle, Clock } from "lucide-react";

// Muscle groups we track
const MUSCLES = ["Chest", "Back", "Shoulders", "Legs", "Biceps", "Triceps", "Core", "Arms", "Cardio"];

// Recovery time in hours by muscle group
const RECOVERY_HOURS: Record<string, number> = {
  Chest: 48, Back: 48, Shoulders: 48, Legs: 72, Biceps: 36,
  Triceps: 36, Core: 24, Arms: 36, Cardio: 24,
};

type RecoveryStatus = "recovered" | "recovering" | "sore" | "unknown";

interface MuscleRecovery {
  muscle: string;
  status: RecoveryStatus;
  lastWorked: Date | null;
  hoursAgo: number;
  recoveryHours: number;
  percentRecovered: number;
}

function getStatus(hoursAgo: number, recoveryHours: number): RecoveryStatus {
  if (hoursAgo < 0) return "unknown";
  if (hoursAgo < recoveryHours * 0.4) return "sore";
  if (hoursAgo < recoveryHours) return "recovering";
  return "recovered";
}

function getStatusConfig(status: RecoveryStatus) {
  switch (status) {
    case "recovered":
      return { color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", barColor: "bg-green-400", label: "Ready", icon: CheckCircle };
    case "recovering":
      return { color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", barColor: "bg-yellow-400", label: "Recovering", icon: Clock };
    case "sore":
      return { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", barColor: "bg-red-400", label: "Sore", icon: AlertTriangle };
    default:
      return { color: "text-zinc-500", bg: "bg-surface border-border", barColor: "bg-zinc-600", label: "No data", icon: Activity };
  }
}

export function MuscleRecoveryIndicator() {
  const { user } = useAuth();
  const [recoveryData, setRecoveryData] = useState<MuscleRecovery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Fetch workouts from last 7 days
        const q = query(
          collection(db, "workouts"),
          where("userId", "==", user.uid),
          where("createdAt", ">=", weekAgo),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);

        // Map exercise names to muscle groups
        const lastWorked: Record<string, Date> = {};
        snap.docs.forEach(d => {
          const data = d.data() as any;
          const exerciseName = (data.exerciseName || "").toLowerCase();
          const workoutDate = data.createdAt?.toDate?.() || new Date(data.dateString || now);

          for (const muscle of MUSCLES) {
            // Check if the exercise relates to this muscle
            if (exerciseBelongsToMuscle(exerciseName, muscle)) {
              if (!lastWorked[muscle] || workoutDate > lastWorked[muscle]) {
                lastWorked[muscle] = workoutDate;
              }
            }
          }
        });

        // Build recovery data
        const data: MuscleRecovery[] = MUSCLES.map(muscle => {
          const lastDate = lastWorked[muscle] || null;
          const hoursAgo = lastDate ? (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60) : -1;
          const recoveryHours = RECOVERY_HOURS[muscle] || 48;
          const percentRecovered = lastDate ? Math.min(100, (hoursAgo / recoveryHours) * 100) : 100;

          return {
            muscle,
            status: lastDate ? getStatus(hoursAgo, recoveryHours) : "unknown",
            lastWorked: lastDate,
            hoursAgo: Math.round(hoursAgo),
            recoveryHours,
            percentRecovered: Math.round(percentRecovered),
          };
        });

        setRecoveryData(data);
      } catch (err) {
        console.error("Recovery load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) return null;

  const readyCount = recoveryData.filter(r => r.status === "recovered" || r.status === "unknown").length;

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400" />
          Muscle Recovery
        </h3>
        <span className="text-[10px] text-zinc-500">
          <span className="text-green-400 font-bold">{readyCount}</span>/{MUSCLES.length} ready
        </span>
      </div>

      <div className="p-3 flex flex-col gap-1.5">
        {recoveryData.map(r => {
          const config = getStatusConfig(r.status);
          const StatusIcon = config.icon;

          return (
            <div key={r.muscle} className="flex items-center gap-2 group">
              <span className="text-xs font-bold text-zinc-400 w-20 truncate">{r.muscle}</span>
              
              {/* Progress bar */}
              <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${config.barColor}`}
                  style={{ width: `${r.percentRecovered}%` }}
                />
              </div>

              {/* Status */}
              <div className="flex items-center gap-1 w-20 justify-end">
                <StatusIcon className={`w-3 h-3 ${config.color}`} />
                <span className={`text-[10px] font-bold ${config.color}`}>
                  {r.status === "unknown" ? "—" : r.hoursAgo < 24 ? `${r.hoursAgo}h` : `${Math.round(r.hoursAgo / 24)}d`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-border/30 flex items-center justify-center gap-4 text-[9px] text-zinc-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Ready</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Recovering</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Sore</span>
      </div>
    </div>
  );
}

// Map exercise names to muscle groups
function exerciseBelongsToMuscle(exerciseName: string, muscle: string): boolean {
  const name = exerciseName.toLowerCase();
  const maps: Record<string, string[]> = {
    Chest: ["bench", "chest", "push up", "pushup", "fly", "pec", "dip"],
    Back: ["row", "pull", "deadlift", "lat", "back", "pulldown", "pullover"],
    Shoulders: ["shoulder", "overhead", "ohp", "press", "lateral", "raise", "delt", "arnold"],
    Legs: ["squat", "leg", "lunge", "calf", "hamstring", "glute", "hip", "quad", "rdl", "split squat"],
    Biceps: ["curl", "bicep"],
    Triceps: ["tricep", "pushdown", "skull", "extension", "dip", "close grip"],
    Core: ["ab", "core", "plank", "crunch", "sit up", "leg raise", "twist", "woodchop"],
    Arms: ["curl", "tricep", "arm", "hammer", "skull", "pushdown"],
    Cardio: ["treadmill", "run", "bike", "cycle", "rowing", "jump rope", "burpee", "sprint", "stair", "cardio"],
  };

  const keywords = maps[muscle] || [];
  return keywords.some(kw => name.includes(kw));
}
