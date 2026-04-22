import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useProfile } from "@/hooks/useProfile";
import { useFoodLog } from "@/hooks/useFoodLog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { todayISO, greeting, fmtKcal } from "@/lib/format";

import { ProgressRing } from "@/components/ui/luxury/ProgressRing";
import { MacroBar } from "@/components/ui/luxury/MacroBar";
import { SurfaceCard } from "@/components/ui/luxury/SurfaceCard";
import { Pill } from "@/components/ui/luxury/Pill";
import { Flame, Droplets, Plus, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authed/app/")({
  head: () => ({ meta: [{ title: "Today — NutriAI" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { totals } = useFoodLog();
  const [waterMl, setWaterMl] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("water_logs")
      .select("amount_ml")
      .eq("user_id", user.id)
      .eq("date", todayISO())
      .then(({ data }) => {
        setWaterMl((data ?? []).reduce((sum, w) => sum + w.amount_ml, 0));
      });
    supabase
      .from("streaks")
      .select("current_streak")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setStreak(data?.current_streak ?? 0));
  }, [user]);

  const addWater = async (ml: number) => {
    if (!user) return;
    setWaterMl((w) => w + ml);
    await supabase.from("water_logs").insert({ user_id: user.id, amount_ml: ml });
  };

  const target = profile?.daily_calories ?? 2000;
  const remaining = Math.max(0, target - totals.calories);

  return (
    <div className="px-6 pt-8 pb-6 stagger">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-caption text-[color:var(--sage)]">{greeting()}</p>
          <h1 className="font-display text-[28px] font-bold mt-1">
            {profile?.name?.split(" ")[0] ?? "Friend"}.
          </h1>
        </div>
        <Pill tone="gold">
          <Flame className="h-3 w-3" /> {streak} day streak
        </Pill>
      </div>

      {/* Calorie ring */}
      <SurfaceCard className="mt-6 flex flex-col items-center py-6">
        <ProgressRing
          value={totals.calories}
          max={target}
          size={220}
          stroke={16}
          label={fmtKcal(remaining)}
          sublabel="kcal left"
          color="var(--forest-mid)"
        />
        <div className="mt-4 flex items-center gap-1.5 text-[12px] text-[color:var(--ink-mid)]">
          <span className="font-semibold text-[color:var(--ink)]">{fmtKcal(totals.calories)}</span>
          <span>of {fmtKcal(target)} kcal eaten</span>
        </div>
      </SurfaceCard>

      {/* Macros */}
      <SurfaceCard className="mt-4">
        <h4 className="font-body font-semibold text-[15px]">Macros today</h4>
        <div className="mt-4 space-y-4">
          <MacroBar label="Protein" value={totals.protein} max={profile?.protein_g ?? 100} color="var(--forest-mid)" />
          <MacroBar label="Carbs" value={totals.carbs} max={profile?.carbs_g ?? 250} color="var(--gold)" />
          <MacroBar label="Fat" value={totals.fat} max={profile?.fat_g ?? 70} color="var(--coral)" />
          <MacroBar label="Fibre" value={totals.fibre} max={30} color="var(--sage)" />
        </div>
      </SurfaceCard>

      {/* Water */}
      <SurfaceCard className="mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-[color:var(--forest-light)]" />
            <h4 className="font-body font-semibold text-[15px]">Hydration</h4>
          </div>
          <span className="text-[13px] font-medium text-[color:var(--ink-mid)]">
            {(waterMl / 1000).toFixed(1)}L / 2.5L
          </span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-[color:var(--cream-dark)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[color:var(--forest-light)] transition-all duration-500 ease-luxury"
            style={{ width: `${Math.min(100, (waterMl / 2500) * 100)}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[250, 500, 750].map((ml) => (
            <button
              key={ml}
              onClick={() => addWater(ml)}
              className="h-10 rounded-[12px] bg-[color:var(--cream-dark)] text-[13px] font-medium text-[color:var(--forest)] hover:bg-[color:var(--sage-light)] active:scale-95 transition-all"
            >
              +{ml}ml
            </button>
          ))}
        </div>
      </SurfaceCard>

      {/* CTA: log a meal */}
      <Link to="/app/log" className="block mt-4">
        <SurfaceCard tone="forest" className="flex items-center justify-between">
          <div>
            <p className="text-caption text-[color:var(--gold-light)] opacity-80">AI Coach</p>
            <h4 className="font-display text-[20px] text-white mt-1">Log a meal</h4>
            <p className="text-[13px] text-white/70 mt-0.5">
              Describe what you ate — get a score in seconds.
            </p>
          </div>
          <div className="h-12 w-12 rounded-full bg-[color:var(--gold)] grid place-items-center text-[color:var(--forest)] shadow-elev-gold shrink-0 ml-3">
            <Sparkles className="h-5 w-5" />
          </div>
        </SurfaceCard>
      </Link>

      {/* Add quick action button (floating) */}
      <Link
        to="/app/log"
        className="fixed bottom-28 right-1/2 translate-x-[200px] z-30 h-14 w-14 rounded-full bg-gradient-cta grid place-items-center text-white shadow-elev-cta active:scale-95 transition-transform"
        aria-label="Quick log"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
