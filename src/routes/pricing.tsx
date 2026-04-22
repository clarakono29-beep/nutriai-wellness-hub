import { createFileRoute, Link } from "@tanstack/react-router";
import { PrimaryButton } from "@/components/ui/luxury/PrimaryButton";
import { SurfaceCard } from "@/components/ui/luxury/SurfaceCard";
import { Pill } from "@/components/ui/luxury/Pill";
import { LeafMark, Wordmark } from "@/components/brand/Logo";
import { ArrowLeft, Check } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — NutriAI" },
      { name: "description", content: "Choose your NutriAI plan. Monthly, quarterly, or annual." },
      { property: "og:title", content: "NutriAI Pricing" },
      { property: "og:description", content: "Simple plans. Cancel anytime." },
    ],
  }),
  component: Pricing,
});

const plans = [
  {
    id: "monthly",
    name: "Monthly",
    price: "$12.99",
    cadence: "/month",
    sub: "Billed monthly",
    badge: null as string | null,
    cta: "Start monthly",
  },
  {
    id: "quarterly",
    name: "Quarterly",
    price: "$8.99",
    cadence: "/month",
    sub: "$26.99 every 3 months",
    badge: "Save 30%",
    cta: "Start quarterly",
  },
  {
    id: "annual",
    name: "Annual",
    price: "$4.99",
    cadence: "/month",
    sub: "$59.99 billed yearly",
    badge: "Best value",
    cta: "Start annual",
  },
];

const features = [
  "Unlimited AI meal analysis",
  "Personalised macro targets",
  "Longevity insights",
  "Streak tracking & weight history",
  "Curated programs & recipes",
];

export default function PricingComponent() {}

function Pricing() {
  return (
    <div className="mobile-shell">
      <header className="px-6 pt-6 flex items-center justify-between">
        <Link
          to="/"
          className="h-10 w-10 grid place-items-center rounded-full bg-[color:var(--cream-dark)] text-[color:var(--ink-mid)]"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-1.5 text-[color:var(--forest)]">
          <LeafMark size={22} />
          <Wordmark className="text-[color:var(--forest)] text-base" />
        </div>
        <div className="w-10" />
      </header>

      <section className="px-6 pt-8 pb-2 animate-fade-up">
        <Pill tone="sage">14-day free trial</Pill>
        <h1 className="mt-3 font-display text-[36px] font-black leading-tight">
          Invest in <span className="italic font-light">you.</span>
        </h1>
        <p className="mt-2 text-[15px] text-[color:var(--ink-mid)]">
          Cancel anytime. All plans include every feature.
        </p>
      </section>

      <section className="px-6 mt-8 stagger pb-10 space-y-4">
        {plans.map((p) => (
          <SurfaceCard
            key={p.id}
            className="relative"
            tone={p.id === "annual" ? "forest" : "white"}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3
                  className={`font-display text-2xl ${
                    p.id === "annual" ? "text-white" : "text-[color:var(--ink)]"
                  }`}
                >
                  {p.name}
                </h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span
                    className={`font-display font-black text-[36px] ${
                      p.id === "annual" ? "text-[color:var(--gold-light)]" : "text-[color:var(--forest)]"
                    }`}
                  >
                    {p.price}
                  </span>
                  <span className={p.id === "annual" ? "text-white/70" : "text-[color:var(--ink-light)]"}>
                    {p.cadence}
                  </span>
                </div>
                <p className={`mt-1 text-[12px] ${p.id === "annual" ? "text-white/60" : "text-[color:var(--ink-light)]"}`}>
                  {p.sub}
                </p>
              </div>
              {p.badge && <Pill tone={p.id === "annual" ? "gold" : "sage"}>{p.badge}</Pill>}
            </div>

            <button
              className={`mt-5 w-full h-12 rounded-[14px] font-semibold text-[15px] transition-all ease-luxury active:scale-[0.97] ${
                p.id === "annual"
                  ? "bg-gradient-gold text-[color:var(--ink)] shadow-elev-gold"
                  : "bg-gradient-cta text-white shadow-elev-cta"
              }`}
            >
              {p.cta}
            </button>
          </SurfaceCard>
        ))}
      </section>

      <section className="px-6 pb-16">
        <SurfaceCard>
          <h4 className="font-body font-semibold text-[15px]">Everything included</h4>
          <ul className="mt-4 space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-[14px] text-[color:var(--ink-mid)]">
                <span className="mt-0.5 h-5 w-5 rounded-full bg-[color:var(--sage-light)] grid place-items-center text-[color:var(--forest)]">
                  <Check className="h-3 w-3" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </SurfaceCard>

        <p className="mt-6 text-center text-[12px] text-[color:var(--ink-light)]">
          Stripe checkout coming soon. Get the foundation first.
        </p>
      </section>
    </div>
  );
}
