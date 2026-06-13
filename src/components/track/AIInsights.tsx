"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Brain, Loader2, RefreshCw, Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InsightData {
  insights: string[];
  strengths: string[];
  improvements: string[];
  weekSummary: {
    totalWorkouts: number;
    musclesWorked: string[];
    musclesMissed: string[];
    totalSets: number;
    avgExercisesPerWorkout: number;
  };
}

export function AIInsights() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInsights = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Fetch last 7 days of workouts
      const workoutSnap = await getDocs(query(
        collection(db, "workouts"),
        where("userId", "==", user.uid),
        where("createdAt", ">=", weekAgo),
        orderBy("createdAt", "desc")
      ));

      const workouts = workoutSnap.docs.map(d => d.data() as any);

      // Fetch streak data
      const streakDoc = await getDoc(doc(db, "streaks", user.uid));
      const streakData = streakDoc.exists() ? streakDoc.data() as any : {};

      // Fetch user's split plan
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data() as any;
      let workoutSplit: any[] = [];
      if (userData?.workoutSplit) {
        try {
          workoutSplit = typeof userData.workoutSplit === 'string' ? JSON.parse(userData.workoutSplit) : userData.workoutSplit;
        } catch (e) {
          console.error("Failed to parse workout split", e);
        }
      }
      if (!Array.isArray(workoutSplit)) workoutSplit = [];

      // Calculate local stats
      const musclesWorked = new Set<string>();
      const exerciseNames = new Set<string>();
      const daySet = new Set<string>();

      workouts.forEach(w => {
        exerciseNames.add(w.exerciseName || "");
        daySet.add(w.dateString || "");
        // Map exercises to muscles
        const name = (w.exerciseName || "").toLowerCase();
        if (name.includes("bench") || name.includes("push") || name.includes("fly") || name.includes("chest") || name.includes("pec")) musclesWorked.add("Chest");
        if (name.includes("row") || name.includes("pull") || name.includes("lat") || name.includes("deadlift") || name.includes("back")) musclesWorked.add("Back");
        if (name.includes("shoulder") || name.includes("press") || name.includes("lateral") || name.includes("delt") || name.includes("arnold")) musclesWorked.add("Shoulders");
        if (name.includes("squat") || name.includes("leg") || name.includes("lunge") || name.includes("calf") || name.includes("hip")) musclesWorked.add("Legs");
        if (name.includes("curl") || name.includes("bicep")) musclesWorked.add("Biceps");
        if (name.includes("tricep") || name.includes("pushdown") || name.includes("skull")) musclesWorked.add("Triceps");
        if (name.includes("plank") || name.includes("crunch") || name.includes("ab") || name.includes("core")) musclesWorked.add("Core");
        if (name.includes("cardio") || name.includes("run") || name.includes("bike") || name.includes("jump")) musclesWorked.add("Cardio");
      });

      // All planned muscles from split
      const allPlannedMuscles = new Set<string>();
      workoutSplit.forEach(day => {
        if (Array.isArray(day)) {
          day.forEach(m => allPlannedMuscles.add(m));
        } else if (typeof day === 'string') {
          day.split('+').map(s => s.trim()).forEach(m => allPlannedMuscles.add(m));
        }
      });

      const musclesMissed = [...allPlannedMuscles].filter(m => !musclesWorked.has(m));
      const totalWorkouts = daySet.size;
      const avgExercises = totalWorkouts > 0 ? Math.round(workouts.length / totalWorkouts) : 0;

      // Generate AI insights via Groq
      const prompt = `Analyze this week's workout data and give personalized fitness insights:

WORKOUT DATA (Last 7 days):
- Total workout days: ${totalWorkouts}
- Total exercises logged: ${workouts.length}
- Average exercises per session: ${avgExercises}
- Muscles trained: ${[...musclesWorked].join(", ") || "None"}
- Muscles NOT trained this week: ${musclesMissed.join(", ") || "All covered!"}
- Current workout streak: ${streakData.workoutStreak || 0} days
- Longest streak ever: ${streakData.longestWorkoutStreak || 0} days
- Planned split (${workoutSplit.length} days): ${workoutSplit.map((d, i) => `Day ${i + 1}: ${Array.isArray(d) ? d.join("+") : d}`).join(", ")}

RESPOND WITH ONLY VALID JSON:
{
  "insights": ["3-4 specific, actionable insights about their training this week"],
  "strengths": ["2-3 things they did well"],
  "improvements": ["2-3 areas to improve"]
}

Be encouraging but honest. Use emojis. Keep each point under 15 words. Reference specific muscles/data.`;

      const res = await fetch("/api/ai/diet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      
      let parsed: any = null;
      if (data.structuredPlan) {
        parsed = data.structuredPlan;
      } else if (data.recommendation) {
        try {
          parsed = JSON.parse(data.recommendation);
        } catch {
          // Try to extract JSON from the response
          const match = data.recommendation.match(/\{[\s\S]*\}/);
          if (match) parsed = JSON.parse(match[0]);
        }
      }

      if (parsed && (parsed.insights || parsed.strengths)) {
        setInsights({
          insights: parsed.insights || [],
          strengths: parsed.strengths || [],
          improvements: parsed.improvements || [],
          weekSummary: {
            totalWorkouts,
            musclesWorked: [...musclesWorked],
            musclesMissed: musclesMissed,
            totalSets: workouts.length,
            avgExercisesPerWorkout: avgExercises,
          },
        });
      } else {
        // Fallback to local-only insights
        setInsights({
          insights: generateLocalInsights(totalWorkouts, [...musclesWorked], musclesMissed, streakData),
          strengths: totalWorkouts >= 3 ? ["Great workout frequency this week! 💪"] : [],
          improvements: musclesMissed.length > 0 ? [`Train ${musclesMissed[0]} this week`] : [],
          weekSummary: {
            totalWorkouts,
            musclesWorked: [...musclesWorked],
            musclesMissed,
            totalSets: workouts.length,
            avgExercisesPerWorkout: avgExercises,
          },
        });
      }
    } catch (err) {
      console.error("AI Insights error:", err);
      setError("Could not generate insights. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
      <div className="px-5 py-3 border-b border-border/30 flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          AI Weekly Insights
        </h3>
        <button onClick={generateInsights} disabled={loading}
          className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 hover:text-brand transition-colors">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {insights ? "Refresh" : "Generate"}
        </button>
      </div>

      <div className="p-4">
        {!insights && !loading && !error && (
          <div className="text-center py-6">
            <Sparkles className="w-8 h-8 text-purple-400/30 mx-auto mb-2" />
            <p className="text-xs text-zinc-500 mb-3">Get AI-powered insights about your training</p>
            <Button onClick={generateInsights} size="sm" variant="outline" className="gap-2 rounded-full text-xs">
              <Brain className="w-3.5 h-3.5" /> Analyze My Week
            </Button>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
            <p className="text-xs text-zinc-500">Analyzing your workouts...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-4">
            <p className="text-xs text-red-400">{error}</p>
            <button onClick={generateInsights} className="text-xs text-brand hover:underline mt-2">Try again</button>
          </div>
        )}

        {insights && !loading && (
          <div className="flex flex-col gap-3">
            {/* Week summary */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="bg-background rounded-xl p-2.5 text-center">
                <p className="text-lg font-black text-brand">{insights.weekSummary.totalWorkouts}</p>
                <p className="text-[9px] text-zinc-500 uppercase font-bold">Days</p>
              </div>
              <div className="bg-background rounded-xl p-2.5 text-center">
                <p className="text-lg font-black text-blue-400">{insights.weekSummary.totalSets}</p>
                <p className="text-[9px] text-zinc-500 uppercase font-bold">Exercises</p>
              </div>
              <div className="bg-background rounded-xl p-2.5 text-center">
                <p className="text-lg font-black text-green-400">{insights.weekSummary.musclesWorked.length}</p>
                <p className="text-[9px] text-zinc-500 uppercase font-bold">Muscles</p>
              </div>
            </div>

            {/* Strengths */}
            {insights.strengths.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-green-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Strengths
                </p>
                {insights.strengths.map((s, i) => (
                  <p key={i} className="text-xs text-zinc-300 py-1 pl-3 border-l-2 border-green-500/30 mb-1">{s}</p>
                ))}
              </div>
            )}

            {/* Improvements */}
            {insights.improvements.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-orange-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Improve
                </p>
                {insights.improvements.map((s, i) => (
                  <p key={i} className="text-xs text-zinc-300 py-1 pl-3 border-l-2 border-orange-500/30 mb-1">{s}</p>
                ))}
              </div>
            )}

            {/* AI Insights */}
            {insights.insights.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Insights
                </p>
                {insights.insights.map((s, i) => (
                  <p key={i} className="text-xs text-zinc-300 py-1 pl-3 border-l-2 border-purple-500/30 mb-1">{s}</p>
                ))}
              </div>
            )}

            {/* Missed muscles warning */}
            {insights.weekSummary.musclesMissed.length > 0 && (
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-orange-400">Missed this week</p>
                  <p className="text-[10px] text-zinc-400">{insights.weekSummary.musclesMissed.join(", ")}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function generateLocalInsights(totalWorkouts: number, musclesWorked: string[], musclesMissed: string[], streakData: any): string[] {
  const insights: string[] = [];
  if (totalWorkouts >= 4) insights.push("🔥 Strong week! You hit the gym " + totalWorkouts + " times");
  else if (totalWorkouts >= 2) insights.push("👍 Decent effort with " + totalWorkouts + " workout days");
  else if (totalWorkouts === 1) insights.push("⚠️ Only 1 workout this week — try for 3+");
  else insights.push("🚫 No workouts logged this week — let's change that!");

  if (musclesMissed.length > 0) insights.push("⚡ Missing: " + musclesMissed.slice(0, 3).join(", "));
  if (musclesWorked.includes("Legs")) insights.push("🦵 Great job not skipping leg day!");
  if (streakData.workoutStreak >= 7) insights.push("🏆 " + streakData.workoutStreak + "-day streak — incredible consistency!");

  return insights;
}
