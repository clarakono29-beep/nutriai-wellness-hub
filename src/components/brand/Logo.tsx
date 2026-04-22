import { cn } from "@/lib/utils";

/**
 * NutriAI logo — two overlapping organic leaf shapes.
 * Color is controlled via `currentColor`, set parent text color.
 */
export function LeafMark({ className, size = 44 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={cn("inline-block", className)}
      aria-hidden="true"
    >
      {/* back leaf */}
      <path
        d="M52 8c0 22-12 36-30 38-2-22 8-36 30-38z"
        fill="currentColor"
        opacity="0.55"
      />
      {/* front leaf */}
      <path
        d="M12 14c22 0 36 12 38 30-22 2-36-8-38-30z"
        fill="currentColor"
      />
      {/* central vein */}
      <path
        d="M16 18c10 6 20 16 28 28"
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display font-bold tracking-tight", className)}>
      Nutri<span className="font-light italic">AI</span>
    </span>
  );
}
