import { cn } from "@/lib/utils";
import { Flame, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { DiaryStory } from "@/lib/narrative";
import { fmtKcal } from "@/lib/format";

interface Props {
  story: DiaryStory;
  caloriesEaten: number;
  calorieTarget: number;
  streakDays: number;
  className?: string;
}

const PACE_STYLES: Record<
  DiaryStory["pace"],
  { bg: string; fg: string; border: string; Icon: typeof TrendingUp }
> = {
  behind: {
    bg: "color-mix(in oklab, var(--gold) 14%, white)",
    fg: "var(--gold)",
    border: "var(--gold)",
    Icon: TrendingDown,
  },
  on_track: {
    bg: "color-mix(in oklab, var(--forest-light) 12%, white)",
    fg: "var(--forest)",
    border: "var(--forest-light)",
    Icon: Minus,
  },
  ahead: {
    bg: "color-mix(in oklab, var(--sage) 18%, white)",
    fg: "var(--forest-mid)",
    border: "var(--sage)",
    Icon: TrendingUp,
  },
  over: {
    bg: "color-mix(in oklab, var(--coral) 12%, white)",
    fg: "var(--coral)",
    border: "var(--coral)",
    Icon: TrendingUp,
  },
};

/**
 * "Your day, in one glance" card. Replaces the plain date row with
 * a luxe narrative + pace chip and a thin progress sparkline.
 */
export function TodayStoryCard({
  story,
  caloriesEaten,
  calorieTarget,
  streakDays,
  className,
}: Props) {
  const pct = Math.max(
    0,
    Math.min(100, (caloriesEaten / Math.max(1, calorieTarget)) * 100),
  );
  const pace = PACE_STYLES[story.pace];
  const PaceIcon = pace.Icon;

  return (
    <div
      className={cn(
        "rounded-[24px] bg-gradient-card border border-[color:var(--cream-border)] shadow-elev-sm p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[color:var(--sage)]">
            {story.greeting}
          </p>
          <h2 className="mt-1.5 font-display text-[22px] font-semibold leading-tight text-[color:var(--ink)]">
            {story.headline}
          </h2>
          {story.subline && (
            <p className="mt-1 text-[12.5px] text-[color:var(--ink-mid)] truncate">
              {story.subline}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span
            className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-semibold border"
            style={{
              background: pace.bg,
              color: pace.fg,
              borderColor: `color-mix(in oklab, ${pace.border} 35%, transparent)`,
            }}
          >
            <PaceIcon className="h-3 w-3" /> {story.paceLabel}
          </span>
          {streakDays > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[color:var(--ink-mid)]">
              <Flame className="h-3 w-3 text-[color:var(--coral)]" />
              {streakDays}d
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between text-[11px] text-[color:var(--ink-light)]">
          <span>
            {fmtKcal(caloriesEaten)}{" "}
            <span className="text-[color:var(--ink-light)]/80">
              / {fmtKcal(calorieTarget)} kcal
            </span>
          </span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-[color:var(--cream-dark)] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-cta transition-[width] duration-700 ease-luxury"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
