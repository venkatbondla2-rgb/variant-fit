"use client";

import { useLoading } from "@/context/LoadingContext";

export function PageLoader() {
  const { isLoading, isExiting } = useLoading();

  if (!isLoading) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/98 backdrop-blur-sm transition-all duration-400 ${
        isExiting ? "opacity-0 scale-110 blur-sm" : "opacity-100 scale-100"
      }`}
      style={{ willChange: "opacity, transform, filter" }}
    >
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
           style={{ background: "radial-gradient(circle, rgba(234,255,102,0.12) 0%, transparent 70%)", animation: "gradient-float 6s ease-in-out infinite" }} />

      {/* Orbit rings */}
      <div className="absolute w-[200px] h-[200px] rounded-full border border-brand/10"
           style={{ animation: "orbit-ring 8s linear infinite" }}>
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-brand/40" />
      </div>
      <div className="absolute w-[280px] h-[280px] rounded-full border border-brand/5"
           style={{ animation: "orbit-ring 12s linear infinite reverse" }}>
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand/30" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[45%] left-[48%] w-2 h-2 rounded-full bg-brand/60" style={{ animation: "particle-float-1 3s ease-in-out infinite", animationDelay: "0s" }} />
        <div className="absolute top-[50%] left-[52%] w-1.5 h-1.5 rounded-full bg-green-400/50" style={{ animation: "particle-float-2 3.5s ease-in-out infinite", animationDelay: "0.5s" }} />
        <div className="absolute top-[48%] left-[46%] w-1 h-1 rounded-full bg-emerald-300/40" style={{ animation: "particle-float-3 4s ease-in-out infinite", animationDelay: "1s" }} />
        <div className="absolute top-[52%] left-[50%] w-2.5 h-2.5 rounded-full bg-brand/30" style={{ animation: "particle-float-4 3.2s ease-in-out infinite", animationDelay: "0.8s" }} />
        <div className="absolute top-[46%] left-[54%] w-1 h-1 rounded-full bg-green-300/50" style={{ animation: "particle-float-5 4.5s ease-in-out infinite", animationDelay: "1.5s" }} />
        <div className="absolute top-[54%] left-[44%] w-1.5 h-1.5 rounded-full bg-emerald-400/40" style={{ animation: "particle-float-6 3.8s ease-in-out infinite", animationDelay: "0.3s" }} />
      </div>

      {/* Premium Logo Container */}
      <div className="relative z-10 mb-8 animate-pulse duration-[2000ms]">
        <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-[2rem] border border-brand/20 bg-slate-900/40 p-4 backdrop-blur-md shadow-[0_0_50px_rgba(234,255,102,0.15)] flex items-center justify-center overflow-hidden">
          {/* Inner pulse ring */}
          <div className="absolute inset-0 rounded-[2rem] border border-brand/40 animate-ping opacity-25" style={{ animationDuration: '3s' }} />
          
          <img 
            src="/icon-512.png?v=4" 
            alt="Variant Fit Logo" 
            className="w-full h-full object-contain rounded-2xl" 
          />
        </div>
      </div>

      {/* Brand text with shimmer */}
      <div className="relative z-10 text-center">
        <h2 className="text-2xl font-black tracking-[0.2em] shimmer-text mb-2">
          VARIANT FIT
        </h2>
        <p className="text-xs text-zinc-500 tracking-widest uppercase font-medium">
          Loading your experience
        </p>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 w-48 h-1 bg-zinc-800 rounded-full mt-8 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            background: "linear-gradient(90deg, #22c55e, #06b6d4, #22c55e)",
            backgroundSize: "200% 100%",
            animation: "progress-sweep 1.5s ease-in-out infinite, shimmer 2s linear infinite",
          }}
        />
      </div>
    </div>
  );
}
