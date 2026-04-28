import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface Micro {
  name: string;
  amount: number;
  unit: string;
  rdi: number;
  emoji: string;
  category: "vitamins" | "minerals" | "essential";
}

interface Props {
  calories: number;
  protein: number;
  fat: number;
  fibre: number;
  /** Daily calorie target for scaling estimates */
  calorieTarget?: number;
}

/**
 * Estimates micronutrient intake from macro data.
 * Uses food composition ratios derived from USDA dietary guidelines.
 * Note: These are estimates only — full micro tracking requires USDA FDC data per food item.
 */
function estimateMicros(props: Props): Micro[] {
  const { calories, protein, fat, fibre, calorieTarget = 2000 } = props;
  const pct = calories / calorieTarget; // how much of target was eaten

  // Rough estimates based on average dietary patterns at given macro ratios
  return [
    // Essential
    { name: "Fibre", amount: Math.round(fibre * 10) / 10, unit: "g", rdi: 30, emoji: "🌾", category: "essential" },
    { name: "Omega-3", amount: Math.round(fat * 0.05 * 10) / 10, unit: "g", rdi: 1.6, emoji: "🐟", category: "essential" },
    { name: "Water", amount: 0, unit: "ml", rdi: 2500, emoji: "💧", category: "essential" },

    // Vitamins
    { name: "Vitamin A", amount: Math.round(pct * 800), unit: "μg", rdi: 900, emoji: "🥕", category: "vitamins" },
    { name: "Vitamin C", amount: Math.round(pct * 70), unit: "mg", rdi: 90, emoji: "🍊", category: "vitamins" },
    { name: "Vitamin D", amount: Math.round(pct * 12), unit: "μg", rdi: 15, emoji: "☀️", category: "vitamins" },
    { name: "Vitamin E", amount: Math.round(pct * 10), unit: "mg", rdi: 15, emoji: "🥑", category: "vitamins" },
    { name: "Vitamin B12", amount: Math.round(pct * 1.8 * 10) / 10, unit: "μg", rdi: 2.4, emoji: "🥩", category: "vitamins" },
    { name: "Folate", amount: Math.round(pct * 300), unit: "μg", rdi: 400, emoji: "🥦", category: "vitamins" },

    // Minerals
    { name: "Iron", amount: Math.round(pct * 12 * 10) / 10, unit: "mg", rdi: 18, emoji: "🫀", category: "minerals" },
    { name: "Calcium", amount: Math.round(pct * 900), unit: "mg", rdi: 1000, emoji: "🥛", category: "minerals" },
    { name: "Magnesium", amount: Math.round(protein * 1.2), unit: "mg", rdi: 420, emoji: "🌰", category: "minerals" },
    { name: "Zinc", amount: Math.round(pct * 8 * 10) / 10, unit: "mg", rdi: 11, emoji: "🦪", category: "minerals" },
    { name: "Potassium", amount: Math.round(pct * 3400), unit: "mg", rdi: 4700, emoji: "🍌", category: "minerals" },
    { name: "Sodium", amount: Math.round(pct * 1800), unit: "mg", rdi: 2300, emoji: "🧂", category: "minerals" },
  ];
}

function MicroBar({ micro }: { micro: Micro }) {
  const pct = Math.min(100, Math.round((micro.amount / micro.rdi) * 100));
  const color = pct >= 100 ? "var(--success)" : pct >= 60 ? "var(--gold)" : "var(--coral)";

  return (
    <div className="flex items-center gap-3">
      <span className="text-[16px] w-6 shrink-0">{micro.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] font-medium text-[color:var(--ink)]">{micro.name}</span>
          <span className="text-[11px] text-[color:var(--ink-light)]">
            {micro.amount}{micro.unit} / {micro.rdi}{micro.unit}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[color:var(--cream-dark)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      </div>
      <span className="text-[11px] font-semibold w-8 text-right shrink-0" style={{ color }}>{pct}%</span>
    </div>
  );
}

export function MicronutrientPanel(props: Props) {
  const [expanded, setExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<"essential" | "vitamins" | "minerals">("essential");
  const micros = estimateMicros(props);

  const filtered = micros.filter((m) => m.category === activeCategory && m.amount > 0);
  const deficientCount = micros.filter((m) => m.amount / m.rdi < 0.6 && m.amount > 0).length;

  return (
    <div className="bg-white rounded-[20px] border border-[color:var(--cream-border)] shadow-elev-sm overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-5"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[color:var(--sage-light)] grid place-items-center text-[18px]">🔬</div>
          <div className="text-left">
            <h4 className="font-body font-semibold text-[14px] text-[color:var(--ink)]">Micronutrients</h4>
            <p className="text-[12px] text-[color:var(--ink-light)] mt-0.5">
              {deficientCount > 0 ? (
                <span className="text-[color:var(--coral)]">{deficientCount} nutrients below 60%</span>
              ) : (
                <span className="text-[color:var(--success)]">All nutrients on track</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[color:var(--cream-dark)] text-[color:var(--ink-mid)] font-medium">Est.</span>
          <ChevronDown className={cn("h-4 w-4 text-[color:var(--ink-light)] transition-transform", expanded && "rotate-180")} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[color:var(--cream-border)] px-5 pb-5">
          <p className="text-[11px] text-[color:var(--ink-light)] italic mt-3 mb-4">
            Estimates based on today's macros. For exact tracking, log individual foods via USDA search.
          </p>

          {/* Category tabs */}
          <div className="flex gap-1 p-1 rounded-full bg-[color:var(--cream-dark)] mb-4">
            {(["essential", "vitamins", "minerals"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "flex-1 h-8 rounded-full text-[11px] font-semibold capitalize transition-all",
                  activeCategory === cat ? "bg-white text-[color:var(--forest)] shadow-elev-sm" : "text-[color:var(--ink-mid)]",
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.map((m) => <MicroBar key={m.name} micro={m} />)}
          </div>
        </div>
      )}
    </div>
  );
}
