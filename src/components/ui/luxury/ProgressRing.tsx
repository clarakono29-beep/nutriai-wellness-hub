import { cn } from "@/lib/utils";

interface Props {
  value: number; // current
  max: number; // target
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  className?: string;
  color?: string; // CSS color
  trackColor?: string;
}

export function ProgressRing({
  value,
  max,
  size = 200,
  stroke = 14,
  label,
  sublabel,
  className,
  color = "var(--forest-mid)",
  trackColor = "var(--cream-dark)",
}: Props) {
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label && <div className="font-display text-3xl font-bold text-[color:var(--ink)]">{label}</div>}
        {sublabel && <div className="text-[11px] uppercase tracking-widest text-[color:var(--ink-light)] mt-0.5">{sublabel}</div>}
      </div>
    </div>
  );
}
