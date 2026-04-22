import { createFileRoute } from "@tanstack/react-router";
import { SurfaceCard } from "@/components/ui/luxury/SurfaceCard";
import { Pill } from "@/components/ui/luxury/Pill";
import { Clock, Flame } from "lucide-react";

export const Route = createFileRoute("/_authed/app/recipes")({
  head: () => ({ meta: [{ title: "Recipes — NutriAI" }] }),
  component: RecipesPage,
});

const recipes = [
  { name: "Salmon, lentils & greens", emoji: "🐟", time: "25 min", kcal: 540, tag: "High protein" },
  { name: "Mediterranean grain bowl", emoji: "🥗", time: "15 min", kcal: 480, tag: "Plant forward" },
  { name: "Spiced chickpea stew", emoji: "🍲", time: "30 min", kcal: 420, tag: "Vegan" },
  { name: "Greek yoghurt parfait", emoji: "🥣", time: "5 min", kcal: 320, tag: "Breakfast" },
];

function RecipesPage() {
  return (
    <div className="px-6 pt-8 pb-6 stagger">
      <Pill tone="sage">Chef-curated</Pill>
      <h1 className="font-display text-[28px] font-bold mt-2">Recipes</h1>
      <p className="text-[14px] text-[color:var(--ink-mid)] mt-1">
        Simple, beautiful, nutritionally complete.
      </p>
      <div className="mt-6 space-y-4">
        {recipes.map((r) => (
          <SurfaceCard key={r.name} className="flex gap-4">
            <div className="text-4xl">{r.emoji}</div>
            <div className="flex-1">
              <h3 className="font-display text-[18px]">{r.name}</h3>
              <div className="mt-2 flex items-center gap-3 text-[12px] text-[color:var(--ink-mid)]">
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {r.time}</span>
                <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3" /> {r.kcal} kcal</span>
              </div>
              <Pill tone="neutral" className="mt-2">{r.tag}</Pill>
            </div>
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
}
