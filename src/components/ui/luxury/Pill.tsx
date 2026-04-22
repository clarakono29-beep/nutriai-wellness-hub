import { cn } from "@/lib/utils";

type Tone = "neutral" | "forest" | "gold" | "coral" | "sage";

interface Props {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}

const toneClasses: Record<Tone, string> = {
  neutral: "bg-[color:var(--cream-dark)] text-[color:var(--ink-mid)]",
  forest: "bg-[color:var(--forest)] text-white",
  gold: "bg-[color:var(--gold-light)] text-[color:var(--gold)]",
  coral: "bg-[color:var(--coral-light)] text-[color:var(--coral)]",
  sage: "bg-[color:var(--sage-light)] text-[color:var(--forest)]",
};

export function Pill({ tone = "neutral", children, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
