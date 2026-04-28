import { useEffect, useState } from "react";
import { Loader2, Check, X, Trash2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fmtKcal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import type { FoodLog } from "@/hooks/useFoodLog";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealType = (typeof MEAL_TYPES)[number];

interface Props {
  log: FoodLog;
  onClose: () => void;
  onUpdated: (updated: FoodLog) => void;
  onDeleted: (id: string) => void;
}

/**
 * Bottom-sheet editor for an already-logged meal.
 * Lets the user fix the name, change meal type, scale servings, or delete.
 * Macros scale linearly with the servings multiplier.
 */
export function EditLogSheet({ log, onClose, onUpdated, onDeleted }: Props) {
  const [name, setName] = useState(log.food_name);
  const [meal, setMeal] = useState<MealType>(
    (MEAL_TYPES as readonly string[]).includes(log.meal_type)
      ? (log.meal_type as MealType)
      : "snack",
  );
  // We treat 1.0 as "as logged" — multiplier applies to all macros.
  const [servings, setServings] = useState(1);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Esc to close
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const previewKcal = Math.round(Number(log.calories) * servings);
  const previewP = Math.round(Number(log.protein) * servings);
  const previewC = Math.round(Number(log.carbs) * servings);
  const previewF = Math.round(Number(log.fat) * servings);
  const previewFibre = Math.round(Number(log.fibre ?? 0) * servings);

  const save = async () => {
    setSaving(true);
    const patch = {
      food_name: name.trim() || log.food_name,
      meal_type: meal,
      calories: previewKcal,
      protein: previewP,
      carbs: previewC,
      fat: previewF,
      fibre: previewFibre,
    };
    const { data, error } = await supabase
      .from("food_logs")
      .update(patch)
      .eq("id", log.id)
      .select()
      .maybeSingle();
    setSaving(false);
    if (error || !data) {
      haptics.error();
      toast.error(error?.message ?? "Couldn't save changes");
      return;
    }
    haptics.success();
    toast.success("Updated");
    onUpdated(data as FoodLog);
    onClose();
  };

  const remove = async () => {
    setDeleting(true);
    const { error } = await supabase.from("food_logs").delete().eq("id", log.id);
    setDeleting(false);
    if (error) {
      haptics.error();
      toast.error(error.message);
      return;
    }
    haptics.light();
    toast.success("Deleted");
    onDeleted(log.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center animate-fade-in">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        className="relative w-full max-w-[430px] bg-white rounded-t-[28px] shadow-elev-lg max-h-[88vh] overflow-y-auto animate-slide-up-panel"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      >
        <div className="sticky top-0 pt-3 bg-white rounded-t-[28px] flex items-center justify-center">
          <div className="h-1.5 w-10 rounded-full bg-[color:var(--cream-border)]" />
        </div>

        <div className="px-5 pt-3 pb-5">
          <div className="flex items-start gap-3">
            <div className="text-[40px] leading-none">{log.emoji ?? "🍽️"}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-[color:var(--sage)] font-semibold">
                Edit entry
              </p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="Food name"
                className="w-full font-display text-[20px] font-semibold text-[color:var(--ink)] bg-transparent border-0 outline-none focus:bg-[color:var(--cream-dark)] rounded-md px-1 -mx-1"
              />
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="h-9 w-9 grid place-items-center rounded-full bg-[color:var(--cream-dark)] text-[color:var(--ink-mid)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Macro preview */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <Pill label="kcal" value={fmtKcal(previewKcal)} dot="var(--forest)" />
            <Pill label="P" value={`${previewP}g`} dot="#7C3AED" />
            <Pill label="C" value={`${previewC}g`} dot="#2563EB" />
            <Pill label="F" value={`${previewF}g`} dot="var(--gold)" />
          </div>

          {/* Meal type */}
          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold mb-2">
              Meal
            </p>
            <div className="flex gap-1 p-1 rounded-full bg-[color:var(--cream-dark)]">
              {MEAL_TYPES.map((m) => (
                <button
                  key={m}
                  onClick={() => setMeal(m)}
                  className={cn(
                    "flex-1 h-9 rounded-full text-[12px] font-semibold capitalize transition-all ease-luxury",
                    meal === m
                      ? "bg-white text-[color:var(--forest)] shadow-elev-sm"
                      : "text-[color:var(--ink-mid)]",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Servings scaler */}
          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold mb-2">
              Scale portion
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setServings((s) => Math.max(0.25, +(s - 0.25).toFixed(2)))}
                aria-label="Smaller portion"
                className="h-10 w-10 rounded-full border border-[color:var(--cream-border)] grid place-items-center active:scale-90 ease-luxury transition-transform"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="flex-1 text-center">
                <div className="font-display text-[22px] font-semibold text-[color:var(--ink)] tabular-nums">
                  ×{servings.toFixed(2).replace(/\.00$/, "")}
                </div>
                <div className="text-[11px] text-[color:var(--ink-light)] uppercase tracking-wider">
                  of original
                </div>
              </div>
              <button
                onClick={() => setServings((s) => Math.min(5, +(s + 0.25).toFixed(2)))}
                aria-label="Larger portion"
                className="h-10 w-10 rounded-full border border-[color:var(--cream-border)] grid place-items-center active:scale-90 ease-luxury transition-transform"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-2">
            <button
              onClick={remove}
              disabled={deleting || saving}
              className="h-12 px-4 rounded-[16px] text-[13px] font-semibold text-[color:var(--coral)] hover:bg-[color:var(--coral-light)] inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </button>
            <button
              onClick={save}
              disabled={saving || deleting}
              className="flex-1 h-14 rounded-[16px] bg-gradient-cta text-white text-[15px] font-semibold shadow-elev-cta active:scale-[0.97] ease-luxury transition-transform disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" strokeWidth={2.6} />
              )}
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pill({ label, value, dot }: { label: string; value: string; dot: string }) {
  return (
    <div className="rounded-[12px] bg-[color:var(--cream-dark)] py-2 px-2 text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-widest text-[color:var(--ink-light)] font-semibold">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
        {label}
      </div>
      <div className="mt-0.5 text-[14px] font-semibold text-[color:var(--ink)]">
        {value}
      </div>
    </div>
  );
}
