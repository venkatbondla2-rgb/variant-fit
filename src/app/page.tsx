"use client";

import Link from "next/link";
import { ArrowRight, Activity, Home as HomeIcon, LineChart, Utensils, Dumbbell, Trophy, Users, MessageCircle, HelpCircle, Sparkles, Shield, Zap, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

const FEATURES = [
  {
    icon: HomeIcon,
    title: "Home Feed",
    desc: "Share workout progress, post updates, and engage with your fitness community in real-time.",
    color: "from-green-500/20 to-green-500/5",
    borderColor: "group-hover:border-green-500/40",
    iconColor: "text-green-400",
    glowColor: "group-hover:shadow-green-500/10",
  },
  {
    icon: LineChart,
    title: "Track Progress",
    desc: "Log workouts with custom splits, track PRs, monitor calories burned, and see your muscle matrix light up.",
    color: "from-blue-500/20 to-blue-500/5",
    borderColor: "group-hover:border-blue-500/40",
    iconColor: "text-blue-400",
    glowColor: "group-hover:shadow-blue-500/10",
  },
  {
    icon: Utensils,
    title: "Diet & Nutrition",
    desc: "AI-powered meal plans with 4-day rotation, USDA food search, and full macro tracking per meal category.",
    color: "from-orange-500/20 to-orange-500/5",
    borderColor: "group-hover:border-orange-500/40",
    iconColor: "text-orange-400",
    glowColor: "group-hover:shadow-orange-500/10",
  },
  {
    icon: Dumbbell,
    title: "Train with Variant",
    desc: "Send live training invites to friends, sync reps and sets in real-time during joint workout sessions.",
    color: "from-red-500/20 to-red-500/5",
    borderColor: "group-hover:border-red-500/40",
    iconColor: "text-red-400",
    glowColor: "group-hover:shadow-red-500/10",
  },
  {
    icon: Trophy,
    title: "Challenge Variants",
    desc: "Compete in weekly step challenges, lifting competitions, and consistency streaks with your community.",
    color: "from-yellow-500/20 to-yellow-500/5",
    borderColor: "group-hover:border-yellow-500/40",
    iconColor: "text-yellow-400",
    glowColor: "group-hover:shadow-yellow-500/10",
  },
  {
    icon: Users,
    title: "Community",
    desc: "Upload media, share achievements, and build your fitness tribe with posts, reactions, and nested replies.",
    color: "from-purple-500/20 to-purple-500/5",
    borderColor: "group-hover:border-purple-500/40",
    iconColor: "text-purple-400",
    glowColor: "group-hover:shadow-purple-500/10",
  },
  {
    icon: MessageCircle,
    title: "Messages",
    desc: "Direct messaging with search, friend-based access, and seamless one-on-one fitness conversations.",
    color: "from-cyan-500/20 to-cyan-500/5",
    borderColor: "group-hover:border-cyan-500/40",
    iconColor: "text-cyan-400",
    glowColor: "group-hover:shadow-cyan-500/10",
  },
  {
    icon: HelpCircle,
    title: "Help me Variant",
    desc: "Get community-powered answers to fitness questions with infinite nested reply threads and reactions.",
    color: "from-pink-500/20 to-pink-500/5",
    borderColor: "group-hover:border-pink-500/40",
    iconColor: "text-pink-400",
    glowColor: "group-hover:shadow-pink-500/10",
  },
];

const STATS = [
  { value: "10+", label: "Core Features", icon: Zap },
  { value: "AI", label: "Powered Diet", icon: Sparkles },
  { value: "Live", label: "Training Sync", icon: Activity },
  { value: "Pro", label: "Workout Splits", icon: Shield },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());
  const featureRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/feed");
    }
  }, [user, loading, router]);

  // Intersection observer for staggered card reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-idx"));
            setVisibleCards((prev) => new Set([...prev, idx]));
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
    );

    featureRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Activity className="w-10 h-10 text-brand animate-pulse" />
      </div>
    );
  }

  if (user) return null; // Will redirect

  return (
    <div className="flex flex-col flex-1 items-center min-h-screen relative overflow-hidden">
      
      {/* ============================================
          HERO SECTION
          ============================================ */}
      <section className="relative w-full flex flex-col items-center justify-center min-h-screen px-6 py-20">
        {/* Background decoration blobs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full pointer-events-none -z-10"
             style={{ background: "radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 60%)", animation: "gradient-float 8s ease-in-out infinite" }} />
        <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] rounded-full pointer-events-none -z-10"
             style={{ background: "radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 60%)", animation: "gradient-float 10s ease-in-out infinite reverse" }} />
        <div className="absolute bottom-[20%] left-[10%] w-[250px] h-[250px] rounded-full pointer-events-none -z-10"
             style={{ background: "radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 60%)", animation: "gradient-float 12s ease-in-out infinite" }} />

        {/* Mini 3D cube decoration */}
        <div className="perspective-container mb-8" style={{ animation: "fade-in-up 0.8s ease-out" }}>
          <div className="relative w-16 h-16"
               style={{ transformStyle: "preserve-3d", animation: "cube-rotate 6s ease-in-out infinite" }}>
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-brand/30"
                 style={{ transform: "translateZ(32px)", background: "linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(34,197,94,0.05) 100%)", boxShadow: "0 0 30px rgba(34,197,94,0.2)" }}>
              <Activity className="w-7 h-7 text-brand" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-brand/20"
                 style={{ transform: "rotateY(90deg) translateZ(32px)", background: "linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.03) 100%)" }}>
              <Dumbbell className="w-7 h-7 text-brand/60" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-brand/20"
                 style={{ transform: "rotateY(180deg) translateZ(32px)", background: "linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.03) 100%)" }}>
              <Trophy className="w-7 h-7 text-yellow-400/60" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-brand/20"
                 style={{ transform: "rotateY(-90deg) translateZ(32px)", background: "linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.03) 100%)" }}>
              <Sparkles className="w-7 h-7 text-cyan-400/60" />
            </div>
          </div>
        </div>

        {/* Hero heading */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-center max-w-5xl leading-[0.9]"
            style={{ animation: "fade-in-up 0.8s ease-out 0.1s both" }}>
          Unleash Your{" "}
          <span className="shimmer-text">Variant</span>
        </h1>

        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl font-medium leading-relaxed text-center mt-6"
           style={{ animation: "fade-in-up 0.8s ease-out 0.2s both" }}>
          The ultimate social gym community. Track workouts, crush goals, compete with friends, 
          and let AI build your perfect diet — all in one platform.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-8"
             style={{ animation: "fade-in-up 0.8s ease-out 0.3s both" }}>
          <Link
            href="/signup"
            id="hero-cta-signup"
            className="group flex items-center justify-center h-14 px-8 rounded-full bg-brand text-black font-bold text-lg transition-all active:scale-95 relative overflow-hidden"
            style={{ animation: "pulse-glow 3s ease-in-out infinite" }}
          >
            <span className="relative z-10 flex items-center">
              Start Tracking
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
          <Link
            href="/login"
            id="hero-cta-login"
            className="flex items-center justify-center h-14 px-8 rounded-full bg-surface text-white font-medium text-lg border border-border hover:bg-surface-hover hover:border-brand/30 transition-all active:scale-95"
          >
            Sign In
          </Link>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-600"
             style={{ animation: "fade-in-up 1s ease-out 0.6s both" }}>
          <span className="text-xs tracking-widest uppercase">Explore Features</span>
          <ChevronRight className="w-4 h-4 rotate-90 animate-bounce" />
        </div>
      </section>

      {/* ============================================
          FEATURES SHOWCASE SECTION
          ============================================ */}
      <section className="w-full max-w-6xl mx-auto px-6 py-20" id="features-section">
        <div className="text-center mb-16" style={{ animation: "fade-in-up 0.8s ease-out both" }}>
          <span className="inline-block px-4 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-bold tracking-widest uppercase mb-6">
            Platform Features
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
            Everything You Need to{" "}
            <span className="text-brand">Dominate</span>
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto text-lg">
            From AI-powered nutrition to live training sessions — discover every tool built to transform your fitness journey.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((feature, idx) => (
            <div
              key={feature.title}
              ref={(el) => { featureRefs.current[idx] = el; }}
              data-idx={idx}
              className={`group feature-card-3d relative rounded-2xl border border-border bg-surface p-6 cursor-default
                ${feature.borderColor} ${feature.glowColor}
                hover:shadow-2xl transition-all duration-500
                ${visibleCards.has(idx) ? "animate-fade-in-up" : "opacity-0"}
              `}
              style={{
                animationDelay: `${idx * 100}ms`,
              }}
            >
              {/* Gradient bg on hover */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-0`} />
              
              <div className="relative z-10">
                <div className={`w-12 h-12 rounded-xl bg-background/80 border border-border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                </div>
                <h3 className="font-bold text-lg mb-2 group-hover:text-white transition-colors">{feature.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================
          STATS SECTION — "Why Variant Fit?"
          ============================================ */}
      <section className="w-full max-w-5xl mx-auto px-6 py-20">
        <div className="glass-card rounded-3xl p-8 md:p-12 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full pointer-events-none"
               style={{ background: "radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 60%)" }} />

          <div className="text-center mb-10 relative z-10">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
              Why <span className="text-brand">Variant Fit</span>?
            </h2>
            <p className="text-zinc-400 max-w-lg mx-auto">
              Built by fitness enthusiasts, for fitness enthusiasts. Every feature is designed to push your limits.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 relative z-10">
            {STATS.map((stat, idx) => (
              <div
                key={stat.label}
                className="text-center p-4 rounded-2xl bg-background/50 border border-border/50 hover:border-brand/30 transition-all duration-300 hover:scale-105"
                style={{ animation: `count-up 0.6s ease-out ${0.2 + idx * 0.1}s both` }}
              >
                <stat.icon className="w-6 h-6 text-brand mx-auto mb-3" />
                <p className="text-2xl md:text-3xl font-black text-white mb-1" style={{ animation: "text-glow 3s ease-in-out infinite" }}>
                  {stat.value}
                </p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          BOTTOM CTA SECTION
          ============================================ */}
      <section className="w-full max-w-4xl mx-auto px-6 pb-20">
        <div className="relative rounded-3xl p-10 md:p-16 text-center overflow-hidden"
             style={{
               background: "linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(6,182,212,0.05) 50%, rgba(168,85,247,0.05) 100%)",
               border: "1px solid rgba(34,197,94,0.2)",
               animation: "pulse-glow 4s ease-in-out infinite",
             }}>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4 relative z-10">
            Ready to Join the{" "}
            <span className="text-brand">Movement</span>?
          </h2>
          <p className="text-zinc-400 max-w-md mx-auto mb-8 relative z-10">
            Start your transformation today. Track, train, eat right, and connect with a community that lifts each other up.
          </p>
          <Link
            href="/signup"
            id="bottom-cta-signup"
            className="group relative z-10 inline-flex items-center justify-center h-14 px-10 rounded-full bg-brand text-black font-bold text-lg transition-all active:scale-95 hover:brightness-110"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-border/50 py-8 text-center">
        <p className="text-xs text-zinc-600">
          © 2026 Variant Fit. Built with 💪 for the fitness community.
        </p>
      </footer>
    </div>
  );
}
