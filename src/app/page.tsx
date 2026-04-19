import Link from "next/link";
import { ArrowRight, Activity } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
      
      <main className="flex flex-col items-center max-w-4xl text-center space-y-10 z-10">
        <div className="p-4 bg-surface rounded-full border border-border shadow-2xl flex items-center justify-center">
          <Activity className="w-10 h-10 text-brand" />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter">
          Unleash Your <span className="text-brand">Variant</span>
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl font-medium leading-relaxed">
          The ultimate social gym community. Track your workouts, compete with friends, and visualize your gains in real-time.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-4">
          <Link 
            href="/signup" 
            className="flex items-center justify-center h-14 px-8 rounded-full bg-brand text-black font-semibold text-lg hover:bg-brand-hover transition-all active:scale-95"
          >
            Start Tracking
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
          <Link 
            href="/login" 
            className="flex items-center justify-center h-14 px-8 rounded-full bg-surface text-white font-medium text-lg border border-border hover:bg-surface-hover transition-all active:scale-95"
          >
            Sign In
          </Link>
        </div>
      </main>
    </div>
  );
}
