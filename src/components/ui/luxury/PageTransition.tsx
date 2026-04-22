import { useLocation } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps a route's content so it re-runs the fade-up animation on each
 * pathname change. Lightweight — no animation library needed.
 */
export function PageTransition({ children, className }: Props) {
  const location = useLocation();
  const [key, setKey] = useState(location.pathname);

  useEffect(() => {
    setKey(location.pathname);
  }, [location.pathname]);

  return (
    <div key={key} className={cn("animate-fade-up", className)}>
      {children}
    </div>
  );
}
