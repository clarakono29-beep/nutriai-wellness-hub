import { Bell, X } from "lucide-react";

interface Props {
  onAllow: () => void;
  onDismiss: () => void;
}

export function NotificationPrompt({ onAllow, onDismiss }: Props) {
  return (
    <div className="rounded-[20px] bg-white border border-[color:var(--cream-border)] shadow-elev-sm p-4 flex items-start gap-3">
      <div className="h-11 w-11 rounded-full bg-[color:var(--forest)]/10 grid place-items-center text-[color:var(--forest)] shrink-0">
        <Bell className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-[16px] text-[color:var(--ink)]">
          Turn on smart reminders?
        </p>
        <p className="text-[12px] text-[color:var(--ink-mid)] mt-1 leading-relaxed">
          Gentle nudges for meals, water and your streak — never spammy.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={onAllow}
            className="h-9 px-4 rounded-full bg-[color:var(--forest)] text-white text-[12px] font-semibold active:scale-95 ease-luxury transition-transform"
          >
            Yes, remind me
          </button>
          <button
            onClick={onDismiss}
            className="h-9 px-3 rounded-full text-[12px] text-[color:var(--ink-mid)] hover:bg-[color:var(--cream-dark)]"
          >
            Not now
          </button>
        </div>
      </div>
      <button
        aria-label="Dismiss"
        onClick={onDismiss}
        className="h-7 w-7 rounded-full grid place-items-center text-[color:var(--ink-light)] hover:bg-[color:var(--cream-dark)]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
