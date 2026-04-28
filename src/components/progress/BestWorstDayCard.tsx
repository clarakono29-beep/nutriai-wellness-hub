import { TrendingDown, TrendingUp, Minus, Award, AlertCircle } from "lucide-react";
import { fmtKcal } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DayTotal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Props {
  dayTotals: DayTotal[];
  weekDays: Date[];
  target: number;
  className?: string;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * "Best & Worst day" card for the Progress screen.
 * Surfaces the day they were closest to target and the day they were
 * furthest off (over OR under). Encourages reflection without judgement.
 */
export function BestWorstDayCard({
  dayTotals,
  weekDays,
  target,
  className,
}: Props) {
  // Only consider elapsed days that actually have a log
  const candidates = dayTotals
    .map((d, i) => ({ idx: i, ...d }))
    .filter(
      (d) => d.calories > 0 && weekDays[d.idx].getTime() <= Date.now(),
    );

  if (candidates.length < 2) {
    return (
      <div
        className={cn(
          "rounded-[18px] bg-white border border-[color:var(--cream-border)] p-4 text-center text-[13px] text-[color:var(--ink-mid)] shadow-elev-sm",
          className,
        )}
      >
        Log a few more days to unlock "best vs toughest day" insights.
      </div>
    );
  }

  const ranked = candidates
    .map((d) => ({ ...d, distance: Math.abs(d.calories - target) }))
    .sort((a, b) => a.distance - b.distance);

  const best = ranked[0];
  const worst = ranked[ranked.length - 1];

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3",
        className,
      )}
    >
      <DayCard
        kind="best"
        label={DAY_NAMES[(weekDays[best.idx].getDay() + 6) % 7]}
        kcal={best.calories}
        protein={best.protein}
        target={target}
      />
      <DayCard
        kind="worst"
        label={DAY_NAMES[(weekDays[worst.idx].getDay() + 6) % 7]}
        kcal={worst.calories}
        protein={worst.protein}
        target={target}
      />
    </div>
  );
}

function DayCard({
  kind,
  label,
  kcal,
  protein,
  target,
}: {
  kind: "best" | "worst";
  label: string;
  kcal: number;
  protein: number;
  target: number;
}) {
  const diff = kcal - target;
  const isOver = diff > 0;
  const Trend = diff === 0 ? Minus : isOver ? TrendingUp : TrendingDown;
  const accent =
    kind === "best" ? "var(--success)" : "var(--coral)";
  const Icon = kind === "best" ? Award : AlertCircle;
  const title = kind === "best" ? "Closest to target" : "Toughest day";
  return (
    <div
      className="rounded-[18px] bg-white border border-[color:var(--cream-border)] p-4 shadow-elev-sm"
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold" style={{ color: accent }}>
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="mt-2 font-display text-[24px] font-bold text-[color:var(--ink)] leading-none">
        {label}
      </div>
      <div className="mt-1.5 text-[13px] text-[color:var(--ink-mid)]">
        {fmtKcal(kcal)} kcal
      </div>
      <div className="mt-1 text-[11px] text-[color:var(--ink-light)] inline-flex items-center gap-1">
        <Trend className="h-3 w-3" />
        {diff === 0 ? "on target" : `${isOver ? "+" : "−"}${Math.round(Math.abs(diff))} kcal`}
        <span className="text-[color:var(--ink-light)]/70">
          · {Math.round(protein)}g protein
        </span>
      </div>
    </div>
  );
}
