import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import {
  calculateTargets,
  type ActivityLevel,
  type Gender,
  type Goal,
} from "@/lib/calculations";

import { LeafMark, Wordmark } from "@/components/brand/Logo";
import { PrimaryButton } from "@/components/ui/luxury/PrimaryButton";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/onboarding")({
  head: () => ({ meta: [{ title: "Set up your profile — NutriAI" }] }),
  component: Onboarding,
});

const TOTAL_STEPS = 12;

type Direction = 1 | -1;

interface Answers {
  problems: string[];
  goal: Goal | "health" | "";
  name: string;
  // Reserved for later steps (5-12)
  gender: Gender | "";
  age: number | "";
  height_cm: number | "";
  weight_kg: number | "";
  target_weight_kg: number | "";
  activity_level: ActivityLevel | "";
  diet_preferences: string[];
}

const PROBLEMS = [
  {
    id: "calorie",
    icon: "🔄",
    title: "Calorie counting feels impossible",
    sub: "I start strong but always give up within a week",
  },
  {
    id: "forget",
    icon: "📱",
    title: "I forget to log and lose track",
    sub: "Life gets busy and consistency falls apart",
  },
  {
    id: "no-results",
    icon: "😤",
    title: "I've tried many apps, seen zero results",
    sub: "Nothing sticks. I'm back to square one.",
  },
  {
    id: "boring",
    icon: "😐",
    title: "Healthy eating feels boring & punishing",
    sub: "I can't sustain a diet I don't enjoy",
  },
  {
    id: "no-time",
    icon: "⏰",
    title: "I don't have time to plan meals",
    sub: "I'm too busy to research what I should eat",
  },
  {
    id: "confused",
    icon: "🤷",
    title: "I genuinely don't know what to eat",
    sub: "Nutrition advice online is confusing and contradictory",
  },
];

const GOALS: {
  v: "lose" | "gain" | "maintain" | "health";
  emoji: string;
  title: string;
  sub: string;
  bg: string;
}[] = [
  {
    v: "lose",
    emoji: "🔥",
    title: "Lose weight",
    sub: "Burn fat, feel lighter, build confidence",
    bg: "var(--coral-light)",
  },
  {
    v: "gain",
    emoji: "💪",
    title: "Build muscle",
    sub: "Gain strength, increase mass, perform better",
    bg: "var(--sage-light)",
  },
  {
    v: "maintain",
    emoji: "⚖️",
    title: "Maintain weight",
    sub: "Sustain your current weight, optimise energy",
    bg: "var(--gold-light)",
  },
  {
    v: "health",
    emoji: "❤️",
    title: "Improve overall health",
    sub: "Better nutrition, more energy, long-term vitality",
    bg: "color-mix(in oklab, var(--forest) 10%, white)",
  },
];

function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { update } = useProfile();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<Direction>(1);
  const [submitting, setSubmitting] = useState(false);

  const [a, setA] = useState<Answers>({
    problems: [],
    goal: "",
    name: user?.user_metadata?.name ?? "",
    gender: "",
    age: "",
    height_cm: "",
    weight_kg: "",
    target_weight_kg: "",
    activity_level: "",
    diet_preferences: [],
  });

  const progressPct = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  const goNext = () => {
    if (step >= TOTAL_STEPS) return;
    setDirection(1);
    setStep((s) => s + 1);
  };
  const goBack = () => {
    if (step <= 1) return;
    setDirection(-1);
    setStep((s) => s - 1);
  };

  const canContinue = (() => {
    switch (step) {
      case 1:
        return true;
      case 2:
        return a.problems.length >= 1;
      case 3:
        return !!a.goal;
      case 4:
        return a.name.trim().length >= 2;
      default:
        return true;
    }
  })();

  const ctaLabel = (() => {
    if (step === 1) return "Begin My Journey";
    if (step === 4) {
      const trimmed = a.name.trim();
      return trimmed.length >= 2 ? `Nice to meet you, ${trimmed}` : "Continue";
    }
    if (step === TOTAL_STEPS) return "Open my dashboard";
    return "Continue";
  })();

  const finalize = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const targets = calculateTargets({
        gender: (a.gender as Gender) || "other",
        age: Number(a.age) || 30,
        height_cm: Number(a.height_cm) || 170,
        weight_kg: Number(a.weight_kg) || 70,
        activity_level: (a.activity_level as ActivityLevel) || "moderate",
        goal: (a.goal === "health" ? "maintain" : (a.goal as Goal)) || "maintain",
      });
      const { error } = await update({
        name: a.name,
        gender: (a.gender as string) || null,
        age: a.age === "" ? null : Number(a.age),
        height_cm: a.height_cm === "" ? null : Number(a.height_cm),
        weight_kg: a.weight_kg === "" ? null : Number(a.weight_kg),
        target_weight_kg:
          a.target_weight_kg === "" ? null : Number(a.target_weight_kg),
        activity_level: (a.activity_level as string) || null,
        goal: (a.goal as string) || "maintain",
        diet_preferences: a.diet_preferences,
        ...targets,
        onboarding_completed: true,
      });
      if (error) throw error;
      toast.success("Profile complete. Let's eat.");
      navigate({ to: "/app" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 1 is full-bleed splash with its own CTA; render separately.
  if (step === 1) {
    return <WelcomeStep onBegin={goNext} />;
  }

  return (
    <div className="mobile-shell flex flex-col min-h-[100dvh] bg-[color:var(--cream)]">
      {/* Top bar */}
      <header className="px-6 pt-5 pb-4 flex items-center gap-3">
        {step > 1 ? (
          <button
            onClick={goBack}
            className="h-10 w-10 grid place-items-center rounded-full bg-white border border-[color:var(--cream-border)] text-[color:var(--ink-mid)] hover:border-[color:var(--forest)] transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : (
          <div className="h-10 w-10" aria-hidden />
        )}

        <div className="flex-1 h-[3px] rounded-full bg-[color:var(--cream-border)] overflow-hidden">
          <div
            className="h-full bg-[color:var(--forest)] transition-all duration-500 ease-luxury"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <span className="text-[12px] font-body font-medium text-[color:var(--ink-light)] tabular-nums min-w-[44px] text-right">
          {step} of {TOTAL_STEPS}
        </span>
      </header>

      {/* Animated content */}
      <StepShell step={step} direction={direction}>
        {step === 2 && (
          <ProblemStep
            selected={a.problems}
            onToggle={(id) =>
              setA({
                ...a,
                problems: a.problems.includes(id)
                  ? a.problems.filter((x) => x !== id)
                  : [...a.problems, id],
              })
            }
          />
        )}
        {step === 3 && (
          <GoalStep
            value={a.goal}
            onChange={(g) => setA({ ...a, goal: g })}
          />
        )}
        {step === 4 && (
          <NameStep
            value={a.name}
            onChange={(name) => setA({ ...a, name })}
          />
        )}
        {step >= 5 && step < TOTAL_STEPS && (
          <PlaceholderStep step={step} onSkip={goNext} />
        )}
        {step === TOTAL_STEPS && (
          <PlaceholderStep step={step} onSkip={() => {}} final />
        )}
      </StepShell>

      {/* Sticky CTA */}
      <div className="sticky bottom-0 left-0 right-0 px-6 pt-6 pb-6 bg-gradient-to-t from-[color:var(--cream)] via-[color:var(--cream)] to-transparent">
        <PrimaryButton
          onClick={step === TOTAL_STEPS ? finalize : goNext}
          disabled={!canContinue}
          loading={submitting}
        >
          {ctaLabel}
          {!submitting && <ArrowRight className="ml-2 h-4 w-4" />}
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ----------------- STEP SHELL (transitions) ----------------- */

function StepShell({
  step,
  direction,
  children,
}: {
  step: number;
  direction: Direction;
  children: React.ReactNode;
}) {
  const [renderKey, setRenderKey] = useState(step);
  const [animClass, setAnimClass] = useState("step-enter");

  useEffect(() => {
    setAnimClass(direction === 1 ? "step-enter-right" : "step-enter-left");
    setRenderKey(step);
  }, [step, direction]);

  return (
    <main className="flex-1 px-6 pb-24 overflow-y-auto">
      <div key={renderKey} className={animClass}>
        {children}
      </div>
    </main>
  );
}

/* ----------------- STEP 1: WELCOME ----------------- */

const FLOATING_FOODS: { emoji: string; top: string; left: string; dur: number; delay: number }[] = [
  { emoji: "🥑", top: "8%", left: "10%", dur: 6, delay: 0 },
  { emoji: "🐟", top: "14%", left: "78%", dur: 7, delay: 1.2 },
  { emoji: "🥦", top: "26%", left: "20%", dur: 5.4, delay: 0.6 },
  { emoji: "🍇", top: "22%", left: "65%", dur: 6.6, delay: 2.1 },
  { emoji: "🥕", top: "70%", left: "8%", dur: 7.2, delay: 0.9 },
  { emoji: "🍳", top: "65%", left: "82%", dur: 5.8, delay: 1.7 },
  { emoji: "🥗", top: "82%", left: "22%", dur: 6.4, delay: 2.5 },
  { emoji: "🫐", top: "78%", left: "70%", dur: 6.8, delay: 0.3 },
];

function WelcomeStep({ onBegin }: { onBegin: () => void }) {
  return (
    <div
      className="mobile-shell relative overflow-hidden text-white flex flex-col min-h-[100dvh] px-6 pt-6 pb-8"
      style={{ background: "var(--gradient-hero)" }}
    >
      {/* Floating food icons */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {FLOATING_FOODS.map((f, i) => (
          <span
            key={i}
            className="absolute text-[34px] opacity-25 will-change-transform"
            style={{
              top: f.top,
              left: f.left,
              animation: `float-y ${f.dur}s ease-in-out ${f.delay}s infinite`,
            }}
          >
            {f.emoji}
          </span>
        ))}
      </div>

      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-[color:var(--gold)] opacity-15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-[color:var(--forest-light)] opacity-30 blur-3xl" />

      {/* Centered hero */}
      <div className="relative flex-1 flex flex-col items-center justify-center text-center stagger">
        <div className="text-[color:var(--gold)] animate-leaf-pulse">
          <LeafMark size={80} />
        </div>
        <Wordmark className="mt-4 text-[22px] text-white" />
        <h1 className="mt-8 font-display font-black text-white text-[36px] leading-[1.05] tracking-tight">
          Welcome to <span className="italic font-light text-[color:var(--gold-light)]">NutriAI</span>
        </h1>
        <p
          className="mt-5 font-body text-[16px] leading-relaxed max-w-[320px]"
          style={{ color: "rgba(255,255,255,0.75)" }}
        >
          The world's most intelligent nutrition companion — personalised
          entirely to you in the next 3 minutes.
        </p>
      </div>

      {/* Bottom CTA */}
      <div className="relative">
        <PrimaryButton
          variant="gold"
          className="text-[color:var(--forest)]"
          onClick={onBegin}
        >
          Begin My Journey <ArrowRight className="ml-2 h-4 w-4" />
        </PrimaryButton>
        <p
          className="mt-4 text-center font-body text-[11px]"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Join 3.4M people already transforming
        </p>
      </div>
    </div>
  );
}

/* ----------------- STEP 2: PROBLEMS ----------------- */

function ProblemStep({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="pt-2">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--sage-light)] px-3 py-1 text-[10px] uppercase tracking-widest font-semibold text-[color:var(--forest)]">
        We get it
      </div>
      <h2 className="mt-4 font-display font-bold text-[30px] text-[color:var(--ink)] leading-[1.1]">
        Do any of these
        <br />
        feel familiar?
      </h2>
      <p className="mt-3 font-body text-[15px] text-[color:var(--ink-mid)] leading-relaxed">
        Select everything that resonates — your answers shape your entire
        experience
      </p>

      <div className="mt-6 space-y-3">
        {PROBLEMS.map((p) => {
          const active = selected.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => onToggle(p.id)}
              className={cn(
                "w-full text-left rounded-[14px] py-[18px] px-5 transition-all duration-200 ease-luxury active:scale-[0.99]",
                "flex items-start gap-3 border-[1.5px]",
                active
                  ? "bg-[#F0F5F1] border-[color:var(--forest)] border-l-4 shadow-elev-sm"
                  : "bg-white border-[color:var(--cream-border)] shadow-elev-sm",
              )}
            >
              <span className="text-[24px] leading-none mt-0.5">{p.icon}</span>
              <div className="flex-1">
                <div className="font-body font-semibold text-[15px] text-[color:var(--ink)] leading-snug">
                  {p.title}
                </div>
                <div className="mt-1 font-body text-[13px] text-[color:var(--ink-mid)] leading-snug">
                  {p.sub}
                </div>
              </div>
              <div
                className={cn(
                  "h-5 w-5 mt-0.5 shrink-0 rounded-full grid place-items-center transition-colors",
                  active
                    ? "bg-[color:var(--forest)] text-white"
                    : "border border-[color:var(--cream-border)]",
                )}
              >
                {active && <Check className="h-3 w-3" strokeWidth={3} />}
              </div>
            </button>
          );
        })}
      </div>

      {selected.length >= 2 && (
        <div className="mt-6 rounded-[14px] bg-[color:var(--sage-light)] border-l-4 border-[color:var(--forest)] p-5 animate-fade-up">
          <p className="font-body text-[14px] leading-relaxed text-[color:var(--forest)]">
            <strong className="font-semibold">You're not alone.</strong> 94% of
            NutriAI users felt exactly this before joining.
          </p>
          <p className="mt-2 font-display italic text-[16px] text-[color:var(--forest)]">
            That changes today.
          </p>
        </div>
      )}
    </div>
  );
}

/* ----------------- STEP 3: GOAL ----------------- */

function GoalStep({
  value,
  onChange,
}: {
  value: Answers["goal"];
  onChange: (g: Answers["goal"]) => void;
}) {
  return (
    <div className="pt-2">
      <h2 className="font-display font-bold text-[30px] text-[color:var(--ink)] leading-[1.1]">
        What's your
        <br />
        primary goal?
      </h2>
      <p className="mt-3 font-body text-[15px] text-[color:var(--ink-mid)] leading-relaxed">
        This shapes your calorie target, macro split, meal plans, and recipe
        recommendations.
      </p>

      <div className="mt-6 space-y-3">
        {GOALS.map((g) => {
          const active = value === g.v;
          return (
            <button
              key={g.v}
              onClick={() => onChange(g.v)}
              className={cn(
                "w-full h-[88px] px-4 rounded-[14px] flex items-center gap-4 transition-all duration-200 ease-luxury active:scale-[0.99]",
                "border-[1.5px]",
                active
                  ? "bg-[#F0F5F1] border-[color:var(--forest)] shadow-elev-sm"
                  : "bg-white border-[color:var(--cream-border)] shadow-elev-sm",
              )}
            >
              <div
                className="h-14 w-14 shrink-0 rounded-full grid place-items-center text-[30px]"
                style={{ background: g.bg }}
              >
                {g.emoji}
              </div>
              <div className="flex-1 text-left">
                <div className="font-body font-semibold text-[17px] text-[color:var(--ink)] leading-tight">
                  {g.title}
                </div>
                <div className="mt-1 font-body text-[13px] text-[color:var(--ink-mid)] leading-snug">
                  {g.sub}
                </div>
              </div>
              <div
                className={cn(
                  "h-6 w-6 shrink-0 rounded-full grid place-items-center transition-colors",
                  active
                    ? "border-[7px] border-[color:var(--forest)]"
                    : "border-[1.5px] border-[color:var(--cream-border)]",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------- STEP 4: NAME ----------------- */

function NameStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const trimmed = value.trim();
  const showGreeting = trimmed.length >= 2;

  return (
    <div className="pt-2">
      <h2 className="font-display font-bold text-[30px] text-[color:var(--ink)] leading-[1.1]">
        What should
        <br />
        we call you?
      </h2>
      <p className="mt-3 font-body text-[15px] text-[color:var(--ink-mid)] leading-relaxed">
        We personalise every element of your experience — from your morning
        greeting to your meal timing.
      </p>

      <div className="mt-8">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your first name..."
          autoComplete="given-name"
          className={cn(
            "w-full h-[60px] px-5 rounded-[14px] bg-white",
            "font-display text-[20px] text-[color:var(--ink)]",
            "border-[1.5px] border-[color:var(--cream-border)]",
            "placeholder:text-[color:var(--ink-light)] placeholder:font-display placeholder:italic",
            "focus:outline-none focus:border-[color:var(--forest)]",
            "focus:shadow-[0_0_0_3px_rgba(45,90,64,0.12)] transition-all",
          )}
        />
      </div>

      {showGreeting && (
        <div className="mt-6 rounded-[14px] bg-[color:var(--gold)]/10 border-l-4 border-[color:var(--gold)] p-5 animate-fade-up">
          <p className="font-body text-[15px] leading-relaxed text-[color:var(--ink)]">
            Hi <span className="font-semibold">{trimmed}</span>! 👋 We're
            building your personalised nutrition plan right now.
          </p>
        </div>
      )}
    </div>
  );
}

/* ----------------- PLACEHOLDER (steps 5–12) ----------------- */

function PlaceholderStep({
  step,
  onSkip,
  final,
}: {
  step: number;
  onSkip: () => void;
  final?: boolean;
}) {
  return (
    <div className="pt-2">
      <h2 className="font-display font-bold text-[30px] text-[color:var(--ink)] leading-[1.1]">
        Step {step}
      </h2>
      <p className="mt-3 font-body text-[15px] text-[color:var(--ink-mid)] leading-relaxed">
        {final
          ? "Your blueprint is ready."
          : "This step is coming soon. Tap continue to proceed."}
      </p>
      {!final && (
        <button
          onClick={onSkip}
          className="mt-6 text-[13px] uppercase tracking-widest text-[color:var(--sage)]"
        >
          Skip for now
        </button>
      )}
    </div>
  );
}
