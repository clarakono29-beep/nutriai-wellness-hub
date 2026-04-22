import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useFoodLog } from "@/hooks/useFoodLog";
import { useProfile } from "@/hooks/useProfile";
import { useAI, type MealAnalysis } from "@/hooks/useAI";
import { fmtKcal, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

import { PrimaryButton } from "@/components/ui/luxury/PrimaryButton";
import {
  Barcode,
  Camera,
  Check,
  Image as ImageIcon,
  Loader2,
  Minus,
  Plus,
  Search,
  Smile,
  Sparkles,
  Star,
  X,
} from "lucide-react";

export const Route = createFileRoute("/_authed/app/log")({
  head: () => ({ meta: [{ title: "Add food — NutriAI" }] }),
  component: FoodLogPage,
});

const MEALS = ["breakfast", "lunch", "dinner", "snack", "water"] as const;
type MealType = (typeof MEALS)[number];

const TABS = [
  { id: "ai", label: "AI Log", icon: Sparkles, emoji: "🤖" },
  { id: "photo", label: "Photo", icon: Camera, emoji: "📷" },
  { id: "search", label: "Search", icon: Search, emoji: "🔍" },
  { id: "barcode", label: "Barcode", icon: Barcode, emoji: "📋" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const EMOJI_OPTIONS = [
  "🍽️", "🥗", "🥘", "🍝", "🍕", "🍔", "🌮", "🌯", "🥙", "🍣",
  "🍱", "🍙", "🍜", "🍲", "🥟", "🥩", "🍗", "🍖", "🥓", "🐟",
  "🥚", "🥑", "🍞", "🥯", "🧀", "🥛", "☕", "🥤", "🍵", "🍷",
  "🍓", "🍌", "🍎", "🍊", "🥕", "🥦", "🌽", "🌶️", "🫐", "🥜",
];

const EXAMPLES = [
  "I had a chicken salad and a cappuccino",
  "For breakfast: oats with berries and honey",
  "Big meal with steak, mash and red wine",
];

const MOCK_FOODS = [
  { name: "Greek yoghurt (full fat)", emoji: "🥣", per100: { kcal: 97, p: 9, c: 4, f: 5, fibre: 0 }, source: "USDA" },
  { name: "Chicken breast (grilled)", emoji: "🍗", per100: { kcal: 165, p: 31, c: 0, f: 3.6, fibre: 0 }, source: "USDA" },
  { name: "Avocado", emoji: "🥑", per100: { kcal: 160, p: 2, c: 9, f: 15, fibre: 7 }, source: "USDA" },
  { name: "Brown rice (cooked)", emoji: "🍚", per100: { kcal: 112, p: 2.6, c: 24, f: 0.9, fibre: 1.8 }, source: "USDA" },
  { name: "Salmon (grilled)", emoji: "🐟", per100: { kcal: 206, p: 22, c: 0, f: 13, fibre: 0 }, source: "USDA" },
  { name: "Banana", emoji: "🍌", per100: { kcal: 89, p: 1.1, c: 23, f: 0.3, fibre: 2.6 }, source: "USDA" },
  { name: "Almonds", emoji: "🥜", per100: { kcal: 579, p: 21, c: 22, f: 50, fibre: 12 }, source: "USDA" },
  { name: "Sourdough bread", emoji: "🥖", per100: { kcal: 289, p: 12, c: 56, f: 1.8, fibre: 2.4 }, source: "USDA" },
  { name: "Olive oil (EVOO)", emoji: "🫒", per100: { kcal: 884, p: 0, c: 0, f: 100, fibre: 0 }, source: "USDA" },
  { name: "Eggs (scrambled)", emoji: "🍳", per100: { kcal: 148, p: 12, c: 1.6, f: 11, fibre: 0 }, source: "USDA" },
];

const BARCODE_DEMO = {
  meal_name: "Oatly Barista Oat Drink",
  emoji: "🥛",
  calories: 60, protein: 1, carbs: 6.6, fat: 3, fibre: 0.8,
  food_score: 7,
  verdict: "Solid plant-based choice — light on protein, easy on the gut.",
};

function inferMeal(): MealType {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

function fmtDate(d = new Date()) {
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "long" });
}

/* ---------------------------------------------------------------- */

function FoodLogPage() {
  const nav = useNavigate();
  const [tab, setTab] = useState<TabId>("ai");
  const [meal, setMeal] = useState<MealType>(inferMeal());
  const [date, setDate] = useState(todayISO());
  const [preview, setPreview] = useState<MealAnalysis | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
      <button
        aria-label="Close"
        onClick={() => nav({ to: "/app" })}
        className="absolute inset-0 bg-black/40"
      />
      <div
        className="relative w-full max-w-[430px] h-[92vh] bg-[color:var(--cream)] rounded-t-[28px] shadow-elev-lg flex flex-col animate-fade-up"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Drag handle */}
        <div className="pt-3 grid place-items-center">
          <div className="h-1.5 w-10 rounded-full bg-[color:var(--cream-border)]" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 flex items-start justify-between">
          <div>
            <h1 className="font-display text-[22px] font-bold leading-none">Add Food</h1>
            <button className="mt-1 text-[12px] text-[color:var(--ink-mid)] hover:text-[color:var(--forest)] transition-colors">
              Today, <span className="font-medium">{fmtDate(new Date(date))}</span>
            </button>
          </div>
          <button
            onClick={() => nav({ to: "/app" })}
            className="h-9 w-9 grid place-items-center rounded-full bg-white border border-[color:var(--cream-border)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Meal selector */}
        <div className="px-5">
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            {MEALS.map((m) => (
              <button
                key={m}
                onClick={() => setMeal(m)}
                className={cn(
                  "px-4 h-9 rounded-full text-[12px] uppercase tracking-widest font-semibold transition-all whitespace-nowrap",
                  meal === m
                    ? "bg-[color:var(--forest)] text-white"
                    : "bg-white border border-[color:var(--cream-border)] text-[color:var(--ink-mid)]",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 mt-4">
          <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-white border border-[color:var(--cream-border)]">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all",
                    active ? "bg-[color:var(--forest)] text-white shadow-elev-sm" : "text-[color:var(--ink-mid)]",
                  )}
                >
                  <span className="text-[14px]">{t.emoji}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2">
          {tab === "ai" && <AITab onResult={setPreview} />}
          {tab === "photo" && <PhotoTab onResult={setPreview} />}
          {tab === "search" && <SearchTab onResult={setPreview} />}
          {tab === "barcode" && <BarcodeTab onResult={setPreview} />}
        </div>

        {/* Result confirm */}
        {preview && (
          <ConfirmSheet
            preview={preview}
            initialMeal={meal === "water" ? "snack" : (meal as Exclude<MealType, "water">)}
            date={date}
            onClose={() => setPreview(null)}
            onLogged={() => {
              setPreview(null);
              toast.success("Logged to your diary ✓");
              nav({ to: "/app" });
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- AI tab ---------- */

function AITab({ onResult }: { onResult: (r: MealAnalysis) => void }) {
  const { profile } = useProfile();
  const { analyseMeal, loading } = useAI();
  const [text, setText] = useState("");

  const submit = async () => {
    if (!text.trim() || loading) return;
    const r = await analyseMeal({
      meal_description: text,
      user_context: {
        goal: profile?.goal,
        daily_calories: profile?.daily_calories,
        protein_target: profile?.protein_g,
      },
    });
    if (!r) {
      toast.error("Couldn't analyse — try again.");
      return;
    }
    onResult(r);
  };

  return (
    <div className="step-enter-right">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Describe what you ate..."
        rows={5}
        className="w-full p-4 rounded-2xl bg-white border-[1.5px] border-[color:var(--cream-border)] text-[15px] text-[color:var(--ink)] placeholder:text-[color:var(--ink-light)] placeholder:italic placeholder:font-display focus:outline-none focus:border-[color:var(--forest-mid)] focus:shadow-[0_0_0_3px_rgba(45,90,64,0.12)] transition-all resize-none"
      />

      <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setText(ex)}
            className="shrink-0 px-3 h-8 rounded-full bg-white border border-[color:var(--cream-border)] text-[12px] text-[color:var(--ink-mid)] hover:border-[color:var(--forest)] hover:text-[color:var(--forest)] transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>

      <PrimaryButton onClick={submit} loading={loading} disabled={!text.trim()} className="mt-4">
        <Sparkles className="h-4 w-4 mr-2" /> Analyse with AI →
      </PrimaryButton>
    </div>
  );
}

/* ---------- Photo tab ---------- */

function PhotoTab({ onResult }: { onResult: (r: MealAnalysis) => void }) {
  const { profile } = useProfile();
  const { analyseMeal, loading } = useAI();
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);

  const handleFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setAnalysing(true);

    // Convert to base64 (strip the data: prefix for the function)
    const b64 = await fileToBase64(file);

    const r = await analyseMeal({
      image_base64: b64,
      user_context: {
        goal: profile?.goal,
        daily_calories: profile?.daily_calories,
        protein_target: profile?.protein_g,
      },
    });
    setAnalysing(false);
    if (!r) {
      toast.error("Couldn't read that photo — try a clearer shot.");
      return;
    }
    onResult(r);
  };

  return (
    <div className="step-enter-right">
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <input
        ref={libraryInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      <div className="aspect-square w-full rounded-3xl bg-white border-2 border-dashed border-[color:var(--cream-border)] grid place-items-center overflow-hidden relative">
        {imageUrl ? (
          <>
            <img src={imageUrl} alt="meal" className="absolute inset-0 h-full w-full object-cover" />
            {(analysing || loading) && (
              <div className="absolute inset-0 bg-black/40 grid place-items-center text-white">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-[14px] font-medium">AI is identifying your meal…</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center px-6">
            <div className="h-16 w-16 mx-auto rounded-full bg-[color:var(--cream-dark)] grid place-items-center text-3xl">
              📷
            </div>
            <p className="mt-3 text-[14px] text-[color:var(--ink-mid)]">
              Take a photo of your plate.
            </p>
            <p className="mt-1 text-[12px] text-[color:var(--ink-light)]">
              Our AI will estimate calories and macros instantly.
            </p>
          </div>
        )}
      </div>

      <PrimaryButton
        onClick={() => cameraInput.current?.click()}
        disabled={analysing || loading}
        className="mt-4"
      >
        <Camera className="h-4 w-4 mr-2" /> Snap It
      </PrimaryButton>
      <button
        onClick={() => libraryInput.current?.click()}
        disabled={analysing || loading}
        className="mt-3 w-full text-[14px] text-[color:var(--forest)] font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        <ImageIcon className="h-4 w-4" /> Or choose from library
      </button>
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/* ---------- Search tab ---------- */

const RECENT_KEY = "nutriai_recent_searches";
const FAV_KEY = "nutriai_fav_foods";

function SearchTab({ onResult }: { onResult: (r: MealAnalysis) => void }) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [recents, setRecents] = useState<string[]>([]);
  const [favs, setFavs] = useState<string[]>([]);
  const [selected, setSelected] = useState<(typeof MOCK_FOODS)[number] | null>(null);

  useEffect(() => {
    try {
      setRecents(JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"));
      setFavs(JSON.parse(localStorage.getItem(FAV_KEY) || "[]"));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const results = useMemo(() => {
    if (!debouncedQ) return [];
    return MOCK_FOODS.filter((f) => f.name.toLowerCase().includes(debouncedQ));
  }, [debouncedQ]);

  const toggleFav = (name: string) => {
    setFavs((prev) => {
      const next = prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name];
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      return next;
    });
  };

  const pick = (food: (typeof MOCK_FOODS)[number]) => {
    setRecents((prev) => {
      const next = [food.name, ...prev.filter((n) => n !== food.name)].slice(0, 8);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
    setSelected(food);
  };

  const recentFoods = MOCK_FOODS.filter((f) => recents.includes(f.name));
  const favFoods = MOCK_FOODS.filter((f) => favs.includes(f.name));

  if (selected) {
    return (
      <ServingPicker
        food={selected}
        onBack={() => setSelected(null)}
        onConfirm={(r) => {
          onResult(r);
          setSelected(null);
        }}
      />
    );
  }

  return (
    <div className="step-enter-right">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--ink-light)]" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search foods…"
          className="w-full h-12 pl-11 pr-4 rounded-full bg-white border border-[color:var(--cream-border)] text-[14px] focus:outline-none focus:border-[color:var(--forest)]"
        />
      </div>

      {!debouncedQ && (
        <>
          {favFoods.length > 0 && (
            <Section title="Favourites">
              {favFoods.map((f) => (
                <FoodResultRow key={f.name} food={f} starred onPick={() => pick(f)} onStar={() => toggleFav(f.name)} />
              ))}
            </Section>
          )}
          {recentFoods.length > 0 && (
            <Section title="Recent">
              {recentFoods.map((f) => (
                <FoodResultRow key={f.name} food={f} starred={favs.includes(f.name)} onPick={() => pick(f)} onStar={() => toggleFav(f.name)} />
              ))}
            </Section>
          )}
          {favFoods.length === 0 && recentFoods.length === 0 && (
            <p className="mt-6 text-center text-[13px] text-[color:var(--ink-light)]">
              Try searching for "chicken", "rice", or "salmon".
            </p>
          )}
        </>
      )}

      {debouncedQ && (
        <Section title={`Results (${results.length})`}>
          {results.length === 0 ? (
            <p className="text-center text-[13px] text-[color:var(--ink-light)] py-4">
              No matches. Try the AI tab — it understands anything.
            </p>
          ) : (
            results.map((f) => (
              <FoodResultRow
                key={f.name}
                food={f}
                starred={favs.includes(f.name)}
                onPick={() => pick(f)}
                onStar={() => toggleFav(f.name)}
              />
            ))
          )}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h3 className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold mb-2">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function FoodResultRow({
  food,
  starred,
  onPick,
  onStar,
}: {
  food: (typeof MOCK_FOODS)[number];
  starred: boolean;
  onPick: () => void;
  onStar: () => void;
}) {
  return (
    <div className="flex items-center gap-3 bg-white border border-[color:var(--cream-border)] rounded-2xl p-3">
      <button onClick={onPick} className="flex-1 flex items-center gap-3 text-left">
        <div className="h-10 w-10 rounded-full bg-[color:var(--cream-dark)] grid place-items-center text-lg">
          {food.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-medium text-[color:var(--ink)] truncate">{food.name}</div>
          <div className="text-[12px] text-[color:var(--ink-light)]">
            {food.per100.kcal} kcal / 100g · <span className="text-[color:var(--sage)]">{food.source}</span>
          </div>
        </div>
      </button>
      <button
        onClick={onStar}
        aria-label={starred ? "Unfavourite" : "Favourite"}
        className={cn(
          "h-9 w-9 grid place-items-center rounded-full transition-colors",
          starred ? "text-[color:var(--gold)] bg-[color:var(--gold-light)]" : "text-[color:var(--ink-light)] hover:bg-[color:var(--cream-dark)]",
        )}
      >
        <Star className="h-4 w-4" fill={starred ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

function ServingPicker({
  food,
  onBack,
  onConfirm,
}: {
  food: (typeof MOCK_FOODS)[number];
  onBack: () => void;
  onConfirm: (r: MealAnalysis) => void;
}) {
  const [unit, setUnit] = useState<"g" | "servings" | "oz">("g");
  const [amount, setAmount] = useState(100);

  // Convert all units to grams
  const grams = unit === "g" ? amount : unit === "oz" ? amount * 28.35 : amount * 100;
  const factor = grams / 100;

  const calc = {
    kcal: Math.round(food.per100.kcal * factor),
    p: Math.round(food.per100.p * factor),
    c: Math.round(food.per100.c * factor),
    f: Math.round(food.per100.f * factor),
    fibre: Math.round(food.per100.fibre * factor),
  };

  const submit = () => {
    onConfirm({
      meal_name: food.name,
      emoji: food.emoji,
      calories: calc.kcal,
      protein: calc.p,
      carbs: calc.c,
      fat: calc.f,
      fibre: calc.fibre,
      food_score: 7,
      verdict: "Looks good — accurate macros from our database.",
    });
  };

  return (
    <div className="step-enter-right">
      <button onClick={onBack} className="text-[13px] text-[color:var(--forest)] font-semibold mb-3">
        ← Back to search
      </button>

      <div className="bg-white rounded-2xl border border-[color:var(--cream-border)] p-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-[color:var(--cream-dark)] grid place-items-center text-2xl">
            {food.emoji}
          </div>
          <div>
            <h3 className="font-display text-[18px]">How much?</h3>
            <p className="text-[13px] text-[color:var(--ink-mid)]">{food.name}</p>
          </div>
        </div>

        <div className="mt-5 flex gap-1 p-1 rounded-full bg-[color:var(--cream-dark)]">
          {(["g", "servings", "oz"] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={cn(
                "flex-1 h-9 rounded-full text-[12px] font-semibold uppercase tracking-wider transition-all",
                unit === u ? "bg-white text-[color:var(--forest)] shadow-elev-sm" : "text-[color:var(--ink-mid)]",
              )}
            >
              {u}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => setAmount((a) => Math.max(0, a - (unit === "servings" ? 0.5 : 10)))}
            className="h-10 w-10 rounded-full border border-[color:var(--cream-border)] grid place-items-center"
            aria-label="Decrease"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="number"
            value={amount}
            min={0}
            step={unit === "servings" ? 0.5 : 10}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
            className="flex-1 h-12 text-center text-[20px] font-display font-semibold rounded-2xl border border-[color:var(--cream-border)] bg-white outline-none focus:border-[color:var(--forest)]"
          />
          <button
            onClick={() => setAmount((a) => a + (unit === "servings" ? 0.5 : 10))}
            className="h-10 w-10 rounded-full border border-[color:var(--cream-border)] grid place-items-center"
            aria-label="Increase"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2 text-center">
          <Mini label="kcal" value={fmtKcal(calc.kcal)} />
          <Mini label="P" value={`${calc.p}g`} />
          <Mini label="C" value={`${calc.c}g`} />
          <Mini label="F" value={`${calc.f}g`} />
        </div>

        <PrimaryButton onClick={submit} className="mt-5">
          Add to Diary →
        </PrimaryButton>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[color:var(--cream-dark)] py-2">
      <div className="text-[10px] uppercase tracking-widest text-[color:var(--ink-light)] font-semibold">{label}</div>
      <div className="font-display text-[16px] font-bold text-[color:var(--forest)]">{value}</div>
    </div>
  );
}

/* ---------- Barcode tab ---------- */

function BarcodeTab({ onResult }: { onResult: (r: MealAnalysis) => void }) {
  const [scanning, setScanning] = useState(false);

  const startScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      onResult(BARCODE_DEMO);
      toast.success("Barcode recognised");
    }, 2000);
  };

  return (
    <div className="step-enter-right">
      <div className="aspect-square w-full rounded-3xl bg-[color:var(--ink)] relative overflow-hidden grid place-items-center">
        {/* corners */}
        {[
          "top-6 left-6 border-t-2 border-l-2",
          "top-6 right-6 border-t-2 border-r-2",
          "bottom-6 left-6 border-b-2 border-l-2",
          "bottom-6 right-6 border-b-2 border-r-2",
        ].map((c) => (
          <span key={c} className={cn("absolute h-10 w-10 border-[color:var(--gold)] rounded-md", c)} />
        ))}

        {/* scan line */}
        {scanning && (
          <div
            className="absolute left-10 right-10 h-0.5 bg-[color:var(--gold)] shadow-[0_0_12px_rgba(196,151,58,0.8)]"
            style={{ animation: "scan-line 2s ease-in-out infinite" }}
          />
        )}

        <div className="text-center text-white/80">
          <div className="text-5xl">📋</div>
          <p className="mt-3 text-[14px] font-medium">Point at barcode</p>
          <p className="mt-1 text-[12px] text-white/50">Demo mode — taps reveal a sample item</p>
        </div>
      </div>

      <PrimaryButton onClick={startScan} loading={scanning} className="mt-4">
        <Barcode className="h-4 w-4 mr-2" /> {scanning ? "Scanning…" : "Simulate Scan"}
      </PrimaryButton>

      <style>{`@keyframes scan-line { 0%, 100% { top: 18%; } 50% { top: 82%; } }`}</style>
    </div>
  );
}

/* ---------- Confirmation sheet ---------- */

function ConfirmSheet({
  preview,
  initialMeal,
  date,
  onClose,
  onLogged,
}: {
  preview: MealAnalysis;
  initialMeal: Exclude<MealType, "water">;
  date: string;
  onClose: () => void;
  onLogged: () => void;
}) {
  const { addLog } = useFoodLog(date);
  const [name, setName] = useState(preview.meal_name);
  const [emoji, setEmoji] = useState(preview.emoji);
  const [meal, setMeal] = useState<Exclude<MealType, "water">>(initialMeal);
  const [servings, setServings] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [scoreFill, setScoreFill] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setScoreFill(preview.food_score), 80);
    return () => clearTimeout(id);
  }, [preview.food_score]);

  const mult = servings || 1;
  const c = scoreColor(preview.food_score);

  const confirm = async () => {
    setSubmitting(true);
    const { error } = await addLog({
      meal_type: meal,
      food_name: name.trim() || preview.meal_name,
      calories: Math.round(preview.calories * mult),
      protein: Math.round(preview.protein * mult),
      carbs: Math.round(preview.carbs * mult),
      fat: Math.round(preview.fat * mult),
      fibre: Math.round(preview.fibre * mult),
      food_score: preview.food_score,
      emoji,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onLogged();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center animate-fade-in">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-[430px] bg-white rounded-t-[28px] shadow-elev-lg max-h-[88vh] overflow-y-auto animate-fade-up"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      >
        <div className="sticky top-0 pt-3 bg-white rounded-t-[28px] grid place-items-center z-10">
          <div className="h-1.5 w-10 rounded-full bg-[color:var(--cream-border)]" />
        </div>

        <div className="px-5 pt-3 pb-5">
          {/* Header */}
          <div className="flex items-start gap-3">
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="text-[40px] leading-none h-14 w-14 grid place-items-center rounded-2xl bg-[color:var(--cream-dark)] hover:bg-[color:var(--sage-light)] transition-colors"
              aria-label="Change emoji"
            >
              {emoji}
            </button>
            <div className="flex-1 min-w-0">
              <div className="relative">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full font-display text-[18px] font-semibold text-[color:var(--ink)] bg-transparent border-0 border-b border-dashed border-[color:var(--cream-border)] outline-none focus:border-[color:var(--forest)] py-1"
                />
                <Smile className="absolute right-1 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--ink-light)]" />
              </div>
              <p className="text-[12px] italic text-[color:var(--ink-mid)] mt-1.5 leading-snug">
                {preview.verdict}
              </p>
            </div>
            {/* Animated NutriScore */}
            <ScoreCircle score={preview.food_score} fill={scoreFill} colors={c} />
          </div>

          {pickerOpen && (
            <div className="mt-3 p-3 rounded-2xl bg-[color:var(--cream-dark)] grid grid-cols-10 gap-1">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    setEmoji(e);
                    setPickerOpen(false);
                  }}
                  className={cn(
                    "text-xl h-8 w-8 rounded-md hover:bg-white transition-colors",
                    emoji === e && "bg-white shadow-elev-sm",
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          {/* Macro pills */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <MacroPill dot="var(--forest)" label="kcal" value={fmtKcal(preview.calories * mult)} />
            <MacroPill dot="#7C3AED" label="P" value={`${Math.round(preview.protein * mult)}g`} />
            <MacroPill dot="#2563EB" label="C" value={`${Math.round(preview.carbs * mult)}g`} />
            <MacroPill dot="var(--gold)" label="F" value={`${Math.round(preview.fat * mult)}g`} />
          </div>

          {/* Servings */}
          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold mb-2">
              Servings
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setServings((s) => Math.max(0.5, +(s - 0.5).toFixed(1)))}
                className="h-10 w-10 rounded-full border border-[color:var(--cream-border)] grid place-items-center active:scale-90"
                aria-label="Decrease servings"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={servings}
                onChange={(e) => setServings(Math.max(0.5, Number(e.target.value) || 1))}
                className="flex-1 h-12 text-center text-[18px] font-display font-semibold rounded-2xl border border-[color:var(--cream-border)] bg-white outline-none focus:border-[color:var(--forest)]"
              />
              <button
                onClick={() => setServings((s) => +(s + 0.5).toFixed(1))}
                className="h-10 w-10 rounded-full border border-[color:var(--cream-border)] grid place-items-center active:scale-90"
                aria-label="Increase servings"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Meal type */}
          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold mb-2">
              Meal
            </p>
            <div className="flex gap-1 p-1 rounded-full bg-[color:var(--cream-dark)]">
              {(["breakfast", "lunch", "dinner", "snack"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMeal(m)}
                  className={cn(
                    "flex-1 h-9 rounded-full text-[12px] font-semibold capitalize transition-all",
                    meal === m
                      ? "bg-white text-[color:var(--forest)] shadow-elev-sm"
                      : "text-[color:var(--ink-mid)]",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl text-[13px] font-semibold text-[color:var(--ink-mid)] hover:bg-[color:var(--cream-dark)]"
            >
              Analyse differently
            </button>
            <button
              onClick={confirm}
              disabled={submitting}
              className="flex-[2] h-14 rounded-2xl bg-gradient-cta text-white text-[15px] font-semibold shadow-elev-cta active:scale-[0.97] transition-transform disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" strokeWidth={2.6} />}
              Add to Diary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreCircle({
  score,
  fill,
  colors,
}: {
  score: number;
  fill: number;
  colors: { bg: string; fg: string };
}) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - fill / 10);
  return (
    <div className="relative h-[60px] w-[60px] shrink-0">
      <svg width={60} height={60} className="-rotate-90">
        <circle cx={30} cy={30} r={r} fill="none" stroke="var(--cream-border)" strokeWidth={4} />
        <circle
          cx={30}
          cy={30}
          r={r}
          fill="none"
          stroke={`var(--${colors.fg.includes("--") ? colors.fg.replace("var(--", "").replace(")", "") : "forest"})`}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div
        className="absolute inset-0 grid place-items-center font-display font-bold text-[20px]"
        style={{ color: colors.fg }}
      >
        {score}
      </div>
    </div>
  );
}

function MacroPill({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[color:var(--cream-dark)] py-2 px-2 text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-widest text-[color:var(--ink-light)] font-semibold">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
        {label}
      </div>
      <div className="mt-0.5 text-[14px] font-semibold text-[color:var(--ink)]">{value}</div>
    </div>
  );
}

function scoreColor(score: number) {
  if (score >= 8) return { bg: "var(--sage-light)", fg: "var(--success)" };
  if (score >= 5) return { bg: "var(--gold-light)", fg: "var(--gold)" };
  return { bg: "var(--coral-light)", fg: "var(--coral)" };
}
