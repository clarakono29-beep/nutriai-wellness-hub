import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Flame, Loader2, Plus, RefreshCw, Sparkles, X, Zap } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { useNutritionInsights, type NutritionInsightsResult } from "@/hooks/useNutritionInsights";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/app/progress")({
  head: () => ({ meta: [{ title: "Progress — NutriAI" }] }),
  component: ProgressPage,
});

interface WeightLog { id: string; weight_kg: number; logged_at: string }
interface FoodRow { date: string; calories: number; protein: number; carbs: number; fat: number; logged_at: string }
interface WaterRow { date: string; amount_ml: number }
interface StreakRow { current_streak: number; longest_streak: number }

type Range = "week" | "lastweek" | "month" | "3months" | "all";
const RANGE_LABELS: Record<Range, string> = {
  week: "This week", lastweek: "Last week", month: "This month",
  "3months": "3 months", all: "All time",
};

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function startOfWeek(d: Date) { const x = startOfDay(d); const dow = (x.getDay() + 6) % 7; return addDays(x, -dow); }

function rangeBounds(r: Range): { start: Date; end: Date } {
  const today = startOfDay(new Date());
  if (r === "week") return { start: startOfWeek(today), end: addDays(startOfWeek(today), 7) };
  if (r === "lastweek") return { start: addDays(startOfWeek(today), -7), end: startOfWeek(today) };
  if (r === "month") { const s = new Date(today.getFullYear(), today.getMonth(), 1); const e = new Date(today.getFullYear(), today.getMonth() + 1, 1); return { start: s, end: e }; }
  if (r === "3months") return { start: addDays(today, -90), end: addDays(today, 1) };
  return { start: addDays(today, -365), end: addDays(today, 1) };
}

function ProgressPage() {
  const { user } = useAuth();
  const { profile, refresh: refreshProfile } = useProfile();
  const { isActive } = useSubscription();
  const { insights, loading: insightsLoading, error: insightsError, generate: generateInsights, clearCache } = useNutritionInsights();

  const [range, setRange] = useState<Range>("week");
  const [rangeOpen, setRangeOpen] = useState(false);
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [foods, setFoods] = useState<FoodRow[]>([]);
  const [waters, setWaters] = useState<WaterRow[]>([]);
  const [streak, setStreak] = useState<StreakRow | null>(null);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeBar, setActiveBar] = useState<number | null>(null);

  const bounds = useMemo(() => rangeBounds(range), [range]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const startISO = isoDate(bounds.start);
      const endISO = isoDate(addDays(bounds.end, -1));
      const [wRes, fRes, hRes, sRes] = await Promise.all([
        supabase.from("weight_logs").select("*").eq("user_id", user.id).order("logged_at", { ascending: true }).limit(120),
        supabase.from("food_logs").select("date,calories,protein,carbs,fat,logged_at").eq("user_id", user.id).gte("date", startISO).lte("date", endISO),
        supabase.from("water_logs").select("date,amount_ml").eq("user_id", user.id).gte("date", startISO).lte("date", endISO),
        supabase.from("streaks").select("current_streak,longest_streak").eq("user_id", user.id).maybeSingle(),
      ]);
      setWeights(wRes.data ?? []);
      setFoods((fRes.data as FoodRow[]) ?? []);
      setWaters((hRes.data as WaterRow[]) ?? []);
      setStreak(sRes.data ?? null);
    };
    load();
  }, [user, bounds.start.getTime(), bounds.end.getTime()]);

  // Weekly aggregations
  const weekStart = startOfWeek(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayTotals = weekDays.map((d) => {
    const iso = isoDate(d);
    const rows = foods.filter((f) => f.date === iso);
    return rows.reduce((a, r) => ({ calories: a.calories + Number(r.calories ?? 0), protein: a.protein + Number(r.protein ?? 0), carbs: a.carbs + Number(r.carbs ?? 0), fat: a.fat + Number(r.fat ?? 0) }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  const dailyTarget = profile?.daily_calories ?? 2000;
  const elapsedDays = weekDays.filter((d, i) => d.getTime() <= Date.now() && dayTotals[i].calories > 0).length || 1;
  const compliantDays = dayTotals.filter((d, i) => { const isFuture = weekDays[i].getTime() > Date.now(); if (isFuture || d.calories === 0) return false; return Math.abs(d.calories - dailyTarget) <= dailyTarget * 0.1; }).length;
  const compliancePct = Math.round((compliantDays / elapsedDays) * 100);

  const proteinTarget = profile?.protein_g ?? 100;
  const waterByDay = weekDays.map((d) => waters.filter((w) => w.date === isoDate(d)).reduce((a, w) => a + Number(w.amount_ml ?? 0), 0));
  const proteinDays = dayTotals.filter((d) => d.protein >= proteinTarget * 0.9).length;
  const hydrationDays = waterByDay.filter((ml) => ml >= 2000).length;
  const lifeScore = Math.min(150, Math.round(compliantDays * 12 + proteinDays * 6 + hydrationDays * 4 + Math.min(streak?.current_streak ?? 0, 14) * 1.5));
  const scoreLabel = lifeScore >= 130 ? "EXCEPTIONAL" : lifeScore >= 100 ? "GREAT" : lifeScore >= 50 ? "GOOD START" : "GETTING GOING";

  const startWeight = weights[0]?.weight_kg ?? profile?.weight_kg;
  const currentWeight = weights[weights.length - 1]?.weight_kg ?? profile?.weight_kg;
  const targetWeight = profile?.target_weight_kg;
  const lostKg = startWeight != null && currentWeight != null ? Number(startWeight) - Number(currentWeight) : 0;
  const toGoal = targetWeight != null && currentWeight != null ? Math.abs(Number(currentWeight) - Number(targetWeight)) : null;
  const journeyPct = startWeight != null && targetWeight != null && currentWeight != null ? Math.max(0, Math.min(100, ((Number(startWeight) - Number(currentWeight)) / (Number(startWeight) - Number(targetWeight) || 1)) * 100)) : 0;

  const logWeight = async () => {
    if (!user || !newWeight) return;
    setSubmitting(true);
    const w = Number(newWeight);
    const { error } = await supabase.from("weight_logs").insert({ user_id: user.id, weight_kg: w });
    if (error) { toast.error(error.message); }
    else {
      await supabase.from("profiles").update({ weight_kg: w }).eq("user_id", user.id);
      const { data } = await supabase.from("weight_logs").select("*").eq("user_id", user.id).order("logged_at", { ascending: true }).limit(120);
      setWeights(data ?? []);
      await refreshProfile();
      setNewWeight(""); setShowWeightModal(false);
      toast.success("Weight logged.");
    }
    setSubmitting(false);
  };

  const handleGenerateInsights = async () => {
    clearCache();
    await generateInsights({
      name: profile?.name,
      goal: profile?.goal,
      daily_calories_target: profile?.daily_calories,
      protein_target: profile?.protein_g,
      current_streak: streak?.current_streak,
      weight_change_kg: lostKg || null,
      days: weekDays.map((d, i) => ({
        date: isoDate(d),
        calories: dayTotals[i].calories,
        protein: dayTotals[i].protein,
        carbs: dayTotals[i].carbs,
        fat: dayTotals[i].fat,
        water_ml: waterByDay[i],
      })),
    });
  };

  return (
    <div className="px-5 pt-7 pb-8 stagger">
      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="font-display text-[28px] font-bold leading-tight">Your Progress</h2>
          <p className="text-[13px] text-[color:var(--ink-mid)] mt-1">Track every win on your journey.</p>
        </div>
        <div className="relative">
          <button onClick={() => { haptics.light(); setRangeOpen((v) => !v); }} className="interactive-chip flex items-center gap-1.5 px-3 py-2 rounded-[12px] border border-[color:var(--cream-border)] bg-white text-[13px] font-medium text-[color:var(--ink)]">
            {RANGE_LABELS[range]} <ChevronDown className={cn("h-3.5 w-3.5 text-[color:var(--ink-light)] transition-transform duration-200", rangeOpen && "rotate-180")} />
          </button>
          {rangeOpen && (
            <div className="absolute right-0 top-[44px] z-30 w-44 bg-white rounded-[14px] border border-[color:var(--cream-border)] shadow-elev-md overflow-hidden animate-scale-in origin-top-right">
              {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
                <button key={r} onClick={() => { haptics.light(); setRange(r); setRangeOpen(false); }} className={cn("interactive-chip w-full text-left px-3.5 py-2.5 text-[13px] hover:bg-[color:var(--cream)]", r === range ? "text-[color:var(--forest)] font-semibold" : "text-[color:var(--ink-mid)]")}>{RANGE_LABELS[r]}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Life Score */}
      <div className="mb-4 rounded-[28px] p-7 bg-gradient-hero text-center text-white shadow-elev-md">
        <div className="text-[11px] tracking-[0.2em] uppercase font-semibold text-[color:var(--gold)]">Weekly Life Score</div>
        <SemicircleGauge score={lifeScore} max={150} />
        <div className="font-display text-[24px] text-[color:var(--gold)] -mt-1">{scoreLabel}</div>
        <div className="text-[13px] text-white/70 mt-1">{lifeScore} / 150 points</div>
      </div>

      {/* Streak + Compliance */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-[18px] p-4" style={{ background: "color-mix(in oklab, var(--gold) 10%, white)", borderLeft: "4px solid var(--gold)" }}>
          <Flame className="h-5 w-5 text-[color:var(--gold)]" />
          <div className="font-display text-[32px] font-bold text-[color:var(--gold)] leading-none mt-2">{streak?.current_streak ?? 0}<span className="text-[18px] font-medium ml-1">d</span></div>
          <div className="text-[13px] text-[color:var(--ink-mid)] mt-1">Current streak</div>
          <div className="text-[12px] text-[color:var(--ink-light)] mt-0.5">Longest: {streak?.longest_streak ?? 0} days</div>
        </div>
        <div className="rounded-[18px] p-4" style={{ background: "color-mix(in oklab, var(--forest) 8%, white)", borderLeft: "4px solid var(--forest)" }}>
          <Zap className="h-5 w-5 text-[color:var(--forest)]" />
          <div className="font-display text-[32px] font-bold text-[color:var(--forest)] leading-none mt-2">{compliancePct}<span className="text-[18px] font-medium">%</span></div>
          <div className="text-[13px] text-[color:var(--ink-mid)] mt-1">Weekly compliance</div>
          <div className="text-[12px] text-[color:var(--ink-light)] mt-0.5">{compliantDays}/{elapsedDays} days on target</div>
        </div>
      </div>

      {/* Calorie chart */}
      <div className="mb-4 bg-white rounded-[20px] border border-[color:var(--cream-border)] p-5 shadow-elev-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-body font-semibold text-[14px] text-[color:var(--ink)]">Daily Calories — This Week</h4>
          <span className="text-[11px] text-[color:var(--ink-light)] uppercase tracking-wider">kcal</span>
        </div>
        <CalorieBars totals={dayTotals} target={dailyTarget} days={weekDays} activeBar={activeBar} setActiveBar={setActiveBar} />
      </div>

      {/* Macro trends */}
      <div className="mb-4 bg-white rounded-[20px] border border-[color:var(--cream-border)] p-5 shadow-elev-sm">
        <h4 className="font-body font-semibold text-[14px] mb-3">Macro trends this week</h4>
        <div className="space-y-4">
          <MacroLine label="Protein" unit="g" color="#7C5CCC" target={proteinTarget} values={dayTotals.map((d) => d.protein)} />
          <MacroLine label="Carbs" unit="g" color="#3B82B8" target={profile?.carbs_g ?? 200} values={dayTotals.map((d) => d.carbs)} />
          <MacroLine label="Fat" unit="g" color="#C4973A" target={profile?.fat_g ?? 65} values={dayTotals.map((d) => d.fat)} />
        </div>
      </div>

      {/* Hydration this week */}
      <div className="mb-4 bg-white rounded-[20px] border border-[color:var(--cream-border)] p-5 shadow-elev-sm">
        <h4 className="font-body font-semibold text-[14px] mb-3">Hydration this week</h4>
        <div className="flex items-end gap-1.5 h-14">
          {weekDays.map((d, i) => {
            const glasses = waterByDay[i] / 250;
            const pct = Math.min(1, glasses / 8);
            const isToday = isoDate(d) === isoDate(new Date());
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end" style={{ height: "40px" }}>
                  <div className="w-full rounded-t-md transition-all duration-500" style={{ height: `${Math.max(pct * 100, glasses > 0 ? 8 : 0)}%`, background: pct >= 1 ? "var(--forest)" : "var(--sage-light)" }} />
                </div>
                <span className={cn("text-[10px] font-medium", isToday ? "text-[color:var(--forest)] font-bold" : "text-[color:var(--ink-light)]")}>
                  {["M","T","W","T","F","S","S"][i]}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[12px] text-[color:var(--ink-light)] mt-2 text-center">
          Average: {(waterByDay.reduce((a, b) => a + b, 0) / 7 / 250).toFixed(1)} glasses/day · Target: 8
        </p>
      </div>

      {/* Weight tracker */}
      <div className="mb-4 bg-white rounded-[20px] border border-[color:var(--cream-border)] p-5 shadow-elev-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-body font-semibold text-[14px]">Weight</h4>
          <button onClick={() => { haptics.tap(); setShowWeightModal(true); }} className="interactive-btn flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-full bg-[color:var(--forest)] text-white hover:shadow-elev-sm">
            <Plus className="h-3.5 w-3.5" /> Log weight
          </button>
        </div>
        {weights.length >= 2 ? (
          <>
            <WeightChart weights={weights.map((w) => Number(w.weight_kg))} target={targetWeight ? Number(targetWeight) : undefined} />
            <div className="flex items-center justify-between mt-3 text-[12px] text-[color:var(--ink-mid)]">
              <span>Start: <strong className="text-[color:var(--ink)]">{Number(startWeight).toFixed(1)} kg</strong></span>
              <span>Now: <strong className="text-[color:var(--ink)]">{Number(currentWeight).toFixed(1)} kg</strong></span>
              {targetWeight && <span>Goal: <strong className="text-[color:var(--ink)]">{Number(targetWeight).toFixed(1)} kg</strong></span>}
            </div>
            {targetWeight && (
              <div className="mt-3">
                <div className="h-2 rounded-full bg-[color:var(--cream-dark)] overflow-hidden">
                  <div className="h-full bg-gradient-cta transition-all duration-700" style={{ width: `${journeyPct}%` }} />
                </div>
                <p className="text-[12px] text-[color:var(--ink-mid)] mt-2 text-center">
                  {lostKg > 0 ? `Lost ${lostKg.toFixed(1)} kg so far` : lostKg < 0 ? `Gained ${Math.abs(lostKg).toFixed(1)} kg` : "Just getting started"}{toGoal != null ? ` · ${toGoal.toFixed(1)} kg to goal` : ""}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="py-8 text-center">
            <p className="text-[14px] text-[color:var(--ink-mid)] mb-4">{weights.length === 1 ? `Logged: ${Number(weights[0].weight_kg).toFixed(1)} kg · One more entry to see your trend.` : "Log your weight to track progress"}</p>
            <button onClick={() => { haptics.tap(); setShowWeightModal(true); }} className="interactive-btn px-5 py-3 rounded-[14px] bg-gradient-cta text-white font-semibold text-[14px] shadow-elev-sm">+ Log Weight</button>
          </div>
        )}
      </div>

      {/* ── AI Insights Panel ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-body font-semibold text-[14px]">AI Weekly Review</h4>
          {isActive && (
            <button onClick={handleGenerateInsights} disabled={insightsLoading} className="flex items-center gap-1.5 text-[12px] font-semibold text-[color:var(--forest)] disabled:opacity-50">
              <RefreshCw className={cn("h-3.5 w-3.5", insightsLoading && "animate-spin")} />
              {insights ? "Refresh" : "Generate"}
            </button>
          )}
        </div>

        {!isActive ? (
          <div className="rounded-[20px] border-2 border-dashed border-[color:var(--sage-light)] p-6 text-center">
            <Sparkles className="h-8 w-8 text-[color:var(--sage)] mx-auto mb-2" />
            <p className="text-[14px] font-semibold text-[color:var(--ink)]">AI Weekly Review</p>
            <p className="text-[13px] text-[color:var(--ink-mid)] mt-1 mb-4">Get a personalised AI analysis of your week — patterns, wins, and what to improve.</p>
            <a href="/pricing" className="inline-flex items-center gap-1.5 px-5 py-3 rounded-full bg-[color:var(--forest)] text-white text-[13px] font-semibold">
              <Sparkles className="h-4 w-4 text-[color:var(--gold)]" /> Upgrade to Pro
            </a>
          </div>
        ) : insightsLoading ? (
          <div className="bg-white rounded-[20px] border border-[color:var(--cream-border)] p-8 text-center shadow-elev-sm">
            <Loader2 className="h-7 w-7 animate-spin mx-auto text-[color:var(--forest)] mb-3" />
            <p className="text-[14px] font-medium text-[color:var(--ink)]">Analysing your week…</p>
            <p className="text-[12px] text-[color:var(--ink-light)] mt-1">This takes a few seconds</p>
          </div>
        ) : insights ? (
          <AIInsightsPanel insights={insights} />
        ) : (
          <div className="bg-white rounded-[20px] border border-[color:var(--cream-border)] p-6 text-center shadow-elev-sm">
            <p className="text-[14px] text-[color:var(--ink-mid)] mb-3">Tap generate for your AI weekly review</p>
            <button onClick={handleGenerateInsights} className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-cta text-white text-[13px] font-semibold shadow-elev-cta">
              <Sparkles className="h-4 w-4" /> Generate review
            </button>
          </div>
        )}
        {insightsError && <p className="text-[12px] text-[color:var(--coral)] mt-2 text-center">{insightsError}</p>}
      </div>

      {/* Static insights */}
      <div>
        <h4 className="font-body font-semibold text-[14px] mb-3">This week's patterns</h4>
        <div className="space-y-2.5">
          {buildStaticInsights({ proteinDays, hydrationDays, avgWater: waterByDay.reduce((a, b) => a + b, 0) / 7 / 250, eveningPct: computeEveningPct(foods), compliantDays, streak: streak?.current_streak ?? 0 }).map((ins, i) => (
            <div key={i} className="bg-white rounded-[14px] p-3.5 border border-[color:var(--cream-border)] flex gap-3" style={{ borderLeft: `4px solid ${ins.color}` }}>
              <span className="text-[20px] leading-none mt-0.5">{ins.icon}</span>
              <p className="text-[13px] text-[color:var(--ink-mid)] leading-snug"><span className="font-semibold text-[color:var(--ink)]">{ins.title}: </span>{ins.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Weight modal */}
      {showWeightModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fade-in" onClick={() => setShowWeightModal(false)}>
          <div className="w-full max-w-[430px] bg-white rounded-t-[28px] p-6 pb-8 animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-widest text-[color:var(--ink-light)] font-semibold">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</span>
              <button onClick={() => setShowWeightModal(false)} aria-label="Close" className="h-9 w-9 grid place-items-center rounded-full text-[color:var(--ink-light)]"><X className="h-5 w-5" /></button>
            </div>
            <h3 className="font-display text-[24px] font-bold text-[color:var(--ink)] mt-1">Today's weight?</h3>
            <div className="mt-6 flex items-end justify-center gap-2">
              <input autoFocus type="number" inputMode="decimal" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} onKeyDown={(e) => e.key === "Enter" && logWeight()} placeholder="0.0" className="w-[180px] text-center font-display text-[56px] font-bold text-[color:var(--forest)] bg-transparent outline-none border-b-2 border-[color:var(--cream-border)] focus:border-[color:var(--forest)]" />
              <span className="text-[20px] font-medium text-[color:var(--ink-mid)] mb-3">kg</span>
            </div>
            <button onClick={logWeight} disabled={submitting || !newWeight} className="interactive-btn mt-7 w-full h-[54px] rounded-[16px] bg-gradient-cta text-white font-semibold text-[15px] shadow-elev-cta">
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AI Insights Panel ───────────────────────────────────────────────

function AIInsightsPanel({ insights }: { insights: NutritionInsightsResult }) {
  if (!insights) return null;
  return (
    <div className="space-y-3">
      {/* Headline */}
      <div className="bg-gradient-to-br from-[color:var(--forest)] to-[color:var(--forest-mid)] rounded-[20px] p-5 text-white">
        <div className="text-[11px] uppercase tracking-widest text-[color:var(--gold)] font-semibold mb-2">Your AI review</div>
        <p className="font-display text-[22px] font-bold leading-snug">{insights.headline}</p>
        <p className="text-[13px] text-white/75 mt-2 leading-relaxed">{insights.motivational_note}</p>
      </div>

      {/* Highlights */}
      {insights.highlights.map((h, i: number) => (
        <div key={i} className="bg-white rounded-[16px] border border-[color:var(--cream-border)] p-4 flex gap-3 shadow-elev-sm">
          <span className="text-[22px] leading-none mt-0.5">{h.icon}</span>
          <div>
            <p className="text-[14px] font-semibold text-[color:var(--ink)]">{h.title}</p>
            <p className="text-[13px] text-[color:var(--ink-mid)] leading-snug mt-0.5">{h.body}</p>
          </div>
        </div>
      ))}

      {/* Focus */}
      <div className="bg-[color:var(--gold-light)] border border-[color:var(--gold)]/20 rounded-[16px] p-4 flex gap-3">
        <span className="text-[22px] leading-none mt-0.5">{insights.focus_next_week.icon}</span>
        <div>
          <p className="text-[12px] uppercase tracking-widest text-[color:var(--gold)] font-semibold">Focus next week</p>
          <p className="text-[14px] font-semibold text-[color:var(--ink)] mt-0.5">{insights.focus_next_week.title}</p>
          <p className="text-[13px] text-[color:var(--ink-mid)] mt-0.5 leading-snug">{insights.focus_next_week.action}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Charts ──────────────────────────────────────────────────────────

function SemicircleGauge({ score, max }: { score: number; max: number }) {
  const w = 240; const h = 130; const cx = w / 2; const cy = h - 8; const r = 100; const sw = 14;
  const segments = [{ from: 0, to: 50 / max, color: "#E8624A" }, { from: 50 / max, to: 100 / max, color: "#C4973A" }, { from: 100 / max, to: 130 / max, color: "#3D7A58" }, { from: 130 / max, to: 1, color: "#F5C85C" }];
  const angleAt = (t: number) => Math.PI + Math.PI * t;
  const point = (t: number) => ({ x: cx + r * Math.cos(angleAt(t)), y: cy + r * Math.sin(angleAt(t)) });
  const arcPath = (from: number, to: number) => { const p1 = point(from); const p2 = point(to); const large = to - from > 0.5 ? 1 : 0; return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y}`; };
  const t = Math.max(0, Math.min(1, score / max));
  const a = angleAt(t);
  const left = { x: cx + r * Math.cos(a - 0.06), y: cy + r * Math.sin(a - 0.06) };
  const right = { x: cx + r * Math.cos(a + 0.06), y: cy + r * Math.sin(a + 0.06) };
  const inner = { x: cx + (r - sw / 2 - 4) * Math.cos(a), y: cy + (r - sw / 2 - 4) * Math.sin(a) };
  const outer = { x: cx + (r + sw / 2 + 6) * Math.cos(a), y: cy + (r + sw / 2 + 6) * Math.sin(a) };

  return (
    <div className="flex flex-col items-center mt-1">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-[260px] h-[140px]">
        {segments.map((s, i) => <path key={i} d={arcPath(s.from, s.to)} stroke={s.color} strokeWidth={sw} fill="none" strokeLinecap="butt" />)}
        <polygon points={`${inner.x},${inner.y} ${left.x},${left.y} ${outer.x},${outer.y} ${right.x},${right.y}`} fill="white" stroke="white" />
        <circle cx={cx + r * Math.cos(a)} cy={cy + r * Math.sin(a)} r={3} fill="white" />
      </svg>
      <div className="-mt-12 flex items-baseline">
        <span className="font-display font-black text-[56px] text-white leading-none">{score}</span>
        <span className="font-display text-[20px] text-white/50 ml-1">/{max}</span>
      </div>
    </div>
  );
}

function CalorieBars({ totals, target, days, activeBar, setActiveBar }: { totals: { calories: number }[]; target: number; days: Date[]; activeBar: number | null; setActiveBar: (n: number | null) => void }) {
  const max = Math.max(target * 1.25, ...totals.map((t) => t.calories), 1);
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  const todayIdx = days.findIndex((d) => isoDate(d) === isoDate(new Date()));
  const targetY = 1 - target / max;
  return (
    <div className="relative h-[140px] flex items-end justify-between gap-2 px-1">
      <div className="absolute left-0 right-0 border-t-2 border-dashed pointer-events-none" style={{ borderColor: "var(--gold)", top: `${targetY * 100}%` }}>
        <span className="absolute right-0 -top-5 text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--gold)" }}>Goal</span>
      </div>
      {totals.map((t, i) => {
        const heightPct = (t.calories / max) * 100;
        const over = t.calories > target;
        const isToday = i === todayIdx;
        const isActive = activeBar === i;
        return (
          <button key={i} onClick={() => { haptics.light(); setActiveBar(isActive ? null : i); }} className="relative flex-1 h-full flex flex-col justify-end items-center">
            {isActive && t.calories > 0 && (
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full bg-[color:var(--ink)] text-white text-[11px] font-medium rounded-md px-2 py-1 whitespace-nowrap z-10">{Math.round(t.calories)} kcal</div>
            )}
            <div className="w-full rounded-t-[6px] transition-all duration-500" style={{ height: `${Math.max(heightPct, t.calories > 0 ? 4 : 0)}%`, background: over ? "var(--coral)" : isToday ? "var(--forest)" : "var(--sage)", opacity: t.calories === 0 ? 0.2 : 1 }} />
            <span className={cn("text-[11px] mt-2", isToday ? "text-[color:var(--forest)] font-bold" : "text-[color:var(--ink-light)] font-medium")}>{labels[i]}</span>
          </button>
        );
      })}
    </div>
  );
}

function MacroLine({ label, unit, color, target, values }: { label: string; unit: string; color: string; target: number; values: number[] }) {
  const w = 280; const h = 44;
  const max = Math.max(target * 1.4, ...values, 1);
  const stepX = w / Math.max(values.length - 1, 1);
  const points = values.map((v, i) => `${i * stepX},${h - (v / max) * (h - 6) - 3}`).join(" ");
  const targetY = h - (target / max) * (h - 6) - 3;
  const today = [...values].reverse().find((v) => v > 0) ?? 0;
  const avgVal = values.filter((v) => v > 0).reduce((a, b) => a + b, 0) / Math.max(1, values.filter((v) => v > 0).length);
  const status = avgVal >= target * 0.9 ? "✓" : avgVal >= target * 0.6 ? "~" : "↓";

  return (
    <div className="flex items-center gap-3">
      <div className="w-16">
        <div className="text-[11px] uppercase tracking-wider font-semibold flex items-center gap-1" style={{ color }}>{label} <span className="text-[9px]">{status}</span></div>
        <div className="text-[12px] text-[color:var(--ink-mid)] font-semibold">{Math.round(today)}<span className="text-[10px] text-[color:var(--ink-light)]">{unit}</span></div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="flex-1 h-11">
        <line x1={0} x2={w} y1={targetY} y2={targetY} stroke={color} strokeOpacity="0.35" strokeDasharray="3 3" />
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {values.map((v, i) => <circle key={i} cx={i * stepX} cy={h - (v / max) * (h - 6) - 3} r={v > 0 ? 2.5 : 0} fill={color} />)}
      </svg>
      <div className="text-[10px] text-[color:var(--ink-light)] w-10 text-right">/{target}{unit}</div>
    </div>
  );
}

function WeightChart({ weights, target }: { weights: number[]; target?: number }) {
  const w = 320; const h = 110;
  const allVals = target ? [...weights, target] : weights;
  const min = Math.min(...allVals) - 0.5;
  const max = Math.max(...allVals) + 0.5;
  const range = max - min || 1;
  const stepX = w / Math.max(weights.length - 1, 1);
  const points = weights.map((v, i) => `${i * stepX},${h - ((v - min) / range) * (h - 12) - 6}`).join(" ");
  const area = `0,${h} ${points} ${w},${h}`;
  const targetY = target != null ? h - ((target - min) / range) * (h - 12) - 6 : null;
  return (
    <div className="mt-4 -mx-1">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28">
        <defs>
          <linearGradient id="weightGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--forest-mid)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--forest-mid)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {targetY != null && <line x1={0} x2={w} y1={targetY} y2={targetY} stroke="var(--gold)" strokeDasharray="4 4" strokeWidth="1.5" />}
        <polygon points={area} fill="url(#weightGrad)" />
        <polyline points={points} fill="none" stroke="var(--forest-mid)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {weights.map((v, i) => <circle key={i} cx={i * stepX} cy={h - ((v - min) / range) * (h - 12) - 6} r={3} fill="white" stroke="var(--forest-mid)" strokeWidth="2" />)}
      </svg>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function computeEveningPct(rows: FoodRow[]): number {
  if (!rows.length) return 0;
  let total = 0; let evening = 0;
  for (const r of rows) { const cals = Number(r.calories ?? 0); total += cals; if (new Date(r.logged_at).getHours() >= 18) evening += cals; }
  return total > 0 ? Math.round((evening / total) * 100) : 0;
}

interface Insight { icon: string; title: string; body: string; color: string }

function buildStaticInsights(d: { proteinDays: number; hydrationDays: number; avgWater: number; eveningPct: number; compliantDays: number; streak: number }): Insight[] {
  const out: Insight[] = [];
  out.push({ icon: "💪", title: "Protein goals", body: `You hit your protein target ${d.proteinDays}/7 days — ${d.proteinDays >= 5 ? "excellent for muscle maintenance!" : "a few more days will boost your recovery."}`, color: "#7C5CCC" });
  if (d.eveningPct > 0) out.push({ icon: "🌙", title: "Evening eating", body: `${d.eveningPct}% of your calories came after 6pm. ${d.eveningPct > 50 ? "Try making lunch your largest meal." : "Good balance across the day."}`, color: "#3B82B8" });
  out.push({ icon: "💧", title: "Hydration", body: `You averaged ${d.avgWater.toFixed(1)} glasses/day — ${d.avgWater >= 8 ? "right on target!" : `${(8 - d.avgWater).toFixed(1)} glasses short of your goal.`}`, color: "#3D9FD9" });
  if (d.streak >= 3) out.push({ icon: "🔥", title: "Consistency", body: `${d.streak}-day logging streak. Daily tracking is the #1 predictor of long-term results.`, color: "#C4973A" });
  else out.push({ icon: "🎯", title: "Compliance", body: `You hit your target on ${d.compliantDays} day${d.compliantDays !== 1 ? "s" : ""} this week. Aim for 5+ to accelerate progress.`, color: "#3D7A58" });
  return out;
}
