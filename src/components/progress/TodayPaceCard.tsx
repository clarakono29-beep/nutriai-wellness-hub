import { fmtKcal } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  caloriesEaten: number;
  calorieTarget: number;
  className?: string;
  hour?: number;
}

/** Same s-curve as in lib/narrative — duplicated here to keep
 *  this component dependency-light. Kept identical intentionally. */
function expectedFraction(h: number): number {
  if (h < 6) return 0.05;
  if (h < 9) return 0.1 + (h - 6) * 0.05;
  if (h < 13) return 0.25 + (h - 9) * 0.07;
  if (h < 19) return 0.55 + (h - 13) * 0.04;
  if (h < 22) return 0.85 + (h - 19) * 0.04;
  return 1;
}

/**
 * Visualizes how today's calorie pace compares to a smoothed
 * "ideal pace" curve based on time of day.
 */
export function TodayPaceCard({
  caloriesEaten,
  calorieTarget,
  className,
  hour,
}: Props) {
  const h = hour ?? new Date().getHours();
  const expectedPct = Math.round(expectedFraction(h) * 100);
  const actualPct = Math.min(
    100,
    Math.round((caloriesEaten / Math.max(1, calorieTarget)) * 100),
  );
  const remaining = Math.max(0, calorieTarget - caloriesEaten);
  const delta = actualPct - expectedPct;

  const tone =
    Math.abs(delta) <= 8
      ? "on"
      : delta > 0
        ? "ahead"
        : "behind";

  const toneCopy = {
    on: "Right on pace.",
    ahead: `${delta}% ahead of ideal pace.`,
    behind: `${Math.abs(delta)}% under ideal pace.`,
  } as const;

  const toneColor = {
    on: "var(--forest)",
    ahead: "var(--gold)",
    behind: "var(--forest-light)",
  } as const;

  return (
    <div
      className={cn(
        "rounded-[20px] bg-white border border-[color:var(--cream-border)] p-5 shadow-elev-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <h4 className="font-body font-semibold text-[14px] text-[color:var(--ink)]">
          Today's pace
        </h4>
        <span
          className="text-[10px] uppercase tracking-widest font-semibold"
          style={{ color: toneColor[tone] }}
        >
          {toneCopy[tone]}
        </span>
      </div>

      {/* Dual progress bars */}
      <div className="mt-4 space-y-3">
        <Bar
          label="Ideal by now"
          pct={expectedPct}
          color="var(--cream-border)"
          textColor="var(--ink-mid)"
          striped
        />
        <Bar
          label="You so far"
          pct={actualPct}
          color="var(--forest)"
          textColor="var(--ink)"
        />
      </div>

      <p className="mt-3 text-[12px] text-[color:var(--ink-mid)]">
        <span className="font-semibold text-[color:var(--ink)]">
          {fmtKcal(remaining)} kcal
        </span>{" "}
        remaining for the day.
      </p>
    </div>
  );
}

function Bar({
  label,
  pct,
  color,
  textColor,
  striped,
}: {
  label: string;
  pct: number;
  color: string;
  textColor: string;
  striped?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span style={{ color: textColor }} className="font-medium">
          {label}
        </span>
        <span className="tabular-nums text-[color:var(--ink-light)]">
          {pct}%
        </span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-[color:var(--cream-dark)] overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-luxury"
          style={{
            width: `${pct}%`,
            background: striped
              ? `repeating-linear-gradient(45deg, ${color}, ${color} 4px, transparent 4px, transparent 8px)`
              : color,
          }}
        />
      </div>
    </div>
  );
}
