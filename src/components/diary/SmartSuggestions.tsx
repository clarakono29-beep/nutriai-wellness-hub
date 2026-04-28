import { Sparkles, ChevronRight } from "lucide-react";
import type { MealSuggestion } from "@/lib/narrative";
import { cn } from "@/lib/utils";

interface Props {
  suggestions: MealSuggestion[];
  onPick: (s: MealSuggestion) => void;
  className?: string;
}

/**
 * Horizontal strip of "next meal" ideas tuned to time-of-day and
 * remaining macros. Tap fills the AI input below with the prompt.
 */
export function SmartSuggestions({ suggestions, onPick, className }: Props) {
  if (!suggestions.length) return null;
  return (
    <div className={cn("mt-5", className)}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Smart suggestions
        </p>
        <span className="text-[10px] text-[color:var(--ink-light)] uppercase tracking-wider">
          tap to log
        </span>
      </div>
      <div className="mt-2 flex gap-2.5 overflow-x-auto no-scrollbar -mx-5 px-5 snap-x-mandatory">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onPick(s)}
            className="snap-start shrink-0 w-[230px] text-left rounded-[18px] bg-white border border-[color:var(--cream-border)] hover:border-[color:var(--forest-mid)] shadow-elev-sm px-3.5 py-3 active:scale-[0.98] ease-luxury transition-all"
          >
            <div className="flex items-start gap-2.5">
              <div className="h-9 w-9 rounded-full bg-[color:var(--cream-dark)] grid place-items-center text-lg shrink-0">
                {s.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold text-[color:var(--ink)] leading-tight truncate-2">
                  {s.title}
                </div>
                <div className="mt-1 text-[11px] text-[color:var(--ink-mid)] leading-snug truncate-2">
                  {s.why}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[color:var(--ink-light)] mt-1 shrink-0" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
