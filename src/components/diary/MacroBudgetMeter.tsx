import { cn } from "@/lib/utils";

interface Props {
  caloriesEaten: number;
  calorieTarget: number;
  proteinEaten: number;
  proteinTarget: number;
  className?: string;
}

/**
 * Tiny meter that lives just above the AI input bar — tells the user
 * how much room is left for today before they even submit a meal.
 */
export function MacroBudgetMeter({
  caloriesEaten,
  calorieTarget,
  proteinEaten,
  proteinTarget,
  className,
}: Props) {
  const kcalRemaining = Math.max(0, Math.round(calorieTarget - caloriesEaten));
  const protRemaining = Math.max(0, Math.round(proteinTarget - proteinEaten));
  const kcalPct = Math.min(
    100,
    Math.max(0, (caloriesEaten / Math.max(1, calorieTarget)) * 100),
  );
  const protPct = Math.min(
    100,
    Math.max(0, (proteinEaten / Math.max(1, proteinTarget)) * 100),
  );

  return (
    <div
      className={cn(
        "mb-1.5 px-3 py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-[color:var(--cream-border)] shadow-elev-sm flex items-center gap-3 text-[11px] font-medium text-[color:var(--ink-mid)]",
        className,
      )}
    >
      <Pip
        label="kcal left"
        value={kcalRemaining.toLocaleString()}
        pct={kcalPct}
        color="var(--forest)"
      />
      <div className="h-3 w-px bg-[color:var(--cream-border)]" />
      <Pip
        label="protein"
        value={`${protRemaining}g`}
        pct={protPct}
        color="#7C3AED"
      />
    </div>
  );
}

function Pip({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="flex-1 min-w-0 flex items-center gap-2">
      <div
        className="relative h-1.5 flex-1 rounded-full bg-[color:var(--cream-dark)] overflow-hidden"
        aria-hidden
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-luxury"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="shrink-0 tabular-nums">
        <span className="text-[color:var(--ink)] font-semibold">{value}</span>{" "}
        <span className="text-[color:var(--ink-light)]">{label}</span>
      </span>
    </div>
  );
}
