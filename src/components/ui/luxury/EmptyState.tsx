import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface Props {
  emoji: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCta?: () => void;
  className?: string;
}

export function EmptyState({
  emoji,
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  onCta,
  className,
}: Props) {
  const cta = ctaLabel ? (
    ctaHref ? (
      <Link
        to={ctaHref}
        className="mt-5 inline-flex items-center justify-center h-11 px-6 rounded-full bg-[color:var(--forest)] text-white text-[14px] font-semibold shadow-elev-sm press-scale"
      >
        {ctaLabel}
      </Link>
    ) : (
      <button
        type="button"
        onClick={onCta}
        className="mt-5 inline-flex items-center justify-center h-11 px-6 rounded-full bg-[color:var(--forest)] text-white text-[14px] font-semibold shadow-elev-sm press-scale"
      >
        {ctaLabel}
      </button>
    )
  ) : null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-8 py-12 rounded-[20px] bg-white border border-[color:var(--cream-border)] animate-fade-up",
        className,
      )}
    >
      <div className="text-[56px] leading-none animate-float-3d" aria-hidden>
        {emoji}
      </div>
      <h3 className="mt-4 font-display text-[20px] text-[color:var(--ink)]">{title}</h3>
      {subtitle && (
        <p className="mt-1.5 text-[14px] text-[color:var(--ink-mid)] max-w-[280px]">
          {subtitle}
        </p>
      )}
      {cta}
    </div>
  );
}
