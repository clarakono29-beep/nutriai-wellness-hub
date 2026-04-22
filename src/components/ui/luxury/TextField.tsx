import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  trailing?: React.ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, Props>(
  ({ className, label, hint, error, trailing, id, ...rest }, ref) => {
    const inputId = id ?? rest.name;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[13px] font-medium text-[color:var(--ink-mid)] mb-2"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full h-[52px] px-[18px] rounded-[14px] bg-white",
              "border-[1.5px] border-[color:var(--cream-border)]",
              "text-[15px] font-body text-[color:var(--ink)] placeholder:text-[color:var(--ink-light)]",
              "focus:outline-none focus:border-[color:var(--forest-mid)]",
              "focus:shadow-[0_0_0_3px_rgba(45,90,64,0.12)]",
              "transition-all duration-200 ease-luxury",
              error && "border-[color:var(--error)] focus:border-[color:var(--error)] focus:shadow-[0_0_0_3px_rgba(192,57,43,0.12)]",
              trailing && "pr-12",
              className,
            )}
            {...rest}
          />
          {trailing && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[color:var(--ink-light)]">
              {trailing}
            </div>
          )}
        </div>
        {(error || hint) && (
          <p
            className={cn(
              "mt-1.5 text-[12px]",
              error ? "text-[color:var(--error)]" : "text-[color:var(--ink-light)]",
            )}
          >
            {error ?? hint}
          </p>
        )}
      </div>
    );
  },
);
TextField.displayName = "TextField";
