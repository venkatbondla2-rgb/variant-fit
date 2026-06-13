"use client";

import React from "react";
import { Info } from "lucide-react";

export default function AdsInfoPage() {
  return (
    <div className="max-w-4xl mx-auto w-full py-12 px-4 sm:px-6">
      <div className="bg-surface border border-border rounded-3xl p-8 sm:p-12 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center text-brand">
             <Info className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Ads Information</h1>
        </div>
        
        <div className="space-y-6 text-zinc-300 leading-relaxed text-sm">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">How Advertising Works on VariantFit</h2>
            <p>To keep the core features of VariantFit free for all users, we display sponsored content and advertisements. We strive to ensure that all ads are relevant to fitness, health, and wellness to provide you with a seamless and non-intrusive experience.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Ad Personalization</h2>
            <p>We use basic profile information (such as your fitness goals or preferred workout styles) to show you advertisements that might genuinely interest you. For example, if you frequently log powerlifting workouts, you might see ads for lifting belts or strength equipment.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Your Data is Safe</h2>
            <p>We never sell your personal data to third-party advertisers. Advertisers do not know who you are; they only bid on aggregate demographics or interests. Your exact name, email, and private messages are completely hidden from our ad partners.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Removing Ads</h2>
            <p>We understand that some users prefer a completely ad-free experience. In the future, we will be launching "VariantFit Pro", a premium subscription tier that will completely remove all advertisements from your feed and profile, while offering advanced analytics.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
