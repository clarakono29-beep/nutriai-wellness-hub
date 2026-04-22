import { useEffect, useMemo, useState } from "react";

interface Props {
  trigger: boolean;
  /** Number of particles. Default 50. */
  count?: number;
  /** ms before particles auto-clear. Default 4000. */
  duration?: number;
}

const COLORS = [
  "var(--forest)",
  "var(--forest-mid)",
  "var(--gold)",
  "var(--gold-light)",
  "var(--sage)",
  "#FFFFFF",
  "var(--coral)",
];

const SHAPES = ["square", "circle", "rect"] as const;
type Shape = (typeof SHAPES)[number];

interface Particle {
  id: number;
  left: number;
  size: number;
  shape: Shape;
  color: string;
  delay: number;
  duration: number;
}

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 4 + Math.random() * 6,
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 2000,
    duration: 2000 + Math.random() * 2000,
  }));
}

export function Confetti({ trigger, count = 50, duration = 4000 }: Props) {
  const [active, setActive] = useState(false);
  const particles = useMemo(() => makeParticles(count), [count, active]);

  useEffect(() => {
    if (!trigger) return;
    setActive(true);
    const t = setTimeout(() => setActive(false), duration);
    return () => clearTimeout(t);
  }, [trigger, duration]);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {particles.map((p) => {
        const radius =
          p.shape === "circle" ? "9999px" : p.shape === "square" ? "2px" : "1px";
        const width = p.shape === "rect" ? p.size * 1.6 : p.size;
        const height = p.shape === "rect" ? p.size * 0.6 : p.size;
        return (
          <span
            key={p.id}
            style={{
              position: "absolute",
              top: "-10vh",
              left: `${p.left}%`,
              width,
              height,
              background: p.color,
              borderRadius: radius,
              animation: `confetti-fall ${p.duration}ms cubic-bezier(0.4,0,0.2,1) ${p.delay}ms forwards`,
              willChange: "transform, opacity",
            }}
          />
        );
      })}
    </div>
  );
}
