import { createFileRoute, Link } from "@tanstack/react-router";
import { LeafMark, Wordmark } from "@/components/brand/Logo";
import { PrimaryButton } from "@/components/ui/luxury/PrimaryButton";
import { SurfaceCard } from "@/components/ui/luxury/SurfaceCard";
import { Pill } from "@/components/ui/luxury/Pill";
import { Sparkles, ShieldCheck, HeartPulse, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NutriAI — Eat smarter. Live longer." },
      { name: "description", content: "Your AI nutrition coach. Personalised macros, instant meal scoring, and a longevity-first approach." },
      { property: "og:title", content: "NutriAI — Eat smarter. Live longer." },
      { property: "og:description", content: "Your AI nutrition coach. Personalised macros, instant meal scoring, and a longevity-first approach." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="mobile-shell">
      {/* Hero */}
      <section
        className="relative overflow-hidden text-white px-6 pt-14 pb-16"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute -top-20 -right-16 h-64 w-64 rounded-full bg-[color:var(--gold)] opacity-15 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[color:var(--forest-light)] opacity-30 blur-3xl" />

        <header className="relative flex items-center justify-between">
          <div className="flex items-center gap-2 text-[color:var(--gold)]">
            <LeafMark size={28} />
            <Wordmark className="text-white text-xl" />
          </div>
          <Link
            to="/auth"
            className="text-[13px] uppercase tracking-widest text-white/80 hover:text-white"
          >
            Sign in
          </Link>
        </header>

        <div className="relative mt-12 stagger">
          <Pill tone="gold">
            <Sparkles className="h-3 w-3" /> Powered by Claude
          </Pill>
          <h1 className="mt-5 text-white font-display font-black text-[44px] leading-[1.02]">
            Eat smarter.
            <br />
            <span className="italic font-light text-[color:var(--gold-light)]">Live longer.</span>
          </h1>
          <p className="mt-5 text-[16px] leading-relaxed text-white/75">
            NutriAI is the world's most thoughtful nutrition coach.
            Snap a meal, get an instant longevity score, and stay perfectly on track.
          </p>

          <div className="mt-8 space-y-3">
            <Link to="/auth" search={{ mode: "signup" }}>
              <PrimaryButton variant="gold" className="text-[color:var(--forest)]">
                Start your journey <ArrowRight className="ml-2 h-4 w-4" />
              </PrimaryButton>
            </Link>
            <Link to="/pricing" className="block text-center text-white/75 text-[13px] uppercase tracking-widest pt-2">
              See plans
            </Link>
          </div>
        </div>
      </section>

      {/* Feature trio */}
      <section className="px-6 py-12 stagger">
        <p className="text-caption text-[color:var(--sage)]">Why NutriAI</p>
        <h2 className="mt-2 font-display text-[28px] text-[color:var(--ink)]">
          A coach, not a calorie counter.
        </h2>

        <div className="mt-8 space-y-4">
          <SurfaceCard className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-2xl bg-[color:var(--sage-light)] grid place-items-center text-[color:var(--forest)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-body font-semibold text-[17px]">AI meal analysis</h4>
              <p className="text-[14px] text-[color:var(--ink-mid)] mt-1">
                Describe a meal in plain English. We score it for nutrition, macros and longevity.
              </p>
            </div>
          </SurfaceCard>

          <SurfaceCard className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-2xl bg-[color:var(--gold-light)] grid place-items-center text-[color:var(--gold)]">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-body font-semibold text-[17px]">Macros that actually fit you</h4>
              <p className="text-[14px] text-[color:var(--ink-mid)] mt-1">
                Targets calculated from your BMR, TDEE and goals. Recalibrated as you progress.
              </p>
            </div>
          </SurfaceCard>

          <SurfaceCard className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-2xl bg-[color:var(--coral-light)] grid place-items-center text-[color:var(--coral)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-body font-semibold text-[17px]">Private by default</h4>
              <p className="text-[14px] text-[color:var(--ink-mid)] mt-1">
                Your data is yours. Bank-grade encryption, no ads, ever.
              </p>
            </div>
          </SurfaceCard>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-6 pb-16">
        <SurfaceCard tone="forest" className="text-center py-10 px-6">
          <p className="text-caption text-[color:var(--gold-light)] opacity-80">
            14-day free trial
          </p>
          <h3 className="mt-3 font-display text-[26px] text-white leading-snug">
            Your healthiest year starts today.
          </h3>
          <p className="mt-3 text-white/70 text-[14px]">
            Join thousands rewriting their nutrition story.
          </p>
          <div className="mt-6">
            <Link to="/auth" search={{ mode: "signup" }}>
              <PrimaryButton variant="gold" className="text-[color:var(--forest)]">
                Begin free
              </PrimaryButton>
            </Link>
          </div>
        </SurfaceCard>

        <p className="mt-8 text-center text-[11px] uppercase tracking-widest text-[color:var(--ink-light)]">
          NutriAI · Crafted for longevity
        </p>
      </section>
    </div>
  );
}
