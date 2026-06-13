"use client";

import React from "react";
import { Dumbbell, Users, Trophy } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto w-full py-12 px-4 sm:px-6">
      <div className="bg-surface border border-border rounded-3xl p-8 sm:p-12 shadow-sm">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black mb-4 tracking-tight">About Variant<span className="text-brand">Fit</span></h1>
          <p className="text-zinc-400 max-w-2xl mx-auto">We are redefining how fitness enthusiasts track, share, and celebrate their progress.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center p-6 bg-background rounded-2xl border border-border">
            <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center mx-auto mb-4 text-brand">
              <Dumbbell className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">Track Everything</h3>
            <p className="text-sm text-zinc-400">Log your sets, reps, and PRs with absolute precision to ensure you are always progressively overloading.</p>
          </div>
          <div className="text-center p-6 bg-background rounded-2xl border border-border">
            <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center mx-auto mb-4 text-brand">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">Community First</h3>
            <p className="text-sm text-zinc-400">Fitness is better together. Share your journey, encourage others, and find training partners globally.</p>
          </div>
          <div className="text-center p-6 bg-background rounded-2xl border border-border">
            <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center mx-auto mb-4 text-brand">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">Hit Your Goals</h3>
            <p className="text-sm text-zinc-400">Whether it's a new 1RM or a transformation, our platform is built to celebrate your biggest wins.</p>
          </div>
        </div>

        <div className="space-y-6 text-zinc-300 leading-relaxed text-sm">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">Our Mission</h2>
            <p>VariantFit was built by lifters, for lifters. We were tired of generic fitness apps that felt like spreadsheets. We wanted a place where the grind is celebrated, where every PR matters, and where you can genuinely connect with other athletes who share your passion.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-white mb-3">The Journey</h2>
            <p>What started as a simple idea to log workouts has evolved into a comprehensive social fitness ecosystem. We are continuously adding new features, from AI-driven diet plans to advanced community challenges, ensuring that VariantFit remains the only fitness app you'll ever need.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
