import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: number;
  max: number;
  color?: string;
  unit?: string;
  className?: string;
}

export function MacroBar({ label, value, max, color = "var(--forest-mid)", unit = "g", className }: Props) {
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0)) * 100;
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[12px] uppercase tracking-widest text-[color:var(--ink-light)] font-medium">
          {label}
        </span>
        <span className="text-[13px] font-medium text-[color:var(--ink)]">
          {Math.round(value)}<span className="text-[color:var(--ink-light)]">/{Math.round(max)}{unit}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-[color:var(--cream-dark)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-luxury"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
