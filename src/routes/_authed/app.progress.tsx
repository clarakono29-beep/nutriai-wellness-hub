import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

import { PrimaryButton } from "@/components/ui/luxury/PrimaryButton";
import { TextField } from "@/components/ui/luxury/TextField";
import { SurfaceCard } from "@/components/ui/luxury/SurfaceCard";
import { Pill } from "@/components/ui/luxury/Pill";
import { TrendingDown, Scale, Award } from "lucide-react";

export const Route = createFileRoute("/_authed/app/progress")({
  head: () => ({ meta: [{ title: "Progress — NutriAI" }] }),
  component: ProgressPage,
});

interface WeightLog { id: string; weight_kg: number; logged_at: string }

function ProgressPage() {
  const { user } = useAuth();
  const { profile, refresh: refreshProfile } = useProfile();
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [newWeight, setNewWeight] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("weight_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: true })
      .limit(60);
    setWeights(data ?? []);
  };

  useEffect(() => {
    load();
  }, [user]);

  const logWeight = async () => {
    if (!user || !newWeight) return;
    setSubmitting(true);
    const w = Number(newWeight);
    const { error } = await supabase.from("weight_logs").insert({ user_id: user.id, weight_kg: w });
    if (error) {
      toast.error(error.message);
    } else {
      await supabase.from("profiles").update({ weight_kg: w }).eq("user_id", user.id);
      setNewWeight("");
      toast.success("Weight logged.");
      await load();
      await refreshProfile();
    }
    setSubmitting(false);
  };

  const start = weights[0]?.weight_kg;
  const current = weights[weights.length - 1]?.weight_kg ?? profile?.weight_kg;
  const target = profile?.target_weight_kg;
  const change = start != null && current != null ? current - start : 0;

  return (
    <div className="px-6 pt-8 pb-6 stagger">
      <Pill tone="sage">Your journey</Pill>
      <h1 className="font-display text-[28px] font-bold mt-2">Progress</h1>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <StatCard icon={<Scale className="h-4 w-4" />} label="Current" value={current ? `${Number(current).toFixed(1)} kg` : "—"} />
        <StatCard
          icon={<TrendingDown className="h-4 w-4" />}
          label="Change"
          value={start != null ? `${change >= 0 ? "+" : ""}${change.toFixed(1)} kg` : "—"}
          tone={change < 0 ? "good" : change > 0 ? "warn" : "neutral"}
        />
        <StatCard icon={<Award className="h-4 w-4" />} label="Target" value={target ? `${Number(target).toFixed(1)} kg` : "—"} />
      </div>

      <SurfaceCard className="mt-5">
        <h4 className="font-body font-semibold text-[15px]">Weight history</h4>
        {weights.length < 2 ? (
          <p className="text-[13px] text-[color:var(--ink-light)] mt-3 text-center py-6">
            Log at least two entries to see your trend.
          </p>
        ) : (
          <Sparkline weights={weights.map((w) => Number(w.weight_kg))} />
        )}
      </SurfaceCard>

      <SurfaceCard tone="cream" className="mt-4">
        <h4 className="font-body font-semibold text-[15px]">Log today's weight</h4>
        <div className="mt-3 flex gap-2 items-end">
          <div className="flex-1">
            <TextField
              type="number"
              inputMode="decimal"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              placeholder="e.g. 68.5"
              trailing="kg"
            />
          </div>
          <button
            onClick={logWeight}
            disabled={submitting || !newWeight}
            className="h-[52px] px-5 rounded-[14px] bg-gradient-cta text-white font-semibold text-[14px] shadow-elev-sm active:scale-[0.97] disabled:opacity-50"
          >
            Log
          </button>
        </div>
      </SurfaceCard>

      {/* Recent entries */}
      {weights.length > 0 && (
        <div className="mt-5">
          <h4 className="font-body font-semibold text-[15px] mb-3">Recent entries</h4>
          <div className="space-y-2">
            {[...weights].reverse().slice(0, 6).map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between py-3 px-4 bg-white rounded-[12px] border border-[color:var(--cream-border)]"
              >
                <span className="text-[13px] text-[color:var(--ink-mid)]">
                  {new Date(w.logged_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
                <span className="font-display text-[16px] text-[color:var(--ink)]">
                  {Number(w.weight_kg).toFixed(1)} kg
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, tone = "neutral" }: { icon: React.ReactNode; label: string; value: string; tone?: "neutral" | "good" | "warn" }) {
  const color = tone === "good" ? "var(--success)" : tone === "warn" ? "var(--coral)" : "var(--ink)";
  return (
    <div className="bg-white rounded-[14px] border border-[color:var(--cream-border)] p-3">
      <div className="flex items-center gap-1 text-[color:var(--ink-light)]">
        {icon}
        <span className="text-[10px] uppercase tracking-widest font-semibold">{label}</span>
      </div>
      <div className="font-display text-[18px] mt-1.5 leading-tight" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function Sparkline({ weights }: { weights: number[] }) {
  const w = 320;
  const h = 100;
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const stepX = w / (weights.length - 1);
  const points = weights.map((v, i) => `${i * stepX},${h - ((v - min) / range) * (h - 10) - 5}`).join(" ");
  const area = `0,${h} ${points} ${w},${h}`;

  return (
    <div className="mt-4 -mx-1">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24">
        <defs>
          <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--forest-mid)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--forest-mid)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#grad)" />
        <polyline points={points} fill="none" stroke="var(--forest-mid)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
