"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Search, Loader2, Utensils, Sparkles, Plus, Calendar, Check, Coffee, Sun, Cookie, Moon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const MEAL_CATEGORIES = [
  { key: "breakfast", label: "Breakfast", icon: Coffee, color: "text-orange-400", bgActive: "bg-orange-400/10 border-orange-400/30" },
  { key: "lunch", label: "Lunch", icon: Sun, color: "text-yellow-400", bgActive: "bg-yellow-400/10 border-yellow-400/30" },
  { key: "mid-snack", label: "Mid-Snack", icon: Cookie, color: "text-pink-400", bgActive: "bg-pink-400/10 border-pink-400/30" },
  { key: "dinner", label: "Dinner", icon: Moon, color: "text-blue-400", bgActive: "bg-blue-400/10 border-blue-400/30" },
];

export default function DietPage() {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"tracker" | "ai">("tracker");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  // Tracker States
  const [foodQuery, setFoodQuery] = useState("");
  const [isSearchingFood, setIsSearchingFood] = useState(false);
  const [foodResults, setFoodResults] = useState<any[]>([]);
  const [dietLogs, setDietLogs] = useState<any[]>([]);
  const [selectedMealCategory, setSelectedMealCategory] = useState("breakfast");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // AI States
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiParsedMacros, setAiParsedMacros] = useState<any>(null);
  const [isApplyingAi, setIsApplyingAi] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, "diet_logs"),
      where("userId", "==", user.uid),
      where("dateString", "==", selectedDate),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDietLogs(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
    });

    return () => unsubscribe();
  }, [user, selectedDate]);

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
        createdAt: serverTimestamp()
      });
      setFoodResults([]);
      setFoodQuery("");
    } catch (err) {
      console.error(err);
      alert("Failed to log food");
    }
  };

  const toggleCompleted = async (logId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "diet_logs", logId), {
        completed: !currentStatus
      });
    } catch (err) {
      console.error(err);
    }
  };

  const generateDiet = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setAiParsedMacros(null);
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
    if (!confirm("Apply this diet plan? This will update your daily macro goals.")) return;
    
    setIsApplyingAi(true);
    try {
      // Use AI-parsed macros if available, otherwise use defaults
      const goals = aiParsedMacros || { dailyCalories: 2200, dailyProtein: 180, dailyCarbs: 220, dailyFat: 70 };
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { dietGoals: goals }, { merge: true });
      alert(`Diet Updated!\nCalories: ${goals.dailyCalories}\nProtein: ${goals.dailyProtein}g\nCarbs: ${goals.dailyCarbs}g\nFat: ${goals.dailyFat}g`);
      setActiveTab("tracker");
    } catch (err) {
      console.error(err);
      alert("Failed to apply diet updates.");
    } finally {
      setIsApplyingAi(false);
    }
  };

  if (!user) return null;

  // Compute totals — only completed meals
  const completedLogs = dietLogs.filter(l => l.completed);
  const totalCalories = completedLogs.reduce((acc, curr) => acc + (curr.calories || 0), 0);
  const totalProtein = completedLogs.reduce((acc, curr) => acc + (curr.protein_g || 0), 0);
  const totalCarbs = completedLogs.reduce((acc, curr) => acc + (curr.carbs_g || 0), 0);
  const totalFat = completedLogs.reduce((acc, curr) => acc + (curr.fat_g || 0), 0);

  // All logged totals (for planning view)
  const allCalories = dietLogs.reduce((acc, curr) => acc + (curr.calories || 0), 0);

  // Group logs by meal category
  const groupedLogs = MEAL_CATEGORIES.map(cat => ({
    ...cat,
    logs: dietLogs.filter(l => (l.mealCategory || "breakfast") === cat.key)
  }));

  const currentCat = MEAL_CATEGORIES.find(c => c.key === selectedMealCategory) || MEAL_CATEGORIES[0];

  return (
    <div className="flex flex-col gap-6 pt-6 pb-20">
      
      {/* Header */}
      <div className="bg-surface rounded-3xl p-8 border border-border text-center">
        <h1 className="text-3xl font-bold mb-4">Diet & Nutrition</h1>
        <p className="text-zinc-400 mb-6 max-w-md mx-auto">
          Track your daily macros or let the Variant AI build a custom diet plan for you.
        </p>

        {/* Date Picker */}
        <div className="flex justify-center mb-8">
          <div className="relative inline-flex items-center">
            <Calendar className="w-5 h-5 text-brand absolute left-4 pointer-events-none" />
            <input 
               type="date"
               value={selectedDate}
               onChange={(e) => setSelectedDate(e.target.value)}
               className="bg-background border border-border rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-brand font-bold text-center appearance-none cursor-pointer"
               style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-center gap-4">
           <button 
             onClick={() => setActiveTab("tracker")}
             className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${activeTab === "tracker" ? "bg-brand text-black" : "bg-background border border-border text-zinc-400 hover:text-white"}`}
           >
             Macro Tracker
           </button>
           <button 
             onClick={() => setActiveTab("ai")}
             className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "ai" ? "bg-brand text-black" : "bg-background border border-border text-zinc-400 hover:text-white"}`}
           >
             <Sparkles className="w-4 h-4" /> AI Dietitian
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "tracker" ? (
        <div className="flex flex-col gap-6">
          
          {/* Live Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-surface rounded-2xl p-4 border border-border text-center">
              <p className="text-2xl font-black text-brand">{Math.round(totalCalories)}</p>
              <p className="text-[10px] text-zinc-500 uppercase font-bold mt-1">Calories</p>
              <p className="text-[10px] text-zinc-600">of {Math.round(allCalories)} planned</p>
            </div>
            <div className="bg-surface rounded-2xl p-4 border border-border text-center">
              <p className="text-2xl font-black text-red-400">{Math.round(totalProtein)}g</p>
              <p className="text-[10px] text-zinc-500 uppercase font-bold mt-1">Protein</p>
            </div>
            <div className="bg-surface rounded-2xl p-4 border border-border text-center">
              <p className="text-2xl font-black text-yellow-400">{Math.round(totalCarbs)}g</p>
              <p className="text-[10px] text-zinc-500 uppercase font-bold mt-1">Carbs</p>
            </div>
            <div className="bg-surface rounded-2xl p-4 border border-border text-center">
              <p className="text-2xl font-black text-purple-400">{Math.round(totalFat)}g</p>
              <p className="text-[10px] text-zinc-500 uppercase font-bold mt-1">Fat</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Search Box */}
            <div className="bg-surface rounded-xl p-6 border border-border shadow-sm flex flex-col gap-4">
               <h3 className="font-bold flex items-center gap-2"><Utensils className="w-5 h-5 text-brand"/> Log Food</h3>
               
               {/* Meal Category Selector */}
               <div className="relative">
                 <button
                   onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                   className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-bold transition-all ${currentCat.bgActive}`}
                 >
                   <span className="flex items-center gap-2">
                     <currentCat.icon className={`w-4 h-4 ${currentCat.color}`} />
                     {currentCat.label}
                   </span>
                   <ChevronDown className={`w-4 h-4 transition-transform ${showCategoryPicker ? "rotate-180" : ""}`} />
                 </button>
                 
                 {showCategoryPicker && (
                   <div className="absolute z-20 w-full mt-1 bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
                     {MEAL_CATEGORIES.map(cat => (
                       <button
                         key={cat.key}
                         onClick={() => { setSelectedMealCategory(cat.key); setShowCategoryPicker(false); }}
                         className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-background transition-colors border-b border-border/30 last:border-0 ${selectedMealCategory === cat.key ? "bg-background font-bold" : ""}`}
                       >
                         <cat.icon className={`w-4 h-4 ${cat.color}`} />
                         {cat.label}
                       </button>
                     ))}
                   </div>
                 )}
               </div>

               <div className="flex gap-2">
                  <div className="relative flex-1">
                     <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                     <input 
                       type="text" 
                       value={foodQuery}
                       onChange={(e) => setFoodQuery(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && searchFood()}
                       placeholder="e.g. 2 eggs" 
                       className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-brand"
                     />
                  </div>
                  <Button onClick={searchFood} disabled={isSearchingFood || !foodQuery.trim()} className="bg-brand text-black hover:brightness-110 h-full px-6 rounded-xl font-bold">
                     {isSearchingFood ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                  </Button>
               </div>

               {/* Search Results */}
               {foodResults.length > 0 && (
                 <div className="mt-2 flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
                    {foodResults.map((food, i) => (
                       <div key={i} className="flex items-center justify-between p-3 bg-background rounded-xl border border-border/50">
                          <div>
                            <p className="font-bold text-sm capitalize">{food.name}</p>
                            <p className="text-xs text-zinc-500">{food.calories} kcal • {food.protein_g}g Protein</p>
                          </div>
                          <button onClick={() => handleLogFood(food)} className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center hover:bg-brand hover:text-black transition-colors">
                            <Plus className="w-4 h-4" />
                          </button>
                       </div>
                    ))}
                 </div>
               )}
            </div>

            {/* Quick Add Manual Entry */}
            <ManualFoodEntry 
              userId={user.uid}
              selectedDate={selectedDate}
              selectedMealCategory={selectedMealCategory}
            />
          </div>

          {/* Meal Timeline */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold">Meal Timeline</h2>
            
            {groupedLogs.map(group => {
              const groupCalories = group.logs.filter(l => l.completed).reduce((a, l) => a + (l.calories || 0), 0);
              const allGroupCalories = group.logs.reduce((a, l) => a + (l.calories || 0), 0);
              const completedCount = group.logs.filter(l => l.completed).length;
              
              return (
                <div key={group.key} className="bg-surface rounded-2xl border border-border overflow-hidden">
                  {/* Category Header */}
                  <div className={`flex items-center justify-between px-5 py-4 border-b border-border/50 ${group.logs.length > 0 && completedCount === group.logs.length && group.logs.length > 0 ? "bg-brand/10" : ""}`}>
                    <div className="flex items-center gap-3">
                      <group.icon className={`w-5 h-5 ${group.color}`} />
                      <h3 className="font-bold">{group.label}</h3>
                      <span className="text-xs text-zinc-500">({group.logs.length} items)</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-brand">{Math.round(groupCalories)} kcal</span>
                      {allGroupCalories > groupCalories && (
                        <span className="text-xs text-zinc-500 ml-1">/ {Math.round(allGroupCalories)}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Meal Items */}
                  {group.logs.length === 0 ? (
                    <div className="px-5 py-4 text-sm text-zinc-500 italic">No items logged for {group.label.toLowerCase()}</div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      {group.logs.map(log => (
                        <div 
                          key={log.id} 
                          className={`flex items-center gap-4 px-5 py-3 transition-all ${log.completed ? "opacity-60" : ""}`}
                        >
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleCompleted(log.id, log.completed)}
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                              log.completed 
                                ? "bg-brand border-brand" 
                                : "border-zinc-600 hover:border-brand"
                            }`}
                          >
                            {log.completed && <Check className="w-4 h-4 text-black" />}
                          </button>
                          
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold text-sm capitalize truncate ${log.completed ? "line-through text-zinc-500" : ""}`}>{log.name}</p>
                            <p className="text-xs text-zinc-500">
                              {log.calories} kcal
                              {log.protein_g ? ` • ${log.protein_g}g P` : ""}
                              {log.carbs_g ? ` • ${log.carbs_g}g C` : ""}
                              {log.fat_g ? ` • ${log.fat_g}g F` : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
           <div className="bg-gradient-to-br from-surface to-background rounded-xl p-6 border border-brand/20 shadow-lg shadow-brand/5 flex flex-col gap-4">
              <h3 className="font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-brand"/> Variant AI Dietitian</h3>
              <p className="text-sm text-zinc-400">Describe your goals, allergies, and available cooking time. The AI will instantly generate a diet plan organized by meal.</p>
              
              <textarea 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="I am a 180lb male looking to cut fat while maintaining muscle. I workout 4 days a week and have a peanut allergy. Build me a 2200 calorie meal plan organized into Breakfast, Lunch, Mid-Snack, and Dinner." 
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand resize-none h-32"
              />
              
              <Button onClick={generateDiet} disabled={isGenerating || !aiPrompt.trim()} className="bg-brand text-black hover:brightness-110 h-12 w-full rounded-xl font-bold mt-2">
                 {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating Plan...</> : "Generate Diet Plan"}
              </Button>
           </div>

           {aiResponse && (
             <div className="bg-surface rounded-xl p-6 border border-border shadow-sm flex flex-col gap-6">
                <div>
                  <h3 className="font-bold mb-4">Your Custom Plan</h3>
                  <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300 bg-background p-4 rounded-xl border border-border">
                    {aiResponse}
                  </pre>
                </div>
                
                <div className="bg-brand/10 border border-brand/20 p-4 rounded-xl text-center">
                  <h4 className="font-bold text-brand mb-2">Update Daily Goals?</h4>
                  <p className="text-xs text-zinc-300 mb-4 max-w-md mx-auto">Grant the AI permission to update your daily calorie and macro tracking goals?</p>
                  <Button onClick={handleApplyAiDiet} disabled={isApplyingAi} className="font-bold text-xs uppercase px-8">
                     {isApplyingAi ? "Applying..." : "Yes, Apply Plan"}
                  </Button>
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
}

// Manual Food Entry Component (for users who want to type their own)
function ManualFoodEntry({ userId, selectedDate, selectedMealCategory }: { userId: string; selectedDate: string; selectedMealCategory: string }) {
  const [name, setName] = useState("");
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
        calories: Number(calories) || 0,
        protein_g: Number(protein) || 0,
        carbs_g: Number(carbs) || 0,
        fat_g: Number(fat) || 0,
        mealCategory: selectedMealCategory,
        completed: false,
        dateString: selectedDate,
        createdAt: serverTimestamp(),
      });
      setName(""); setCalories(""); setProtein(""); setCarbs(""); setFat("");
    } catch (err) {
      console.error(err);
      alert("Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-surface rounded-xl p-6 border border-border shadow-sm flex flex-col gap-4">
      <h3 className="font-bold flex items-center gap-2"><Plus className="w-5 h-5 text-brand" /> Manual Entry</h3>
      <p className="text-xs text-zinc-500">Add your own food item with custom macros.</p>
      
      <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Food name (e.g. Greek Yogurt)" className="bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-brand" />
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Calories</label>
          <input type="number" value={calories} onChange={e => setCalories(e.target.value)} placeholder="200" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand text-center" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Protein (g)</label>
          <input type="number" value={protein} onChange={e => setProtein(e.target.value)} placeholder="20" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand text-center" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Carbs (g)</label>
          <input type="number" value={carbs} onChange={e => setCarbs(e.target.value)} placeholder="30" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand text-center" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Fat (g)</label>
          <input type="number" value={fat} onChange={e => setFat(e.target.value)} placeholder="10" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand text-center" />
        </div>
      </div>
      
      <Button onClick={handleSave} disabled={!name || isSaving} className="w-full bg-brand text-black font-bold rounded-xl">
        {isSaving ? "Saving..." : "Add to Meal Plan"}
      </Button>
    </div>
  );
}
