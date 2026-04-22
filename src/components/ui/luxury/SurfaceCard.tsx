import { cn } from "@/lib/utils";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  tone?: "white" | "cream" | "forest" | "gold";
  elevated?: boolean;
}

export function SurfaceCard({
  className,
  tone = "white",
  elevated = true,
  children,
  ...rest
}: Props) {
  return (
    <div
      className={cn(
        "rounded-[20px] p-5",
        tone === "white" && "bg-white border border-[color:var(--cream-border)]",
        tone === "cream" && "bg-[color:var(--cream-dark)] border border-[color:var(--cream-border)]",
        tone === "forest" && "bg-gradient-cta text-white",
        tone === "gold" && "bg-gradient-gold text-[color:var(--ink)]",
        elevated && tone === "white" && "shadow-elev-sm",
        elevated && tone === "forest" && "shadow-elev-md",
        elevated && tone === "gold" && "shadow-elev-gold",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
