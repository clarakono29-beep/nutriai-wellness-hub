import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Loader2, RefreshCw, ShoppingCart, Sparkles, Utensils, X } from "lucide-react";

import { useMealPlan, type MealItem, type MealPlanDay } from "@/hooks/useMealPlan";
import { useProfile } from "@/hooks/useProfile";
import { useFoodLog } from "@/hooks/useFoodLog";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { PrimaryButton } from "@/components/ui/luxury/PrimaryButton";

export const Route = createFileRoute("/_authed/app/mealplan")({
  head: () => ({ meta: [{ title: "Meal Plan — NutriAI" }] }),
  component: MealPlanPage,
});

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_EMOJIS: Record<string, string> = { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍎" };

type MealKey = (typeof MEAL_TYPES)[number];

function MealPlanPage() {
  const { profile } = useProfile();
  const { isActive } = useSubscription();
  const { plan, generating, error, generate, clearPlan, isStale } = useMealPlan();
  const [activeDay, setActiveDay] = useState(0);
  const [activePrefs, setActivePrefs] = useState(false);
  const [cookingTime, setCookingTime] = useState<"quick" | "moderate" | "leisurely">("moderate");
  const [budget, setBudget] = useState<"budget" | "moderate" | "premium">("moderate");
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [mealDetail, setMealDetail] = useState<{ meal: MealItem; label: string } | null>(null);

  const handleGenerate = async () => {
    if (!isActive) { toast.error("Upgrade to Pro to generate meal plans."); return; }
    haptics.light();
    const result = await generate({
      name: profile?.name,
      goal: profile?.goal,
      daily_calories: profile?.daily_calories,
      protein_g: profile?.protein_g,
      carbs_g: profile?.carbs_g,
      fat_g: profile?.fat_g,
      diet_preferences: profile?.diet_preferences,
      budget,
      cooking_time: cookingTime,
    });
    if (!result) toast.error(error ?? "Couldn't generate plan — try again.");
    else { toast.success("7-day meal plan ready! 🎉"); haptics.success(); }
  };

  if (!isActive) {
    return <UpgradePrompt />;
  }

  return (
    <div className="px-5 pt-7 pb-8 stagger">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight">Meal Plan</h1>
          <p className="text-[13px] text-[color:var(--ink-mid)] mt-1">AI-generated for your exact goals</p>
        </div>
        <div className="flex items-center gap-2">
          {plan && (
            <button
              onClick={() => { haptics.light(); setShoppingOpen(true); }}
              className="h-10 w-10 rounded-full bg-white border border-[color:var(--cream-border)] grid place-items-center text-[color:var(--forest)] shadow-elev-sm"
              aria-label="Shopping list"
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => { haptics.light(); setActivePrefs((v) => !v); }}
            className="h-10 px-3 rounded-full bg-white border border-[color:var(--cream-border)] text-[12px] font-semibold text-[color:var(--ink-mid)] flex items-center gap-1"
          >
            Preferences <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", activePrefs && "rotate-180")} />
          </button>
        </div>
      </div>

      {/* Preferences panel */}
      {activePrefs && (
        <div className="mb-5 p-4 bg-white rounded-2xl border border-[color:var(--cream-border)] shadow-elev-sm space-y-4 animate-fade-in">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold mb-2">Cooking time</p>
            <div className="flex gap-1 p-1 rounded-full bg-[color:var(--cream-dark)]">
              {(["quick", "moderate", "leisurely"] as const).map((t) => (
                <button key={t} onClick={() => setCookingTime(t)} className={cn("flex-1 h-9 rounded-full text-[12px] font-semibold capitalize transition-all", cookingTime === t ? "bg-white text-[color:var(--forest)] shadow-elev-sm" : "text-[color:var(--ink-mid)]")}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold mb-2">Budget</p>
            <div className="flex gap-1 p-1 rounded-full bg-[color:var(--cream-dark)]">
              {(["budget", "moderate", "premium"] as const).map((b) => (
                <button key={b} onClick={() => setBudget(b)} className={cn("flex-1 h-9 rounded-full text-[12px] font-semibold capitalize transition-all", budget === b ? "bg-white text-[color:var(--forest)] shadow-elev-sm" : "text-[color:var(--ink-mid)]")}>{b}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Generate / Regenerate */}
      {(!plan || isStale) && (
        <PrimaryButton onClick={handleGenerate} loading={generating} className="mb-5">
          <Sparkles className="h-4 w-4 mr-2" />
          {generating ? "Generating your plan…" : plan ? "Regenerate plan" : "Generate 7-day meal plan →"}
        </PrimaryButton>
      )}

      {generating && (
        <div className="mb-5 flex flex-col items-center gap-3 py-12 text-center">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-[color:var(--sage-light)]" />
            <div className="absolute inset-0 rounded-full border-4 border-[color:var(--forest)] border-t-transparent animate-spin" />
            <div className="absolute inset-0 grid place-items-center text-2xl">🧑‍🍳</div>
          </div>
          <p className="text-[15px] font-medium text-[color:var(--ink)]">Your personal chef is cooking…</p>
          <p className="text-[13px] text-[color:var(--ink-light)]">This takes 10–15 seconds</p>
        </div>
      )}

      {plan && !generating && (
        <>
          {/* Coach note */}
          <div className="mb-5 p-4 rounded-2xl bg-gradient-to-br from-[color:var(--forest)] to-[color:var(--forest-mid)] text-white">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">🧑‍⚕️</span>
              <div>
                <p className="text-[11px] uppercase tracking-widest opacity-70 font-semibold mb-1">Your coach says</p>
                <p className="text-[13px] leading-relaxed opacity-90">{plan.coach_notes}</p>
              </div>
            </div>
          </div>

          {/* Weekly overview */}
          <div className="mb-5 p-4 rounded-2xl bg-[color:var(--cream-dark)]">
            <p className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold mb-1">This week's approach</p>
            <p className="text-[13px] text-[color:var(--ink-mid)] leading-relaxed">{plan.weekly_overview}</p>
          </div>

          {/* Day selector */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 -mx-1 px-1">
            {plan.days.map((d, i) => (
              <button
                key={i}
                onClick={() => { haptics.light(); setActiveDay(i); }}
                className={cn(
                  "shrink-0 flex flex-col items-center px-3 py-2.5 rounded-2xl border transition-all",
                  activeDay === i
                    ? "bg-[color:var(--forest)] border-[color:var(--forest)] text-white shadow-elev-sm"
                    : "bg-white border-[color:var(--cream-border)] text-[color:var(--ink-mid)]",
                )}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider">{d.day.slice(0, 3)}</span>
                <span className="text-[12px] font-medium mt-0.5">{d.totals.calories}<span className="text-[9px] ml-0.5 opacity-70">kcal</span></span>
              </button>
            ))}
          </div>

          {/* Day detail */}
          <DayView
            day={plan.days[activeDay]}
            onMealPress={(meal, label) => setMealDetail({ meal, label })}
          />

          {/* Regenerate */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="mt-5 w-full h-12 rounded-2xl border border-[color:var(--cream-border)] bg-white text-[13px] font-semibold text-[color:var(--ink-mid)] flex items-center justify-center gap-2 hover:bg-[color:var(--cream-dark)]"
          >
            <RefreshCw className="h-4 w-4" /> Regenerate plan
          </button>
        </>
      )}

      {/* Shopping list modal */}
      {shoppingOpen && plan && (
        <ShoppingListModal list={plan.shopping_list} onClose={() => setShoppingOpen(false)} />
      )}

      {/* Meal detail modal */}
      {mealDetail && (
        <MealDetailModal meal={mealDetail.meal} label={mealDetail.label} onClose={() => setMealDetail(null)} />
      )}
    </div>
  );
}

function DayView({ day, onMealPress }: { day: MealPlanDay; onMealPress: (meal: MealItem, label: string) => void }) {
  return (
    <div className="space-y-3">
      {/* Macro summary bar */}
      <div className="bg-white rounded-2xl border border-[color:var(--cream-border)] p-4 shadow-elev-sm">
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            { label: "Calories", value: String(day.totals.calories), unit: "kcal", color: "var(--forest)" },
            { label: "Protein", value: String(day.totals.protein), unit: "g", color: "#7C3AED" },
            { label: "Carbs", value: String(day.totals.carbs), unit: "g", color: "#2563EB" },
            { label: "Fat", value: String(day.totals.fat), unit: "g", color: "var(--gold)" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: s.color }}>{s.label}</div>
              <div className="mt-0.5 font-display text-[18px] font-bold text-[color:var(--ink)]">{s.value}</div>
              <div className="text-[10px] text-[color:var(--ink-light)]">{s.unit}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Meal cards */}
      {MEAL_TYPES.map((mealKey) => {
        const meal = day[mealKey] as MealItem;
        return (
          <button
            key={mealKey}
            onClick={() => onMealPress(meal, `${MEAL_EMOJIS[mealKey]} ${mealKey.charAt(0).toUpperCase() + mealKey.slice(1)}`)}
            className="w-full bg-white rounded-2xl border border-[color:var(--cream-border)] p-4 shadow-elev-sm flex items-center gap-4 text-left active:scale-[0.98] transition-transform"
          >
            <div className="h-12 w-12 rounded-full bg-[color:var(--cream-dark)] grid place-items-center text-2xl shrink-0">{meal.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold">{MEAL_EMOJIS[mealKey]} {mealKey}</div>
              <div className="text-[15px] font-medium text-[color:var(--ink)] truncate mt-0.5">{meal.name}</div>
              <div className="flex items-center gap-3 mt-1 text-[11px]">
                <span className="font-semibold text-[color:var(--forest)]">{meal.calories} kcal</span>
                <span className="text-[#7C3AED]">P:{meal.protein}g</span>
                <span className="text-[color:var(--ink-light)]">⏱ {meal.prep_time}m</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-[color:var(--ink-light)] shrink-0" />
          </button>
        );
      })}
    </div>
  );
}

function MealDetailModal({ meal, label, onClose }: { meal: MealItem; label: string; onClose: () => void }) {
  const { addLog } = useFoodLog();

  const logMeal = async () => {
    await addLog({
      meal_type: label.toLowerCase().includes("breakfast") ? "breakfast" : label.toLowerCase().includes("lunch") ? "lunch" : label.toLowerCase().includes("dinner") ? "dinner" : "snack",
      food_name: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      fibre: 0,
      food_score: 8,
      emoji: meal.emoji,
    });
    toast.success(`${meal.emoji} ${meal.name} logged!`);
    haptics.success();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-[430px] max-h-[85vh] bg-white rounded-t-[28px] shadow-elev-lg overflow-y-auto animate-fade-up" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}>
        <div className="sticky top-0 pt-3 bg-white rounded-t-[28px] grid place-items-center">
          <div className="h-1.5 w-10 rounded-full bg-[color:var(--cream-border)]" />
        </div>
        <div className="px-5 pt-2 pb-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <span className="text-5xl">{meal.emoji}</span>
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold">{label}</p>
              <h3 className="font-display text-[20px] font-bold leading-snug mt-0.5">{meal.name}</h3>
              <p className="text-[12px] text-[color:var(--ink-light)] mt-1">⏱ {meal.prep_time} min</p>
            </div>
          </div>

          {/* Macros */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {[["kcal", String(meal.calories), "var(--forest)"], ["P", `${meal.protein}g`, "#7C3AED"], ["C", `${meal.carbs}g`, "#2563EB"], ["F", `${meal.fat}g`, "var(--gold)"]].map(([l, v, c]) => (
              <div key={l} className="rounded-2xl bg-[color:var(--cream-dark)] py-3 text-center">
                <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: c }}>{l}</div>
                <div className="font-display text-[18px] font-bold text-[color:var(--ink)]">{v}</div>
              </div>
            ))}
          </div>

          {/* Ingredients */}
          <p className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold mb-2">Ingredients</p>
          <div className="mb-4 space-y-1.5">
            {meal.ingredients.map((ing, i) => (
              <div key={i} className="flex items-center gap-2.5 text-[14px] text-[color:var(--ink)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--forest)] shrink-0" />
                {ing}
              </div>
            ))}
          </div>

          {/* Method */}
          <p className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold mb-2">How to make it</p>
          <p className="text-[14px] text-[color:var(--ink-mid)] leading-relaxed mb-4">{meal.method}</p>

          {/* Tip */}
          <div className="p-3.5 rounded-2xl bg-[color:var(--gold-light)] border border-[color:var(--gold)]/20 mb-5">
            <p className="text-[12px] font-semibold text-[color:var(--gold)] mb-0.5">💡 Coach tip</p>
            <p className="text-[13px] text-[color:var(--ink-mid)] leading-snug">{meal.tip}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 h-12 rounded-2xl border border-[color:var(--cream-border)] text-[13px] font-semibold text-[color:var(--ink-mid)]">Close</button>
            <button onClick={logMeal} className="flex-[2] h-12 rounded-2xl bg-gradient-cta text-white text-[14px] font-semibold shadow-elev-cta flex items-center justify-center gap-2">
              <Utensils className="h-4 w-4" /> Log to diary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShoppingListModal({ list, onClose }: { list: { category: string; items: string[] }[]; onClose: () => void }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const toggle = (item: string) => setChecked((prev) => { const next = new Set(prev); next.has(item) ? next.delete(item) : next.add(item); return next; });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-[430px] max-h-[85vh] bg-white rounded-t-[28px] shadow-elev-lg flex flex-col animate-fade-up" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}>
        <div className="sticky top-0 pt-3 bg-white rounded-t-[28px] z-10 px-5 pb-3 border-b border-[color:var(--cream-border)]">
          <div className="grid place-items-center mb-3"><div className="h-1.5 w-10 rounded-full bg-[color:var(--cream-border)]" /></div>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-[20px] font-bold">Shopping list</h3>
            <button onClick={onClose}><X className="h-5 w-5 text-[color:var(--ink-light)]" /></button>
          </div>
          <p className="text-[12px] text-[color:var(--ink-light)] mt-0.5">Tap items to check them off</p>
        </div>
        <div className="overflow-y-auto px-5 pt-4 space-y-5">
          {list.map((cat) => (
            <div key={cat.category}>
              <p className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold mb-2">{cat.category}</p>
              <div className="space-y-2">
                {cat.items.map((item) => {
                  const done = checked.has(item);
                  return (
                    <button key={item} onClick={() => toggle(item)} className={cn("w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left", done ? "bg-[color:var(--cream-dark)] border-[color:var(--cream-border)] opacity-50" : "bg-white border-[color:var(--cream-border)]")}>
                      <div className={cn("h-5 w-5 rounded-full border-2 grid place-items-center shrink-0 transition-colors", done ? "border-[color:var(--forest)] bg-[color:var(--forest)]" : "border-[color:var(--cream-border)]")}>
                        {done && <span className="text-white text-[10px]">✓</span>}
                      </div>
                      <span className={cn("text-[14px]", done ? "line-through text-[color:var(--ink-light)]" : "text-[color:var(--ink)]")}>{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}

function UpgradePrompt() {
  return (
    <div className="px-5 pt-16 pb-8 flex flex-col items-center text-center">
      <div className="h-24 w-24 rounded-full bg-[color:var(--gold-light)] grid place-items-center text-5xl mb-6">🧑‍🍳</div>
      <h2 className="font-display text-[28px] font-bold">AI Meal Planner</h2>
      <p className="text-[15px] text-[color:var(--ink-mid)] mt-3 max-w-[280px] leading-relaxed">
        Get a personalised 7-day meal plan with recipes, shopping list, and macros — all in one tap.
      </p>
      <div className="mt-8 space-y-3 w-full max-w-[300px]">
        {["7-day personalised meal plan", "Complete shopping list", "Log meals directly to diary", "Regenerate anytime", "Matches your macros exactly"].map((f) => (
          <div key={f} className="flex items-center gap-3 text-left">
            <div className="h-6 w-6 rounded-full bg-[color:var(--sage-light)] grid place-items-center text-[color:var(--forest)] text-[12px] font-bold shrink-0">✓</div>
            <span className="text-[14px] text-[color:var(--ink)]">{f}</span>
          </div>
        ))}
      </div>
      <a href="/pricing" className="mt-8 w-full max-w-[300px] h-14 rounded-2xl bg-gradient-cta text-white text-[15px] font-semibold shadow-elev-cta flex items-center justify-center gap-2">
        <Sparkles className="h-5 w-5" /> Upgrade to Pro →
      </a>
    </div>
  );
}
