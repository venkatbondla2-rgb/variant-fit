"use client";

import { useRef, useState, useEffect } from "react";
import { Download, Share2, X, Dumbbell, Flame, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShareCardProps {
  type: "workout" | "pr" | "streak";
  data: {
    username: string;
    title: string;
    subtitle?: string;
    stat?: string;
    statLabel?: string;
    exercises?: number;
    calories?: number;
    streak?: number;
    prExercise?: string;
    prWeight?: string;
  };
  onClose: () => void;
}

export function ShareCard({ type, data, onClose }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generating, setGenerating] = useState(false);

  const generateCard = async () => {
    setGenerating(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = 1080;
    const h = 1080;
    canvas.width = w;
    canvas.height = h;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    if (type === "workout") {
      grad.addColorStop(0, "#0a0a0a");
      grad.addColorStop(0.5, "#111111");
      grad.addColorStop(1, "#1a1a0a");
    } else if (type === "pr") {
      grad.addColorStop(0, "#0a0a0a");
      grad.addColorStop(0.5, "#111111");
      grad.addColorStop(1, "#1a0a1a");
    } else {
      grad.addColorStop(0, "#0a0a0a");
      grad.addColorStop(0.5, "#111111");
      grad.addColorStop(1, "#0a1a0a");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Accent glow
    const glowGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, 400);
    glowGrad.addColorStop(0, type === "workout" ? "rgba(234,255,102,0.08)" : type === "pr" ? "rgba(168,85,247,0.08)" : "rgba(249,115,22,0.08)");
    glowGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, w, h);

    // Border
    ctx.strokeStyle = type === "workout" ? "rgba(234,255,102,0.2)" : type === "pr" ? "rgba(168,85,247,0.2)" : "rgba(249,115,22,0.2)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(40, 40, w - 80, h - 80, 32);
    ctx.stroke();

    // VariantFit branding
    ctx.fillStyle = type === "workout" ? "#EAFF66" : type === "pr" ? "#A855F7" : "#F97316";
    ctx.font = "bold 28px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("VARIANTFIT", 80, 110);

    // Type badge
    ctx.fillStyle = type === "workout" ? "rgba(234,255,102,0.15)" : type === "pr" ? "rgba(168,85,247,0.15)" : "rgba(249,115,22,0.15)";
    const badgeText = type === "workout" ? "WORKOUT COMPLETED" : type === "pr" ? "NEW PERSONAL RECORD" : "STREAK ACHIEVEMENT";
    ctx.font = "900 18px Inter, system-ui, sans-serif";
    const badgeWidth = ctx.measureText(badgeText).width + 40;
    ctx.beginPath();
    ctx.roundRect(80, 160, badgeWidth, 40, 20);
    ctx.fill();
    ctx.fillStyle = type === "workout" ? "#EAFF66" : type === "pr" ? "#A855F7" : "#F97316";
    ctx.textAlign = "left";
    ctx.fillText(badgeText, 100, 187);

    // Username
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 64px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(data.username, w / 2, 340);

    // Title
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 36px Inter, system-ui, sans-serif";
    ctx.fillText(data.title, w / 2, 420);

    // Main stat
    if (data.stat) {
      ctx.fillStyle = type === "workout" ? "#EAFF66" : type === "pr" ? "#A855F7" : "#F97316";
      ctx.font = "900 120px Inter, system-ui, sans-serif";
      ctx.fillText(data.stat, w / 2, 600);

      if (data.statLabel) {
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "bold 28px Inter, system-ui, sans-serif";
        ctx.fillText(data.statLabel, w / 2, 650);
      }
    }

    // Stats row at bottom
    if (type === "workout" && data.exercises) {
      const stats = [
        { label: "Exercises", value: `${data.exercises}` },
        { label: "Calories", value: `${data.calories || 0}` },
      ];

      const startX = w / 2 - (stats.length * 180) / 2;
      stats.forEach((s, i) => {
        const x = startX + i * 180 + 90;
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.beginPath();
        ctx.roundRect(x - 70, 720, 140, 80, 16);
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "900 32px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(s.value, x, 758);
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "bold 14px Inter, system-ui, sans-serif";
        ctx.fillText(s.label.toUpperCase(), x, 785);
      });
    }

    if (type === "streak" && data.streak) {
      // Fire emoji text
      ctx.font = "80px Inter, system-ui, sans-serif";
      ctx.fillText("🔥", w / 2, 780);
    }

    // Subtitle / PR details
    if (data.subtitle) {
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "24px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(data.subtitle, w / 2, 880);
    }

    // Date
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "18px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }), w / 2, 950);

    // Tagline
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.font = "16px Inter, system-ui, sans-serif";
    ctx.fillText("variantfit.vercel.app", w / 2, 1000);

    setGenerating(false);
  };

  const downloadCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `variantfit-${type}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const shareCard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;
      const file = new File([blob], `variantfit-${type}.png`, { type: "image/png" });
      if (navigator.share) {
        await navigator.share({ files: [file], title: `VariantFit ${type}` });
      } else {
        downloadCard();
      }
    } catch {
      downloadCard();
    }
  };

  // Auto-generate on mount
  useEffect(() => {
    const timer = setTimeout(generateCard, 100);
    return () => clearTimeout(timer);
  }, []);


  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-3xl border border-border p-5 max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Share2 className="w-4 h-4 text-brand" /> Share Your Achievement
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-surface-hover"><X className="w-4 h-4" /></button>
        </div>

        <canvas ref={canvasRef} className="w-full aspect-square rounded-2xl bg-black mb-4" style={{ imageRendering: "auto" }} />

        <div className="flex gap-2">
          <Button onClick={generateCard} variant="outline" className="flex-1 gap-2 rounded-xl" disabled={generating}>
            Regenerate
          </Button>
          <Button onClick={downloadCard} className="flex-1 gap-2 bg-brand text-black font-bold rounded-xl">
            <Download className="w-4 h-4" /> Download
          </Button>
          <Button onClick={shareCard} variant="outline" className="gap-2 rounded-xl">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
