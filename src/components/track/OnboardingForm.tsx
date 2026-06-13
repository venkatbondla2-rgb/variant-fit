import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Select, SelectItem } from '@/components/ui/select';

interface OnboardingFormProps {
  userId: string;
  onComplete: (data: {
    bodyWeight: number;
    height: number;
    goal: string;
    experience: string;
    frequency: number;
    splitPattern: string;
    musclePriorities: string[];
  }) => void;
}

const fitnessGoals = ['Bulk', 'Cut', 'Recomp', 'Strength', 'Muscle Gain', 'Fat Loss'];
const experienceLevels = ['Beginner', 'Intermediate', 'Advanced'];
const frequencies = [3, 4, 5, 6, 7];
const muscleOptions = ['Chest', 'Arms', 'Back', 'Legs', 'Shoulders', 'Aesthetics', 'Strength'];
const muscleGroupOptions = ['1 Muscle', '2 Muscles', 'Full Body'];

export function OnboardingForm({ userId, onComplete }: OnboardingFormProps) {
  const [bodyWeight, setBodyWeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [height, setHeight] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState(fitnessGoals[0]);
  const [gymExperience, setGymExperience] = useState(experienceLevels[0]);
  const [workoutDays, setWorkoutDays] = useState(frequencies[1]);
  const [muscles, setMuscles] = useState<string[]>([]);
  const [muscleGroupsPerDay, setMuscleGroupsPerDay] = useState(muscleGroupOptions[0]);
  const [loading, setLoading] = useState(false);

  const toggleMuscle = (muscle: string) => {
    setMuscles(prev => (prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle]));
  };

  const handleSubmit = async () => {
    if (!bodyWeight || !height) return;
    setLoading(true);
    const data = {
      bodyWeight: Number(bodyWeight),
      goalWeight: Number(goalWeight) || null,
      height: Number(height),
      fitnessGoal,
      gymExperience,
      workoutDays,
      muscleGroupsPerDay,
      musclePriorities: muscles,
    };
    await setDoc(doc(db, 'users', userId), data, { merge: true });
    setLoading(false);
    onComplete({
      bodyWeight: data.bodyWeight,
      height: data.height,
      goal: data.fitnessGoal,
      experience: data.gymExperience,
      frequency: data.workoutDays,
      splitPattern: data.muscleGroupsPerDay,
      musclePriorities: data.musclePriorities,
    });
  };

  return (
    <div className="flex flex-col gap-5 p-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 rounded-2xl shadow-2xl max-w-3xl mx-auto backdrop-blur-lg border border-emerald-500/30">
      <h2 className="text-3xl font-extrabold text-emerald-400 tracking-wider text-center mb-6">🚀 Personalize Your AI Coach</h2>
      {/* Core Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <Input placeholder="Current Weight (kg)" value={bodyWeight} onChange={e => setBodyWeight(e.target.value)} type="number" />
        <Input placeholder="Goal Weight (kg)" value={goalWeight} onChange={e => setGoalWeight(e.target.value)} type="number" />
        <Input placeholder="Height (cm)" value={height} onChange={e => setHeight(e.target.value)} type="number" />
      </div>
      {/* Selections */}
      <select value={fitnessGoal} onChange={e => setFitnessGoal(e.target.value)} className="bg-gray-800 border border-emerald-500 rounded-xl p-2 mb-2 text-sm text-emerald-300">
        {fitnessGoals.map(g => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>
      <select value={gymExperience} onChange={e => setGymExperience(e.target.value)} className="bg-gray-800 border border-emerald-500 rounded-xl p-2 mb-2 text-sm text-emerald-300">
        {experienceLevels.map(e => (
          <option key={e} value={e}>{e}</option>
        ))}
      </select>
      <select value={workoutDays.toString()} onChange={e => setWorkoutDays(Number(e.target.value))} className="bg-gray-800 border border-emerald-500 rounded-xl p-2 mb-2 text-sm text-emerald-300">
        {frequencies.map(d => (
          <option key={d} value={d.toString()}>{d} Days / Week</option>
        ))}
      </select>
      <select value={muscleGroupsPerDay} onChange={e => setMuscleGroupsPerDay(e.target.value)} className="bg-gray-800 border border-emerald-500 rounded-xl p-2 mb-4 text-sm text-emerald-300">
        {muscleGroupOptions.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      {/* Muscle Priorities */}
      <div className="flex flex-wrap gap-2 mb-4">
        {muscleOptions.map(m => (
          <button
            key={m}
            type="button"
            onClick={() => toggleMuscle(m)}
            className={`px-4 py-1 rounded-full border border-emerald-600 text-emerald-200 hover:bg-emerald-900 transition ${muscles.includes(m) ? 'bg-emerald-800' : ''}`}>
            {m}
          </button>
        ))}
      </div>
      <Button onClick={handleSubmit} disabled={loading} className="self-end mt-3 bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-semibold py-2 px-6 rounded-lg shadow-lg">
        {loading ? 'Saving...' : 'Generate My Plan'}
      </Button>
    </div>
  );
}
