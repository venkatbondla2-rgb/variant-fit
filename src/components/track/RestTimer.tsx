"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Timer, Play, Pause, RotateCcw, Plus, Minus } from "lucide-react";

interface RestTimerProps {
  onComplete?: () => void;
}

const PRESETS = [30, 60, 90, 120, 180];

export function RestTimer({ onComplete }: RestTimerProps) {
  const [duration, setDuration] = useState(90);
  const [remaining, setRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create beep sound on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.frequency.value = 800;
        gain.gain.value = 0;
        audioRef.current = null; // We'll use AudioContext for beep
      } catch {}
    }
  }, []);

  const playBeep = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.value = 0.3;
      o.start();
      o.stop(ctx.currentTime + 0.15);
      setTimeout(() => {
        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.connect(g2);
        g2.connect(ctx.destination);
        o2.frequency.value = 1100;
        g2.gain.value = 0.3;
        o2.start();
        o2.stop(ctx.currentTime + 0.2);
      }, 200);
    } catch {}
  }, []);

  useEffect(() => {
    if (isRunning && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            playBeep();
            onComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, remaining, playBeep, onComplete]);

  const start = () => {
    if (remaining === 0) setRemaining(duration);
    setIsRunning(true);
  };

  const pause = () => setIsRunning(false);
  const reset = () => { setIsRunning(false); setRemaining(0); };

  const progress = remaining > 0 ? ((duration - remaining) / duration) * 100 : 0;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  // Circle progress
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (progress / 100) * circumference;

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all text-xs font-bold ${
          isRunning
            ? "bg-blue-500/10 border-blue-500/40 text-blue-400 animate-pulse"
            : remaining > 0
            ? "bg-orange-500/10 border-orange-500/40 text-orange-400"
            : "bg-surface border-border text-zinc-400 hover:border-brand/50"
        }`}
      >
        <Timer className="w-3.5 h-3.5" />
        {isRunning ? `${minutes}:${seconds.toString().padStart(2, "0")}` : "Rest Timer"}
      </button>
    );
  }

  return (
    <div className="bg-surface rounded-2xl border border-border p-4 relative overflow-hidden">
      {/* Animated background glow when running */}
      {isRunning && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-blue-500/5 animate-pulse" />
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Timer className="w-4 h-4 text-blue-400" />
            Rest Timer
          </h3>
          <button onClick={() => setIsExpanded(false)} className="text-zinc-500 hover:text-white text-xs">
            Minimize
          </button>
        </div>

        {/* Circular timer */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-28 h-28">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(63,63,70,0.3)" strokeWidth="4" />
              {/* Progress circle */}
              <circle
                cx="50" cy="50" r={radius} fill="none"
                stroke={remaining <= 5 && remaining > 0 ? "#ef4444" : "#3b82f6"}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-black tabular-nums ${
                remaining <= 5 && remaining > 0 ? "text-red-400" : "text-white"
              }`}>
                {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
              {remaining === 0 && !isRunning && (
                <span className="text-[9px] text-zinc-500 uppercase">Ready</span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {!isRunning ? (
              <button onClick={start} className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-400 transition-colors">
                <Play className="w-5 h-5 ml-0.5" />
              </button>
            ) : (
              <button onClick={pause} className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-400 transition-colors">
                <Pause className="w-5 h-5" />
              </button>
            )}
            <button onClick={reset} className="w-8 h-8 rounded-full bg-surface border border-border text-zinc-400 flex items-center justify-center hover:text-white transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Duration selector */}
          {!isRunning && remaining === 0 && (
            <div className="w-full">
              <p className="text-[10px] text-zinc-500 uppercase font-bold text-center mb-2">Duration</p>
              <div className="flex items-center justify-center gap-2">
                <button onClick={() => setDuration(d => Math.max(10, d - 15))} className="w-7 h-7 rounded-full bg-background border border-border flex items-center justify-center text-zinc-400 hover:text-white">
                  <Minus className="w-3 h-3" />
                </button>
                <div className="flex gap-1">
                  {PRESETS.map(p => (
                    <button
                      key={p}
                      onClick={() => setDuration(p)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        duration === p
                          ? "bg-blue-500/20 border border-blue-500/40 text-blue-400"
                          : "bg-background border border-border text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {p >= 60 ? `${p / 60}m` : `${p}s`}
                    </button>
                  ))}
                </div>
                <button onClick={() => setDuration(d => d + 15)} className="w-7 h-7 rounded-full bg-background border border-border flex items-center justify-center text-zinc-400 hover:text-white">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
