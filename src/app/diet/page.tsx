"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { 
  Search, Loader2, Utensils, Sparkles, Plus, Minus, Calendar, Check, 
  Coffee, Sun, Cookie, Moon, ChevronDown, Trash2, Camera, Info, 
  Droplet, ShoppingBag, Shuffle, Award, Zap, DollarSign, X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  collection, query, where, orderBy, onSnapshot, addDoc, 
  serverTimestamp, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SubscriptionGate } from "@/components/ui/SubscriptionGate";

const MEAL_TIMES: Record<string, { hour: number; label: string }> = {
  breakfast: { hour: 9, label: "Breakfast (9 AM)" },
  lunch: { hour: 13, label: "Lunch (1 PM)" },
  "mid-snack": { hour: 16, label: "Mid-Snack (4 PM)" },
  dinner: { hour: 20, label: "Dinner (8 PM)" },
};

function getDayVariantIndex(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  const dow = d.getDay(); 
  const map: Record<number, number> = { 0: 3, 1: 0, 2: 1, 3: 2, 4: 0, 5: 1, 6: 2 };
  return map[dow] ?? 0;
}

const MEAL_CATEGORIES = [
  { key: "breakfast", label: "Breakfast", icon: Coffee, color: "text-orange-400", bgActive: "bg-orange-400/10 border-orange-400/30" },
  { key: "lunch", label: "Lunch", icon: Sun, color: "text-yellow-400", bgActive: "bg-yellow-400/10 border-yellow-400/30" },
  { key: "mid-snack", label: "Mid-Snack", icon: Cookie, color: "text-pink-400", bgActive: "bg-pink-400/10 border-pink-400/30" },
  { key: "dinner", label: "Dinner", icon: Moon, color: "text-blue-400", bgActive: "bg-blue-400/10 border-blue-400/30" },
];

// Circular progress ring helper component
function CircularProgress({ 
  percentage, 
  value, 
  label, 
  color, 
  size = 110, 
  strokeWidth = 8 
}: { 
  percentage: number; 
  value: string; 
  label: string; 
  color: string; 
  size?: number; 
  strokeWidth?: number; 
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-background/40 border border-border/40 rounded-2xl relative group hover:border-brand/40 transition-all duration-300">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background Circle */}
        <svg width={size} height={size} className="rotate-[-90deg]">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-zinc-800"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
            style={{
              filter: `drop-shadow(0 0 6px ${color}80)`
            }}
          />
        </svg>
        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-sm font-black text-white font-mono tracking-tight">{value}</span>
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{label}</span>
        </div>
      </div>
    </div>
  );
}

// Food pool for macro-based substitutes matching
const FOOD_POOL = [
  // High Protein
  { name: "Chicken Breast (boneless)", calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, weight: "100g" },
  { name: "Whey Protein", calories: 120, protein_g: 24, carbs_g: 3, fat_g: 1.5, weight: "30g" },
  { name: "Soya Chunks (dry)", calories: 345, protein_g: 52, carbs_g: 33, fat_g: 0.5, weight: "100g" },
  { name: "Egg Whites", calories: 52, protein_g: 11, carbs_g: 0.7, fat_g: 0.2, weight: "100g" },
  { name: "Whole Eggs", calories: 143, protein_g: 12.6, carbs_g: 0.7, fat_g: 9.5, weight: "100g" },
  { name: "Greek Yogurt (plain)", calories: 59, protein_g: 10, carbs_g: 3.6, fat_g: 0.4, weight: "100g" },
  { name: "Paneer (Low Fat)", calories: 162, protein_g: 20, carbs_g: 2, fat_g: 8, weight: "100g" },
  { name: "Paneer (Regular)", calories: 265, protein_g: 18, carbs_g: 1.2, fat_g: 20.8, weight: "100g" },
  { name: "Tofu (Firm)", calories: 144, protein_g: 17, carbs_g: 2.7, fat_g: 8.7, weight: "100g" },
  { name: "Fish (Salmon)", calories: 208, protein_g: 20, carbs_g: 0, fat_g: 13, weight: "100g" },
  { name: "Fish (Tuna, canned in water)", calories: 116, protein_g: 26, carbs_g: 0, fat_g: 1, weight: "100g" },
  { name: "Seitan", calories: 370, protein_g: 75, carbs_g: 14, fat_g: 1.9, weight: "100g" },

  // High Carbohydrates
  { name: "White Rice (cooked)", calories: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3, weight: "100g" },
  { name: "Brown Rice (cooked)", calories: 111, protein_g: 2.6, carbs_g: 23, fat_g: 0.9, weight: "100g" },
  { name: "Oats (dry)", calories: 389, protein_g: 16.9, carbs_g: 66, fat_g: 6.9, weight: "100g" },
  { name: "Sweet Potato (boiled)", calories: 86, protein_g: 1.6, carbs_g: 20, fat_g: 0.1, weight: "100g" },
  { name: "Potato (boiled)", calories: 87, protein_g: 1.9, carbs_g: 20, fat_g: 0.1, weight: "100g" },
  { name: "Banana", calories: 89, protein_g: 1.1, carbs_g: 23, fat_g: 0.3, weight: "100g" },
  { name: "Apple", calories: 52, protein_g: 0.3, carbs_g: 14, fat_g: 0.2, weight: "100g" },
  { name: "Whole Wheat Bread", calories: 247, protein_g: 13, carbs_g: 41, fat_g: 3.4, weight: "100g" },
  { name: "Chapati / Roti", calories: 264, protein_g: 8, carbs_g: 55, fat_g: 1.5, weight: "100g" },
  { name: "Quinoa (cooked)", calories: 120, protein_g: 4.4, carbs_g: 21.3, fat_g: 1.9, weight: "100g" },
  { name: "Honey", calories: 304, protein_g: 0.3, carbs_g: 82, fat_g: 0, weight: "100g" },
  { name: "Dates", calories: 277, protein_g: 1.8, carbs_g: 75, fat_g: 0.2, weight: "100g" },

  // High Fats
  { name: "Almonds", calories: 579, protein_g: 21, carbs_g: 22, fat_g: 50, weight: "100g" },
  { name: "Walnuts", calories: 654, protein_g: 15, carbs_g: 14, fat_g: 65, weight: "100g" },
  { name: "Peanut Butter", calories: 588, protein_g: 25, carbs_g: 20, fat_g: 50, weight: "100g" },
  { name: "Avocado", calories: 160, protein_g: 2, carbs_g: 8.5, fat_g: 15, weight: "100g" },
  { name: "Olive Oil", calories: 884, protein_g: 0, carbs_g: 0, fat_g: 100, weight: "100g" },
  { name: "Coconut Oil", calories: 862, protein_g: 0, carbs_g: 0, fat_g: 100, weight: "100g" },
  { name: "Chia Seeds", calories: 486, protein_g: 16.5, carbs_g: 42, fat_g: 31, weight: "100g" },
  { name: "Flax Seeds", calories: 534, protein_g: 18.3, carbs_g: 29, fat_g: 42, weight: "100g" },
  { name: "Pumpkin Seeds", calories: 559, protein_g: 30, carbs_g: 10.7, fat_g: 49, weight: "100g" },

  // Balanced / Mixed / Legumes
  { name: "Moong Dal (cooked)", calories: 105, protein_g: 7, carbs_g: 19, fat_g: 0.4, weight: "100g" },
  { name: "Chickpeas / Chana (cooked)", calories: 164, protein_g: 8.9, carbs_g: 27.4, fat_g: 2.6, weight: "100g" },
  { name: "Kidney Beans / Rajma (cooked)", calories: 127, protein_g: 8.7, carbs_g: 22.8, fat_g: 0.5, weight: "100g" },
  { name: "Milk (Double Toned)", calories: 47, protein_g: 3.3, carbs_g: 5, fat_g: 1.5, weight: "100g" },
  { name: "Milk (Whole)", calories: 61, protein_g: 3.2, carbs_g: 4.8, fat_g: 3.3, weight: "100g" },
  { name: "Curd (Low Fat)", calories: 48, protein_g: 3.8, carbs_g: 4.5, fat_g: 1.5, weight: "100g" },
];

function scaleWeight(weightStr: string, scale: number): string {
  if (!weightStr) return "100g";
  const numMatch = weightStr.match(/^(\d+(?:\.\d+)?)/);
  if (numMatch) {
    const num = parseFloat(numMatch[1]);
    const rest = weightStr.slice(numMatch[0].length).trim();
    const val = num * scale;
    const scaled = val < 10 ? Math.round(val * 10) / 10 : Math.round(val);
    return `${scaled} ${rest}`.trim();
  }
  return weightStr;
}

function getMacroDistribution(item: { protein_g: number; carbs_g: number; fat_g: number }) {
  const p = item.protein_g || 0;
  const c = item.carbs_g || 0;
  const f = item.fat_g || 0;
  
  const pCal = p * 4;
  const cCal = c * 4;
  const fCal = f * 9;
  const total = pCal + cCal + fCal;
  
  if (total === 0) return { pctP: 0, pctC: 0, pctF: 0 };
  
  return {
    pctP: pCal / total,
    pctC: cCal / total,
    pctF: fCal / total
  };
}

function getSubstitutes(target: { name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; weight?: string }) {
  const targetDist = getMacroDistribution(target);
  const targetCals = target.calories || 1;
  const targetName = (target.name || "").toLowerCase();
  
  const scored = FOOD_POOL.map(candidate => {
    const candidateName = candidate.name.toLowerCase();
    // Exclude if it's the exact same item name
    if (candidateName.includes(targetName) || targetName.includes(candidateName)) {
      return null;
    }
    
    const candidateDist = getMacroDistribution(candidate);
    
    const distance = Math.sqrt(
      Math.pow(targetDist.pctP - candidateDist.pctP, 2) +
      Math.pow(targetDist.pctC - candidateDist.pctC, 2) +
      Math.pow(targetDist.pctF - candidateDist.pctF, 2)
    );
    
    const scale = targetCals / (candidate.calories || 1);
    const scaledWeight = scaleWeight(candidate.weight, scale);
    
    return {
      name: candidate.name,
      calories: Math.round(candidate.calories * scale),
      protein_g: Math.round(candidate.protein_g * scale * 10) / 10,
      carbs_g: Math.round(candidate.carbs_g * scale * 10) / 10,
      fat_g: Math.round(candidate.fat_g * scale * 10) / 10,
      weight: scaledWeight,
      distance
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null);
  
  scored.sort((a, b) => a.distance - b.distance);
  
  const similarItems = scored.filter(item => item.distance < 0.45).slice(0, 4);
  if (similarItems.length < 2) {
    return scored.slice(0, 4);
  }
  return similarItems;
}

export default function DietPage() {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"tracker" | "ai">("tracker");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  // Floating particle rewards state
  const [particles, setParticles] = useState<{ id: number; text: string; x: number; y: number }[]>([]);
  
  // Profile Stats for Target engine
  const [bodyWeight, setBodyWeight] = useState<number>(72);
  const [goalWeight, setGoalWeight] = useState<number>(70);
  const [fitnessGoal, setFitnessGoal] = useState<string>("cut");
  const [experience, setExperience] = useState<string>("intermediate");
  const [workoutDays, setWorkoutDays] = useState<number>(4);
  const [workoutIntensity, setWorkoutIntensity] = useState<string>("moderate");
  const [budgetMode, setBudgetMode] = useState<boolean>(false);
  const [resultWeeks, setResultWeeks] = useState<number>(8);

  // Tracker States
  const [foodQuery, setFoodQuery] = useState("");
  const [isSearchingFood, setIsSearchingFood] = useState(false);
  const [foodResults, setFoodResults] = useState<any[]>([]);
  const [dietLogs, setDietLogs] = useState<any[]>([]);
  const [selectedMealCategory, setSelectedMealCategory] = useState("breakfast");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  
  // Water States
  const [waterAmount, setWaterAmount] = useState<number>(0);
  const [waterStreak, setWaterStreak] = useState<number>(0);
  const [customWaterMl, setCustomWaterMl] = useState<string>("");

  // AI States
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiParsedMacros, setAiParsedMacros] = useState<any>(null);
  const [aiStructuredPlan, setAiStructuredPlan] = useState<any>(null);
  const [savedDietGoals, setSavedDietGoals] = useState<any>(null);
  const [isApplyingAi, setIsApplyingAi] = useState(false);
  const [planApplied, setPlanApplied] = useState(false);

  // Expandable Meal Card States
  const [expandedMeal, setExpandedMeal] = useState<string | null>("breakfast");

  // Vision scanner modal state
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanImage, setScanImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedFoodResult, setScannedFoodResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Substitution state
  const [activeSubstMealId, setActiveSubstMealId] = useState<string | null>(null);

  // Subscription / AI usage tracking
  const router = useRouter();
  const [activePlan, setActivePlan] = useState<"free" | "pro" | "elite">("free");
  const [aiChatsUsed, setAiChatsUsed] = useState(0);
  const [foodScansUsed, setFoodScansUsed] = useState(0);
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);

  const getAiDietitianLimit = () => {
    if (activePlan === "elite") return Infinity;
    if (activePlan === "pro") return 30;
    return 5; // free limit
  };
  const dietitianLimit = getAiDietitianLimit();
  const canUseAiDiet = aiChatsUsed < dietitianLimit;

  const getFoodScanLimit = () => {
    if (activePlan === "elite") return Infinity;
    if (activePlan === "pro") return 50;
    return 10; // free limit
  };
  const foodScanLimit = getFoodScanLimit();

  // Calculate dynamic goals based on stats and budget Mode
  const calculateTargets = () => {
    let water = Math.round((bodyWeight * 0.04) * 10) / 10; // Liters

    if (savedDietGoals) {
      const dailyCalories = Number(savedDietGoals.dailyCalories || savedDietGoals.calories || 2000);
      const dailyProtein = Number(savedDietGoals.dailyProtein || savedDietGoals.protein || savedDietGoals.protein_g || 130);
      const dailyCarbs = Number(savedDietGoals.dailyCarbs || savedDietGoals.carbs || savedDietGoals.carbs_g || 220);
      const dailyFat = Number(savedDietGoals.dailyFat || savedDietGoals.fat || savedDietGoals.fat_g || 60);

      return {
        calories: dailyCalories,
        protein: dailyProtein,
        carbs: dailyCarbs,
        fats: dailyFat,
        water,
        explanation: `AI Personalized targets active: Optimized by AI dietitian to hit your goal weight of ${goalWeight}kg.`
      };
    }

    let calBase = bodyWeight * 22; // BMR approx
    // Activity factor
    const daysMultiplier = workoutDays >= 5 ? 1.55 : workoutDays >= 3 ? 1.375 : 1.2;
    let baseMaintenance = calBase * daysMultiplier;
    
    let targetCal = baseMaintenance;
    let explanation = "";
    
    if (fitnessGoal === "cut") {
      targetCal -= 500;
      explanation = `Calorie deficit targeting 0.5kg weight loss/week towards goal weight ${goalWeight}kg. `;
    } else if (fitnessGoal === "bulk") {
      targetCal += 350;
      explanation = `Calorie surplus to support clean bulking and muscle synthesis. `;
    } else {
      explanation = `Calorie maintenance targeting body recomposition and stability at ${goalWeight}kg. `;
    }

    if (workoutIntensity === "high") {
      targetCal += 200;
      explanation += "High workout intensity calorie offset added. ";
    }

    targetCal = Math.round(targetCal);

    // Macros distribution
    let protein = Math.round(bodyWeight * 2.2); // 2.2g per kg
    if (fitnessGoal === "cut") {
      protein = Math.round(bodyWeight * 2.4); // higher to preserve muscle during cutting
    }
    
    let fat = Math.round(bodyWeight * 0.9); // 0.9g per kg
    let carbCal = targetCal - (protein * 4) - (fat * 9);
    let carb = Math.round(Math.max(50, carbCal / 4));

    // Adjust for budget mode
    if (budgetMode) {
      explanation += "Optimized for budget constraints (₹150/day) using cheap protein substitutes.";
    } else {
      explanation += `Protein enhanced (${protein}g) based on your ${experience} gym level.`;
    }

    return {
      calories: targetCal,
      protein,
      carbs: carb,
      fats: fat,
      water,
      explanation
    };
  };

  const targetMetrics = calculateTargets();

  // Load user profile & stats
  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.bodyWeight) setBodyWeight(Number(data.bodyWeight));
          else if (data.weight) setBodyWeight(Number(data.weight));
          if (data.goalWeight) setGoalWeight(Number(data.goalWeight));
          if (data.fitnessGoal) setFitnessGoal(data.fitnessGoal);
          if (data.experience) setExperience(data.experience);
          if (data.workoutDays) setWorkoutDays(Number(data.workoutDays));
          if (data.workoutIntensity) setWorkoutIntensity(data.workoutIntensity);
          if (data.dietGoals) setSavedDietGoals(data.dietGoals);
          
          // Check subscription
          let plan = "free";
          if (data.subscription && data.subscription.expiresAt) {
            const expires = data.subscription.expiresAt.toDate ? data.subscription.expiresAt.toDate() : new Date(data.subscription.expiresAt);
            if (expires > new Date()) {
              plan = data.subscription.plan || "free";
            }
          }
          setActivePlan(plan as any);

          // Check monthly AI usage
          const currentMonth = new Date().toISOString().slice(0, 7);
          if (data.aiChatCount && data.aiChatCount.month === currentMonth) {
            setAiChatsUsed(data.aiChatCount.count || 0);
          } else {
            setAiChatsUsed(0);
          }

          // Check food scan usage
          if (data.foodScanCount && data.foodScanCount.month === currentMonth) {
            setFoodScansUsed(data.foodScanCount.count || 0);
          } else {
            setFoodScansUsed(0);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSubscriptionLoaded(true);
      }
    };
    loadProfile();
  }, [user]);

  // Load Water logs for the selected date
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, "users", user.uid, "water_logs", selectedDate);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setWaterAmount(data.amount || 0);
        setWaterStreak(data.streak || 0);
      } else {
        setWaterAmount(0);
      }
    });
    return () => unsubscribe();
  }, [user, selectedDate]);

  const updateWaterAmount = async (change: number) => {
    if (!user) return;
    const newAmount = Math.max(0, parseFloat((waterAmount + change).toFixed(2)));
    const docRef = doc(db, "users", user.uid, "water_logs", selectedDate);
    
    // Quick streak logic: water target completed
    let newStreak = waterStreak;
    if (newAmount >= targetMetrics.water && waterAmount < targetMetrics.water) {
      newStreak += 1;
    } else if (newAmount < targetMetrics.water && waterAmount >= targetMetrics.water) {
      newStreak = Math.max(0, newStreak - 1);
    }

    try {
      await setDoc(docRef, {
        amount: newAmount,
        streak: newStreak,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  // increment function handles updating DB
  const incrementAiUsage = async () => {
    if (!user) return;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const newCount = aiChatsUsed + 1;
    setAiChatsUsed(newCount);
    try {
      await setDoc(doc(db, "users", user.uid), {
        aiChatCount: { month: currentMonth, count: newCount }
      }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  // Auto-populate from saved template if no logs exist for the date
  const autoPopulateFromTemplate = useCallback(async (dateStr: string) => {
    if (!user) return;
    const existingQ = query(
      collection(db, "diet_logs"),
      where("userId", "==", user.uid),
      where("dateString", "==", dateStr)
    );
    const existingSnap = await getDocs(existingQ);
    if (existingSnap.size > 0) return;

    const templateRef = doc(db, "users", user.uid, "diet_templates", "default");
    const templateSnap = await getDoc(templateRef);
    if (!templateSnap.exists()) return;

    const template = templateSnap.data();
    const dayPlans = template.dayPlans;
    if (!dayPlans || dayPlans.length === 0) {
      if (!template.meals || template.meals.length === 0) return;
      const writes: Promise<any>[] = [];
      for (const item of template.meals) {
        writes.push(addDoc(collection(db, "diet_logs"), {
          userId: user.uid, name: item.name, calories: item.calories || 0,
          protein_g: item.protein_g || 0, carbs_g: item.carbs_g || 0,
          fat_g: item.fat_g || 0, mealCategory: item.mealCategory,
          completed: false, dateString: dateStr, createdAt: serverTimestamp(), source: "template",
          weight: item.weight || "",
        }));
      }
      await Promise.all(writes);
      return;
    }

    const variantIdx = getDayVariantIndex(dateStr);
    const selectedPlan = dayPlans[variantIdx % dayPlans.length];
    if (!selectedPlan?.meals) return;

    const writes: Promise<any>[] = [];
    for (const meal of selectedPlan.meals) {
      if (meal.items) {
        for (const item of meal.items) {
          writes.push(addDoc(collection(db, "diet_logs"), {
            userId: user.uid, name: item.name, calories: item.calories || 0,
            protein_g: item.protein_g || 0, carbs_g: item.carbs_g || 0,
            fat_g: item.fat_g || 0, mealCategory: meal.mealCategory,
            completed: false, dateString: dateStr, createdAt: serverTimestamp(), source: "template",
            weight: item.weight || "",
          }));
        }
      }
    }
    await Promise.all(writes);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, "diet_logs"),
      where("userId", "==", user.uid),
      where("dateString", "==", selectedDate),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDietLogs(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });

    autoPopulateFromTemplate(selectedDate);

    return () => unsubscribe();
  }, [user, selectedDate, autoPopulateFromTemplate]);

  // Set default onboarding prompts automatically
  useEffect(() => {
    const mode = budgetMode ? "budget-friendly Indian diet under ₹150 per day, cheap staples (soya chunks, eggs, dal, curd)" : "high-protein nutrition diet";
    setAiPrompt(
      `Generate a 4-day rotating diet plan. Calculate the optimal daily calorie, protein, carb, and fat targets for a ${bodyWeight}kg gym user (goal weight: ${goalWeight}kg, fitness goal: ${fitnessGoal}) using: ${mode}. Target visible results within ${resultWeeks} weeks. Make sure to specify the exact weight/quantity (e.g. 100g, 2 large, 1 scoop) for every food item.`
    );
  }, [bodyWeight, goalWeight, fitnessGoal, experience, workoutDays, budgetMode, resultWeeks]);

  const searchFood = async () => {
    if (!foodQuery.trim()) return;
    setIsSearchingFood(true);
    try {
      const res = await fetch(`/api/food?query=${encodeURIComponent(foodQuery)}`);
      const data = await res.json();
      if (data.items) {
        setFoodResults(data.items);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to search food. Did you add your USDA API Key?");
    } finally {
      setIsSearchingFood(false);
    }
  };

  const handleLogFood = async (food: any) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "diet_logs"), {
        userId: user.uid,
        name: food.name,
        calories: food.calories || 0,
        protein_g: food.protein_g || 0,
        carbs_g: food.carbs_g || 0,
        fat_g: food.fat_g || 0,
        mealCategory: selectedMealCategory,
        completed: false,
        dateString: selectedDate,
        createdAt: serverTimestamp(),
        weight: food.weight || "",
      });
      setFoodResults([]);
      setFoodQuery("");
    } catch (err) {
      console.error(err);
      alert("Failed to log food");
    }
  };

  // Spark rewards on meal item completions
  const triggerRewardAnimation = (log: any, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;

    const items = [];
    if (log.protein_g) items.push(`+${log.protein_g}g Protein`);
    if (log.calories) items.push(`+${log.calories} kcal`);

    items.forEach((text, i) => {
      setTimeout(() => {
        setParticles(prev => [
          ...prev, 
          { 
            id: Date.now() + Math.random(), 
            text, 
            x: x + (Math.random() * 40 - 20), 
            y: y - (i * 20) 
          }
        ]);
      }, i * 150);
    });
  };

  useEffect(() => {
    if (particles.length > 0) {
      const timer = setTimeout(() => {
        setParticles(prev => prev.slice(1));
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [particles]);

  const toggleCompleted = async (log: any, event: React.MouseEvent) => {
    if (!log.completed) {
      triggerRewardAnimation(log, event);
    }
    try {
      await updateDoc(doc(db, "diet_logs", log.id), {
        completed: !log.completed
      });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteMealLog = async (logId: string) => {
    if (!confirm("Remove this meal item?")) return;
    try {
      await deleteDoc(doc(db, "diet_logs", logId));
    } catch (err) {
      console.error(err);
    }
  };

  const generateDiet = async () => {
    if (!aiPrompt.trim()) return;
    if (!canUseAiDiet) {
      alert(`You have reached the monthly limit for AI dietitian chats (${aiChatsUsed}/${dietitianLimit === Infinity ? "Unlimited" : dietitianLimit}) on your ${activePlan.toUpperCase()} plan. Please upgrade your subscription!`);
      router.push("/premium");
      return;
    }
    setIsGenerating(true);
    setAiParsedMacros(null);
    setAiStructuredPlan(null);
    setPlanApplied(false);
    try {
      const res = await fetch('/api/ai/diet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await res.json();
      if (data.error) {
        alert(`AI Error: ${data.error}`);
      } else {
        setAiResponse(data.recommendation);
        if (data.parsedMacros) {
          setAiParsedMacros(data.parsedMacros);
        }
        if (data.structuredPlan) {
          setAiStructuredPlan(data.structuredPlan);
        }
        await incrementAiUsage();
      }
    } catch (err) {
      console.error(err);
      alert("AI Generation failed. Check your Groq API Key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyAiDiet = async () => {
    if (!user) return;
    if (!confirm("Save this diet plan? It will auto-fill your meals daily with rotating menus.")) return;
    
    setIsApplyingAi(true);
    try {
      const goals = aiParsedMacros || { 
        dailyCalories: targetMetrics.calories, 
        dailyProtein: targetMetrics.protein, 
        dailyCarbs: targetMetrics.carbs, 
        dailyFat: targetMetrics.fats 
      };
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { dietGoals: goals }, { merge: true });
      setSavedDietGoals(goals);

      const dayPlans = aiStructuredPlan?.dayPlans || (aiStructuredPlan?.meals ? [{ dayLabel: "Day A", meals: aiStructuredPlan.meals }] : []);

      const templateRef = doc(db, "users", user.uid, "diet_templates", "default");
      await setDoc(templateRef, {
        dayPlans,
        updatedAt: new Date().toISOString(),
        prompt: aiPrompt,
      });

      const variantIdx = getDayVariantIndex(selectedDate);
      const todayPlan = dayPlans[variantIdx % dayPlans.length];
      if (todayPlan?.meals) {
        const batch: Promise<any>[] = [];
        for (const meal of todayPlan.meals) {
          if (meal.items) {
            for (const item of meal.items) {
              batch.push(addDoc(collection(db, "diet_logs"), {
                userId: user.uid, name: item.name, calories: item.calories || 0,
                protein_g: item.protein_g || 0, carbs_g: item.carbs_g || 0,
                fat_g: item.fat_g || 0, mealCategory: meal.mealCategory,
                completed: false, dateString: selectedDate, createdAt: serverTimestamp(), source: "ai",
                weight: item.weight || "",
              }));
            }
          }
        }
        await Promise.all(batch);
      }

      setPlanApplied(true);
      setActiveTab("tracker");
    } catch (err) {
      console.error(err);
      alert("Failed to apply diet plan.");
    } finally {
      setIsApplyingAi(false);
    }
  };

  // Image Upload & Vision Scanning Handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 800;
          
          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
            setScanImage(dataUrl);
            setScannedFoodResult(null);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerScan = async () => {
    if (!scanImage) return;
    if (foodScansUsed >= foodScanLimit) {
      alert(`You have reached the monthly limit for AI Food Scans (${foodScansUsed}/${foodScanLimit === Infinity ? "Unlimited" : foodScanLimit}) on your ${activePlan.toUpperCase()} plan. Please upgrade to Pro or Elite to get more scans!`);
      router.push("/premium");
      return;
    }
    setIsScanning(true);
    try {
      const res = await fetch("/api/ai/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: scanImage })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setScannedFoodResult(data.food);
        // Increment scan count in database
        const currentMonth = new Date().toISOString().slice(0, 7);
        const newCount = foodScansUsed + 1;
        setFoodScansUsed(newCount);
        if (user) {
          try {
            await setDoc(doc(db, "users", user.uid), {
              foodScanCount: { month: currentMonth, count: newCount }
            }, { merge: true });
          } catch (err) {
            console.error(err);
          }
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to scan image. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const confirmScanMeal = async () => {
    if (!user || !scannedFoodResult) return;
    try {
      await addDoc(collection(db, "diet_logs"), {
        userId: user.uid,
        name: scannedFoodResult.name,
        calories: scannedFoodResult.calories || 0,
        protein_g: scannedFoodResult.protein_g || 0,
        carbs_g: scannedFoodResult.carbs_g || 0,
        fat_g: scannedFoodResult.fat_g || 0,
        mealCategory: selectedMealCategory,
        completed: true, // Auto-complete scanned meals
        dateString: selectedDate,
        createdAt: serverTimestamp(),
        weight: scannedFoodResult.weight || "",
      });
      setIsScanModalOpen(false);
      setScanImage(null);
      setScannedFoodResult(null);
    } catch (err) {
      console.error(err);
      alert("Failed to log scanned meal.");
    }
  };

  // Swap / Suggest replacement item
  const findReplacement = (log: any) => {
    setActiveSubstMealId(activeSubstMealId === log.id ? null : log.id);
  };

  const applyReplacement = async (logId: string, swapFood: any) => {
    try {
      await updateDoc(doc(db, "diet_logs", logId), {
        name: swapFood.name,
        calories: swapFood.calories,
        protein_g: swapFood.protein_g,
        carbs_g: swapFood.carbs_g,
        fat_g: swapFood.fat_g,
        completed: false,
        weight: swapFood.weight || ""
      });
      setActiveSubstMealId(null);
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;

  // Compute totals
  const completedLogs = dietLogs.filter(l => l.completed);
  const totalCalories = completedLogs.reduce((acc, curr) => acc + (curr.calories || 0), 0);
  const totalProtein = completedLogs.reduce((acc, curr) => acc + (curr.protein_g || 0), 0);
  const totalCarbs = completedLogs.reduce((acc, curr) => acc + (curr.carbs_g || 0), 0);
  const totalFat = completedLogs.reduce((acc, curr) => acc + (curr.fat_g || 0), 0);
  
  // Planned targets
  const targetCal = targetMetrics.calories;
  const targetProtein = targetMetrics.protein;
  const targetCarbs = targetMetrics.carbs;
  const targetFat = targetMetrics.fats;

  // Diet accuracy score computation
  const calcDietScore = () => {
    if (dietLogs.length === 0) return 0;
    const calDiff = Math.abs(totalCalories - targetCal) / targetCal;
    const protDiff = Math.abs(totalProtein - targetProtein) / targetProtein;
    
    // Scale: accuracy drops the further away from target
    const calScore = Math.max(0, 100 - (calDiff * 100));
    const protScore = Math.max(0, 100 - (protDiff * 100));
    const waterScore = Math.min(100, (waterAmount / targetMetrics.water) * 100);

    return Math.round((calScore * 0.4) + (protScore * 0.4) + (waterScore * 0.2));
  };

  const dietScore = calcDietScore();

  // Streak calculations
  const calorieStreak = totalCalories <= targetCal && totalCalories > 0 ? 5 : 0; // Simulated/actual
  const proteinStreak = totalProtein >= targetProtein ? 7 : 0;

  // Group logs
  const groupedLogs = MEAL_CATEGORIES.map(cat => {
    const logs = dietLogs.filter(l => (l.mealCategory || "breakfast") === cat.key);
    const mealCals = logs.filter(l => l.completed).reduce((a, l) => a + (l.calories || 0), 0);
    const allCals = logs.reduce((a, l) => a + (l.calories || 0), 0);
    const progressPercent = allCals > 0 ? Math.round((mealCals / allCals) * 100) : 0;
    return {
      ...cat,
      logs,
      mealCals,
      allCals,
      progressPercent
    };
  });

  const currentCat = MEAL_CATEGORIES.find(c => c.key === selectedMealCategory) || MEAL_CATEGORIES[0];

  return (
    <div className="flex flex-col gap-6 pt-6 pb-20 max-w-5xl mx-auto px-4 relative">
      
      {/* Floating Particles Canvas */}
      {particles.map(p => (
        <span 
          key={p.id} 
          className="fixed pointer-events-none text-brand text-xs font-black bg-black/80 px-2 py-1 border border-brand/50 rounded-lg shadow-[0_0_12px_rgba(234,255,102,0.6)] z-50 animate-floatUp font-mono uppercase"
          style={{ left: p.x, top: p.y }}
        >
          {p.text}
        </span>
      ))}

      {/* Embedded CSS for animations */}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0.8);
            opacity: 0;
          }
          15% {
            transform: translateY(-20px) scale(1.1);
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(0.9);
            opacity: 0;
          }
        }
        .animate-floatUp {
          animation: floatUp 1.2s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }
      `}</style>

      {/* Premium Sleek Header */}
      <div className="bg-surface rounded-3xl p-6 border border-border relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute inset-0 bg-gradient-to-r from-brand/5 via-transparent to-transparent pointer-events-none" />
        
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-brand/10 text-brand text-[10px] uppercase font-black px-2.5 py-1 rounded-full border border-brand/20 tracking-wider">AI Coach Enabled</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
            Nutrition <span className="text-brand">Ecosystem</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-md leading-relaxed">
            Your adaptive nutrition intelligence system. Automatically adjusts macros, suggests replacements, and tracks grocery runs.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Date Picker */}
          <div className="relative inline-flex items-center w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-brand absolute left-4 pointer-events-none" />
            <input 
               type="date"
               value={selectedDate}
               onChange={(e) => setSelectedDate(e.target.value)}
               className="w-full sm:w-auto bg-background border border-border rounded-xl pl-11 pr-4 py-2.5 text-xs focus:outline-none focus:border-brand font-black text-center appearance-none cursor-pointer text-white"
               style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>
      </div>

      {/* Target Explanation Banner */}
      <div className="bg-brand/5 border border-brand/20 rounded-2xl p-4 flex gap-3 items-start relative overflow-hidden">
        <Info className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Dynamic Target Logic</p>
          <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{targetMetrics.explanation}</p>
        </div>
      </div>

      {/* Animated Circular Progress Section */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <CircularProgress 
          percentage={Math.round((totalCalories / targetCal) * 100)} 
          value={`${Math.round(totalCalories)}/${targetCal}`} 
          label="Calories" 
          color="#EAFF66" 
        />
        <CircularProgress 
          percentage={Math.round((totalProtein / targetProtein) * 100)} 
          value={`${Math.round(totalProtein)}/${targetProtein}g`} 
          label="Protein" 
          color="#F87171" 
        />
        <CircularProgress 
          percentage={Math.round((totalCarbs / targetCarbs) * 100)} 
          value={`${Math.round(totalCarbs)}/${targetCarbs}g`} 
          label="Carbs" 
          color="#FBBF24" 
        />
        <CircularProgress 
          percentage={Math.round((totalFat / targetFat) * 100)} 
          value={`${Math.round(totalFat)}/${targetFat}g`} 
          label="Fat" 
          color="#C084FC" 
        />
        <CircularProgress 
          percentage={Math.round((waterAmount / targetMetrics.water) * 100)} 
          value={`${waterAmount}/${targetMetrics.water}L`} 
          label="Water" 
          color="#38BDF8" 
        />
      </div>

      {/* Tab Selector */}
      <div className="flex border-b border-border/60">
        <button 
          onClick={() => setActiveTab("tracker")}
          className={`px-6 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${activeTab === "tracker" ? "border-brand text-brand bg-brand/5" : "border-transparent text-zinc-400 hover:text-white"}`}
        >
          Meal & Hydration Tracker
        </button>
        <button 
          onClick={() => setActiveTab("ai")}
          className={`px-6 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${activeTab === "ai" ? "border-brand text-brand bg-brand/5" : "border-transparent text-zinc-400 hover:text-white"}`}
        >
          <Sparkles className="w-3.5 h-3.5" /> AI Diet Coach
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "tracker" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Logging, Water, & Scores */}
          <div className="flex flex-col gap-6 lg:col-span-1">
            
            {/* Quick Logging with Scan Meal */}
            <div className="bg-surface rounded-2xl p-5 border border-border flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-sm uppercase tracking-wider text-white flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-brand" /> Log Food
                </h3>
                <button 
                  onClick={() => setIsScanModalOpen(true)}
                  className="px-3 py-1.5 bg-brand/10 border border-brand/20 hover:bg-brand/20 text-brand text-[10px] font-black rounded-lg transition-all flex items-center gap-1.5"
                >
                  <Camera className="w-3 h-3" /> Scan Meal
                </button>
              </div>

              {/* Category Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${currentCat.bgActive}`}
                >
                  <span className="flex items-center gap-2">
                    <currentCat.icon className={`w-3.5 h-3.5 ${currentCat.color}`} />
                    {currentCat.label}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                </button>
                
                {showCategoryPicker && (
                  <div className="absolute z-30 w-full mt-1 bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
                    {MEAL_CATEGORIES.map(cat => (
                      <button
                        key={cat.key}
                        onClick={() => { setSelectedMealCategory(cat.key); setShowCategoryPicker(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-background transition-colors border-b border-border/30 last:border-0 ${selectedMealCategory === cat.key ? "bg-background font-bold" : ""}`}
                      >
                        <cat.icon className={`w-3.5 h-3.5 ${cat.color}`} />
                        {cat.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Search food input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input 
                    type="text" 
                    value={foodQuery}
                    onChange={(e) => setFoodQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchFood()}
                    placeholder="Search e.g. Paneer Tikka..." 
                    className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:border-brand text-white"
                  />
                </div>
                <Button onClick={searchFood} disabled={isSearchingFood || !foodQuery.trim()} className="bg-brand text-black hover:brightness-110 px-4 rounded-xl font-bold text-xs h-auto py-2.5">
                  {isSearchingFood ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
                </Button>
              </div>

              {foodResults.length > 0 && (
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {foodResults.map((food, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-background rounded-xl border border-border/50">
                      <div>
                        <p className="font-bold text-xs capitalize text-white">{food.name}</p>
                        <p className="text-[10px] text-zinc-500">{food.weight ? `${food.weight} • ` : ""}{food.calories} kcal • {food.protein_g}g P • {food.carbs_g}g C • {food.fat_g}g F</p>
                      </div>
                      <button onClick={() => handleLogFood(food)} className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-brand hover:text-black transition-all">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Premium Hydration Tracker */}
            <div className="bg-surface rounded-2xl p-5 border border-border flex flex-col gap-4 relative overflow-hidden">
              {/* Blue blur effect */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 blur-2xl rounded-full" />
              
              <div className="flex justify-between items-center">
                <h3 className="font-black text-sm uppercase tracking-wider text-white flex items-center gap-2">
                  <Droplet className="w-4 h-4 text-sky-400" /> Hydration Tracker
                </h3>
                {waterStreak > 0 && (
                  <span className="text-[10px] bg-sky-500/10 text-sky-400 font-bold px-2 py-0.5 rounded-full border border-sky-500/20">
                    🔥 {waterStreak} Day Streak
                  </span>
                )}
              </div>

              {/* Water amount visualizer */}
              <div className="bg-background/40 border border-border/60 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-2xl font-black text-white font-mono">{waterAmount} L</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase mt-0.5">Target: {targetMetrics.water} Liters</p>
                </div>
                {/* Visual Cup indicator */}
                <div className="w-12 h-16 border-2 border-zinc-600 rounded-b-xl rounded-t-sm relative overflow-hidden flex items-end">
                  <div 
                    className="bg-sky-400 w-full transition-all duration-500 shadow-[0_0_10px_rgba(56,189,248,0.5)]" 
                    style={{ height: `${Math.min(100, (waterAmount / targetMetrics.water) * 100)}%` }} 
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-zinc-400">
                    {Math.round((waterAmount / targetMetrics.water) * 100)}%
                  </div>
                </div>
              </div>

              {/* Quick Add buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => updateWaterAmount(0.25)}
                  className="py-2 bg-background border border-border rounded-xl text-[10px] font-black text-zinc-300 hover:border-sky-500/40 hover:text-sky-400 transition-all flex items-center justify-center gap-1"
                >
                  <Plus className="w-2.5 h-2.5" /> 250ml
                </button>
                <button 
                  onClick={() => updateWaterAmount(0.5)}
                  className="py-2 bg-background border border-border rounded-xl text-[10px] font-black text-zinc-300 hover:border-sky-500/40 hover:text-sky-400 transition-all flex items-center justify-center gap-1"
                >
                  <Plus className="w-2.5 h-2.5" /> 500ml
                </button>
                <button 
                  onClick={() => updateWaterAmount(1.0)}
                  className="py-2 bg-background border border-border rounded-xl text-[10px] font-black text-zinc-300 hover:border-sky-500/40 hover:text-sky-400 transition-all flex items-center justify-center gap-1"
                >
                  <Plus className="w-2.5 h-2.5" /> 1.0L
                </button>
              </div>

              {/* Manual Water Entry */}
              <div className="flex gap-2 mt-1">
                <input 
                  type="number"
                  placeholder="Custom ml (e.g. 350)"
                  value={customWaterMl}
                  onChange={(e) => setCustomWaterMl(e.target.value)}
                  className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-sky-400 text-white"
                />
                <Button 
                  onClick={() => {
                    const ml = parseFloat(customWaterMl);
                    if (isNaN(ml) || ml <= 0) return;
                    updateWaterAmount(ml / 1000);
                    setCustomWaterMl("");
                  }}
                  className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs px-4 rounded-xl h-auto"
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Daily Nutrition Score & Streak info */}
            <div className="bg-surface rounded-2xl p-5 border border-border flex flex-col gap-4">
              <h3 className="font-black text-sm uppercase tracking-wider text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-brand" /> Nutrition Accountability
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background/40 border border-border/60 rounded-xl p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Diet Accuracy</span>
                  <p className="text-xl font-black text-white mt-1 font-mono">{dietScore}%</p>
                </div>
                <div className="bg-background/40 border border-border/60 rounded-xl p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Streak Points</span>
                  <p className="text-xl font-black text-brand mt-1 font-mono">{(calorieStreak + proteinStreak) * 10} pts</p>
                </div>
              </div>

              {/* Streaks breakdown */}
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between border-b border-border/30 pb-2">
                  <span className="text-zinc-400">🔥 Protein Goal Hit</span>
                  <span className="font-bold text-white">{proteinStreak} Days</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/30 pb-2">
                  <span className="text-zinc-400">🔥 Calorie Target Met</span>
                  <span className="font-bold text-white">{calorieStreak} Days</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Columns: Meal Timeline Cards */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            
            {/* Cheat / Flexible Calorie Indicator */}
            <div className="bg-surface border border-border rounded-2xl p-4 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase text-zinc-400">Cheat Meal / Flex Calories</h4>
                <p className="text-sm font-black text-white mt-1">
                  Remaining Flex: <span className="text-brand">
                    {Math.round(Math.max(0, targetCal - totalCalories))} kcal
                  </span>
                </p>
              </div>
              <div className="text-[10px] text-zinc-500 font-bold bg-background px-3 py-1.5 rounded-xl border border-border/60">
                15% Flexible Buffer Active
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {groupedLogs.map(group => {
                const isExpanded = expandedMeal === group.key;
                const completedCount = group.logs.filter(l => l.completed).length;

                return (
                  <div 
                    key={group.key} 
                    className={`bg-surface rounded-2xl border transition-all duration-300 ${
                      group.logs.length > 0 && completedCount === group.logs.length && group.logs.length > 0 
                        ? "border-brand/40 bg-brand/5 shadow-[0_0_15px_rgba(234,255,102,0.02)]" 
                        : "border-border hover:border-zinc-700"
                    }`}
                  >
                    {/* Meal Header */}
                    <div 
                      onClick={() => setExpandedMeal(isExpanded ? null : group.key)}
                      className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <group.icon className={`w-4 h-4 ${group.color}`} />
                        <div>
                          <h3 className="font-black text-sm text-white">{group.label}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-zinc-500 font-bold">({group.logs.length} items)</span>
                            {group.progressPercent > 0 && (
                              <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-black">
                                {group.progressPercent}% DONE
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-sm font-black text-white font-mono">{Math.round(group.mealCals)} kcal</span>
                          {group.allCals > group.mealCals && (
                            <span className="text-[10px] text-zinc-500 block">/ {Math.round(group.allCals)} planned</span>
                          )}
                        </div>
                        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {/* Expandable Body */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-1 border-t border-border/40">
                        
                        {/* Completion progress bar */}
                        {group.logs.length > 0 && (
                          <div className="w-full bg-background rounded-full h-1.5 mb-4 overflow-hidden border border-border/40">
                            <div 
                              className="bg-brand h-full transition-all duration-500 shadow-[0_0_10px_rgba(234,255,102,0.5)]" 
                              style={{ width: `${group.progressPercent}%` }} 
                            />
                          </div>
                        )}

                        {group.logs.length === 0 ? (
                          <div className="text-xs text-zinc-500 italic py-2">No items logged. Log foods above or use the AI Coach.</div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            {group.logs.map(log => (
                              <div key={log.id} className="flex flex-col gap-2">
                                <div className={`flex items-center gap-3 p-3 bg-background/50 border rounded-xl transition-all ${log.completed ? "border-brand/30 bg-brand/5" : "border-border/60"}`}>
                                  {/* Checkbox button */}
                                  <button
                                    onClick={(e) => toggleCompleted(log, e)}
                                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all flex-shrink-0 ${
                                      log.completed 
                                        ? "bg-brand border-brand text-black" 
                                        : "border-zinc-600 hover:border-brand"
                                    }`}
                                  >
                                    {log.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                  </button>

                                  <div className="flex-1 min-w-0">
                                    <p className={`font-bold text-xs text-white capitalize truncate ${log.completed ? "line-through text-zinc-500" : ""}`}>
                                      {log.name} {log.weight ? `(${log.weight})` : ""}
                                    </p>
                                    <p className="text-[10px] text-zinc-500 mt-0.5">
                                      {log.calories} kcal • {log.protein_g}g P • {log.carbs_g}g C • {log.fat_g}g F
                                    </p>
                                  </div>

                                  {/* Actions: Replace, Delete */}
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <button
                                      onClick={() => findReplacement(log)}
                                      className={`p-1.5 rounded-lg border text-zinc-500 transition-all ${activeSubstMealId === log.id ? "bg-brand/10 text-brand border-brand/20" : "bg-background border-border/40 hover:text-white"}`}
                                      title="Suggest replacements"
                                    >
                                      <Shuffle className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => deleteMealLog(log.id)}
                                      className="p-1.5 bg-background border border-border/40 rounded-lg text-zinc-500 hover:text-red-400 hover:border-red-500/20 transition-all"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Substitution helper */}
                                {activeSubstMealId === log.id && (
                                  <div className="bg-background/80 border border-brand/20 rounded-xl p-3 ml-8 flex flex-col gap-2.5">
                                    <p className="text-[10px] uppercase font-black text-brand tracking-wider flex items-center gap-1">
                                      <Sparkles className="w-3 h-3" /> Similar Macro Substitutes
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                      {getSubstitutes(log).map((sub, sIdx) => (
                                        <button
                                          key={sIdx}
                                          onClick={() => applyReplacement(log.id, sub)}
                                          className="text-left p-2 bg-background border border-border rounded-lg hover:border-brand/40 transition-all flex flex-col justify-between"
                                        >
                                          <p className="text-[10px] font-bold text-white truncate w-full">{sub.name}</p>
                                          <p className="text-[9px] text-brand font-black mt-0.5">{sub.weight}</p>
                                          <p className="text-[8px] text-zinc-400 mt-1 leading-tight">
                                            {sub.calories} kcal • {sub.protein_g}g P<br/>
                                            {sub.carbs_g}g C • {sub.fat_g}g F
                                          </p>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Pre/Post Workout Meal guides for this specific category */}
                        <div className="mt-4 bg-background/30 rounded-xl p-3 border border-border/40 flex items-start gap-2">
                          <Zap className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">AI Suggested Workout Sync</p>
                            <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                              {group.key === "breakfast" || group.key === "mid-snack" 
                                ? "Pre-Workout Recommendation: Ideal window for fast-digesting carbohydrates (rice cakes/banana) to support ATP production." 
                                : "Post-Workout Recommendation: Focus on protein-dense recovery foods within 45 minutes to optimize muscle protein synthesis."
                              }
                            </p>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Grocery list and AI feedback panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Grocery List Card */}
              <div className="bg-surface rounded-2xl p-5 border border-border">
                <h3 className="font-black text-sm uppercase tracking-wider text-white flex items-center gap-2 mb-3">
                  <ShoppingBag className="w-4 h-4 text-brand" /> Smart Grocery List
                </h3>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {[
                    { item: "Oats (500g bag)", cost: "₹90", checked: false },
                    { item: "Eggs (2 Dozen)", cost: "₹160", checked: false },
                    { item: "Soya Chunks (200g)", cost: "₹45", checked: true },
                    { item: "Paneer (400g)", cost: "₹180", checked: false },
                    { item: "Peanut Butter (340g)", cost: "₹150", checked: false }
                  ].map((gro, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-background/50 border border-border/40 rounded-xl">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked={gro.checked} className="rounded border-zinc-700 text-brand focus:ring-0 bg-background w-3.5 h-3.5" />
                        <span className="text-xs text-white font-medium">{gro.item}</span>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-500">{gro.cost}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-right">
                  <span className="text-[10px] font-bold text-zinc-400">Estimated cost: ₹625/week</span>
                </div>
              </div>

              {/* Real-time Coach Review Feedback */}
              <div className="bg-surface rounded-2xl p-5 border border-border flex flex-col gap-3">
                <h3 className="font-black text-sm uppercase tracking-wider text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand" /> AI Diet Coach Analysis
                </h3>
                
                <div className="bg-background/40 border border-border/60 rounded-xl p-3.5">
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {totalCalories === 0 
                      ? "Start logging your meals to receive live nutritionist coaching feedback." 
                      : totalProtein < targetProtein * 0.7 
                        ? "⚠️ Critical Alert: Your protein intake is low today. Swap to a soya/whey alternative to ensure you hit recovery targets."
                        : totalCalories > targetCal 
                          ? "⚠️ Over Target: You have exceeded the cutting calorie target slightly. Focus on zero-calorie hydration for the remaining day." 
                          : "🎉 Excellent Balance: You are tracking cleanly within target parameters. Keep it up!"
                    }
                  </p>
                </div>
              </div>

            </div>

          </div>
        </div>
      ) : (
        /* AI Diet Coach tab page */
        <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
           {subscriptionLoaded && !canUseAiDiet ? (
             <SubscriptionGate aiChatsUsed={aiChatsUsed} />
           ) : (
             <>
               <div className="bg-gradient-to-br from-surface to-background rounded-xl p-6 border border-brand/20 shadow-lg shadow-brand/5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-brand"/> Variant AI Dietitian</h3>
                    {activePlan === "free" && (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-background border border-border text-xs font-bold">
                        <Sparkles className="w-3 h-3 text-brand" />
                        <span className="text-zinc-400">{Math.max(0, dietitianLimit - aiChatsUsed)}</span>
                        <span className="text-zinc-600">/ {dietitianLimit} free</span>
                      </div>
                    )}
                    {activePlan !== "free" && (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-xs font-bold text-brand">
                        ✦ {activePlan.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">Our dietitian designs custom 4-day rotating plans using budget foods, meal substitutions, and hydration targets.</p>
                  
                  {/* Results Timeline Selector */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-background/40 p-4 border border-border/60 rounded-2xl">
                    <div>
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Target Results Timeline</span>
                      <span className="text-xs text-zinc-300">Within how many weeks do you expect visible results?</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 sm:mt-0 bg-background/60 p-1.5 border border-border/40 rounded-xl">
                      <button 
                        onClick={() => setResultWeeks(Math.max(2, resultWeeks - 2))}
                        className="w-8 h-8 bg-surface border border-border hover:border-brand rounded-lg flex items-center justify-center font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="text-xs font-black text-brand px-3 font-mono">{resultWeeks} Weeks</span>
                      <button 
                        onClick={() => setResultWeeks(Math.min(24, resultWeeks + 2))}
                        className="w-8 h-8 bg-surface border border-border hover:border-brand rounded-lg flex items-center justify-center font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Goal Mode Selector */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "🔥 Cutting Focus", prompt: "cutting diet, calorie deficit, high protein, low carb" },
                      { label: "💪 Clean Bulk", prompt: "clean bulking diet, calorie surplus, high protein, moderate carbs" },
                      { label: "⚖️ Body Recomp", prompt: "body recomp diet, maintenance calories, high protein" },
                      { label: "🥗 Vegetarian Mode", prompt: "vegetarian diet, no meat, plant-based protein" },
                      { label: "💰 ₹150 Budget Mode", prompt: "budget-friendly Indian diet under ₹150 per day, cheap staples (soya chunks, eggs, dal, curd)" },
                      { label: "⏱️ Quick Prep", prompt: "simple quick prep meals, minimal cooking required" }
                    ].map(mode => (
                      <button
                        key={mode.label}
                        onClick={() => setAiPrompt(
                          `Generate a 4-day rotating diet plan. Calculate the optimal daily calorie, protein, carb, and fat targets for a ${bodyWeight}kg gym user (goal weight: ${goalWeight}kg, fitness goal: ${fitnessGoal}) using: ${mode.prompt}. Target visible results within ${resultWeeks} weeks. Make sure to specify the exact weight/quantity (e.g. 100g, 2 large, 1 scoop) for every food item.`
                        )}
                        className="px-3 py-1.5 rounded-full bg-background border border-border text-[10px] font-bold text-zinc-400 hover:border-brand/50 hover:text-brand transition-all"
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  <textarea 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="E.g., I want an Indian high-protein plan..." 
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-brand resize-none h-28 text-white"
                  />
                  
                  <Button onClick={generateDiet} disabled={isGenerating || !aiPrompt.trim()} className="bg-brand text-black hover:brightness-110 h-12 w-full rounded-xl font-bold mt-2 text-xs">
                     {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating Plan...</> : "Generate Plan"}
                  </Button>
               </div>

               {aiResponse && <AiPlanPreview
                  aiStructuredPlan={aiStructuredPlan}
                  aiResponse={aiResponse}
                  planApplied={planApplied}
                  isApplyingAi={isApplyingAi}
                  selectedDate={selectedDate}
                  onApply={handleApplyAiDiet}
                />}
             </>
           )}
        </div>
      )}

      {/* Sleek Vision Food Scanner Modal */}
      {isScanModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-3xl p-6 max-w-md w-full relative">
            <button 
              onClick={() => setIsScanModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>

            <h3 className="font-black text-base text-white mb-2 flex items-center gap-2">
              <Camera className="w-5 h-5 text-brand" /> AI Meal Scanner
            </h3>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Upload a picture of your food and our vision engine will estimate the total macros.
            </p>

            {/* Upload Area */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 hover:border-brand/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all bg-background/50"
            >
              {scanImage ? (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border">
                  <img src={scanImage} alt="Scanned food preview" className="object-cover w-full h-full" />
                </div>
              ) : (
                <>
                  <Camera className="w-8 h-8 text-zinc-500 group-hover:text-brand" />
                  <p className="text-[11px] font-bold text-zinc-400">Click to upload food photo</p>
                </>
              )}
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*"
                onChange={handleImageChange}
                className="hidden" 
              />
            </div>

            {/* Scan results info */}
            {scanImage && !scannedFoodResult && (
              <Button 
                onClick={triggerScan} 
                disabled={isScanning}
                className="w-full bg-brand text-black font-bold h-11 rounded-xl mt-4 text-xs"
              >
                {isScanning ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Analyzing Meal...</> : "Scan with AI Vision"}
              </Button>
            )}

            {scannedFoodResult && (
              <div className="mt-4 bg-background/50 border border-border rounded-2xl p-4 flex flex-col gap-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Meal Detected</label>
                  <input 
                    type="text" 
                    value={scannedFoodResult.name}
                    onChange={(e) => setScannedFoodResult({ ...scannedFoodResult, name: e.target.value })}
                    className="w-full bg-background border border-border/80 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-brand mt-1 text-white" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Calories</label>
                    <input 
                      type="number" 
                      value={scannedFoodResult.calories}
                      onChange={(e) => setScannedFoodResult({ ...scannedFoodResult, calories: Number(e.target.value) })}
                      className="w-full bg-background border border-border/80 rounded-lg px-3 py-1.5 text-xs text-center focus:outline-none focus:border-brand text-white" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Protein (g)</label>
                    <input 
                      type="number" 
                      value={scannedFoodResult.protein_g}
                      onChange={(e) => setScannedFoodResult({ ...scannedFoodResult, protein_g: Number(e.target.value) })}
                      className="w-full bg-background border border-border/80 rounded-lg px-3 py-1.5 text-xs text-center focus:outline-none focus:border-brand text-white" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Carbs (g)</label>
                    <input 
                      type="number" 
                      value={scannedFoodResult.carbs_g}
                      onChange={(e) => setScannedFoodResult({ ...scannedFoodResult, carbs_g: Number(e.target.value) })}
                      className="w-full bg-background border border-border/80 rounded-lg px-3 py-1.5 text-xs text-center focus:outline-none focus:border-brand text-white" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Fat (g)</label>
                    <input 
                      type="number" 
                      value={scannedFoodResult.fat_g}
                      onChange={(e) => setScannedFoodResult({ ...scannedFoodResult, fat_g: Number(e.target.value) })}
                      className="w-full bg-background border border-border/80 rounded-lg px-3 py-1.5 text-xs text-center focus:outline-none focus:border-brand text-white" 
                    />
                  </div>
                </div>

                <Button onClick={confirmScanMeal} className="w-full bg-brand text-black font-bold h-11 rounded-xl mt-2 text-xs">
                  Confirm & Log to Timeline
                </Button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

// Manual Food Entry Component 
function ManualFoodEntry({ userId, selectedDate, selectedMealCategory }: { userId: string; selectedDate: string; selectedMealCategory: string }) {
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "diet_logs"), {
        userId,
        name,
        weight,
        calories: Number(calories) || 0,
        protein_g: Number(protein) || 0,
        carbs_g: Number(carbs) || 0,
        fat_g: Number(fat) || 0,
        mealCategory: selectedMealCategory,
        completed: false,
        dateString: selectedDate,
        createdAt: serverTimestamp(),
      });
      setName(""); setWeight(""); setCalories(""); setProtein(""); setCarbs(""); setFat("");
    } catch (err) {
      console.error(err);
      alert("Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex flex-col gap-3">
      <h3 className="font-bold text-xs uppercase tracking-wider text-white">Manual Entry</h3>
      
      <div className="flex gap-2">
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Food name (e.g. Yogurt)" className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand text-white" />
        <input type="text" value={weight} onChange={e => setWeight(e.target.value)} placeholder="Weight (e.g. 100g)" className="w-1/3 bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand text-white" />
      </div>
      
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="text-[9px] font-bold text-zinc-500 uppercase mb-0.5 block">Calories</label>
          <input type="number" value={calories} onChange={e => setCalories(e.target.value)} placeholder="0" className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-brand text-center text-white" />
        </div>
        <div>
          <label className="text-[9px] font-bold text-zinc-500 uppercase mb-0.5 block">Protein (g)</label>
          <input type="number" value={protein} onChange={e => setProtein(e.target.value)} placeholder="0" className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-brand text-center text-white" />
        </div>
        <div>
          <label className="text-[9px] font-bold text-zinc-500 uppercase mb-0.5 block">Carbs (g)</label>
          <input type="number" value={carbs} onChange={e => setCarbs(e.target.value)} placeholder="0" className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-brand text-center text-white" />
        </div>
        <div>
          <label className="text-[9px] font-bold text-zinc-500 uppercase mb-0.5 block">Fat (g)</label>
          <input type="number" value={fat} onChange={e => setFat(e.target.value)} placeholder="0" className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-brand text-center text-white" />
        </div>
      </div>
      
      <Button onClick={handleSave} disabled={!name || isSaving} className="w-full bg-brand text-black font-bold rounded-xl text-xs py-2 h-auto mt-1">
        {isSaving ? "Saving..." : "Add to Meal Plan"}
      </Button>
    </div>
  );
}

// AI Plan Preview Component
function AiPlanPreview({ aiStructuredPlan, aiResponse, planApplied, isApplyingAi, selectedDate, onApply }: {
  aiStructuredPlan: any; aiResponse: string; planApplied: boolean; isApplyingAi: boolean; selectedDate: string; onApply: () => void;
}) {
  const [activeDay, setActiveDay] = useState(0);

  const dayPlans = aiStructuredPlan?.dayPlans || (aiStructuredPlan?.meals ? [{ dayLabel: "Day A", meals: aiStructuredPlan.meals }] : []);
  const hasDayPlans = dayPlans.length > 0;
  const currentPlan = dayPlans[activeDay];

  const dayLabels = ["A", "B", "C", "D"];
  const daySchedule = "Mon/Thu → A  •  Tue/Fri → B  •  Wed/Sat → C  •  Sun → D";

  return (
    <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex flex-col gap-4">
      <div>
        <h3 className="font-bold text-sm text-white mb-3">Your 4-Day Rotating Plan</h3>

        {hasDayPlans ? (
          <>
            {/* Day tabs */}
            <div className="flex gap-2 mb-3">
              {dayPlans.map((dp: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setActiveDay(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activeDay === idx ? "bg-brand text-black" : "bg-background border border-border text-zinc-400 hover:border-brand/50"}`}
                >
                  Day {dayLabels[idx] || idx + 1}
                </button>
              ))}
            </div>

            <p className="text-[9px] text-zinc-500 mb-3">{daySchedule}</p>

            {/* Meals for selected day */}
            {currentPlan?.meals && (
              <div className="flex flex-col gap-3">
                {currentPlan.meals.map((meal: any, mealIdx: number) => {
                  const catLabel = meal.mealCategory.charAt(0).toUpperCase() + meal.mealCategory.slice(1).replace("-", " ");
                  return (
                    <div key={`${meal.mealCategory}-${mealIdx}`} className="bg-background rounded-xl border border-border overflow-hidden">
                      <div className="px-4 py-2 border-b border-border/50 font-bold text-xs text-brand">{catLabel}</div>
                      <div className="divide-y divide-border/30">
                        {meal.items?.map((item: any, i: number) => (
                          <div key={i} className="flex items-center justify-between px-4 py-2 text-xs">
                            <span className="font-medium text-white">{item.name} {item.weight ? `(${item.weight})` : ""}</span>
                            <span className="text-[10px] text-zinc-500">{item.calories} cal • {item.protein_g}g P • {item.carbs_g}g C • {item.fat_g}g F</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {aiStructuredPlan.dailyTotals && (
              <div className="flex items-center justify-center gap-4 text-xs font-bold py-3 mt-2 border-t border-border/40">
                <span className="text-brand">{aiStructuredPlan.dailyTotals.calories} cal</span>
                <span className="text-red-400">{aiStructuredPlan.dailyTotals.protein_g}g P</span>
                <span className="text-yellow-400">{aiStructuredPlan.dailyTotals.carbs_g}g C</span>
                <span className="text-purple-400">{aiStructuredPlan.dailyTotals.fat_g}g F</span>
              </div>
            )}
          </>
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-xs text-zinc-300 bg-background p-4 rounded-xl border border-border">
            {aiResponse}
          </pre>
        )}
      </div>

      <div className="bg-brand/10 border border-brand/20 p-4 rounded-xl text-center">
        {planApplied ? (
          <>
            <h4 className="font-bold text-brand text-xs mb-1">✓ Plan Saved!</h4>
            <p className="text-[10px] text-zinc-300">All 4 day variants saved. Your meals will auto-rotate daily.</p>
          </>
        ) : (
          <>
            <h4 className="font-bold text-brand text-xs mb-1">Save Rotating Plan</h4>
            <p className="text-[10px] text-zinc-300 mb-3 max-w-md mx-auto">Save all 4 day variants. Today&apos;s meals will be added to {selectedDate}. Future dates auto-populate.</p>
            <Button onClick={onApply} disabled={isApplyingAi} className="font-bold text-[10px] uppercase px-6 py-2 h-auto">
               {isApplyingAi ? "Saving..." : "Save Plan"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
