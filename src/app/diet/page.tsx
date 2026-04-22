"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Search, Loader2, Utensils, Sparkles, Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

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

  // AI States
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
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
      setDietLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
        dateString: selectedDate,
        createdAt: serverTimestamp()
      });
      // Optionally clear search results after logging
      setFoodResults([]);
      setFoodQuery("");
    } catch (err) {
      console.error(err);
      alert("Failed to log food");
    }
  };

  const generateDiet = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/diet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await res.json();
      setAiResponse(data.recommendation);
    } catch (err) {
      console.error(err);
      alert("AI Generation failed. Check your Groq API Key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyAiDiet = async () => {
    if (!user) return;
    if (!confirm("Are you sure you want to apply this new diet? This will update your daily macro goals.")) return;
    
    setIsApplyingAi(true);
    try {
      // Mocking the AI parsed macros for demonstration. In a real scenario, the AI would return a structured JSON.
      const parsedGoals = { dailyCalories: 2200, dailyProtein: 180 }; 
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { dietGoals: parsedGoals }, { merge: true });
      alert("Your Daily Goals have been updated automatically!");
      setActiveTab("tracker");
    } catch (err) {
      console.error(err);
      alert("Failed to apply diet updates.");
    } finally {
      setIsApplyingAi(false);
    }
  };

  if (!user) return null;

  const totalCalories = dietLogs.reduce((acc, curr) => acc + (curr.calories || 0), 0);
  const totalProtein = dietLogs.reduce((acc, curr) => acc + (curr.protein_g || 0), 0);

  return (
    <div className="flex flex-col gap-6 pt-6">
      
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
           
           {/* Search Box */}
           <div className="bg-surface rounded-xl p-6 border border-border shadow-sm flex flex-col gap-4">
              <h3 className="font-bold flex items-center gap-2"><Utensils className="w-5 h-5 text-brand"/> Log Food</h3>
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
                <div className="mt-4 flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
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

           {/* Logged Intake */}
           <div className="bg-surface rounded-xl p-6 border border-border shadow-sm flex flex-col h-full">
             <div className="flex items-center justify-between mb-4">
               <h3 className="font-bold">Logged Intake</h3>
               <div className="text-xs text-brand text-right">
                  <span className="font-bold">{Math.round(totalCalories)} kcal</span> | <span>{Math.round(totalProtein)}g Prot</span>
               </div>
             </div>
             <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-2 flex-grow">
                {dietLogs.length === 0 ? (
                  <div className="flex items-center justify-center h-40 bg-background rounded-xl border border-border border-dashed text-zinc-500 text-sm">
                    No food logged on this date
                  </div>
                ) : (
                  dietLogs.map(log => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-background rounded-xl border border-border/50">
                       <p className="font-bold text-sm capitalize">{log.name}</p>
                       <p className="text-xs text-zinc-400">{log.calories} kcal • {log.protein_g}g</p>
                    </div>
                  ))
                )}
             </div>
           </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full pb-20">
           <div className="bg-gradient-to-br from-surface to-background rounded-xl p-6 border border-brand/20 shadow-lg shadow-brand/5 flex flex-col gap-4">
              <h3 className="font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-brand"/> Variant AI Dietitian</h3>
              <p className="text-sm text-zinc-400">Describe your goals, allergies, and available cooking time. The AI will instantly generate an editable diet plan.</p>
              
              <textarea 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="I am a 180lb male looking to cut fat while maintaining muscle. I workout 4 days a week and have a peanut allergy. Build me a 2200 calorie meal plan." 
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
                  <p className="text-xs text-zinc-300 mb-4 max-w-md mx-auto">Do you want to grant the AI Dietitian permission to automatically update your daily calorie and protein tracking goals?</p>
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
