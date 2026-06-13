// src/components/track/AITrainerBanner.tsx
import { Sparkles } from 'lucide-react';

interface AITrainerBannerProps {
  fitnessGoal: string;
  gymExperience: string;
  bodyWeight: number;
  day: number;
  split: string[];
}

/**
 * Generate a dynamic, highly specific tip based on target muscle groups, experience level, and goal.
 */
function getDynamicTip(day: number, split: string[], gymExperience: string, fitnessGoal: string): string {
  const muscles = split.map(m => m.toLowerCase());
  const experience = gymExperience.toLowerCase();
  const goal = fitnessGoal.toLowerCase();

  if (muscles.length === 0 || muscles.includes('rest')) {
    if (goal.includes('cut') || goal.includes('fat')) {
      return "Active Recovery: Keep moving today! Focus on a brisk walk or light jog to keep burning calories while preserving muscle.";
    }
    if (goal.includes('bulk') || goal.includes('gain')) {
      return "Muscle Growth happens during rest! Focus on high-quality sleep, muscle hydration, and meeting your daily protein targets.";
    }
    return "Central Nervous System recovery day. Hydrate, foam roll, and let your body repair for the next high-intensity session.";
  }

  // Chest tips
  if (muscles.includes('chest')) {
    if (experience.includes('begin')) {
      return "Keep your shoulders retracted and flat against the bench to isolate your chest and protect your joints.";
    }
    if (experience.includes('adv')) {
      return "Try pre-exhausting your chest with incline cable flyes before jumping into heavy compound presses. Rest 120s between sets.";
    }
    return "Maintain a 3-second negative phase when lowering the weights, then press up explosively to build core power.";
  }

  // Back tips
  if (muscles.includes('back')) {
    if (experience.includes('begin')) {
      return "Imagine your hands are hooks – pull with your elbows, not your biceps, and squeeze your scapulae at peak contraction.";
    }
    if (experience.includes('adv')) {
      return "Integrate a 1-2 second static pause at the top of your cable rows and lat pulldowns to recruit deep back muscle fibers.";
    }
    return "For Deadlifts & Rows, keep a neutral spine and brace your abdominal wall to stabilize the pelvic floor.";
  }

  // Legs tips
  if (muscles.includes('legs')) {
    if (experience.includes('begin')) {
      return "Focus on depth – squat until thighs are parallel to the floor, keeping your heels flat to maximize quad and glute engagement.";
    }
    if (experience.includes('adv')) {
      return "Finish legs with a quad dropset on leg extensions. Force failure at full extension to trigger maximum muscle hypertrophy.";
    }
    return "Maintain knee alignment – do not let your knees collapse inward (valgus collapse) during heavy squats or leg presses.";
  }

  // Shoulder tips
  if (muscles.includes('shoulders') || muscles.includes('shoulder')) {
    if (experience.includes('begin')) {
      return "Control lateral raises completely; do not use body momentum. Keep the weight light to fully isolate the lateral deltoids.";
    }
    if (experience.includes('adv')) {
      return "During Overhead Press, squeeze your glutes and core to form a solid trunk, preventing lower back hyperextension.";
    }
    return "Prioritize rotator cuff warm-ups (internal/external rotations) before tackling heavy vertical pushes.";
  }

  // Arm tips
  if (muscles.includes('arms') || muscles.includes('biceps') || muscles.includes('triceps')) {
    if (experience.includes('begin')) {
      return "Keep your elbows locked to your sides during bicep curls and tricep pressdowns to keep tension strictly on the target muscles.";
    }
    if (experience.includes('adv')) {
      return "Incorporate supersets (agonist/antagonist pairs) for biceps and triceps. This pumps blood to the arm region and triggers growth.";
    }
    return "Focus on the eccentric (lowering) phase. Curls and skull-crushers are twice as effective if you lower the weight slowly.";
  }

  // Core tips
  if (muscles.includes('core')) {
    return "Exhale completely on the contraction of every crunch to engage the deep transverse abdominis rather than just the hip flexors.";
  }

  return `Targeting ${split.join(' + ')}. Focus on progressive overload – try to add 1 rep or 1-2kg to your compound lifts compared to last week.`;
}

/**
 * Generate a specific target weight/recommendation based on muscle groups and body weight.
 */
function getDynamicTarget(bodyWeight: number, split: string[], gymExperience: string): string {
  const muscles = split.map(m => m.toLowerCase());
  const isAdv = gymExperience.toLowerCase().includes('adv');
  const isInter = gymExperience.toLowerCase().includes('inter');
  const mult = isAdv ? 1.0 : isInter ? 0.75 : 0.5;

  if (muscles.length === 0 || muscles.includes('rest')) {
    return "Target: 8,000+ steps, foam rolling, and mobility work.";
  }

  if (muscles.includes('legs')) {
    const targetSquat = Math.round(bodyWeight * mult * 1.25);
    return `Target: Squats / Leg Press – stay within ${targetSquat}kg for compound working sets.`;
  }
  if (muscles.includes('chest')) {
    const targetBench = Math.round(bodyWeight * mult);
    return `Target: Flat/Incline Press – stay within ${targetBench}kg for compound lifts.`;
  }
  if (muscles.includes('back')) {
    const targetRow = Math.round(bodyWeight * mult * 1.1);
    return `Target: Rows / Deadlifts – stay within ${targetRow}kg for heavy working sets.`;
  }
  if (muscles.includes('shoulders')) {
    const targetPress = Math.round(bodyWeight * mult * 0.6);
    return `Target: Overhead Shoulder Press – stay within ${targetPress}kg today.`;
  }
  return "Target: Progressive volume increase, tracking set completion and adjusting weights.";
}

/**
 * Premium AI coach banner. Uses neon‑green glow, subtle pulse and a short tip.
 */
export function AITrainerBanner({ fitnessGoal, gymExperience, bodyWeight, day, split }: AITrainerBannerProps) {
  const tip = getDynamicTip(day, split, gymExperience, fitnessGoal);
  const target = getDynamicTarget(bodyWeight, split, gymExperience);

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-surface rounded-2xl border border-border card-glow"
    >
      <div className="flex-shrink-0 p-2 bg-brand/20 rounded-full w-fit animate-pulse">
        <Sparkles className="w-5 h-5 text-brand" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-brand mb-0.5">Your AI Coach</p>
        <p className="text-xs text-zinc-200 font-medium leading-relaxed">{tip}</p>
        <p className="text-xs text-brand font-semibold mt-1">{target}</p>
        <p className="mt-1.5 text-[10px] text-emerald-400 uppercase font-medium">
          Goal: {fitnessGoal} • Experience: {gymExperience}
        </p>
      </div>
    </div>
  );
}
