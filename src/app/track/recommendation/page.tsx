// src/app/track/recommendation/page.tsx

"use client";

import { useEffect } from "react";
import { useTrackEngine } from "@/lib/useTrackEngine";
import { SplitCard } from "@/components/track/SplitCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function RecommendationPage() {
  const {
    generateRecommendations,
    splitOptions,
    selectedOptionId,
    selectOption,
    confirmSplit,
    selectedOption,
    setShowSetup,
    setSetupStep,
  } = useTrackEngine();

  // Load recommendations when the component mounts
  useEffect(() => {
    generateRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = async () => {
    if (selectedOption) {
      await confirmSplit(selectedOption);
    }
  };

  return (
    <section className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-slate-900 p-6 relative">
      {/* Header */}
      <header className="flex items-center mb-8">
        <a href="/track" className="mr-4">
          <Button variant="ghost">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </a>
        <h1 className="text-3xl font-bold text-white">AI‑Generated Split Recommendations</h1>
      </header>

      {/* Grid of split cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {splitOptions.map((opt) => (
          <SplitCard
            key={opt.id}
            option={opt}
            selected={opt.id === selectedOptionId}
            onSelect={selectOption}
          />
        ))}
      </div>

      {/* Confirmation actions */}
      <div className="mt-8 flex justify-center">
        <Button
          disabled={!selectedOption}
          onClick={handleConfirm}
          className="px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg shadow-lg transition-colors"
        >
          Confirm &amp; Apply Split
        </Button>
      </div>
    </section>
  );
}
