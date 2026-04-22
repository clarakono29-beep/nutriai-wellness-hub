import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LeafMark, Wordmark } from "@/components/brand/Logo";
import { PrimaryButton } from "@/components/ui/luxury/PrimaryButton";
import { ArrowRight, Star } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NutriAI — AI Nutrition Tracking & Calorie Counter" },
      {
        name: "description",
        content:
          "The world's most intelligent nutrition app. AI-powered calorie counting, personalised meal plans, and macro tracking. Join 3.4M users transforming their health.",
      },
      {
        name: "keywords",
        content:
          "calorie counter, nutrition tracker, AI food log, macro tracking, meal planning, weight loss app",
      },
      { property: "og:title", content: "NutriAI — AI Nutrition Tracking & Calorie Counter" },
      {
        property: "og:description",
        content:
          "AI-powered calorie counting and macro tracking. Describe your meal in plain English — we handle the rest.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/icon-512.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/icon-512.png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "NutriAI",
          description:
            "AI-powered nutrition tracking that learns your body. Personalised macros, instant meal scoring, longevity-first.",
          applicationCategory: "HealthApplication",
          operatingSystem: "iOS, Android, Web",
          offers: {
            "@type": "Offer",
            price: "9.99",
            priceCurrency: "USD",
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.9",
            ratingCount: "148000",
          },
        }),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="mobile-shell">
      <Hero />
      <Features />
      <Testimonials />
      <FinalCTA />
    </div>
  );
}

/* ---------------- HERO ---------------- */
function Hero() {
  return (
    <section
      className="relative overflow-hidden text-white px-6 pt-6 pb-10 min-h-[100vh] flex flex-col"
      style={{ background: "var(--gradient-hero)" }}
    >
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-[color:var(--gold)] opacity-15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -left-24 h-80 w-80 rounded-full bg-[color:var(--forest-light)] opacity-30 blur-3xl" />

      {/* Top bar */}
      <header className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LeafMark size={26} className="text-[color:var(--gold)]" />
          <Wordmark className="text-white text-[18px]" />
        </div>
        <div className="flex items-center gap-3">
          {import.meta.env.DEV && <DevBypassLink />}
          <Link
            to="/signin"
            className="font-body text-[15px] text-[color:var(--sage-light)] hover:text-white transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero content */}
      <div className="relative mt-8 stagger">
        <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--gold)]/60 px-4 py-1.5 text-[12px] font-medium text-[color:var(--gold-light)]">
          🌿 Trusted by 3.4M people
        </div>

        <h1 className="mt-5 font-display font-black text-white text-[44px] leading-[1.05] tracking-tight">
          Your healthiest self
          <br />
          <span className="italic font-light text-[color:var(--gold-light)]">
            starts here.
          </span>
        </h1>

        <p
          className="mt-5 font-body text-[17px] leading-relaxed max-w-[300px]"
          style={{ color: "rgba(255,255,255,0.72)" }}
        >
          AI-powered nutrition that learns your body, not just your calories.
        </p>
      </div>

      {/* Phone mockup with floating cards */}
      <div className="relative mt-10 mb-8 flex justify-center items-center min-h-[260px]">
        {/* Left floating card */}
        <FoodCard
          className="absolute left-0 top-6 animate-float-delayed"
          emoji="🥑"
          name="Avocado"
          kcal={160}
          score={9}
        />
        {/* Right floating card */}
        <FoodCard
          className="absolute right-0 bottom-4 animate-float"
          emoji="🐟"
          name="Salmon"
          kcal={208}
          score={10}
        />
        {/* Phone */}
        <PhoneMockup />
      </div>

      {/* Social proof */}
      <div className="relative grid grid-cols-3 gap-2 mt-auto">
        <Stat value="3.4M+" label="users" />
        <Stat value="4.9★" label="rating" />
        <Stat value="89%" label="hit goal" />
      </div>

      {/* Bottom CTA */}
      <div className="relative mt-6">
        <Link to="/auth" search={{ mode: "signup" }}>
          <PrimaryButton variant="gold" className="text-[color:var(--forest)]">
            Begin Your Transformation <ArrowRight className="ml-2 h-4 w-4" />
          </PrimaryButton>
        </Link>
        <p
          className="mt-3 text-center font-body text-[13px]"
          style={{ color: "rgba(255,255,255,0.65)" }}
        >
          Takes 3 minutes · Results in 2 weeks
        </p>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 px-2 py-3 text-center">
      <div className="font-display font-black text-[26px] text-[color:var(--gold)] leading-none">
        {value}
      </div>
      <div
        className="mt-1.5 font-body text-[12px]"
        style={{ color: "rgba(255,255,255,0.7)" }}
      >
        {label}
      </div>
    </div>
  );
}

function FoodCard({
  className,
  emoji,
  name,
  kcal,
  score,
}: {
  className?: string;
  emoji: string;
  name: string;
  kcal: number;
  score: number;
}) {
  return (
    <div
      className={
        "z-10 rounded-2xl bg-white px-3 py-2.5 shadow-elev-md min-w-[130px] " +
        (className ?? "")
      }
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl leading-none">{emoji}</span>
        <div>
          <div className="font-body font-semibold text-[13px] text-[color:var(--forest)] leading-tight">
            {name}
          </div>
          <div className="font-body text-[11px] text-[color:var(--ink-mid)] leading-tight mt-0.5">
            {kcal} kcal
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-[color:var(--ink-light)]">
          Score
        </span>
        <span className="font-display font-bold text-[14px] text-[color:var(--gold)]">
          {score}/10
        </span>
      </div>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="relative animate-float">
      <div className="rounded-[36px] bg-[#0E1F16] p-2 shadow-elev-lg border border-white/10">
        <div className="w-[180px] h-[260px] rounded-[28px] bg-[color:var(--cream)] overflow-hidden relative">
          {/* Status bar */}
          <div className="flex justify-between items-center px-4 pt-2 text-[8px] text-[color:var(--ink)] font-semibold">
            <span>9:41</span>
            <span>●●●</span>
          </div>
          {/* Greeting */}
          <div className="px-4 mt-2">
            <div className="text-[9px] uppercase tracking-widest text-[color:var(--sage)]">
              Today
            </div>
            <div className="font-display text-[14px] text-[color:var(--ink)] leading-tight mt-0.5">
              Good morning, Alex
            </div>
          </div>
          {/* Calorie ring */}
          <div className="mt-3 flex justify-center">
            <CalorieRing />
          </div>
          {/* Macros */}
          <div className="px-4 mt-3 space-y-1.5">
            <MacroRow label="Protein" pct={62} color="var(--forest-mid)" />
            <MacroRow label="Carbs" pct={48} color="var(--gold)" />
            <MacroRow label="Fat" pct={71} color="var(--coral)" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CalorieRing() {
  const r = 36;
  const c = 2 * Math.PI * r;
  const pct = 0.62;
  return (
    <div className="relative">
      <svg width="92" height="92" viewBox="0 0 92 92">
        <circle
          cx="46"
          cy="46"
          r={r}
          stroke="var(--cream-dark)"
          strokeWidth="6"
          fill="none"
        />
        <circle
          cx="46"
          cy="46"
          r={r}
          stroke="url(#ringGold)"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform="rotate(-90 46 46)"
        />
        <defs>
          <linearGradient id="ringGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C4973A" />
            <stop offset="100%" stopColor="#E8B94A" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display font-black text-[18px] text-[color:var(--ink)] leading-none">
          1,240
        </div>
        <div className="text-[8px] uppercase tracking-widest text-[color:var(--ink-light)] mt-0.5">
          of 2,000
        </div>
      </div>
    </div>
  );
}

function MacroRow({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-[8px] font-medium text-[color:var(--ink-mid)] mb-0.5">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1 rounded-full bg-[color:var(--cream-dark)] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

/* ---------------- FEATURES ---------------- */
function Features() {
  const features = [
    {
      emoji: "🤖",
      bg: "var(--sage-light)",
      title: "2-Second AI Logging",
      desc: "Just describe your meal in plain English. Our AI identifies every ingredient, calculates precise macros, and logs it instantly. No barcode scanning. No searching databases.",
    },
    {
      emoji: "🧬",
      bg: "var(--gold-light)",
      title: "Your Personal Nutrition DNA",
      desc: "We calculate your exact metabolic rate using medical-grade equations, then build a calorie and macro target that fits YOUR body — not a generic template.",
    },
    {
      emoji: "📈",
      bg: "var(--coral-light)",
      title: "Weekly Life Score",
      desc: "A single number from 0-150 that tells you exactly how your nutrition is trending. More motivating than raw numbers. Updated every Monday.",
    },
  ];
  return (
    <section className="bg-[color:var(--cream)] px-6 py-16">
      <p className="text-caption text-[color:var(--sage)]">The difference</p>
      <h2 className="mt-2 font-display text-[32px] text-[color:var(--forest)] leading-[1.1]">
        Why NutriAI
        <br />
        is different
      </h2>

      <div className="mt-10 space-y-5">
        {features.map((f) => (
          <article
            key={f.title}
            className="rounded-[20px] bg-white border border-[color:var(--cream-border)] p-6 shadow-elev-sm"
          >
            <div
              className="h-14 w-14 rounded-full grid place-items-center text-[28px]"
              style={{ background: f.bg }}
            >
              {f.emoji}
            </div>
            <h4 className="mt-5 font-body font-semibold text-[18px] text-[color:var(--ink)]">
              {f.title}
            </h4>
            <p className="mt-2 font-body text-[15px] leading-relaxed text-[color:var(--ink-mid)]">
              {f.desc}
            </p>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="mt-4 inline-flex items-center gap-1 font-body font-medium text-[14px] text-[color:var(--forest)] hover:text-[color:var(--forest-mid)]"
            >
              See how <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------------- TESTIMONIALS ---------------- */
function Testimonials() {
  const items = [
    {
      initials: "SM",
      name: "Sarah M.",
      result: "Lost 14kg in 4 months",
      quote:
        "I tried every app. NutriAI is the first one that actually feels like a coach who knows me. I just describe what I ate and it does the rest.",
    },
    {
      initials: "JT",
      name: "James T.",
      result: "Gained 6kg lean mass",
      quote:
        "The macro targets adjust as I progress. My energy is through the roof and my lifts have never been stronger.",
    },
    {
      initials: "AK",
      name: "Aisha K.",
      result: "Doctor cleared cholesterol",
      quote:
        "The weekly Life Score kept me focused. Six months later my bloodwork came back perfect. My doctor was stunned.",
    },
  ];
  return (
    <section
      className="px-6 py-16"
      style={{ background: "var(--gradient-hero)" }}
    >
      <p className="text-caption text-[color:var(--gold-light)] opacity-80">
        Testimonials
      </p>
      <h2 className="mt-2 font-display text-[32px] text-white leading-[1.1]">
        Real results,
        <br />
        real people
      </h2>

      <div className="mt-8 -mx-6 px-6 flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2">
        {items.map((t) => (
          <article
            key={t.name}
            className="snap-start shrink-0 w-[280px] rounded-[20px] bg-white p-6 shadow-elev-md"
          >
            <div className="flex items-center gap-3">
              <div
                className="h-11 w-11 rounded-full grid place-items-center font-body font-semibold text-[14px] text-[color:var(--forest)]"
                style={{ background: "var(--gradient-gold)" }}
              >
                {t.initials}
              </div>
              <div>
                <div className="font-body font-semibold text-[14px] text-[color:var(--ink)]">
                  {t.name}
                </div>
                <div className="font-body font-semibold text-[13px] text-[color:var(--gold)]">
                  {t.result}
                </div>
              </div>
            </div>
            <p className="mt-4 font-body text-[14px] italic leading-relaxed text-[color:var(--ink-mid)]">
              "{t.quote}"
            </p>
            <div className="mt-4 flex gap-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star
                  key={i}
                  className="h-4 w-4 fill-[color:var(--gold)] text-[color:var(--gold)]"
                />
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------------- FINAL CTA ---------------- */
function FinalCTA() {
  return (
    <section className="bg-[color:var(--cream)] px-6 py-20 text-center">
      <div className="text-[56px] leading-none">🎯</div>
      <h2 className="mt-6 font-display text-[32px] text-[color:var(--forest)] leading-[1.1]">
        Your plan is waiting
      </h2>
      <p className="mt-4 font-body text-[16px] leading-relaxed text-[color:var(--ink-mid)] max-w-[320px] mx-auto">
        Answer 8 questions and we'll build your complete nutrition strategy in
        60 seconds.
      </p>

      <div className="mt-8">
        <Link to="/auth" search={{ mode: "signup" }}>
          <PrimaryButton variant="primary">
            Start For Free — No Card Needed
          </PrimaryButton>
        </Link>
      </div>

      <p className="mt-6 font-body text-[13px] text-[color:var(--ink-light)]">
        🔒 Secure · 🏅 Science-backed · ✅ Cancel anytime
      </p>

      <p className="mt-12 text-[11px] uppercase tracking-widest text-[color:var(--ink-light)]">
        NutriAI · Eat smarter. Live longer.
      </p>
    </section>
  );
}
