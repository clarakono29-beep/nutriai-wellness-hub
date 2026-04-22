import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Pill } from "@/components/ui/luxury/Pill";
import { PrimaryButton } from "@/components/ui/luxury/PrimaryButton";
import { useProfile } from "@/hooks/useProfile";
import { ChevronDown, ChevronUp, Sparkles, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/app/programs")({
  head: () => ({ meta: [{ title: "Programs — NutriAI" }] }),
  component: ProgramsPage,
});

type Difficulty = "Easy" | "Medium" | "Hard";

interface ProgramMeal {
  emoji: string;
  name: string;
  kcal: number;
}
interface ProgramWeek {
  title: string;
  focus: string;
  bullets: string[];
}
interface Program {
  id: string;
  category: "Weight Loss" | "Muscle" | "Balance" | "Fasting" | "Plant-Based";
  name: string;
  emoji: string;
  weeks: number;
  mealsPerWeek: number;
  gradient: string;
  tags: { label: string; tone: "forest" | "gold" | "coral" | "sage" | "neutral" }[];
  description: string;
  longDescription: string;
  completed: number;
  difficulty: Difficulty;
  sampleMeals: ProgramMeal[];
  weekPlan: ProgramWeek[];
}

const programs: Program[] = [
  {
    id: "fasting-16-8",
    category: "Fasting",
    name: "16:8 Fasting",
    emoji: "⏰",
    weeks: 4,
    mealsPerWeek: 14,
    gradient: "linear-gradient(135deg, #1C3A2A 0%, #0F4D52 100%)",
    tags: [
      { label: "Time-restricted", tone: "forest" },
      { label: "Beginner-friendly", tone: "sage" },
    ],
    description:
      "Eat within an 8-hour window. Reset insulin sensitivity, sharpen focus, simplify your day.",
    longDescription:
      "A gentle entry into intermittent fasting with a structured 8-hour eating window (e.g., 12pm–8pm). We coach you through hunger waves, hydration, and meal density so you stay satiated and energetic.",
    completed: 12840,
    difficulty: "Easy",
    sampleMeals: [
      { emoji: "🥑", name: "Avocado & egg toast", kcal: 480 },
      { emoji: "🍗", name: "Herb chicken bowl", kcal: 620 },
      { emoji: "🐟", name: "Salmon, lentils & greens", kcal: 540 },
    ],
    weekPlan: [
      { title: "Week 1", focus: "Adaptation", bullets: ["12pm–8pm window", "Hydration protocol", "No snacking outside window"] },
      { title: "Week 2", focus: "Stabilise", bullets: ["Protein at every meal", "Electrolytes morning", "Track energy levels"] },
      { title: "Week 3", focus: "Optimise", bullets: ["Push to 17:7 if comfortable", "Strategic carbs post-workout", "Sleep before 11pm"] },
      { title: "Week 4", focus: "Lock-in", bullets: ["Habit consolidation", "Weekend protocol", "Plan continuation"] },
    ],
  },
  {
    id: "lean-strong",
    category: "Muscle",
    name: "Lean & Strong",
    emoji: "💪",
    weeks: 8,
    mealsPerWeek: 28,
    gradient: "linear-gradient(135deg, #2A2520 0%, #0F0D0B 100%)",
    tags: [
      { label: "High protein", tone: "forest" },
      { label: "Strength", tone: "gold" },
    ],
    description:
      "Build lean muscle while staying defined. 1.8g/kg protein, controlled carbs, smart timing.",
    longDescription:
      "Designed with sports nutritionists. Hits 1.8g/kg protein daily, periodises carbs around your training, and keeps fat in the optimal hormonal range.",
    completed: 8421,
    difficulty: "Medium",
    sampleMeals: [
      { emoji: "🥩", name: "Sirloin & sweet potato", kcal: 720 },
      { emoji: "🍳", name: "Whey & oats power bowl", kcal: 560 },
      { emoji: "🐟", name: "Tuna sashimi rice plate", kcal: 640 },
    ],
    weekPlan: [
      { title: "Weeks 1–2", focus: "Foundation", bullets: ["Calculate true TDEE", "Protein per meal anchor", "Pre/post training carbs"] },
      { title: "Weeks 3–4", focus: "Volume up", bullets: ["+200 kcal surplus", "Add creatine 5g/day", "Track lifts weekly"] },
      { title: "Weeks 5–6", focus: "Push", bullets: ["Carb cycling", "Recovery meals", "Weekly weigh-in"] },
      { title: "Weeks 7–8", focus: "Refine", bullets: ["Hold surplus", "Sleep 8h+", "Photo progress check"] },
    ],
  },
  {
    id: "keto-torch",
    category: "Weight Loss",
    name: "Keto Torch",
    emoji: "🔥",
    weeks: 6,
    mealsPerWeek: 21,
    gradient: "linear-gradient(135deg, #B8651F 0%, #5A2410 100%)",
    tags: [
      { label: "Low carb", tone: "coral" },
      { label: "Fat-adapted", tone: "gold" },
    ],
    description:
      "Aggressive ketogenic protocol. Burn stubborn fat, stabilise energy, eliminate cravings.",
    longDescription:
      "A medically-informed keto plan: under 30g carbs, 70% fat, 25% protein. We walk you through the keto flu, electrolytes, and ketone testing.",
    completed: 5320,
    difficulty: "Hard",
    sampleMeals: [
      { emoji: "🥓", name: "Bacon, eggs, avocado", kcal: 620 },
      { emoji: "🥩", name: "Ribeye & buttered greens", kcal: 780 },
      { emoji: "🧀", name: "Caprese with olive oil", kcal: 540 },
    ],
    weekPlan: [
      { title: "Week 1", focus: "Induction", bullets: ["<20g net carbs", "Electrolyte loading", "Track ketones"] },
      { title: "Weeks 2–3", focus: "Fat adaptation", bullets: ["MCT oil intro", "Strategic exercise", "Hunger drops"] },
      { title: "Weeks 4–5", focus: "Burn", bullets: ["Optimise sleep", "Add light cardio", "Visible composition shift"] },
      { title: "Week 6", focus: "Transition", bullets: ["Plan exit or continuation", "Strategic carb refeeds", "Maintain habits"] },
    ],
  },
  {
    id: "mediterranean",
    category: "Balance",
    name: "Mediterranean",
    emoji: "🫒",
    weeks: 4,
    mealsPerWeek: 21,
    gradient: "linear-gradient(135deg, #3A6F8F 0%, #8FAF95 100%)",
    tags: [
      { label: "Longevity", tone: "sage" },
      { label: "Anti-inflammatory", tone: "forest" },
    ],
    description:
      "The longest-studied diet on earth. Olive oil, fish, legumes, vegetables. Balanced and sustainable.",
    longDescription:
      "Modelled on the diets of Crete and Sardinia — blue zones with the highest healthy lifespan in the world. Heart, brain, and metabolic health, all at once.",
    completed: 14210,
    difficulty: "Easy",
    sampleMeals: [
      { emoji: "🐟", name: "Grilled sardines & lemon", kcal: 460 },
      { emoji: "🥗", name: "Greek farmer's salad", kcal: 380 },
      { emoji: "🍝", name: "Whole-grain pasta puttanesca", kcal: 540 },
    ],
    weekPlan: [
      { title: "Week 1", focus: "Olive oil first", bullets: ["EVOO with everything", "Fish 3x/week", "Reduce red meat"] },
      { title: "Week 2", focus: "Legumes", bullets: ["Daily legume serving", "Whole grains only", "Fresh herbs"] },
      { title: "Week 3", focus: "Plates", bullets: ["½ plate vegetables", "Glass of red optional", "Walk after meals"] },
      { title: "Week 4", focus: "Lifestyle", bullets: ["Eat with others", "Slower meals", "Seasonal produce"] },
    ],
  },
  {
    id: "sugar-detox",
    category: "Weight Loss",
    name: "Sugar Detox",
    emoji: "🍓",
    weeks: 3,
    mealsPerWeek: 21,
    gradient: "linear-gradient(135deg, #F4A88E 0%, #E8624A 100%)",
    tags: [
      { label: "No added sugar", tone: "coral" },
      { label: "Whole foods", tone: "sage" },
    ],
    description:
      "21 days to break free from sugar. Reset your palate, taste real food again, end cravings.",
    longDescription:
      "A short, intense reset. We strip out added sugars, artificial sweeteners, and ultra-processed foods. Your taste buds reawaken in 7–10 days.",
    completed: 7240,
    difficulty: "Medium",
    sampleMeals: [
      { emoji: "🍓", name: "Berries & full-fat yoghurt", kcal: 280 },
      { emoji: "🥗", name: "Roast veg & quinoa bowl", kcal: 480 },
      { emoji: "🍗", name: "Lemon herb chicken", kcal: 520 },
    ],
    weekPlan: [
      { title: "Week 1", focus: "Withdrawal", bullets: ["Read every label", "Hydrate aggressively", "Plan snacks ahead"] },
      { title: "Week 2", focus: "Reset", bullets: ["Cravings drop", "Energy stabilises", "Sleep deepens"] },
      { title: "Week 3", focus: "Reawaken", bullets: ["Fruit tastes sweeter", "New baseline", "Plan a sustainable rule"] },
    ],
  },
  {
    id: "plant-power",
    category: "Plant-Based",
    name: "Plant Power",
    emoji: "🌱",
    weeks: 4,
    mealsPerWeek: 21,
    gradient: "linear-gradient(135deg, #1C3A2A 0%, #5BBF5F 100%)",
    tags: [
      { label: "Vegan-friendly", tone: "sage" },
      { label: "Fibre-rich", tone: "forest" },
    ],
    description:
      "Whole-food plant focus with measured macros. Energy, gut health, and clear conscience.",
    longDescription:
      "We protect protein (1.4g/kg via legumes, tofu, tempeh, seitan) and supplement B12. Diverse plants for a thriving gut microbiome.",
    completed: 6190,
    difficulty: "Medium",
    sampleMeals: [
      { emoji: "🥗", name: "Buddha bowl with tahini", kcal: 540 },
      { emoji: "🍲", name: "Lentil & chickpea stew", kcal: 480 },
      { emoji: "🌯", name: "Tempeh wrap & kraut", kcal: 510 },
    ],
    weekPlan: [
      { title: "Week 1", focus: "Plant swaps", bullets: ["1 plant meal/day", "Try 3 new legumes", "B12 supplement"] },
      { title: "Week 2", focus: "Protein dial-in", bullets: ["Hit 1.4g/kg", "Tofu/tempeh basics", "Iron + vitamin C pairing"] },
      { title: "Week 3", focus: "Diversity", bullets: ["30+ plants this week", "Ferments daily", "Seasonal eating"] },
      { title: "Week 4", focus: "Lock-in", bullets: ["Meal prep Sunday", "Plant pantry staples", "Plan ongoing ratio"] },
    ],
  },
];

const categories = ["All", "🔥 Weight Loss", "💪 Muscle", "🧘 Balance", "⏰ Fasting", "🌱 Plant-Based"] as const;
const categoryMap: Record<(typeof categories)[number], Program["category"] | "All"> = {
  "All": "All",
  "🔥 Weight Loss": "Weight Loss",
  "💪 Muscle": "Muscle",
  "🧘 Balance": "Balance",
  "⏰ Fasting": "Fasting",
  "🌱 Plant-Based": "Plant-Based",
};

const ACTIVE_KEY = "nutriai_active_program";

interface ActiveProgramState {
  id: string;
  startedAt: string; // ISO
}

function ProgramsPage() {
  const { profile } = useProfile();
  const [activeCat, setActiveCat] = useState<(typeof categories)[number]>("All");
  const [openProgram, setOpenProgram] = useState<Program | null>(null);
  const [active, setActive] = useState<ActiveProgramState | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ACTIVE_KEY);
      if (raw) setActive(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const filtered = useMemo(() => {
    const target = categoryMap[activeCat];
    if (target === "All") return programs;
    return programs.filter((p) => p.category === target);
  }, [activeCat]);

  const activeProgram = active ? programs.find((p) => p.id === active.id) ?? null : null;
  const weekNumber = useMemo(() => {
    if (!active) return 1;
    const days = Math.floor((Date.now() - new Date(active.startedAt).getTime()) / (1000 * 60 * 60 * 24));
    return Math.min((activeProgram?.weeks ?? 1), Math.max(1, Math.floor(days / 7) + 1));
  }, [active, activeProgram]);

  const startProgram = (id: string) => {
    const next: ActiveProgramState = { id, startedAt: new Date().toISOString() };
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(next));
    setActive(next);
    setOpenProgram(null);
  };

  const goalLabel = profile?.goal ? profile.goal.replace(/_/g, " ") : "wellness";

  return (
    <div className="px-6 pt-8 pb-6 stagger">
      <h2 className="font-display text-[28px] font-bold">Programs</h2>
      <p className="text-[15px] text-[color:var(--ink-mid)] mt-1">
        Science-backed plans tailored to your <span className="text-[color:var(--forest)] font-semibold">{goalLabel}</span> goal
      </p>

      {/* Active program */}
      {activeProgram && (
        <div
          className="mt-5 rounded-[28px] p-6 text-white shadow-elev-md relative overflow-hidden"
          style={{ background: activeProgram.gradient }}
        >
          <div className="text-[11px] uppercase tracking-widest font-semibold text-[color:var(--gold-light)]">
            Active Program
          </div>
          <h3 className="font-display text-[22px] font-bold mt-1 text-white">{activeProgram.name}</h3>
          <div className="text-[13px] text-white/70 mt-1">
            Week {weekNumber} of {activeProgram.weeks}
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full bg-gradient-gold rounded-full transition-all duration-700"
              style={{ width: `${(weekNumber / activeProgram.weeks) * 100}%` }}
            />
          </div>
          <div className="text-[13px] text-white/60 mt-3">
            {Math.min(activeProgram.mealsPerWeek, weekNumber * 4)} meals completed this week
          </div>
          <button
            onClick={() => setOpenProgram(activeProgram)}
            className="mt-4 inline-flex items-center gap-1.5 px-5 h-11 rounded-full bg-gradient-gold text-[color:var(--forest)] text-[14px] font-semibold shadow-elev-gold active:scale-95 transition-transform"
          >
            Continue →
          </button>
        </div>
      )}

      {/* Category filter chips */}
      <div className="mt-6 -mx-6 px-6 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max">
          {categories.map((c) => {
            const isActive = activeCat === c;
            return (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
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

      {/* Program cards */}
      <div className="mt-5 space-y-5">
        {filtered.map((p) => (
          <ProgramCard key={p.id} program={p} onOpen={() => setOpenProgram(p)} />
        ))}
      </div>

      {openProgram && (
        <ProgramDetailSheet
          program={openProgram}
          onClose={() => setOpenProgram(null)}
          onStart={() => startProgram(openProgram.id)}
          isActive={active?.id === openProgram.id}
        />
      )}
    </div>
  );
}

function ProgramCard({ program, onOpen }: { program: Program; onOpen: () => void }) {
  return (
    <div className="bg-white rounded-[28px] overflow-hidden shadow-elev-sm border border-[color:var(--cream-border)]">
      <div
        className="relative h-[180px] flex items-end justify-start p-5"
        style={{ background: program.gradient }}
      >
        <div className="absolute inset-0 grid place-items-center text-7xl opacity-40 select-none">
          {program.emoji}
        </div>
        <div className="absolute top-4 right-4 h-7 px-3 rounded-full bg-black/40 backdrop-blur-sm text-white text-[11px] font-medium grid place-items-center">
          {program.weeks} weeks
        </div>
        <h3 className="relative font-display text-[22px] font-bold text-white drop-shadow-md">
          {program.name}
        </h3>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap gap-1.5">
          {program.tags.map((t) => (
            <Pill key={t.label} tone={t.tone}>{t.label}</Pill>
          ))}
        </div>
        <p className="mt-3 text-[14px] text-[color:var(--ink-mid)] leading-relaxed line-clamp-2">
          {program.description}
        </p>

        <div className="mt-3 flex items-center justify-between text-[12px] text-[color:var(--sage)]">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3" /> {program.completed.toLocaleString()} completed
          </span>
          <span>Difficulty: <span className="text-[color:var(--ink)] font-medium">{program.difficulty}</span></span>
        </div>

        <button
          onClick={onOpen}
          className="mt-4 w-full h-11 rounded-full border border-[color:var(--forest)] text-[color:var(--forest)] text-[14px] font-semibold active:scale-[0.98] transition-transform hover:bg-[color:var(--cream-dark)]"
        >
          Start Program →
        </button>
      </div>
    </div>
  );
}

function ProgramDetailSheet({
  program,
  onClose,
  onStart,
  isActive,
}: {
  program: Program;
  onClose: () => void;
  onStart: () => void;
  isActive: boolean;
}) {
  const [openWeek, setOpenWeek] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-[430px] h-[90vh] bg-[color:var(--cream)] rounded-t-[28px] overflow-hidden flex flex-col animate-fade-up"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="sticky top-0 z-10 bg-[color:var(--cream)]/95 backdrop-blur-md border-b border-[color:var(--cream-border)] flex items-center justify-between px-5 py-4">
          <h3 className="font-display text-[18px] font-semibold truncate">{program.name}</h3>
          <button
            onClick={onClose}
            className="h-9 w-9 grid place-items-center rounded-full bg-white border border-[color:var(--cream-border)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div
            className="h-[200px] relative grid place-items-center"
            style={{ background: program.gradient }}
          >
            <div className="text-7xl opacity-90">{program.emoji}</div>
            <div className="absolute bottom-4 left-5 text-white">
              <div className="text-[11px] uppercase tracking-widest text-[color:var(--gold-light)]">
                {program.category}
              </div>
              <div className="font-display text-[24px] font-bold">{program.name}</div>
            </div>
          </div>

          <div className="p-6">
            <p className="text-[15px] text-[color:var(--ink-mid)] leading-relaxed">
              {program.longDescription}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <Stat label="Duration" value={`${program.weeks}w`} />
              <Stat label="Meals/wk" value={`${program.mealsPerWeek}`} />
              <Stat label="Level" value={program.difficulty} />
            </div>

            <h4 className="mt-7 text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold">
              What you'll eat
            </h4>
            <div className="mt-3 space-y-2">
              {program.sampleMeals.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center gap-3 bg-white border border-[color:var(--cream-border)] rounded-2xl p-3"
                >
                  <div className="h-10 w-10 grid place-items-center rounded-full bg-[color:var(--cream-dark)] text-2xl">
                    {m.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="text-[14px] font-medium">{m.name}</div>
                    <div className="text-[12px] text-[color:var(--ink-light)]">{m.kcal} kcal</div>
                  </div>
                </div>
              ))}
            </div>

            <h4 className="mt-7 text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold">
              Week-by-week
            </h4>
            <div className="mt-3 space-y-2">
              {program.weekPlan.map((w, i) => {
                const open = openWeek === i;
                return (
                  <div
                    key={w.title}
                    className="bg-white border border-[color:var(--cream-border)] rounded-2xl overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenWeek(open ? -1 : i)}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <div>
                        <div className="text-[14px] font-semibold">{w.title}</div>
                        <div className="text-[12px] text-[color:var(--ink-mid)]">{w.focus}</div>
                      </div>
                      {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {open && (
                      <ul className="px-4 pb-4 space-y-1.5 text-[13px] text-[color:var(--ink-mid)]">
                        {w.bullets.map((b) => (
                          <li key={b} className="flex gap-2">
                            <span className="text-[color:var(--forest)]">•</span> {b}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="h-6" />
          </div>
        </div>

        <div className="border-t border-[color:var(--cream-border)] bg-white p-4">
          <PrimaryButton variant={isActive ? "outline" : "primary"} onClick={onStart}>
            {isActive ? (
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Currently active — restart
              </span>
            ) : (
              "Start This Program"
            )}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-[color:var(--cream-border)] rounded-2xl p-3 text-center">
      <div className="text-[11px] uppercase tracking-widest text-[color:var(--ink-light)]">{label}</div>
      <div className="font-display text-[20px] font-bold mt-0.5">{value}</div>
    </div>
  );
}
