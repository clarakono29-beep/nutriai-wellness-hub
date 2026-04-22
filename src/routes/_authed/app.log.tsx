import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { useFoodLog } from "@/hooks/useFoodLog";
import { useProfile } from "@/hooks/useProfile";
import { useAI, type MealAnalysis } from "@/hooks/useAI";
import { fmtKcal, fmtGrams } from "@/lib/format";

import { PrimaryButton } from "@/components/ui/luxury/PrimaryButton";
import { SurfaceCard } from "@/components/ui/luxury/SurfaceCard";
import { Pill } from "@/components/ui/luxury/Pill";
import { Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/app/log")({
  head: () => ({ meta: [{ title: "Log a meal — NutriAI" }] }),
  component: FoodLogPage,
});

const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealType = (typeof MEALS)[number];

function FoodLogPage() {
  const { profile } = useProfile();
  const { logs, addLog, removeLog } = useFoodLog();
  const { analyseMeal, loading } = useAI();

  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<MealAnalysis | null>(null);

  const analyze = async () => {
    if (!text.trim()) return;
    const result = await analyseMeal({
      meal_description: text,
      user_context: {
        goal: profile?.goal,
        daily_calories: profile?.daily_calories,
        protein_target: profile?.protein_g,
      },
    });
    if (result) {
      setPreview(result);
    } else {
      toast.error("Could not analyse — connect your Anthropic key in Cloud secrets.");
    }
  };

  const confirm = async () => {
    if (!preview) return;
    const { error } = await addLog({
      meal_type: mealType,
      food_name: preview.meal_name,
      calories: preview.calories,
      protein: preview.protein,
      carbs: preview.carbs,
      fat: preview.fat,
      fibre: preview.fibre,
      food_score: preview.food_score,
      emoji: preview.emoji,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Logged.");
    setText("");
    setPreview(null);
  };

  return (
    <div className="px-6 pt-8 pb-6">
      <Pill tone="sage">AI Meal Log</Pill>
      <h1 className="font-display text-[28px] font-bold mt-2">What did you eat?</h1>
      <p className="text-[14px] text-[color:var(--ink-mid)] mt-1">
        Describe in plain English. We'll do the rest.
      </p>

      <div className="mt-5">
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1">
          {MEALS.map((m) => (
            <button
              key={m}
              onClick={() => setMealType(m)}
              className={cn(
                "px-4 h-9 rounded-full text-[12px] uppercase tracking-widest font-semibold transition-all ease-luxury active:scale-95 whitespace-nowrap",
                mealType === m
                  ? "bg-[color:var(--forest)] text-white"
                  : "bg-white border border-[color:var(--cream-border)] text-[color:var(--ink-mid)]",
              )}
            >
              {m}
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Two scrambled eggs on sourdough with avocado and a flat white"
          rows={4}
          className="mt-4 w-full p-4 rounded-[14px] bg-white border-[1.5px] border-[color:var(--cream-border)] text-[15px] text-[color:var(--ink)] placeholder:text-[color:var(--ink-light)] focus:outline-none focus:border-[color:var(--forest-mid)] focus:shadow-[0_0_0_3px_rgba(45,90,64,0.12)] transition-all resize-none"
        />
        <PrimaryButton onClick={analyze} loading={loading} className="mt-3" disabled={!text.trim()}>
          <Sparkles className="h-4 w-4 mr-2" /> Analyse with AI
        </PrimaryButton>
      </div>

      {preview && (
        <SurfaceCard className="mt-5 animate-scale-in">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="text-3xl">{preview.emoji}</div>
              <div>
                <h3 className="font-display text-[20px] leading-tight">{preview.meal_name}</h3>
                <p className="text-[13px] text-[color:var(--ink-mid)] mt-1">{preview.verdict}</p>
              </div>
            </div>
            <ScoreBadge score={preview.food_score} />
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            <Stat label="kcal" value={fmtKcal(preview.calories)} />
            <Stat label="P" value={fmtGrams(preview.protein)} />
            <Stat label="C" value={fmtGrams(preview.carbs)} />
            <Stat label="F" value={fmtGrams(preview.fat)} />
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setPreview(null)}
              className="flex-1 h-12 rounded-[14px] bg-[color:var(--cream-dark)] text-[14px] font-semibold text-[color:var(--ink-mid)] active:scale-[0.97]"
            >
              Discard
            </button>
            <button
              onClick={confirm}
              className="flex-[2] h-12 rounded-[14px] bg-gradient-cta text-white font-semibold text-[14px] shadow-elev-sm active:scale-[0.97]"
            >
              Add to {mealType}
            </button>
          </div>
        </SurfaceCard>
      )}

      {/* Today's logs */}
      <h2 className="mt-8 font-display text-[22px]">Today's log</h2>
      {logs.length === 0 ? (
        <SurfaceCard tone="cream" className="mt-4 text-center py-8">
          <p className="text-[14px] text-[color:var(--ink-mid)]">
            No meals yet. Add your first above.
          </p>
        </SurfaceCard>
      ) : (
        <div className="mt-4 space-y-3">
          {logs.map((l) => (
            <SurfaceCard key={l.id} className="flex items-center gap-3">
              <div className="text-2xl">{l.emoji ?? "🍽️"}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-body font-semibold text-[14px] truncate">{l.food_name}</h4>
                  {l.food_score != null && <ScoreDot score={l.food_score} />}
                </div>
                <p className="text-[12px] text-[color:var(--ink-light)] mt-0.5">
                  {fmtKcal(Number(l.calories))} kcal · {fmtGrams(Number(l.protein))} P · {fmtGrams(Number(l.carbs))} C · {fmtGrams(Number(l.fat))} F
                </p>
              </div>
              <button
                onClick={() => removeLog(l.id)}
                className="h-9 w-9 grid place-items-center rounded-full text-[color:var(--ink-light)] hover:text-[color:var(--coral)] hover:bg-[color:var(--coral-light)] transition-all"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </SurfaceCard>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-[color:var(--cream-dark)] py-2">
      <div className="font-display text-[16px] text-[color:var(--forest)]">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-[color:var(--ink-light)]">{label}</div>
    </div>
  );
}

function scoreColor(score: number) {
  if (score >= 8) return { bg: "var(--sage-light)", fg: "var(--success)" };
  if (score >= 5) return { bg: "var(--gold-light)", fg: "var(--gold)" };
  return { bg: "var(--coral-light)", fg: "var(--coral)" };
}

function ScoreBadge({ score }: { score: number }) {
  const c = scoreColor(score);
  return (
    <div
      className="h-12 w-12 rounded-2xl grid place-items-center font-display font-bold"
      style={{ background: c.bg, color: c.fg }}
    >
      {score}
    </div>
  );
}

function ScoreDot({ score }: { score: number }) {
  const c = scoreColor(score);
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{ background: c.bg, color: c.fg }}
    >
      {score}/10
    </span>
  );
}
