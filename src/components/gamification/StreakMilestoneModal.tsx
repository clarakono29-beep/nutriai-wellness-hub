import { useEffect, useMemo } from "react";
import { Sparkles, X } from "lucide-react";
import type { MilestoneEvent } from "@/hooks/useStreak";

interface Props {
  milestone: MilestoneEvent;
  onClose: () => void;
}

const CONFETTI_COLORS = ["#C4973A", "#E8B94A", "#3D7A58", "#E8624A", "#FFFFFF"];

export function StreakMilestoneModal({ milestone, onClose }: Props) {
  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        duration: 2.5 + Math.random() * 1.8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: Math.random() * 360,
        size: 6 + Math.round(Math.random() * 6),
      })),
    [milestone.days],
  );

  const handleShare = async () => {
    const text = `I'm on a ${milestone.days}-day streak with NutriAI 🔥`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "NutriAI streak", text });
        return;
      } catch {
        // fallthrough to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in px-5">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />

      {/* Confetti layer */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {pieces.map((p) => (
          <span
            key={p.id}
            className="absolute top-0 block rounded-[2px]"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 1.6,
              background: p.color,
              transform: `rotate(${p.rotate}deg)`,
              animation: `confetti-fall ${p.duration}s ${p.delay}s linear forwards`,
            }}
          />
        ))}
      </div>

      <div
        className="relative w-full max-w-[380px] rounded-[28px] text-white p-7 text-center shadow-elev-lg animate-scale-in overflow-hidden"
        style={{ background: "var(--gradient-hero)" }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 h-9 w-9 rounded-full grid place-items-center text-white/80 hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-[80px] leading-none animate-leaf-pulse" aria-hidden="true">
          {milestone.days >= 30 ? "👑" : milestone.days >= 14 ? "🏆" : milestone.days >= 7 ? "💪" : "🔥"}
        </div>

        <h2 className="mt-4 font-display text-[28px] text-white">{milestone.title}</h2>
        <p className="mt-2 text-[14px] text-white/80 leading-relaxed">{milestone.message}</p>

        <div className="mt-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[color:var(--gold)] text-[color:var(--forest)] text-[12px] font-semibold uppercase tracking-widest">
          <Sparkles className="h-3.5 w-3.5" /> {milestone.days}-day milestone
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            onClick={handleShare}
            className="h-12 rounded-[16px] bg-white/10 hover:bg-white/15 text-white text-[14px] font-semibold transition-colors"
          >
            Share
          </button>
          <button
            onClick={onClose}
            className="h-12 rounded-[16px] bg-[color:var(--gold)] text-[color:var(--forest)] text-[14px] font-semibold active:scale-[0.97] ease-luxury transition-transform"
          >
            Keep going
          </button>
        </div>
      </div>
    </div>
  );
}
