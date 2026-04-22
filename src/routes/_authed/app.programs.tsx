import { createFileRoute } from "@tanstack/react-router";
import { SurfaceCard } from "@/components/ui/luxury/SurfaceCard";
import { Pill } from "@/components/ui/luxury/Pill";
import { Lock, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authed/app/programs")({
  head: () => ({ meta: [{ title: "Programs — NutriAI" }] }),
  component: ProgramsPage,
});

const programs = [
  { name: "Mediterranean Reset", duration: "21 days", emoji: "🫒", desc: "Olive oil, fish, legumes — longevity classic.", premium: false },
  { name: "Lean Cut Protocol", duration: "8 weeks", emoji: "🔥", desc: "High protein, controlled deficit. Lose fat, keep muscle.", premium: true },
  { name: "Athlete Fuel", duration: "12 weeks", emoji: "⚡", desc: "Performance-first nutrition for serious training.", premium: true },
  { name: "Plant Forward", duration: "30 days", emoji: "🌱", desc: "Whole-food plant focus with measured macros.", premium: false },
  { name: "Longevity Method", duration: "Ongoing", emoji: "🧬", desc: "Time-restricted eating, antioxidants, micronutrient density.", premium: true },
];

function ProgramsPage() {
  return (
    <div className="px-6 pt-8 pb-6 stagger">
      <Pill tone="gold">Curated by experts</Pill>
      <h1 className="font-display text-[28px] font-bold mt-2">Programs</h1>
      <p className="text-[14px] text-[color:var(--ink-mid)] mt-1">
        Structured nutrition plans designed for results.
      </p>

      <div className="mt-6 space-y-4">
        {programs.map((p) => (
          <SurfaceCard key={p.name} className="relative overflow-hidden">
            <div className="flex gap-4">
              <div className="text-4xl">{p.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-[18px] text-[color:var(--ink)]">{p.name}</h3>
                  {p.premium && (
                    <Pill tone="gold">
                      <Sparkles className="h-3 w-3" /> Pro
                    </Pill>
                  )}
                </div>
                <p className="text-[10px] uppercase tracking-widest text-[color:var(--sage)] mt-1">{p.duration}</p>
                <p className="text-[13px] text-[color:var(--ink-mid)] mt-2 leading-relaxed">{p.desc}</p>
                <button
                  className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[color:var(--forest)] hover:text-[color:var(--forest-light)]"
                  disabled={p.premium}
                >
                  {p.premium ? (<><Lock className="h-3 w-3" /> Unlock with Pro</>) : "Start program →"}
                </button>
              </div>
            </div>
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
}
