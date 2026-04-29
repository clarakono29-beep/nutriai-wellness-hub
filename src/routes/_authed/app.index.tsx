import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useProfile } from "@/hooks/useProfile";
import { useFoodLog, type FoodLog } from "@/hooks/useFoodLog";
import { useAI, type MealAnalysis } from "@/hooks/useAI";
import { useStreak } from "@/hooks/useStreak";
import { useNotifications } from "@/hooks/useNotifications";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { todayISO, fmtKcal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { evaluateAchievements } from "@/lib/achievements";
import { haptics } from "@/lib/haptics";

import { CoachChat } from "@/components/coach/CoachChat";
import { StreakMilestoneModal } from "@/components/gamification/StreakMilestoneModal";
import { NotificationPrompt } from "@/components/gamification/NotificationPrompt";
import { Confetti } from "@/components/ui/luxury/Confetti";
import { EmptyState } from "@/components/ui/luxury/EmptyState";
import { TodayStoryCard } from "@/components/diary/TodayStoryCard";
import { SmartSuggestions } from "@/components/diary/SmartSuggestions";
import { buildDiaryStory, buildMealSuggestions } from "@/lib/narrative";
import { Pill } from "@/components/ui/luxury/Pill";
import { Flame, Minus, Plus, Send, Trash2, Loader2, Check } from "lucide-react";

export const Route = createFileRoute("/_authed/app/")({
  head: () => ({ meta: [{ title: "Diary — NutriAI" }] }),
  component: Diary,
});

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealType = (typeof MEAL_TYPES)[number];
const GLASS_ML = 250;
const WATER_TARGET_GLASSES = 8;

function inferMeal(): MealType {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

function fmtDateLong(d = new Date()) {
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "long" });
}

function Diary() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { logs, totals, addLog, removeLog } = useFoodLog();
  const { analyseMeal, loading: aiLoading } = useAI();
  const { streak, milestone, clearMilestone, recordDailyActivity } = useStreak();
  const { shouldShowPrompt, requestPermission, dismissPrompt } = useNotifications();
  const { refresh: refreshSubscription } = useSubscription();

  // Detect return from Stripe checkout and welcome the user
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "success") return;

    // Remove query param from URL without reload
    window.history.replaceState({}, "", "/app");
    toast.success("🎉 Welcome to Pro! Your trial has started.", { duration: 6000 });

    // Poll for webhook to sync subscription — retry a few times
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      await refreshSubscription();
      if (attempts >= 5) clearInterval(poll);
    }, 2000);

    return () => clearInterval(poll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [waterGlasses, setWaterGlasses] = useState(0);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<MealAnalysis | null>(null);
  const [confirmMealType, setConfirmMealType] = useState<MealType>(inferMeal());
  const [confirmName, setConfirmName] = useState("");
  const [servings, setServings] = useState(1);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const goalCelebratedRef = useRef(false);

  // Load water for today
  useEffect(() => {
    if (!user) return;
    supabase
      .from("water_logs")
      .select("amount_ml")
      .eq("user_id", user.id)
      .eq("date", todayISO())
      .then(({ data }) => {
        const total = (data ?? []).reduce((s, w) => s + w.amount_ml, 0);
        setWaterGlasses(Math.round(total / GLASS_ML));
      });
  }, [user]);

  const target = profile?.daily_calories ?? 2000;
  const remaining = Math.max(0, target - totals.calories);
  const ringPct = Math.min(100, (totals.calories / target) * 100);

  // Celebrate when daily calorie goal is first reached today
  useEffect(() => {
    if (totals.calories >= target && target > 0 && !goalCelebratedRef.current) {
      goalCelebratedRef.current = true;
      setConfettiTrigger((n) => n + 1);
      haptics.goal();
    }
    if (totals.calories < target * 0.95) {
      // allow celebrating again after a reset (e.g. day rollover, deletes)
      goalCelebratedRef.current = false;
    }
  }, [totals.calories, target]);

  const recents = useMemo(() => {
    const seen = new Set<string>();
    const out: FoodLog[] = [];
    for (const l of logs) {
      const key = l.food_name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(l);
      if (out.length >= 5) break;
    }
    return out;
  }, [logs]);

  const grouped = useMemo(() => {
    const g: Record<MealType, FoodLog[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    for (const l of logs) {
      const t = (l.meal_type as MealType) ?? "snack";
      if (g[t]) g[t].push(l);
    }
    return g;
  }, [logs]);

  // Water actions
  const adjustWater = async (delta: number) => {
    if (!user) return;
    const next = Math.max(0, waterGlasses + delta);
    setWaterGlasses(next);
    if (delta > 0) {
      await supabase.from("water_logs").insert({ user_id: user.id, amount_ml: GLASS_ML });
    } else {
      // Delete most recent water entry today
      const { data } = await supabase
        .from("water_logs")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", todayISO())
        .order("logged_at", { ascending: false })
        .limit(1);
      if (data?.[0]) await supabase.from("water_logs").delete().eq("id", data[0].id);
    }
  };

  // AI submit
  const submitAI = async () => {
    if (!text.trim() || aiLoading) return;
    const result = await analyseMeal({
      meal_description: text,
      user_context: {
        goal: profile?.goal,
        daily_calories: profile?.daily_calories,
        protein_target: profile?.protein_g,
      },
    });
    if (!result) {
      toast.error("Couldn't analyse that meal — try again.");
      return;
    }
    setPreview(result);
    setConfirmName(result.meal_name);
    setConfirmMealType(inferMeal());
    setServings(1);
  };

  const closeModal = () => {
    setPreview(null);
    setServings(1);
  };

  const confirmLog = async () => {
    if (!preview) return;
    setConfirmSubmitting(true);
    const mult = servings || 1;
    const { error } = await addLog({
      meal_type: confirmMealType,
      food_name: confirmName.trim() || preview.meal_name,
      calories: Math.round(preview.calories * mult),
      protein: Math.round(preview.protein * mult),
      carbs: Math.round(preview.carbs * mult),
      fat: Math.round(preview.fat * mult),
      fibre: Math.round(preview.fibre * mult),
      food_score: preview.food_score,
      emoji: preview.emoji,
    });
    setConfirmSubmitting(false);
    if (error) {
      haptics.error();
      toast.error(error.message);
      return;
    }
    haptics.success();
    toast.success(`${preview.emoji} ${confirmName} — ${fmtKcal(preview.calories * mult)} kcal added`);
    setText("");
    closeModal();
    // Update streak + check achievements
    await recordDailyActivity();
    evaluateAchievements({
      totalLogs: logs.length + 1,
      currentStreak: streak.current_streak + 1,
    });
  };

  const relog = async (l: FoodLog) => {
    haptics.light();
    const { error } = await addLog({
      meal_type: inferMeal(),
      food_name: l.food_name,
      calories: l.calories,
      protein: l.protein,
      carbs: l.carbs,
      fat: l.fat,
      fibre: l.fibre,
      food_score: l.food_score,
      emoji: l.emoji,
    });
    if (error) toast.error(error.message);
    else toast.success(`Re-logged ${l.food_name}`);
  };

  const handleDelete = async (id: string) => {
    haptics.light();
    await removeLog(id);
  };

  return (
    <div className="px-5 pt-7 pb-[180px] stagger">
      {/* Date + streak row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-body font-semibold text-[18px] text-[color:var(--ink)] leading-none">
            Today
          </h1>
          <p className="text-[13px] text-[color:var(--ink-mid)] mt-1">{fmtDateLong()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone="gold" className="border border-[color:var(--gold)]/30">
            <Flame className="h-3 w-3" /> {streak.current_streak} day streak
          </Pill>
          <Link
            to="/app/profile"
            aria-label="Open profile"
            className="interactive-icon h-10 w-10 rounded-full bg-[color:var(--forest)] text-white grid place-items-center font-display font-semibold text-[13px] shadow-elev-sm hover:shadow-elev-md"
          >
            {(profile?.name ?? user?.email ?? "U")
              .split(/[\s@.]/)
              .filter(Boolean)
              .map((s) => s[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </Link>
        </div>
      </div>

      {shouldShowPrompt && (
        <div className="mt-4">
          <NotificationPrompt
            onAllow={async () => {
              const r = await requestPermission();
              if (r === "granted") toast.success("Reminders enabled.");
              dismissPrompt();
            }}
            onDismiss={dismissPrompt}
          />
        </div>
      )}

      {/* Today's story narrative */}
      <TodayStoryCard
        className="mt-5"
        story={buildDiaryStory({
          firstName: profile?.name?.split(" ")[0],
          caloriesEaten: totals.calories,
          calorieTarget: target,
          proteinEaten: totals.protein,
          proteinTarget: profile?.protein_g ?? 100,
          waterGlasses,
          waterTargetGlasses: WATER_TARGET_GLASSES,
          streakDays: streak.current_streak,
        })}
        caloriesEaten={totals.calories}
        calorieTarget={target}
        streakDays={streak.current_streak}
      />

      {/* Calorie ring card */}
      <div className="mt-5 rounded-[28px] bg-white shadow-elev-sm border border-[color:var(--cream-border)] p-7 flex flex-col items-center">
        <CalorieRing eaten={totals.calories} target={target} remaining={remaining} pct={ringPct} />
        <div className="mt-5 grid grid-cols-3 gap-2 w-full text-center">
          <Stat label="Eaten" value={`${fmtKcal(totals.calories)}`} suffix="kcal" />
          <Stat label="Goal" value={`${fmtKcal(target)}`} suffix="kcal" />
          <Stat label="Burned" value="—" suffix="kcal" />
        </div>
      </div>

      {/* Macros row */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MacroCard
          label="Protein"
          eaten={totals.protein}
          target={profile?.protein_g ?? 100}
          color="#7C3AED"
        />
        <MacroCard
          label="Carbs"
          eaten={totals.carbs}
          target={profile?.carbs_g ?? 250}
          color="#2563EB"
        />
        <MacroCard
          label="Fat"
          eaten={totals.fat}
          target={profile?.fat_g ?? 70}
          color="var(--gold)"
        />
      </div>

      {/* Water tracker */}
      <WaterTracker glasses={waterGlasses} onAdd={() => adjustWater(1)} onRemove={() => adjustWater(-1)} />

      {/* Smart suggestions — based on remaining macros + time of day */}
      <SmartSuggestions
        suggestions={buildMealSuggestions({
          caloriesRemaining: remaining,
          proteinRemaining: Math.max(0, (profile?.protein_g ?? 100) - totals.protein),
          diet: profile?.diet_preferences,
        })}
        onPick={(s) => {
          setText(s.prompt);
          haptics.light();
        }}
      />

      {/* Recents */}
      {recents.length > 0 && (
        <div className="mt-6">
          <p className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold flex items-center gap-1">
            ⭐ Recently logged
          </p>
          <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
            {recents.map((r) => (
              <button
                key={r.id}
                onClick={() => { haptics.tap(); relog(r); }}
                className="interactive-chip shrink-0 flex items-center gap-2 px-3 h-9 rounded-full bg-white border border-[color:var(--cream-border)] hover:border-[color:var(--forest-mid)] text-[13px] text-[color:var(--ink)]"
              >
                <span>{r.emoji ?? "🍽️"}</span>
                <span className="max-w-[140px] truncate">{r.food_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Food log list */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] uppercase tracking-widest font-semibold text-[color:var(--ink)]">
            Today's Food
          </h2>
          <span className="text-[13px] font-medium text-[color:var(--sage)]">
            {fmtKcal(totals.calories)} kcal
          </span>
        </div>

        {logs.length === 0 ? (
          <EmptyState
            className="mt-6"
            emoji="🍽️"
            title="Nothing logged yet"
            subtitle="Type your meal in the bar below — AI handles the macros."
          />
        ) : (
          <div className="mt-3 space-y-5">
            {MEAL_TYPES.map((m) =>
              grouped[m].length === 0 ? null : (
                <section key={m}>
                  <h3 className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold mb-2">
                    {m}
                  </h3>
                  <div className="space-y-2">
                    {grouped[m].map((l) => (
                      <FoodRow key={l.id} log={l} onDelete={() => handleDelete(l.id)} />
                    ))}
                  </div>
                </section>
              ),
            )}
          </div>
        )}
      </div>

      {/* AI input — floating above tab bar */}
      <div
        className="fixed bottom-[88px] left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30 px-4"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="bg-white rounded-[20px] shadow-elev-md border border-[color:var(--cream-border)] flex items-center gap-2 px-3 py-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitAI();
              }
            }}
            rows={1}
            placeholder="What did you eat? 🤖"
            className="flex-1 resize-none bg-transparent border-0 outline-none text-[15px] text-[color:var(--ink)] placeholder:text-[color:var(--ink-light)] py-2 px-1 max-h-[120px]"
          />
          <button
            onClick={submitAI}
            disabled={!text.trim() || aiLoading}
            aria-label="Send to AI"
            className="interactive-btn h-11 w-11 rounded-full bg-gradient-cta grid place-items-center text-white shadow-elev-sm hover:shadow-elev-md"
          >
            {aiLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Confirm modal */}
      {preview && (
        <ConfirmModal
          preview={preview}
          name={confirmName}
          onName={setConfirmName}
          mealType={confirmMealType}
          onMealType={setConfirmMealType}
          servings={servings}
          onServings={setServings}
          submitting={confirmSubmitting}
          onConfirm={confirmLog}
          onClose={closeModal}
        />
      )}

      {/* Floating AI nutrition coach */}
      <CoachChat />

      {/* Streak milestone celebration */}
      {milestone && (
        <StreakMilestoneModal milestone={milestone} onClose={clearMilestone} />
      )}

      {/* Goal-reached celebration */}
      <Confetti trigger={confettiTrigger > 0} count={60} duration={3500} />
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function CalorieRing({
  eaten,
  target,
  remaining,
  pct,
}: {
  eaten: number;
  target: number;
  remaining: number;
  pct: number;
}) {
  const size = 200;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(1, eaten / target));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ctaRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2D5A40" />
            <stop offset="100%" stopColor="#1C3A2A" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--cream-border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ctaRing)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="font-display text-[32px] font-bold text-[color:var(--forest)] leading-none">
          {fmtKcal(remaining)}
        </div>
        <div className="text-[11px] uppercase tracking-widest text-[color:var(--ink-light)] mt-1">
          kcal
        </div>
        <div className="text-[12px] text-[color:var(--ink-mid)] mt-1">remaining today</div>
        <div className="text-[10px] uppercase tracking-widest text-[color:var(--sage)] mt-1.5">
          {Math.round(pct)}%
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-[color:var(--sage)] font-semibold">
        {label}
      </div>
      <div className="mt-1 text-[13px] text-[color:var(--ink-mid)]">
        <span className="font-semibold text-[color:var(--ink)]">{value}</span>
        {suffix && <span className="text-[color:var(--ink-light)]"> {suffix}</span>}
      </div>
    </div>
  );
}

function MacroCard({
  label,
  eaten,
  target,
  color,
}: {
  label: string;
  eaten: number;
  target: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(1, target > 0 ? eaten / target : 0)) * 100;
  return (
    <div className="rounded-[14px] bg-white border border-[color:var(--cream-border)] py-3 px-3.5 shadow-elev-sm">
      <div className="text-[10px] uppercase tracking-widest text-[color:var(--sage)] font-semibold">
        {label}
      </div>
      <div className="text-[14px] font-semibold text-[color:var(--ink)] mt-1">
        {Math.round(eaten)}g
        <span className="text-[color:var(--ink-light)] font-normal"> / {Math.round(target)}g</span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-[color:var(--cream-dark)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-luxury"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function WaterTracker({
  glasses,
  onAdd,
  onRemove,
}: {
  glasses: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const reached = glasses >= WATER_TARGET_GLASSES;
  return (
    <div className="mt-3 rounded-[18px] bg-white border border-[color:var(--cream-border)] shadow-elev-sm py-3 pl-3 pr-3 flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-[#E0F2FE] grid place-items-center text-lg shrink-0">
        💧
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[color:var(--ink)]">Water</span>
          {reached && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[color:var(--gold-light)] text-[color:var(--gold)]">
              ✓ Goal
            </span>
          )}
        </div>
        <div className="text-[12px] text-[color:var(--ink-mid)]">
          {glasses} / {WATER_TARGET_GLASSES} glasses
        </div>
        <div className="mt-1.5 flex gap-0.5">
          {Array.from({ length: WATER_TARGET_GLASSES }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 h-1.5 rounded-full transition-colors",
                i < glasses ? "bg-[#3B82F6]" : "bg-[color:var(--cream-dark)]",
              )}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        <button
          onClick={() => { haptics.light(); onAdd(); }}
          aria-label="Add glass of water"
          className="interactive-icon h-7 w-7 rounded-full border border-[color:var(--forest)] text-[color:var(--forest)] grid place-items-center"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
        <button
          onClick={() => { haptics.light(); onRemove(); }}
          aria-label="Remove glass of water"
          disabled={glasses === 0}
          className="interactive-icon h-7 w-7 rounded-full border border-[color:var(--cream-border)] text-[color:var(--ink-mid)] grid place-items-center"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

function FoodRow({ log, onDelete }: { log: FoodLog; onDelete: () => void }) {
  const [offset, setOffset] = useState(0);
  const startX = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < 0) setOffset(Math.max(dx, -88));
  };
  const onTouchEnd = () => {
    setOffset((o) => (o < -50 ? -88 : 0));
    startX.current = null;
  };

  return (
    <div className="relative overflow-hidden rounded-[16px]">
      <button
        onClick={onDelete}
        className="absolute right-0 top-0 bottom-0 w-[88px] bg-[color:var(--coral)] text-white flex items-center justify-center gap-1 text-[12px] font-semibold"
      >
        <Trash2 className="h-4 w-4" /> Delete
      </button>
      <div
        className="relative bg-white border border-[color:var(--cream-border)] rounded-[16px] py-3 px-3 flex items-center gap-3 transition-transform"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="h-10 w-10 rounded-full bg-[color:var(--cream-dark)] grid place-items-center text-lg shrink-0">
          {log.emoji ?? "🍽️"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-medium text-[color:var(--ink)] truncate">
            {log.food_name}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px]">
            <span className="text-[#7C3AED] font-medium">P:{Math.round(Number(log.protein))}g</span>
            <span className="text-[#2563EB] font-medium">C:{Math.round(Number(log.carbs))}g</span>
            <span className="text-[color:var(--gold)] font-medium">F:{Math.round(Number(log.fat))}g</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-[18px] font-bold text-[color:var(--ink)] leading-none">
            {fmtKcal(Number(log.calories))}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-[color:var(--ink-light)] mt-1">
            kcal
          </div>
        </div>
        {/* Desktop fallback delete (no-touch devices) */}
        <button
          onClick={onDelete}
          aria-label="Delete entry"
          className="hidden md:grid h-8 w-8 place-items-center rounded-full text-[color:var(--ink-light)] hover:text-[color:var(--coral)] hover:bg-[color:var(--coral-light)] transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}



function ConfirmModal({
  preview,
  name,
  onName,
  mealType,
  onMealType,
  servings,
  onServings,
  submitting,
  onConfirm,
  onClose,
}: {
  preview: MealAnalysis;
  name: string;
  onName: (v: string) => void;
  mealType: MealType;
  onMealType: (m: MealType) => void;
  servings: number;
  onServings: (n: number) => void;
  submitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const c = scoreColor(preview.food_score);
  const mult = servings || 1;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        className="relative w-full max-w-[430px] bg-white rounded-t-[28px] shadow-elev-lg max-h-[80vh] overflow-y-auto animate-scale-in"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      >
        <div className="sticky top-0 pt-3 bg-white rounded-t-[28px] flex items-center justify-center">
          <div className="h-1.5 w-10 rounded-full bg-[color:var(--cream-border)]" />
        </div>

        <div className="px-5 pt-3 pb-5">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="text-[40px] leading-none">{preview.emoji}</div>
            <div className="flex-1 min-w-0">
              <input
                value={name}
                onChange={(e) => onName(e.target.value)}
                className="w-full font-display text-[22px] font-semibold text-[color:var(--ink)] bg-transparent border-0 outline-none focus:bg-[color:var(--cream-dark)] rounded-md px-1 -mx-1"
              />
              <p className="text-[13px] italic text-[color:var(--ink-mid)] mt-1">
                {preview.verdict}
              </p>
            </div>
            <div
              className="h-11 w-11 rounded-full grid place-items-center font-display font-bold shrink-0"
              style={{ background: c.bg, color: c.fg }}
            >
              {preview.food_score}
            </div>
          </div>

          {/* Macro pills */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <MacroPill dot="var(--forest)" label="kcal" value={fmtKcal(preview.calories * mult)} />
            <MacroPill dot="#7C3AED" label="P" value={`${Math.round(preview.protein * mult)}g`} />
            <MacroPill dot="#2563EB" label="C" value={`${Math.round(preview.carbs * mult)}g`} />
            <MacroPill dot="var(--gold)" label="F" value={`${Math.round(preview.fat * mult)}g`} />
          </div>

          {/* Meal type segmented */}
          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold mb-2">
              Meal
            </p>
            <div className="flex gap-1 p-1 rounded-full bg-[color:var(--cream-dark)]">
              {MEAL_TYPES.map((m) => (
                <button
                  key={m}
                  onClick={() => { if (mealType !== m) haptics.light(); onMealType(m); }}
                  className={cn(
                    "interactive-chip flex-1 h-9 rounded-full text-[12px] font-semibold capitalize",
                    mealType === m
                      ? "bg-white text-[color:var(--forest)] shadow-elev-sm"
                      : "text-[color:var(--ink-mid)]",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Servings */}
          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold mb-2">
              Servings
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { haptics.light(); onServings(Math.max(0.5, +(servings - 0.5).toFixed(1))); }}
                className="interactive-icon h-10 w-10 rounded-full border border-[color:var(--cream-border)] grid place-items-center"
                aria-label="Decrease servings"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={servings}
                onChange={(e) => onServings(Math.max(0.5, Number(e.target.value) || 1))}
                className="flex-1 h-12 text-center text-[18px] font-display font-semibold rounded-[14px] border border-[color:var(--cream-border)] bg-white outline-none focus:border-[color:var(--forest-mid)]"
              />
              <button
                onClick={() => { haptics.light(); onServings(+(servings + 0.5).toFixed(1)); }}
                className="interactive-icon h-10 w-10 rounded-full border border-[color:var(--cream-border)] grid place-items-center"
                aria-label="Increase servings"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-2">
            <button
              onClick={onClose}
              className="interactive-btn flex-1 h-12 rounded-[16px] text-[14px] font-semibold text-[color:var(--ink-mid)] hover:bg-[color:var(--cream-dark)]"
            >
              Adjust
            </button>
            <button
              onClick={onConfirm}
              disabled={submitting}
              className="interactive-btn flex-[2] h-14 rounded-[16px] bg-gradient-cta text-white text-[15px] font-semibold shadow-elev-cta hover:shadow-elev-lg inline-flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" strokeWidth={2.6} />
              )}
              Confirm & Log
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MacroPill({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-[color:var(--cream-dark)] py-2 px-2 text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-widest text-[color:var(--ink-light)] font-semibold">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
        {label}
      </div>
      <div className="mt-0.5 text-[14px] font-semibold text-[color:var(--ink)]">{value}</div>
    </div>
  );
}

function scoreColor(score: number) {
  if (score >= 8) return { bg: "var(--sage-light)", fg: "var(--success)" };
  if (score >= 5) return { bg: "var(--gold-light)", fg: "var(--gold)" };
  return { bg: "var(--coral-light)", fg: "var(--coral)" };
}
