import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { calculateTargets, type ActivityLevel, type Gender, type Goal } from "@/lib/calculations";

import { LeafMark } from "@/components/brand/Logo";
import { PrimaryButton } from "@/components/ui/luxury/PrimaryButton";
import { TextField } from "@/components/ui/luxury/TextField";
import { SurfaceCard } from "@/components/ui/luxury/SurfaceCard";
import { Pill } from "@/components/ui/luxury/Pill";
import { ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/onboarding")({
  head: () => ({ meta: [{ title: "Set up your profile — NutriAI" }] }),
  component: Onboarding,
});

const STEPS = ["welcome", "basics", "body", "activity", "goal", "diet", "summary"] as const;
type Step = (typeof STEPS)[number];

interface Answers {
  name: string;
  gender: Gender | "";
  age: number | "";
  height_cm: number | "";
  weight_kg: number | "";
  target_weight_kg: number | "";
  activity_level: ActivityLevel | "";
  goal: Goal | "";
  diet_preferences: string[];
}

const DIETS = ["Mediterranean", "High-protein", "Vegetarian", "Vegan", "Pescatarian", "Low-carb", "No restrictions"];

function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { update } = useProfile();
  const [step, setStep] = useState<Step>("welcome");
  const [submitting, setSubmitting] = useState(false);

  const [a, setA] = useState<Answers>({
    name: user?.user_metadata?.name ?? "",
    gender: "",
    age: "",
    height_cm: "",
    weight_kg: "",
    target_weight_kg: "",
    activity_level: "",
    goal: "",
    diet_preferences: [],
  });

  const idx = STEPS.indexOf(step);
  const progressPct = (idx / (STEPS.length - 1)) * 100;

  const goNext = () => setStep(STEPS[Math.min(idx + 1, STEPS.length - 1)]);
  const goBack = () => setStep(STEPS[Math.max(idx - 1, 0)]);

  const canContinue = (() => {
    switch (step) {
      case "welcome": return true;
      case "basics": return a.name.trim().length > 0 && a.gender && Number(a.age) >= 13;
      case "body": return Number(a.height_cm) > 0 && Number(a.weight_kg) > 0;
      case "activity": return !!a.activity_level;
      case "goal": return !!a.goal && (a.goal === "maintain" || Number(a.target_weight_kg) > 0);
      case "diet": return true;
      case "summary": return true;
    }
  })();

  const finalize = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const targets = calculateTargets({
        gender: a.gender as Gender,
        age: Number(a.age),
        height_cm: Number(a.height_cm),
        weight_kg: Number(a.weight_kg),
        activity_level: a.activity_level as ActivityLevel,
        goal: a.goal as Goal,
      });

      const { error } = await update({
        name: a.name,
        gender: a.gender as string,
        age: Number(a.age),
        height_cm: Number(a.height_cm),
        weight_kg: Number(a.weight_kg),
        target_weight_kg: a.target_weight_kg ? Number(a.target_weight_kg) : null,
        activity_level: a.activity_level as string,
        goal: a.goal as string,
        diet_preferences: a.diet_preferences,
        ...targets,
        onboarding_completed: true,
      });
      if (error) throw error;
      toast.success("Profile complete. Let's eat.");
      navigate({ to: "/app" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mobile-shell flex flex-col">
      {/* Top bar */}
      <header className="px-6 pt-6 pb-4 flex items-center gap-3">
        {idx > 0 && (
          <button
            onClick={goBack}
            className="h-10 w-10 grid place-items-center rounded-full bg-[color:var(--cream-dark)] text-[color:var(--ink-mid)]"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="flex-1 h-1.5 rounded-full bg-[color:var(--cream-dark)] overflow-hidden">
          <div
            className="h-full bg-gradient-cta transition-all duration-500 ease-luxury"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-[11px] uppercase tracking-widest text-[color:var(--ink-light)]">
          {idx + 1}/{STEPS.length}
        </span>
      </header>

      <main key={step} className="flex-1 px-6 pb-32 animate-fade-up">
        {step === "welcome" && (
          <div className="pt-8">
            <div className="text-[color:var(--forest)]"><LeafMark size={56} /></div>
            <h1 className="mt-6 font-display text-[34px] font-black leading-tight">
              Let’s tailor NutriAI to you.
            </h1>
            <p className="mt-3 text-[15px] text-[color:var(--ink-mid)]">
              Six quick questions. Your numbers, your goals, your way.
              We’ll calculate your perfect daily targets.
            </p>
            <SurfaceCard tone="cream" className="mt-8">
              <p className="text-[13px] text-[color:var(--ink-mid)] leading-relaxed">
                <strong className="text-[color:var(--forest)]">Privacy first.</strong> Your data
                stays yours. We never sell or share it.
              </p>
            </SurfaceCard>
          </div>
        )}

        {step === "basics" && (
          <div className="pt-4">
            <h2 className="font-display text-[28px] font-bold">Tell us about you</h2>
            <p className="mt-2 text-[14px] text-[color:var(--ink-mid)]">The basics first.</p>
            <div className="mt-6 space-y-4">
              <TextField
                label="Name"
                value={a.name}
                onChange={(e) => setA({ ...a, name: e.target.value })}
                placeholder="Alex"
              />
              <div>
                <label className="block text-[13px] font-medium text-[color:var(--ink-mid)] mb-2">
                  Gender
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["female", "male", "other"] as Gender[]).map((g) => (
                    <ChipChoice
                      key={g}
                      active={a.gender === g}
                      onClick={() => setA({ ...a, gender: g })}
                    >
                      {g[0].toUpperCase() + g.slice(1)}
                    </ChipChoice>
                  ))}
                </div>
              </div>
              <TextField
                label="Age"
                type="number"
                inputMode="numeric"
                value={a.age}
                onChange={(e) => setA({ ...a, age: e.target.value === "" ? "" : Number(e.target.value) })}
                placeholder="32"
              />
            </div>
          </div>
        )}

        {step === "body" && (
          <div className="pt-4">
            <h2 className="font-display text-[28px] font-bold">Your measurements</h2>
            <p className="mt-2 text-[14px] text-[color:var(--ink-mid)]">Used to calculate your daily energy needs.</p>
            <div className="mt-6 space-y-4">
              <TextField
                label="Height"
                type="number"
                inputMode="decimal"
                value={a.height_cm}
                onChange={(e) => setA({ ...a, height_cm: e.target.value === "" ? "" : Number(e.target.value) })}
                trailing="cm"
                placeholder="172"
              />
              <TextField
                label="Current weight"
                type="number"
                inputMode="decimal"
                value={a.weight_kg}
                onChange={(e) => setA({ ...a, weight_kg: e.target.value === "" ? "" : Number(e.target.value) })}
                trailing="kg"
                placeholder="68"
              />
            </div>
          </div>
        )}

        {step === "activity" && (
          <div className="pt-4">
            <h2 className="font-display text-[28px] font-bold">How active are you?</h2>
            <p className="mt-2 text-[14px] text-[color:var(--ink-mid)]">Be honest. We can always recalibrate.</p>
            <div className="mt-6 space-y-3">
              {[
                { v: "sedentary", label: "Sedentary", sub: "Desk job, little movement" },
                { v: "light", label: "Lightly active", sub: "Walks, occasional gym" },
                { v: "moderate", label: "Moderately active", sub: "3–5 workouts a week" },
                { v: "active", label: "Very active", sub: "6–7 workouts a week" },
                { v: "very_active", label: "Athlete", sub: "Hard training, twice a day" },
              ].map((o) => (
                <RowChoice
                  key={o.v}
                  active={a.activity_level === o.v}
                  onClick={() => setA({ ...a, activity_level: o.v as ActivityLevel })}
                  title={o.label}
                  subtitle={o.sub}
                />
              ))}
            </div>
          </div>
        )}

        {step === "goal" && (
          <div className="pt-4">
            <h2 className="font-display text-[28px] font-bold">What’s your goal?</h2>
            <p className="mt-2 text-[14px] text-[color:var(--ink-mid)]">We’ll set your calories accordingly.</p>
            <div className="mt-6 space-y-3">
              {[
                { v: "lose", label: "Lose fat", sub: "~0.5 kg per week" },
                { v: "maintain", label: "Maintain", sub: "Body recomposition" },
                { v: "gain", label: "Gain muscle", sub: "Lean surplus" },
              ].map((o) => (
                <RowChoice
                  key={o.v}
                  active={a.goal === o.v}
                  onClick={() => setA({ ...a, goal: o.v as Goal })}
                  title={o.label}
                  subtitle={o.sub}
                />
              ))}
              {a.goal !== "maintain" && (
                <div className="pt-2">
                  <TextField
                    label="Target weight"
                    type="number"
                    inputMode="decimal"
                    value={a.target_weight_kg}
                    onChange={(e) =>
                      setA({ ...a, target_weight_kg: e.target.value === "" ? "" : Number(e.target.value) })
                    }
                    trailing="kg"
                    placeholder="65"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {step === "diet" && (
          <div className="pt-4">
            <h2 className="font-display text-[28px] font-bold">Diet preferences</h2>
            <p className="mt-2 text-[14px] text-[color:var(--ink-mid)]">
              Pick what fits. We’ll adapt suggestions accordingly.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {DIETS.map((d) => {
                const active = a.diet_preferences.includes(d);
                return (
                  <button
                    key={d}
                    onClick={() => {
                      setA({
                        ...a,
                        diet_preferences: active
                          ? a.diet_preferences.filter((x) => x !== d)
                          : [...a.diet_preferences, d],
                      });
                    }}
                    className={cn(
                      "px-4 h-11 rounded-full text-[14px] font-medium transition-all ease-luxury active:scale-[0.97]",
                      active
                        ? "bg-[color:var(--forest)] text-white shadow-elev-sm"
                        : "bg-white border border-[color:var(--cream-border)] text-[color:var(--ink-mid)]",
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === "summary" && (() => {
          const targets = calculateTargets({
            gender: (a.gender as Gender) || "other",
            age: Number(a.age) || 30,
            height_cm: Number(a.height_cm) || 170,
            weight_kg: Number(a.weight_kg) || 70,
            activity_level: (a.activity_level as ActivityLevel) || "moderate",
            goal: (a.goal as Goal) || "maintain",
          });
          return (
            <div className="pt-4">
              <Pill tone="gold">Your blueprint</Pill>
              <h2 className="mt-3 font-display text-[28px] font-bold">Hello, {a.name || "friend"}.</h2>
              <p className="mt-2 text-[14px] text-[color:var(--ink-mid)]">
                Here are your personalised daily targets.
              </p>

              <SurfaceCard tone="forest" className="mt-6 text-center">
                <p className="text-caption text-white/60">Daily calories</p>
                <div className="mt-2 font-display font-black text-[48px] text-[color:var(--gold-light)] leading-none">
                  {targets.daily_calories}
                </div>
                <p className="text-[13px] text-white/70 mt-1">kcal · {a.goal} mode</p>
              </SurfaceCard>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <MacroChip label="Protein" value={`${targets.protein_g}g`} />
                <MacroChip label="Carbs" value={`${targets.carbs_g}g`} />
                <MacroChip label="Fat" value={`${targets.fat_g}g`} />
              </div>

              <SurfaceCard className="mt-4 flex justify-between items-center">
                <div>
                  <p className="text-[12px] text-[color:var(--ink-light)] uppercase tracking-widest">BMR</p>
                  <p className="font-display text-xl">{targets.bmr}</p>
                </div>
                <div>
                  <p className="text-[12px] text-[color:var(--ink-light)] uppercase tracking-widest">TDEE</p>
                  <p className="font-display text-xl">{targets.tdee}</p>
                </div>
                <div>
                  <p className="text-[12px] text-[color:var(--ink-light)] uppercase tracking-widest">Goal</p>
                  <p className="font-display text-xl capitalize">{a.goal}</p>
                </div>
              </SurfaceCard>
            </div>
          );
        })()}
      </main>

      {/* Sticky CTA */}
      <div className="sticky bottom-0 left-0 right-0 px-6 pt-4 pb-6 bg-gradient-to-t from-[color:var(--cream)] via-[color:var(--cream)]/95 to-transparent">
        {step === "summary" ? (
          <PrimaryButton onClick={finalize} loading={submitting}>
            Open my dashboard
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={goNext} disabled={!canContinue}>
            Continue
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}

function ChipChoice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-12 rounded-[14px] text-[14px] font-medium transition-all ease-luxury active:scale-[0.97]",
        active
          ? "bg-[color:var(--forest)] text-white shadow-elev-sm"
          : "bg-white border border-[color:var(--cream-border)] text-[color:var(--ink-mid)]",
      )}
    >
      {children}
    </button>
  );
}

function RowChoice({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-[14px] flex items-center justify-between transition-all ease-luxury active:scale-[0.99]",
        active
          ? "bg-[color:var(--sage-light)] border border-[color:var(--forest-light)]"
          : "bg-white border border-[color:var(--cream-border)] hover:border-[color:var(--sage)]",
      )}
    >
      <div>
        <div className="font-body font-semibold text-[15px] text-[color:var(--ink)]">{title}</div>
        <div className="text-[13px] text-[color:var(--ink-mid)] mt-0.5">{subtitle}</div>
      </div>
      <div
        className={cn(
          "h-6 w-6 rounded-full grid place-items-center transition-all",
          active ? "bg-[color:var(--forest)] text-white" : "border border-[color:var(--cream-border)]",
        )}
      >
        {active && <Check className="h-3.5 w-3.5" />}
      </div>
    </button>
  );
}

function MacroChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-white border border-[color:var(--cream-border)] py-3 text-center">
      <p className="text-[10px] uppercase tracking-widest text-[color:var(--ink-light)]">{label}</p>
      <p className="font-display text-lg mt-1 text-[color:var(--forest)]">{value}</p>
    </div>
  );
}
