import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Filter, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PrimaryButton } from "@/components/ui/luxury/PrimaryButton";
import { useProfile } from "@/hooks/useProfile";
import { useFoodLog } from "@/hooks/useFoodLog";

export const Route = createFileRoute("/_authed/app/recipes")({
  head: () => ({ meta: [{ title: "Recipes — NutriAI" }] }),
  component: RecipesPage,
});

interface Recipe {
  id: string;
  name: string;
  emoji: string;
  gradient: string;
  meal: "Breakfast" | "Lunch" | "Dinner" | "Snacks";
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  time: number; // minutes
  difficulty: "Easy" | "Medium" | "Hard";
  nutriScore: number; // 1-10
  tags: string[];
  ingredients: string[];
  steps: string[];
  goodFor: string;
}

const recipes: Recipe[] = [
  {
    id: "salmon-lentils",
    name: "Salmon, lentils & greens",
    emoji: "🐟",
    gradient: "linear-gradient(135deg, #3A6F8F 0%, #1C3A2A 100%)",
    meal: "Dinner",
    kcal: 540, protein: 42, carbs: 38, fat: 22, fibre: 11,
    time: 25, difficulty: "Easy", nutriScore: 9,
    tags: ["High protein", "Omega-3", "Mediterranean"],
    ingredients: [
      "150g salmon fillet",
      "100g cooked green lentils",
      "Handful baby spinach",
      "1 tbsp olive oil",
      "Lemon, salt, pepper",
    ],
    steps: [
      "Pan-sear salmon skin-down 4 min, flip 2 min.",
      "Warm lentils with olive oil and a squeeze of lemon.",
      "Wilt spinach in pan residue. Plate and season.",
    ],
    goodFor: "Recovery & lean muscle",
  },
  {
    id: "med-bowl",
    name: "Mediterranean grain bowl",
    emoji: "🥗",
    gradient: "linear-gradient(135deg, #8FAF95 0%, #C5D9CA 100%)",
    meal: "Lunch",
    kcal: 480, protein: 18, carbs: 62, fat: 18, fibre: 12,
    time: 15, difficulty: "Easy", nutriScore: 9,
    tags: ["Plant-forward", "Quick", "Mediterranean"],
    ingredients: [
      "100g cooked quinoa",
      "Cherry tomatoes, cucumber",
      "30g feta",
      "Kalamata olives",
      "Olive oil + oregano",
    ],
    steps: ["Combine grains and chopped veg.", "Crumble feta, scatter olives.", "Drizzle EVOO and oregano."],
    goodFor: "Sustained energy",
  },
  {
    id: "chickpea-stew",
    name: "Spiced chickpea stew",
    emoji: "🍲",
    gradient: "linear-gradient(135deg, #C4973A 0%, #E8624A 100%)",
    meal: "Dinner",
    kcal: 420, protein: 18, carbs: 58, fat: 12, fibre: 14,
    time: 30, difficulty: "Easy", nutriScore: 9,
    tags: ["Vegan", "High fibre", "Budget"],
    ingredients: [
      "400g chickpeas",
      "Tin tomatoes",
      "Onion, garlic, ginger",
      "Cumin, paprika, coriander",
      "Spinach to finish",
    ],
    steps: [
      "Sweat onion, garlic, ginger; bloom spices.",
      "Add tomatoes and chickpeas, simmer 20 min.",
      "Stir in spinach. Serve with lemon.",
    ],
    goodFor: "Gut health",
  },
  {
    id: "yoghurt-parfait",
    name: "Greek yoghurt parfait",
    emoji: "🥣",
    gradient: "linear-gradient(135deg, #F5E6C8 0%, #C4973A 100%)",
    meal: "Breakfast",
    kcal: 320, protein: 22, carbs: 36, fat: 8, fibre: 5,
    time: 5, difficulty: "Easy", nutriScore: 8,
    tags: ["Quick", "High protein", "Breakfast"],
    ingredients: ["200g Greek yoghurt 0%", "30g granola", "Mixed berries", "1 tsp honey"],
    steps: ["Layer yoghurt, granola, berries.", "Drizzle honey. Enjoy."],
    goodFor: "Morning energy",
  },
  {
    id: "egg-avocado",
    name: "Avocado & egg toast",
    emoji: "🥑",
    gradient: "linear-gradient(135deg, #8FAF95 0%, #1C3A2A 100%)",
    meal: "Breakfast",
    kcal: 480, protein: 22, carbs: 32, fat: 28, fibre: 9,
    time: 10, difficulty: "Easy", nutriScore: 8,
    tags: ["High protein", "Quick", "Breakfast"],
    ingredients: ["2 slices sourdough", "½ avocado", "2 eggs", "Chilli flakes, lemon"],
    steps: ["Toast bread.", "Smash avocado on top.", "Fry eggs and slide on. Season."],
    goodFor: "Brain & focus",
  },
  {
    id: "ribeye-greens",
    name: "Ribeye & buttered greens",
    emoji: "🥩",
    gradient: "linear-gradient(135deg, #2A2520 0%, #0F0D0B 100%)",
    meal: "Dinner",
    kcal: 720, protein: 52, carbs: 8, fat: 56, fibre: 4,
    time: 20, difficulty: "Medium", nutriScore: 7,
    tags: ["Keto", "High protein", "Low carb"],
    ingredients: ["200g ribeye", "Tenderstem broccoli", "Knob butter", "Salt, pepper"],
    steps: [
      "Season steak; sear 3 min/side; rest 5 min.",
      "Blanch greens; toss in butter.",
      "Slice steak and plate.",
    ],
    goodFor: "Strength & satiety",
  },
  {
    id: "berries-cottage",
    name: "Berries & cottage cheese",
    emoji: "🍓",
    gradient: "linear-gradient(135deg, #FDE8E4 0%, #E8624A 100%)",
    meal: "Snacks",
    kcal: 220, protein: 18, carbs: 18, fat: 6, fibre: 4,
    time: 2, difficulty: "Easy", nutriScore: 9,
    tags: ["Quick", "High protein", "Low calorie"],
    ingredients: ["150g cottage cheese", "Mixed berries", "Pumpkin seeds"],
    steps: ["Spoon cottage cheese.", "Top with berries and seeds."],
    goodFor: "Snacking smart",
  },
  {
    id: "tempeh-wrap",
    name: "Tempeh wrap & kraut",
    emoji: "🌯",
    gradient: "linear-gradient(135deg, #1C3A2A 0%, #5BBF5F 100%)",
    meal: "Lunch",
    kcal: 510, protein: 28, carbs: 52, fat: 18, fibre: 11,
    time: 15, difficulty: "Easy", nutriScore: 9,
    tags: ["Plant-based", "High protein", "Gut-healthy"],
    ingredients: ["100g tempeh", "Whole-wheat wrap", "Sauerkraut", "Hummus, lettuce, tomato"],
    steps: ["Pan-fry sliced tempeh.", "Spread hummus on wrap.", "Layer veg, kraut, tempeh. Roll."],
    goodFor: "Plant-based power",
  },
];

const filterChips = [
  "All",
  "Quick",
  "High Protein",
  "Low Carb",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snacks",
] as const;

interface FilterState {
  kcalMax: number;
  timeBucket: "any" | "<15" | "15-30" | "30-60" | "60+";
  proteinMin: number;
  diet: string[];
}

const defaultFilters: FilterState = {
  kcalMax: 1200,
  timeBucket: "any",
  proteinMin: 10,
  diet: [],
};

const dietOptions = ["Vegan", "Vegetarian", "Gluten-free", "Dairy-free", "Keto", "Mediterranean"];

function RecipesPage() {
  const { profile } = useProfile();
  const { addLog } = useFoodLog();
  const [search, setSearch] = useState("");
  const [activeChip, setActiveChip] = useState<(typeof filterChips)[number]>("All");
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [openRecipe, setOpenRecipe] = useState<Recipe | null>(null);

  const userDiet = profile?.diet_preferences?.[0];

  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;

      // chip
      if (activeChip === "Quick" && r.time >= 15) return false;
      if (activeChip === "High Protein" && r.protein < 25) return false;
      if (activeChip === "Low Carb" && r.carbs > 30) return false;
      if (["Breakfast", "Lunch", "Dinner", "Snacks"].includes(activeChip) && r.meal !== activeChip) return false;

      // sheet filters
      if (r.kcal > filters.kcalMax) return false;
      if (r.protein < filters.proteinMin) return false;
      if (filters.timeBucket === "<15" && r.time >= 15) return false;
      if (filters.timeBucket === "15-30" && (r.time < 15 || r.time > 30)) return false;
      if (filters.timeBucket === "30-60" && (r.time < 30 || r.time > 60)) return false;
      if (filters.timeBucket === "60+" && r.time < 60) return false;
      if (filters.diet.length > 0 && !filters.diet.some((d) => r.tags.some((t) => t.toLowerCase().includes(d.toLowerCase())))) {
        return false;
      }

      return true;
    });
  }, [search, activeChip, filters]);

  const grouped = useMemo(() => {
    const groups: Record<Recipe["meal"], Recipe[]> = { Breakfast: [], Lunch: [], Dinner: [], Snacks: [] };
    filtered.forEach((r) => groups[r.meal].push(r));
    return groups;
  }, [filtered]);

  const featured = [
    { title: "Performance Recipes", emoji: "💪", kcal: 540, gradient: "linear-gradient(135deg, #1C3A2A 0%, #2D5A40 100%)" },
    { title: "Quick & Healthy", emoji: "⚡", kcal: 380, gradient: "linear-gradient(135deg, #C4973A 0%, #E8B94A 100%)" },
    { title: "Weekend Meal Prep", emoji: "🍱", kcal: 460, gradient: "linear-gradient(135deg, #2D5A40 0%, #8FAF95 100%)" },
  ];

  const chipsWithDiet = useMemo(() => {
    if (!userDiet) return filterChips;
    return [...filterChips.slice(0, 4), `Your Diet (${userDiet})` as any, ...filterChips.slice(4)];
  }, [userDiet]);

  return (
    <div className="pt-6 pb-6 stagger">
      <div className="px-6">
        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--ink-light)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search 5,000+ recipes..."
              className="w-full h-12 pl-11 pr-4 rounded-full bg-[color:var(--cream-dark)] border border-[color:var(--cream-border)] text-[14px] focus:outline-none focus:border-[color:var(--forest)]"
            />
          </div>
          <button
            onClick={() => setFilterOpen(true)}
            className="h-12 w-12 grid place-items-center rounded-full bg-white border border-[color:var(--cream-border)]"
            aria-label="Open filters"
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="mt-4 -mx-0 px-6 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max">
          {chipsWithDiet.map((c) => {
            const isActive = activeChip === c || (typeof c === "string" && c.startsWith("Your Diet") && activeChip === "All");
            return (
              <button
                key={c}
                onClick={() => setActiveChip(filterChips.includes(c as any) ? (c as any) : "All")}
                className={cn(
                  "h-9 px-4 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ease-luxury",
                  isActive
                    ? "bg-[color:var(--forest)] text-white"
                    : "bg-white border border-[color:var(--cream-border)] text-[color:var(--ink-mid)]",
                )}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured banner carousel */}
      <div className="mt-5 overflow-x-auto no-scrollbar">
        <div className="flex gap-3 px-6 min-w-max">
          {featured.map((f) => (
            <div
              key={f.title}
              className="relative w-[80vw] max-w-[340px] h-[200px] rounded-[24px] p-5 text-white flex flex-col justify-between shadow-elev-md"
              style={{ background: f.gradient }}
            >
              <div className="text-[11px] uppercase tracking-widest text-[color:var(--gold-light)] font-semibold">
                Featured
              </div>
              <div className="absolute top-4 right-5 text-6xl opacity-80">{f.emoji}</div>
              <div>
                <div className="font-display text-[22px] font-bold leading-tight">{f.title}</div>
                <div className="text-[13px] text-white/70 mt-1">~{f.kcal} kcal · curated</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sections by meal */}
      <div className="mt-6 space-y-7">
        {(["Breakfast", "Lunch", "Dinner", "Snacks"] as const).map((meal) => {
          const items = grouped[meal];
          if (items.length === 0) return null;
          return (
            <div key={meal}>
              <div className="px-6 flex items-center justify-between">
                <h3 className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold">
                  {meal}
                </h3>
                <button className="text-[13px] font-semibold text-[color:var(--forest)]">See all →</button>
              </div>
              <div className="mt-3 overflow-x-auto no-scrollbar">
                <div className="flex gap-3 px-6 min-w-max">
                  {items.map((r) => (
                    <RecipeCard key={r.id} recipe={r} onOpen={() => setOpenRecipe(r)} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="px-6 text-center text-[14px] text-[color:var(--ink-mid)] py-10">
            No recipes match these filters.
          </div>
        )}
      </div>

      {filterOpen && (
        <FilterSheet
          filters={filters}
          onClose={() => setFilterOpen(false)}
          onApply={(f) => {
            setFilters(f);
            setFilterOpen(false);
          }}
          onClear={() => setFilters(defaultFilters)}
        />
      )}

      {openRecipe && (
        <RecipeDetail
          recipe={openRecipe}
          goal={profile?.goal ?? "wellness"}
          onClose={() => setOpenRecipe(null)}
          onLog={async () => {
            await addLog({
              food_name: openRecipe.name,
              meal_type: openRecipe.meal.toLowerCase() === "snacks" ? "snack" : openRecipe.meal.toLowerCase(),
              calories: openRecipe.kcal,
              protein: openRecipe.protein,
              carbs: openRecipe.carbs,
              fat: openRecipe.fat,
              fibre: openRecipe.fibre,
              emoji: openRecipe.emoji,
              food_score: openRecipe.nutriScore,
            });
            setOpenRecipe(null);
          }}
        />
      )}
    </div>
  );
}

function RecipeCard({ recipe, onOpen }: { recipe: Recipe; onOpen: () => void }) {
  const scoreColor =
    recipe.nutriScore >= 8 ? "bg-[color:var(--success)]" :
    recipe.nutriScore >= 6 ? "bg-[color:var(--gold)]" :
    "bg-[color:var(--coral)]";
  return (
    <button
      onClick={onOpen}
      className="w-[160px] flex-shrink-0 rounded-[20px] bg-white border border-[color:var(--cream-border)] overflow-hidden shadow-elev-sm text-left active:scale-[0.98] transition-transform"
    >
      <div className="relative h-[120px] grid place-items-center" style={{ background: recipe.gradient }}>
        <div className="text-5xl">{recipe.emoji}</div>
        <div className={cn("absolute top-2 right-2 h-7 w-7 rounded-full grid place-items-center text-white text-[12px] font-bold border-2 border-white", scoreColor)}>
          {recipe.nutriScore}
        </div>
      </div>
      <div className="p-3 h-[80px]">
        <div className="text-[13px] font-semibold leading-tight line-clamp-2">{recipe.name}</div>
        <div className="mt-1 text-[11px] text-[color:var(--ink-mid)]">
          🔥 {recipe.kcal} kcal · ⏱ {recipe.time} min
        </div>
      </div>
    </button>
  );
}

function FilterSheet({
  filters,
  onClose,
  onApply,
  onClear,
}: {
  filters: FilterState;
  onClose: () => void;
  onApply: (f: FilterState) => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState<FilterState>(filters);

  const toggleDiet = (d: string) => {
    setDraft((prev) => ({
      ...prev,
      diet: prev.diet.includes(d) ? prev.diet.filter((x) => x !== d) : [...prev.diet, d],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-[430px] bg-[color:var(--cream)] rounded-t-[28px] p-6 animate-fade-up"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-[20px] font-semibold">Filters</h3>
          <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-full bg-white border border-[color:var(--cream-border)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-6">
          <div>
            <div className="flex items-baseline justify-between">
              <label className="text-[12px] uppercase tracking-widest text-[color:var(--sage)] font-semibold">Calories (max)</label>
              <span className="text-[14px] font-semibold">{draft.kcalMax} kcal</span>
            </div>
            <input
              type="range" min={100} max={1200} step={50}
              value={draft.kcalMax}
              onChange={(e) => setDraft({ ...draft, kcalMax: Number(e.target.value) })}
              className="luxury-range mt-3"
            />
          </div>

          <div>
            <label className="text-[12px] uppercase tracking-widest text-[color:var(--sage)] font-semibold">Time</label>
            <div className="mt-3 flex gap-2 flex-wrap">
              {(["any", "<15", "15-30", "30-60", "60+"] as const).map((t) => {
                const active = draft.timeBucket === t;
                return (
                  <button
                    key={t}
                    onClick={() => setDraft({ ...draft, timeBucket: t })}
                    className={cn(
                      "h-9 px-4 rounded-full text-[13px] font-medium",
                      active ? "bg-[color:var(--forest)] text-white" : "bg-white border border-[color:var(--cream-border)] text-[color:var(--ink-mid)]",
                    )}
                  >
                    {t === "any" ? "Any" : `${t} min`}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label className="text-[12px] uppercase tracking-widest text-[color:var(--sage)] font-semibold">Protein (min)</label>
              <span className="text-[14px] font-semibold">{draft.proteinMin}g</span>
            </div>
            <input
              type="range" min={10} max={80} step={5}
              value={draft.proteinMin}
              onChange={(e) => setDraft({ ...draft, proteinMin: Number(e.target.value) })}
              className="luxury-range mt-3"
            />
          </div>

          <div>
            <label className="text-[12px] uppercase tracking-widest text-[color:var(--sage)] font-semibold">Dietary</label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {dietOptions.map((d) => {
                const active = draft.diet.includes(d);
                return (
                  <button
                    key={d}
                    onClick={() => toggleDiet(d)}
                    className={cn(
                      "h-11 px-3 rounded-2xl text-[13px] font-medium border flex items-center gap-2",
                      active
                        ? "bg-[color:var(--forest)]/8 border-[color:var(--forest)] text-[color:var(--forest)]"
                        : "bg-white border-[color:var(--cream-border)] text-[color:var(--ink-mid)]",
                    )}
                  >
                    <span className={cn("h-4 w-4 rounded-full grid place-items-center border", active ? "bg-[color:var(--forest)] border-[color:var(--forest)]" : "border-[color:var(--cream-border)]")}>
                      {active && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </span>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              setDraft(defaultFilters);
              onClear();
            }}
            className="flex-1 h-12 rounded-full text-[14px] font-semibold text-[color:var(--ink-mid)]"
          >
            Clear all
          </button>
          <PrimaryButton onClick={() => onApply(draft)} className="flex-1">
            Apply Filters
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function RecipeDetail({
  recipe,
  goal,
  onClose,
  onLog,
}: {
  recipe: Recipe;
  goal: string;
  onClose: () => void;
  onLog: () => void;
}) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i); else n.add(i);
      return n;
    });
  };

  const scoreColor =
    recipe.nutriScore >= 8 ? "bg-[color:var(--success)]" :
    recipe.nutriScore >= 6 ? "bg-[color:var(--gold)]" :
    "bg-[color:var(--coral)]";
  const scoreVerdict = recipe.nutriScore >= 8 ? "Excellent" : recipe.nutriScore >= 6 ? "Good" : "Treat occasionally";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-[430px] h-[95vh] bg-[color:var(--cream)] rounded-t-[28px] overflow-hidden flex flex-col animate-fade-up"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="sticky top-0 z-10 bg-[color:var(--cream)]/95 backdrop-blur-md border-b border-[color:var(--cream-border)] flex items-center justify-between px-5 py-4">
          <h3 className="font-display text-[18px] font-semibold truncate">{recipe.name}</h3>
          <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-full bg-white border border-[color:var(--cream-border)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="h-[250px] grid place-items-center" style={{ background: recipe.gradient }}>
            <div className="text-8xl">{recipe.emoji}</div>
          </div>

          <div className="p-6">
            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat2 label="kcal" value={String(recipe.kcal)} />
              <Stat2 label="protein" value={`${recipe.protein}g`} />
              <Stat2 label="carbs" value={`${recipe.carbs}g`} />
              <Stat2 label="fat" value={`${recipe.fat}g`} />
              <Stat2 label="time" value={`${recipe.time}m`} />
              <Stat2 label="level" value={recipe.difficulty} />
            </div>

            {/* NutriScore */}
            <div className="mt-5 bg-white border border-[color:var(--cream-border)] rounded-2xl p-4 flex items-center gap-4">
              <div className={cn("h-14 w-14 rounded-full grid place-items-center text-white font-display text-[24px] font-bold", scoreColor)}>
                {recipe.nutriScore}
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold">NutriScore</div>
                <div className="text-[15px] font-semibold">{scoreVerdict}</div>
                <div className="text-[12px] text-[color:var(--ink-mid)]">
                  Good for: <span className="text-[color:var(--forest)] font-semibold">{recipe.goodFor || goal}</span>
                </div>
              </div>
            </div>

            {/* Ingredients */}
            <h4 className="mt-6 text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold">
              Ingredients
            </h4>
            <ul className="mt-3 space-y-2">
              {recipe.ingredients.map((ing, i) => {
                const isOn = checked.has(i);
                return (
                  <li key={ing}>
                    <button
                      onClick={() => toggle(i)}
                      className="w-full flex items-center gap-3 bg-white border border-[color:var(--cream-border)] rounded-2xl p-3 text-left active:scale-[0.99] transition-transform"
                    >
                      <span className={cn("h-6 w-6 rounded-full grid place-items-center border-2", isOn ? "bg-[color:var(--forest)] border-[color:var(--forest)]" : "border-[color:var(--cream-border)]")}>
                        {isOn && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                      </span>
                      <span className={cn("text-[14px]", isOn && "line-through text-[color:var(--ink-light)]")}>{ing}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Steps */}
            <h4 className="mt-6 text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold">
              Instructions
            </h4>
            <ol className="mt-3 space-y-3">
              {recipe.steps.map((s, i) => (
                <li key={s} className="flex gap-3 bg-white border border-[color:var(--cream-border)] rounded-2xl p-4">
                  <div className="h-8 w-8 rounded-full grid place-items-center bg-[color:var(--forest)] text-white text-[14px] font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="text-[14px] leading-relaxed">{s}</div>
                </li>
              ))}
            </ol>

            <div className="h-6" />
          </div>
        </div>

        <div className="border-t border-[color:var(--cream-border)] bg-white p-4">
          <PrimaryButton onClick={onLog}>Log This Meal →</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function Stat2({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-[color:var(--cream-border)] rounded-2xl p-3">
      <div className="text-[10px] uppercase tracking-widest text-[color:var(--ink-light)]">{label}</div>
      <div className="font-display text-[18px] font-bold mt-0.5">{value}</div>
    </div>
  );
}
