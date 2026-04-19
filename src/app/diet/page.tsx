"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Search, Loader2, Utensils, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DietPage() {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"tracker" | "ai">("tracker");
  
  // Tracker States
  const [foodQuery, setFoodQuery] = useState("");
  const [isSearchingFood, setIsSearchingFood] = useState(false);
  const [foodResults, setFoodResults] = useState<any[]>([]);

  // AI States
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

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

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6 pt-6">
      
      {/* Header */}
      <div className="bg-surface rounded-3xl p-8 border border-border text-center">
        <h1 className="text-3xl font-bold mb-4">Diet & Nutrition</h1>
        <p className="text-zinc-400 mb-8 max-w-md mx-auto">
          Track your daily macros using the USDA Food Database or let the Variant AI build a custom diet plan for you.
        </p>

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
                      placeholder="e.g. 2 eggs and 1 slice of toast" 
                      className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-brand"
                    />
                 </div>
                 <Button onClick={searchFood} disabled={isSearchingFood || !foodQuery.trim()} className="bg-brand text-black hover:brightness-110 h-full px-6 rounded-xl font-bold">
                    {isSearchingFood ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                 </Button>
              </div>

              {/* Search Results */}
              {foodResults.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                   {foodResults.map((food, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-background rounded-xl border border-border/50">
                         <div>
                           <p className="font-bold text-sm capitalize">{food.name}</p>
                           <p className="text-xs text-zinc-500">{food.calories} kcal • {food.protein_g}g Protein</p>
                         </div>
                         <button className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center hover:bg-brand hover:text-black transition-colors">
                           <Plus className="w-4 h-4" />
                         </button>
                      </div>
                   ))}
                </div>
              )}
           </div>

           {/* Today's Log Placeholder */}
           <div className="bg-surface rounded-xl p-6 border border-border shadow-sm">
             <h3 className="font-bold mb-4">Today's Intake</h3>
             <div className="flex items-center justify-center h-40 bg-background rounded-xl border border-border border-dashed text-zinc-500 text-sm">
                No food logged today
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
             <div className="bg-surface rounded-xl p-6 border border-border shadow-sm">
                <h3 className="font-bold mb-4">Your Custom Plan</h3>
                {/* We render pre-wrap to keep whitespace styling from ChatGPT text */}
                <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300">
                  {aiResponse}
                </pre>
             </div>
           )}
        </div>
      )}

    </div>
  );
}
