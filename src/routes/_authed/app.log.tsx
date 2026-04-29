import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";

import { useFoodLog } from "@/hooks/useFoodLog";
import { useProfile } from "@/hooks/useProfile";
import { useAI, type MealAnalysis } from "@/hooks/useAI";
import { useFoodSearch, type USDAFood, type BarcodeProduct } from "@/hooks/useFoodSearch";
import { fmtKcal, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { PrimaryButton } from "@/components/ui/luxury/PrimaryButton";
import {
  Camera, Check, Image as ImageIcon, Loader2, Minus, Plus,
  Search, Sparkles, Star, X, Zap, RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/_authed/app/log")({
  head: () => ({ meta: [{ title: "Add food — NutriAI" }] }),
  component: FoodLogPage,
});

const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealType = (typeof MEALS)[number];
const TABS = [
  { id: "ai", label: "AI Log", emoji: "🤖" },
  { id: "photo", label: "Photo", emoji: "📷" },
  { id: "search", label: "Search", emoji: "🔍" },
  { id: "barcode", label: "Scan", emoji: "📋" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const EMOJI_OPTIONS = ["🍽️","🥗","🥘","🍝","🍕","🍔","🌮","🌯","🥙","🍣","🍱","🍙","🍜","🍲","🥟","🥩","🍗","🍖","🥓","🐟","🥚","🥑","🍞","🥯","🧀","🥛","☕","🥤","🍵","🍷","🍓","🍌","🍎","🍊","🥕","🥦","🌽","🌶️","🫐","🥜"];
const EXAMPLES = ["Chicken salad with olive oil and cappuccino","Oats with mixed berries and honey","Steak, sweet potato mash and broccoli","Protein shake with banana and peanut butter"];

function inferMeal(): MealType {
  const h = new Date().getHours();
  if (h < 11) return "breakfast"; if (h < 15) return "lunch"; if (h < 21) return "dinner"; return "snack";
}

// ─── Main Page ─────────────────────────────────────────────────────

function FoodLogPage() {
  const nav = useNavigate();
  const [tab, setTab] = useState<TabId>("ai");
  const [meal, setMeal] = useState<MealType>(inferMeal());
  const [date] = useState(todayISO());
  const [preview, setPreview] = useState<MealAnalysis | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
      <button aria-label="Close" onClick={() => nav({ to: "/app" })} className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-[430px] h-[92vh] bg-[color:var(--cream)] rounded-t-[28px] shadow-elev-lg flex flex-col animate-fade-up" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="pt-3 grid place-items-center"><div className="h-1.5 w-10 rounded-full bg-[color:var(--cream-border)]" /></div>
        <div className="px-5 pt-3 pb-4 flex items-start justify-between">
          <div>
            <h1 className="font-display text-[22px] font-bold leading-none">Add Food</h1>
            <p className="mt-1 text-[12px] text-[color:var(--ink-mid)]">{new Date(date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "long" })}</p>
          </div>
          <button onClick={() => nav({ to: "/app" })} className="h-9 w-9 grid place-items-center rounded-full bg-white border border-[color:var(--cream-border)]" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {MEALS.map((m) => (
              <button key={m} onClick={() => { haptics.light(); setMeal(m); }} className={cn("px-4 h-8 rounded-full text-[12px] uppercase tracking-widest font-semibold transition-all whitespace-nowrap", meal === m ? "bg-[color:var(--forest)] text-white" : "bg-white border border-[color:var(--cream-border)] text-[color:var(--ink-mid)]")}>{m}</button>
            ))}
          </div>
        </div>
        <div className="px-5 mt-4">
          <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-white border border-[color:var(--cream-border)]">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => { haptics.light(); setTab(t.id); }} className={cn("h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all", active ? "bg-[color:var(--forest)] text-white shadow-elev-sm" : "text-[color:var(--ink-mid)] hover:bg-[color:var(--cream-dark)]")}>
                  <span className="text-[15px]">{t.emoji}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2">
          {tab === "ai" && <AITab onResult={setPreview} />}
          {tab === "photo" && <PhotoTab onResult={setPreview} />}
          {tab === "search" && <SearchTab onResult={setPreview} />}
          {tab === "barcode" && <BarcodeTab onResult={setPreview} />}
        </div>
        {preview && (
          <ConfirmSheet preview={preview} initialMeal={meal} date={date} onClose={() => setPreview(null)} onLogged={() => { setPreview(null); toast.success("Logged ✓"); nav({ to: "/app" }); }} />
        )}
      </div>
    </div>
  );
}

// ─── AI Tab ─────────────────────────────────────────────────────────

function AITab({ onResult }: { onResult: (r: MealAnalysis) => void }) {
  const { profile } = useProfile();
  const { analyseMeal, loading } = useAI();
  const [text, setText] = useState("");

  const submit = async () => {
    if (!text.trim() || loading) return;
    const r = await analyseMeal({ meal_description: text, user_context: { goal: profile?.goal, daily_calories: profile?.daily_calories, protein_target: profile?.protein_g } });
    if (!r) { toast.error("Couldn't analyse — try rephrasing."); return; }
    onResult(r);
  };

  return (
    <div className="space-y-4">
      <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} placeholder="Describe what you ate in plain English…" rows={4} className="w-full p-4 rounded-2xl bg-white border-[1.5px] border-[color:var(--cream-border)] text-[15px] text-[color:var(--ink)] placeholder:text-[color:var(--ink-light)] focus:outline-none focus:border-[color:var(--forest-mid)] focus:shadow-[0_0_0_3px_rgba(45,90,64,0.1)] transition-all resize-none" />
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {EXAMPLES.map((ex) => (
          <button key={ex} onClick={() => { haptics.light(); setText(ex); }} className="shrink-0 px-3 h-8 rounded-full bg-white border border-[color:var(--cream-border)] text-[12px] text-[color:var(--ink-mid)] hover:border-[color:var(--forest)] hover:text-[color:var(--forest)] transition-colors">{ex.length > 30 ? ex.slice(0, 28) + "…" : ex}</button>
        ))}
      </div>
      <PrimaryButton onClick={submit} loading={loading} disabled={!text.trim()}><Sparkles className="h-4 w-4 mr-2" /> Analyse with AI →</PrimaryButton>
      <p className="text-center text-[11px] text-[color:var(--ink-light)]">AI estimates macros · Usually within ±15%</p>
    </div>
  );
}

// ─── Photo Tab ───────────────────────────────────────────────────────

function PhotoTab({ onResult }: { onResult: (r: MealAnalysis) => void }) {
  const { profile } = useProfile();
  const { analyseMeal, loading } = useAI();
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);

  const handleFile = async (file: File) => {
    setImageUrl(URL.createObjectURL(file));
    setAnalysing(true);
    const b64 = await fileToBase64(file);
    const r = await analyseMeal({ image_base64: b64, user_context: { goal: profile?.goal, daily_calories: profile?.daily_calories, protein_target: profile?.protein_g } });
    setAnalysing(false);
    if (!r) { toast.error("Couldn't read that photo — try a clearer, well-lit shot."); return; }
    onResult(r);
  };

  return (
    <div className="space-y-4">
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={libraryInput} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <div className="aspect-[4/3] w-full rounded-3xl bg-white border-2 border-dashed border-[color:var(--cream-border)] grid place-items-center overflow-hidden relative">
        {imageUrl ? (
          <>
            <img src={imageUrl} alt="meal" className="absolute inset-0 h-full w-full object-cover" />
            {(analysing || loading) && (
              <div className="absolute inset-0 bg-black/50 grid place-items-center">
                <div className="text-center text-white"><Loader2 className="h-8 w-8 animate-spin mx-auto" /><p className="text-[14px] font-medium mt-3">Analysing your meal…</p></div>
              </div>
            )}
            {!analysing && !loading && <button onClick={() => setImageUrl(null)} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/50 grid place-items-center text-white"><X className="h-4 w-4" /></button>}
          </>
        ) : (
          <div className="text-center px-6">
            <div className="h-16 w-16 mx-auto rounded-full bg-[color:var(--cream-dark)] grid place-items-center text-3xl">📷</div>
            <p className="mt-3 text-[14px] font-medium text-[color:var(--ink)]">Snap your plate</p>
            <p className="mt-1 text-[12px] text-[color:var(--ink-light)]">AI estimates calories and macros instantly</p>
          </div>
        )}
      </div>
      <PrimaryButton onClick={() => cameraInput.current?.click()} disabled={analysing || loading}><Camera className="h-4 w-4 mr-2" /> Snap it →</PrimaryButton>
      <button onClick={() => libraryInput.current?.click()} disabled={analysing || loading} className="w-full text-[14px] text-[color:var(--forest)] font-semibold inline-flex items-center justify-center gap-1.5 py-2 disabled:opacity-50"><ImageIcon className="h-4 w-4" /> Choose from library</button>
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let b = ""; const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) b += String.fromCharCode(bytes[i]);
  return btoa(b);
}

// ─── Search Tab (real USDA) ──────────────────────────────────────────

const FAV_KEY = "nutriai_fav_foods_v2";
const RECENT_KEY = "nutriai_recent_foods_v2";

function SearchTab({ onResult }: { onResult: (r: MealAnalysis) => void }) {
  const { search, results, loading, error } = useFoodSearch();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<USDAFood | null>(null);
  const [favs, setFavs] = useState<number[]>(() => { try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch { return []; } });
  const [recents, setRecents] = useState<USDAFood[]>(() => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; } });
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const handleQuery = (val: string) => {
    setQ(val); clearTimeout(timer.current);
    if (val.trim()) timer.current = setTimeout(() => search(val), 350);
  };

  const pick = (food: USDAFood) => {
    haptics.light();
    setRecents((prev) => { const next = [food, ...prev.filter((f) => f.fdcId !== food.fdcId)].slice(0, 6); localStorage.setItem(RECENT_KEY, JSON.stringify(next)); return next; });
    setSelected(food);
  };
  const toggleFav = (id: number) => setFavs((prev) => { const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]; localStorage.setItem(FAV_KEY, JSON.stringify(next)); return next; });

  if (selected) return <ServingPicker food={selected} onBack={() => setSelected(null)} onConfirm={(r) => { onResult(r); setSelected(null); }} />;

  const showing = q.trim().length > 0;
  const favFoods = recents.filter((f) => favs.includes(f.fdcId));
  const recentNonFav = recents.filter((f) => !favs.includes(f.fdcId));

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--ink-light)]" />
        <input autoFocus value={q} onChange={(e) => handleQuery(e.target.value)} placeholder="Search 700K+ foods from USDA…" className="w-full h-12 pl-11 pr-10 rounded-full bg-white border border-[color:var(--cream-border)] text-[14px] focus:outline-none focus:border-[color:var(--forest)] transition-colors" />
        {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--ink-light)] animate-spin" />}
        {q && !loading && <button onClick={() => setQ("")} className="absolute right-4 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-[color:var(--ink-light)]" /></button>}
      </div>

      {!showing && (
        <>
          {favFoods.length > 0 && <SearchSection title="⭐ Favourites">{favFoods.map((f) => <FoodRow key={f.fdcId} food={f} starred onPick={() => pick(f)} onStar={() => toggleFav(f.fdcId)} />)}</SearchSection>}
          {recentNonFav.length > 0 && <SearchSection title="Recent">{recentNonFav.map((f) => <FoodRow key={f.fdcId} food={f} starred={false} onPick={() => pick(f)} onStar={() => toggleFav(f.fdcId)} />)}</SearchSection>}
          {favFoods.length === 0 && recentNonFav.length === 0 && <div className="text-center py-8"><p className="text-[14px] text-[color:var(--ink-mid)]">700K+ foods · USDA database</p><p className="text-[12px] text-[color:var(--ink-light)] mt-1">Try "chicken", "rice", or "avocado"</p></div>}
        </>
      )}

      {showing && !loading && (
        <SearchSection title={error ? "Error" : `${results.length} results`}>
          {error ? (
            <div className="text-center py-4"><p className="text-[13px] text-[color:var(--coral)]">{error}</p><button onClick={() => search(q)} className="mt-2 text-[13px] text-[color:var(--forest)] font-semibold flex items-center gap-1 mx-auto"><RefreshCw className="h-3.5 w-3.5" /> Retry</button></div>
          ) : results.length === 0 ? (
            <p className="text-center text-[13px] text-[color:var(--ink-light)] py-4">No matches · Try the <span className="text-[color:var(--forest)] font-medium">AI tab</span></p>
          ) : (
            results.map((f) => <FoodRow key={f.fdcId} food={f} starred={favs.includes(f.fdcId)} onPick={() => pick(f)} onStar={() => toggleFav(f.fdcId)} />)
          )}
        </SearchSection>
      )}
    </div>
  );
}

function SearchSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h3 className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold mb-2">{title}</h3><div className="space-y-2">{children}</div></div>;
}

function FoodRow({ food, starred, onPick, onStar }: { food: USDAFood; starred: boolean; onPick: () => void; onStar: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-[color:var(--cream-border)] rounded-2xl p-3">
      <button onClick={onPick} className="flex-1 flex items-center gap-3 text-left">
        <div className="h-10 w-10 rounded-full bg-[color:var(--cream-dark)] grid place-items-center text-lg shrink-0">{food.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-medium text-[color:var(--ink)] truncate">{food.name}</div>
          <div className="text-[12px] text-[color:var(--ink-light)]">{food.per100.kcal} kcal/100g · <span className="text-[color:var(--sage)] font-medium">{food.source}</span></div>
        </div>
      </button>
      <button onClick={onStar} aria-label={starred ? "Unfavourite" : "Favourite"} className={cn("h-9 w-9 grid place-items-center rounded-full transition-colors shrink-0", starred ? "text-[color:var(--gold)] bg-[color:var(--gold-light)]" : "text-[color:var(--ink-light)] hover:bg-[color:var(--cream-dark)]")}>
        <Star className="h-4 w-4" fill={starred ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

function ServingPicker({ food, onBack, onConfirm }: { food: USDAFood; onBack: () => void; onConfirm: (r: MealAnalysis) => void }) {
  const [unit, setUnit] = useState<"g" | "oz" | "serving">("g");
  const [amount, setAmount] = useState(100);

  useEffect(() => { setAmount(unit === "serving" ? 1 : unit === "oz" ? 3.5 : 100); }, [unit]);
  const grams = unit === "g" ? amount : unit === "oz" ? amount * 28.35 : amount * food.servingSize;
  const factor = grams / 100;
  const calc = { kcal: Math.round(food.per100.kcal * factor), p: Math.round(food.per100.protein * factor * 10) / 10, c: Math.round(food.per100.carbs * factor * 10) / 10, f: Math.round(food.per100.fat * factor * 10) / 10, fibre: Math.round(food.per100.fibre * factor * 10) / 10 };
  const step = unit === "serving" ? 0.5 : unit === "oz" ? 0.5 : 10;

  return (
    <div>
      <button onClick={onBack} className="text-[13px] text-[color:var(--forest)] font-semibold mb-4">← Back to search</button>
      <div className="bg-white rounded-2xl border border-[color:var(--cream-border)] p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-12 w-12 rounded-full bg-[color:var(--cream-dark)] grid place-items-center text-2xl">{food.emoji}</div>
          <div><h3 className="font-display text-[18px]">How much?</h3><p className="text-[13px] text-[color:var(--ink-mid)] truncate max-w-[220px]">{food.name}</p></div>
        </div>
        <div className="flex gap-1 p-1 rounded-full bg-[color:var(--cream-dark)] mb-4">
          {(["g", "oz", "serving"] as const).map((u) => (
            <button key={u} onClick={() => setUnit(u)} className={cn("flex-1 h-9 rounded-full text-[12px] font-semibold uppercase tracking-wider transition-all", unit === u ? "bg-white text-[color:var(--forest)] shadow-elev-sm" : "text-[color:var(--ink-mid)]")}>{u === "serving" ? `${food.servingSize}g` : u}</button>
          ))}
        </div>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setAmount((a) => Math.max(step, +(a - step).toFixed(1)))} className="h-10 w-10 rounded-full border border-[color:var(--cream-border)] grid place-items-center"><Minus className="h-4 w-4" /></button>
          <input type="number" value={amount} min={step} step={step} onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))} className="flex-1 h-12 text-center text-[20px] font-display font-semibold rounded-2xl border border-[color:var(--cream-border)] bg-white outline-none focus:border-[color:var(--forest)]" />
          <button onClick={() => setAmount((a) => +(a + step).toFixed(1))} className="h-10 w-10 rounded-full border border-[color:var(--cream-border)] grid place-items-center"><Plus className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[["kcal", fmtKcal(calc.kcal), "var(--forest)"], ["P", `${calc.p}g`, "#7C3AED"], ["C", `${calc.c}g`, "#2563EB"], ["F", `${calc.f}g`, "var(--gold)"]].map(([l, v, c]) => (
            <div key={l} className="rounded-xl bg-[color:var(--cream-dark)] py-2 text-center">
              <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: c }}>{l}</div>
              <div className="font-display text-[15px] font-bold text-[color:var(--ink)]">{v}</div>
            </div>
          ))}
        </div>
        <PrimaryButton onClick={() => onConfirm({ meal_name: food.name, emoji: food.emoji, calories: calc.kcal, protein: calc.p, carbs: calc.c, fat: calc.f, fibre: calc.fibre, food_score: food.score, verdict: `Accurate macros from ${food.source} database.` })}>Add to Diary →</PrimaryButton>
      </div>
    </div>
  );
}

// ─── Barcode Tab (BarcodeDetector + OpenFoodFacts) ───────────────────

function BarcodeTab({ onResult }: { onResult: (r: MealAnalysis) => void }) {
  const { lookupBarcode } = useFoodSearch();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanRef = useRef<ReturnType<typeof setInterval>>();
  const [scanning, setScanning] = useState(false);
  const [looking, setLooking] = useState(false);
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  const stopCamera = useCallback(() => {
    clearInterval(scanRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null; setScanning(false);
  }, []);

  const handleBarcode = useCallback(async (code: string) => {
    setLooking(true);
    const p = await lookupBarcode(code);
    setLooking(false);
    if (!p) { toast.error("Product not found. Try manual entry or the AI tab."); return; }
    setProduct(p);
  }, [lookupBarcode]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setScanning(true);
      if ("BarcodeDetector" in window) {
        // @ts-ignore
        const detector = new window.BarcodeDetector({ formats: ["ean_13","ean_8","upc_a","upc_e","code_128","code_39"] });
        scanRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) { stopCamera(); await handleBarcode(codes[0].rawValue); }
          } catch { /* keep scanning */ }
        }, 300);
      } else {
        setCameraError("Auto-detect unavailable — enter barcode manually below");
      }
    } catch (e) {
      const msg = (e as Error).message ?? "";
      setCameraError(msg.includes("ermission") || msg.includes("enied") ? "Camera permission denied" : "Camera unavailable");
    }
  }, [stopCamera, handleBarcode]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  if (product) {
    return (
      <ProductView product={product} onBack={() => setProduct(null)} onConfirm={(p, g) => {
        const f = g / 100;
        onResult({ meal_name: p.name, emoji: p.emoji, calories: Math.round(p.per100.kcal * f), protein: Math.round(p.per100.protein * f * 10) / 10, carbs: Math.round(p.per100.carbs * f * 10) / 10, fat: Math.round(p.per100.fat * f * 10) / 10, fibre: Math.round(p.per100.fibre * f * 10) / 10, food_score: p.score, verdict: `Scanned · ${p.nutriScore ? "Nutri-Score " + p.nutriScore : p.source}` });
      }} />
    );
  }

  return (
    <div className="space-y-4">
      <div className="aspect-[4/3] w-full rounded-3xl bg-[color:var(--ink)] relative overflow-hidden grid place-items-center">
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted />
        {["top-6 left-6 border-t-2 border-l-2","top-6 right-6 border-t-2 border-r-2","bottom-6 left-6 border-b-2 border-l-2","bottom-6 right-6 border-b-2 border-r-2"].map((c) => <span key={c} className={cn("absolute h-10 w-10 border-[color:var(--gold)] rounded-sm z-10", c)} />)}
        {scanning && <div className="absolute left-10 right-10 h-0.5 bg-[color:var(--gold)] shadow-[0_0_12px_rgba(196,151,58,0.9)] z-10" style={{ animation: "scanline 2s ease-in-out infinite" }} />}
        {!scanning && !looking && <div className="text-center text-white/80 z-10 px-6"><div className="text-5xl mb-3">📋</div><p className="text-[14px] font-medium">3M+ products</p><p className="text-[12px] text-white/50 mt-1">via OpenFoodFacts</p></div>}
        {looking && <div className="absolute inset-0 bg-black/60 grid place-items-center z-20"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>}
        {cameraError && <div className="absolute inset-x-4 bottom-4 bg-black/70 rounded-xl p-3 z-10"><p className="text-[12px] text-white/90 text-center">{cameraError}</p></div>}
      </div>
      {scanning
        ? <button onClick={stopCamera} className="w-full h-12 rounded-2xl border border-[color:var(--cream-border)] text-[14px] font-semibold text-[color:var(--ink-mid)]">Stop camera</button>
        : <PrimaryButton onClick={startCamera} loading={looking}><Camera className="h-4 w-4 mr-2" /> Start camera scan</PrimaryButton>
      }
      <div className="border-t border-[color:var(--cream-border)] pt-4">
        <p className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold mb-2">Manual barcode entry</p>
        <div className="flex gap-2">
          <input value={manual} onChange={(e) => setManual(e.target.value)} onKeyDown={(e) => e.key === "Enter" && manual.trim() && (stopCamera(), handleBarcode(manual.trim()))} placeholder="e.g. 5000159407236" type="text" inputMode="numeric" className="flex-1 h-11 px-4 rounded-2xl bg-white border border-[color:var(--cream-border)] text-[14px] focus:outline-none focus:border-[color:var(--forest)]" />
          <button onClick={() => { stopCamera(); handleBarcode(manual.trim()); }} disabled={!manual.trim() || looking} className="h-11 px-4 rounded-2xl bg-[color:var(--forest)] text-white text-[13px] font-semibold disabled:opacity-50">
            {looking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <style>{`@keyframes scanline { 0%, 100% { top: 18%; } 50% { top: 82%; } }`}</style>
    </div>
  );
}

function ProductView({ product, onBack, onConfirm }: { product: BarcodeProduct; onBack: () => void; onConfirm: (p: BarcodeProduct, grams: number) => void }) {
  const [grams, setGrams] = useState(product.serving.size);
  const factor = grams / 100;
  const calc = { kcal: Math.round(product.per100.kcal * factor), p: Math.round(product.per100.protein * factor * 10) / 10, c: Math.round(product.per100.carbs * factor * 10) / 10, f: Math.round(product.per100.fat * factor * 10) / 10 };
  const nsColor: Record<string, string> = { A: "#038141", B: "#85BB2F", C: "#FFCC00", D: "#FF6600", E: "#E63E11" };

  return (
    <div>
      <button onClick={onBack} className="text-[13px] text-[color:var(--forest)] font-semibold mb-4">← Scan again</button>
      <div className="bg-white rounded-2xl border border-[color:var(--cream-border)] p-5">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-4xl">{product.emoji}</span>
          <div className="flex-1">
            <h3 className="font-display text-[16px] font-semibold leading-snug">{product.name}</h3>
            {product.brand && <p className="text-[12px] text-[color:var(--ink-light)]">{product.brand}</p>}
            {product.nutriScore && <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded uppercase text-white" style={{ background: nsColor[product.nutriScore] ?? "#888" }}>Nutri-Score {product.nutriScore}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <label className="text-[12px] font-medium text-[color:var(--ink-mid)] whitespace-nowrap">Amount (g)</label>
          <input type="number" value={grams} min={1} step={5} onChange={(e) => setGrams(Math.max(1, Number(e.target.value)))} className="flex-1 h-10 text-center font-display font-semibold rounded-xl border border-[color:var(--cream-border)] outline-none focus:border-[color:var(--forest)]" />
          <button onClick={() => setGrams(product.serving.size)} className="text-[12px] text-[color:var(--forest)] font-medium whitespace-nowrap">1 serving</button>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[["kcal", String(calc.kcal), "var(--forest)"], ["P", `${calc.p}g`, "#7C3AED"], ["C", `${calc.c}g`, "#2563EB"], ["F", `${calc.f}g`, "var(--gold)"]].map(([l, v, c]) => (
            <div key={l} className="rounded-xl bg-[color:var(--cream-dark)] py-2 text-center"><div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: c }}>{l}</div><div className="font-display text-[15px] font-bold text-[color:var(--ink)]">{v}</div></div>
          ))}
        </div>
        <PrimaryButton onClick={() => onConfirm(product, grams)}><Check className="h-4 w-4 mr-2" /> Add to Diary</PrimaryButton>
      </div>
    </div>
  );
}

// ─── Confirm Sheet ───────────────────────────────────────────────────

function ConfirmSheet({ preview, initialMeal, date, onClose, onLogged }: { preview: MealAnalysis; initialMeal: MealType; date: string; onClose: () => void; onLogged: () => void }) {
  const { addLog } = useFoodLog(date);
  const [name, setName] = useState(preview.meal_name);
  const [emoji, setEmoji] = useState(preview.emoji);
  const [meal, setMeal] = useState<MealType>(initialMeal);
  const [servings, setServings] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const mult = servings || 1;
  const c = scoreColor(preview.food_score);

  const confirm = async () => {
    setSubmitting(true);
    const { error } = await addLog({ meal_type: meal, food_name: name.trim() || preview.meal_name, calories: Math.round(preview.calories * mult), protein: Math.round(preview.protein * mult), carbs: Math.round(preview.carbs * mult), fat: Math.round(preview.fat * mult), fibre: Math.round(preview.fibre * mult), food_score: preview.food_score, emoji });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    haptics.success(); onLogged();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center animate-fade-in">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-[430px] bg-white rounded-t-[28px] shadow-elev-lg max-h-[88vh] overflow-y-auto animate-fade-up" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}>
        <div className="sticky top-0 pt-3 bg-white rounded-t-[28px] grid place-items-center z-10"><div className="h-1.5 w-10 rounded-full bg-[color:var(--cream-border)]" /></div>
        <div className="px-5 pt-3 pb-5">
          <div className="flex items-start gap-3 mb-4">
            <button onClick={() => setPickerOpen((v) => !v)} className="text-[40px] leading-none h-14 w-14 grid place-items-center rounded-2xl bg-[color:var(--cream-dark)] hover:bg-[color:var(--sage-light)] transition-colors shrink-0">{emoji}</button>
            <div className="flex-1 min-w-0">
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full font-display text-[18px] font-semibold text-[color:var(--ink)] bg-transparent border-0 border-b border-dashed border-[color:var(--cream-border)] outline-none focus:border-[color:var(--forest)] py-1" />
              <p className="text-[12px] italic text-[color:var(--ink-mid)] mt-1.5 leading-snug">{preview.verdict}</p>
            </div>
            <div className="relative h-[60px] w-[60px] shrink-0">
              <svg width={60} height={60} className="-rotate-90">
                <circle cx={30} cy={30} r={26} fill="none" stroke="var(--cream-border)" strokeWidth={4} />
                <circle cx={30} cy={30} r={26} fill="none" strokeWidth={4} strokeLinecap="round" strokeDasharray={2 * Math.PI * 26} strokeDashoffset={2 * Math.PI * 26 * (1 - preview.food_score / 10)} style={{ stroke: c.fg, transition: "stroke-dashoffset 700ms ease" }} />
              </svg>
              <div className="absolute inset-0 grid place-items-center font-display font-bold text-[20px]" style={{ color: c.fg }}>{preview.food_score}</div>
            </div>
          </div>
          {pickerOpen && (
            <div className="mb-4 p-3 rounded-2xl bg-[color:var(--cream-dark)] grid grid-cols-10 gap-1">
              {EMOJI_OPTIONS.map((e) => <button key={e} onClick={() => { setEmoji(e); setPickerOpen(false); }} className={cn("text-xl h-8 w-8 rounded-md hover:bg-white transition-colors", emoji === e && "bg-white shadow-elev-sm")}>{e}</button>)}
            </div>
          )}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {[["kcal", fmtKcal(preview.calories * mult), "var(--forest)"], ["P", `${Math.round(preview.protein * mult)}g`, "#7C3AED"], ["C", `${Math.round(preview.carbs * mult)}g`, "#2563EB"], ["F", `${Math.round(preview.fat * mult)}g`, "var(--gold)"]].map(([l, v, col]) => (
              <div key={l} className="rounded-2xl bg-[color:var(--cream-dark)] py-2 px-2 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-widest text-[color:var(--ink-light)] font-semibold"><span className="h-1.5 w-1.5 rounded-full" style={{ background: col }} />{l}</div>
                <div className="mt-0.5 text-[14px] font-semibold text-[color:var(--ink)]">{v}</div>
              </div>
            ))}
          </div>
          <p className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold mb-2">Servings</p>
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => setServings((s) => Math.max(0.5, +(s - 0.5).toFixed(1)))} className="h-10 w-10 rounded-full border border-[color:var(--cream-border)] grid place-items-center"><Minus className="h-4 w-4" /></button>
            <input type="number" step="0.5" min="0.5" value={servings} onChange={(e) => setServings(Math.max(0.5, Number(e.target.value) || 1))} className="flex-1 h-12 text-center text-[18px] font-display font-semibold rounded-2xl border border-[color:var(--cream-border)] bg-white outline-none focus:border-[color:var(--forest)]" />
            <button onClick={() => setServings((s) => +(s + 0.5).toFixed(1))} className="h-10 w-10 rounded-full border border-[color:var(--cream-border)] grid place-items-center"><Plus className="h-4 w-4" /></button>
          </div>
          <p className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold mb-2">Meal</p>
          <div className="flex gap-1 p-1 rounded-full bg-[color:var(--cream-dark)] mb-6">
            {MEALS.map((m) => <button key={m} onClick={() => setMeal(m)} className={cn("flex-1 h-9 rounded-full text-[12px] font-semibold capitalize transition-all", meal === m ? "bg-white text-[color:var(--forest)] shadow-elev-sm" : "text-[color:var(--ink-mid)]")}>{m}</button>)}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 h-12 rounded-2xl text-[13px] font-semibold text-[color:var(--ink-mid)] hover:bg-[color:var(--cream-dark)]">Edit</button>
            <button onClick={confirm} disabled={submitting} className="flex-[2] h-14 rounded-2xl bg-gradient-cta text-white text-[15px] font-semibold shadow-elev-cta active:scale-[0.97] transition-transform disabled:opacity-60 inline-flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" strokeWidth={2.6} />}Add to Diary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function scoreColor(score: number) {
  if (score >= 8) return { bg: "var(--sage-light)", fg: "var(--success)" };
  if (score >= 5) return { bg: "var(--gold-light)", fg: "var(--gold)" };
  return { bg: "var(--coral-light)", fg: "var(--coral)" };
}
