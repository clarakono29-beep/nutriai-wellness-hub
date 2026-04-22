import { AlertCircle, RotateCw } from "lucide-react";

interface Props {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went sideways",
  message = "We couldn't load this just now. Give it another try.",
  onRetry,
}: Props) {
  return (
    <div className="rounded-[20px] bg-white border-l-4 border-l-[color:var(--coral)] border border-[color:var(--cream-border)] p-5 flex items-start gap-3 animate-fade-up shadow-elev-sm">
      <div className="h-10 w-10 rounded-full bg-[color:var(--coral-light)] grid place-items-center text-[color:var(--coral)] shrink-0">
        <AlertCircle className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-[16px] text-[color:var(--ink)]">{title}</p>
        <p className="text-[13px] text-[color:var(--ink-mid)] mt-1 leading-relaxed">
          {message}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[color:var(--forest)] text-white text-[12px] font-semibold press-scale"
          >
            <RotateCw className="h-3.5 w-3.5" /> Try again
          </button>
        )}
      </div>
    </div>
  );
}
