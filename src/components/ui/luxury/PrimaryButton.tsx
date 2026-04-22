import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "gold" | "outline";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gradient-cta text-white shadow-elev-cta hover:-translate-y-px hover:shadow-elev-lg active:scale-[0.97]",
  secondary:
    "bg-[color:var(--cream-dark)] text-[color:var(--forest)] hover:bg-[color:var(--sage-light)] active:scale-[0.97]",
  ghost:
    "bg-transparent text-[color:var(--forest)] hover:bg-[color:var(--cream-dark)] active:scale-[0.97]",
  gold:
    "bg-gradient-gold text-[color:var(--ink)] shadow-elev-gold hover:-translate-y-px active:scale-[0.97]",
  outline:
    "bg-white text-[color:var(--forest)] border border-[color:var(--cream-border)] hover:border-[color:var(--forest-mid)] active:scale-[0.97]",
};

export const PrimaryButton = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = "primary", loading, fullWidth = true, children, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "relative inline-flex items-center justify-center h-14 px-7 rounded-[20px] font-body text-[17px] font-semibold ease-luxury transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
          fullWidth && "w-full",
          variantClasses[variant],
          className,
        )}
        {...rest}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            <span>Please wait…</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  },
);
PrimaryButton.displayName = "PrimaryButton";
