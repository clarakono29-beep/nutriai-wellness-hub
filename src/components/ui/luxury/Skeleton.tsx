import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Override default border radius. */
  rounded?: string;
}

/**
 * Premium shimmer skeleton. Use for any data-fetching layout.
 * Match the skeleton dimensions to the real content.
 */
export function Skeleton({ className, rounded, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("skeleton-shimmer", className)}
      style={{ borderRadius: rounded, ...style }}
      {...props}
    />
  );
}

/* Pre-built skeletons for common screens */

export function CalorieRingSkeleton() {
  return (
    <div className="rounded-[28px] bg-white shadow-elev-sm border border-[color:var(--cream-border)] p-7 flex flex-col items-center">
      <div
        className="rounded-full skeleton-shimmer"
        style={{ width: 200, height: 200 }}
      />
      <div className="mt-5 grid grid-cols-3 gap-2 w-full">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FoodRowSkeleton() {
  return (
    <div className="rounded-[14px] bg-white border border-[color:var(--cream-border)] p-3 flex items-center gap-3">
      <Skeleton className="h-10 w-10" rounded="9999px" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-6 w-12" />
    </div>
  );
}

export function RecipeCardSkeleton() {
  return (
    <div className="shrink-0 w-[160px] rounded-[14px] overflow-hidden bg-white border border-[color:var(--cream-border)]">
      <Skeleton className="h-[120px] w-full" rounded="0" />
      <div className="p-2 space-y-2">
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}
