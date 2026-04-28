import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2, Sparkles, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Upgrade to Pro — NutriAI" },
      { name: "description", content: "The world's smartest AI nutrition coach. Unlimited scans, meal plans, and macro coaching." },
    ],
  }),
  component: PricingPage,
});

const FEATURES_FREE = [
  "5 AI meal analyses per day",
  "Manual food logging",
  "Water & weight tracking",
  "Basic progress charts",
  "7-day streak tracking",
];

const FEATURES_PRO = [
  "Unlimited AI food photo scanning",
  "700K+ USDA food database search",
  "Real barcode scanner (3M+ products)",
  "7-day personalised meal plans",
  "Complete shopping list generator",
  "AI nutrition coach (unlimited)",
  "Advanced macro & micronutrient insights",
  "AI weekly performance review",
  "Calorie burn estimates",
  "Priority AI response speed",
];

function PricingPage() {
  const { user } = useAuth();
  const { isActive } = useSubscription();
  const [plan, setPlan] = useState<"monthly" | "annual">("annual");
  const [loading, setLoading] = useState(false);

  const monthlyEquiv = plan === "annual" ? "4.17" : "7.99";
  const annualSaving = "50%";

  const startCheckout = async () => {
    if (!user) {
      // Redirect to signup with return URL
      window.location.href = "/signin?redirect=/pricing";
      return;
    }
    if (isActive) {
      toast.info("You already have an active Pro subscription.");
      return;
    }

    setLoading(true);
    haptics.light();

    try {
      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: {
          plan,
          successUrl: `${window.location.origin}/app?checkout=success`,
          cancelUrl: `${window.location.origin}/pricing?checkout=cancelled`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Checkout failed";
      toast.error(msg.includes("not configured") ? "Payment system is being set up — check back soon." : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[color:var(--cream)] px-5 py-8">
      {/* Back */}
      <Link to={user ? "/app" : "/"} className="inline-flex items-center gap-1.5 text-[13px] text-[color:var(--ink-mid)] font-medium mb-8">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      {/* Hero */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[color:var(--gold-light)] border border-[color:var(--gold)]/30 text-[12px] font-semibold text-[color:var(--gold)] mb-4">
          <Sparkles className="h-3.5 w-3.5" /> 7-day free trial · cancel anytime
        </div>
        <h1 className="font-display text-[36px] font-black leading-tight text-[color:var(--ink)]">
          The AI nutrition coach<br />you've been waiting for
        </h1>
        <p className="text-[15px] text-[color:var(--ink-mid)] mt-3 max-w-[320px] mx-auto leading-relaxed">
          Snap a meal. Get instant macros. Hit your goals. Used by 50,000+ people who take nutrition seriously.
        </p>
      </div>

      {/* Social proof */}
      <div className="flex items-center justify-center gap-1 mb-8">
        {["⭐️","⭐️","⭐️","⭐️","⭐️"].map((s, i) => <span key={i} className="text-[18px]">{s}</span>)}
        <span className="ml-2 text-[13px] font-medium text-[color:var(--ink-mid)]">4.8 · 12,000 reviews</span>
      </div>

      {/* Plan toggle */}
      <div className="flex gap-2 p-1 rounded-full bg-white border border-[color:var(--cream-border)] mb-6 max-w-[320px] mx-auto">
        <button
          onClick={() => setPlan("monthly")}
          className={cn("flex-1 h-11 rounded-full text-[13px] font-semibold transition-all", plan === "monthly" ? "bg-[color:var(--forest)] text-white shadow-elev-sm" : "text-[color:var(--ink-mid)]")}
        >
          Monthly
        </button>
        <button
          onClick={() => setPlan("annual")}
          className={cn("flex-1 h-11 rounded-full text-[13px] font-semibold transition-all flex items-center justify-center gap-2", plan === "annual" ? "bg-[color:var(--forest)] text-white shadow-elev-sm" : "text-[color:var(--ink-mid)]")}
        >
          Annual
          <span className={cn("text-[11px] px-1.5 py-0.5 rounded-full font-bold", plan === "annual" ? "bg-[color:var(--gold)] text-white" : "bg-[color:var(--gold-light)] text-[color:var(--gold)]")}>
            -{annualSaving}
          </span>
        </button>
      </div>

      {/* Main pricing card */}
      <div className="max-w-[400px] mx-auto mb-6">
        <div className="bg-gradient-to-br from-[color:var(--forest)] to-[color:var(--ink)] rounded-[28px] p-7 text-white shadow-elev-lg">
          <div className="flex items-end gap-2 mb-1">
            <span className="font-display text-[52px] font-black leading-none">${monthlyEquiv}</span>
            <span className="text-white/60 text-[15px] mb-2">/month</span>
          </div>
          {plan === "annual" && (
            <p className="text-[color:var(--gold)] text-[13px] font-semibold mb-4">
              Billed as ${(parseFloat(monthlyEquiv) * 12).toFixed(0)}/year · Save 50% vs monthly
            </p>
          )}
          {plan === "monthly" && (
            <p className="text-white/60 text-[13px] mb-4">Billed monthly · Cancel anytime</p>
          )}

          {/* CTA */}
          <button
            onClick={startCheckout}
            disabled={loading || isActive}
            className="w-full h-14 rounded-2xl bg-white text-[color:var(--forest)] text-[15px] font-semibold shadow-elev-sm active:scale-[0.97] transition-transform disabled:opacity-70 flex items-center justify-center gap-2 mb-4"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isActive ? (
              <><Check className="h-5 w-5" /> Already subscribed</>
            ) : (
              <><Zap className="h-5 w-5 text-[color:var(--gold)]" /> Start 7-day free trial</>
            )}
          </button>

          <p className="text-center text-[12px] text-white/50">No charge during trial · Cancel any time</p>

          {/* Pro features */}
          <div className="mt-6 space-y-3">
            {FEATURES_PRO.map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-[color:var(--gold)]/20 border border-[color:var(--gold)]/30 grid place-items-center shrink-0">
                  <Check className="h-3 w-3 text-[color:var(--gold)]" />
                </div>
                <span className="text-[13px] text-white/90">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Free plan comparison */}
      <div className="max-w-[400px] mx-auto mb-10 bg-white rounded-[24px] border border-[color:var(--cream-border)] p-6 shadow-elev-sm">
        <h3 className="font-semibold text-[15px] text-[color:var(--ink)] mb-4">Free plan includes</h3>
        <div className="space-y-2.5">
          {FEATURES_FREE.map((f) => (
            <div key={f} className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-[color:var(--cream-dark)] grid place-items-center shrink-0">
                <Check className="h-3 w-3 text-[color:var(--ink-mid)]" />
              </div>
              <span className="text-[13px] text-[color:var(--ink-mid)]">{f}</span>
            </div>
          ))}
        </div>
        {!user && (
          <Link to="/signin" className="mt-4 block w-full h-11 rounded-2xl border border-[color:var(--cream-border)] text-[13px] font-semibold text-[color:var(--ink-mid)] flex items-center justify-center">
            Continue with free plan
          </Link>
        )}
      </div>

      {/* Testimonials */}
      <div className="max-w-[400px] mx-auto space-y-3 mb-10">
        {[
          { name: "Sarah M.", handle: "@sarahfitness", text: "The AI scanning is scary accurate. I logged my entire Thanksgiving dinner in 30 seconds. 🙌", stars: 5 },
          { name: "James K.", handle: "@jamesketo", text: "Switched from Lifesum. The barcode scanner actually works properly and the macro coach is next level.", stars: 5 },
          { name: "Priya R.", handle: "@priyawellness", text: "Lost 8kg in 3 months. The meal plans are so good I actually follow them. Game changer.", stars: 5 },
        ].map((t) => (
          <div key={t.name} className="bg-white rounded-[20px] border border-[color:var(--cream-border)] p-4 shadow-elev-sm">
            <div className="flex items-center gap-1 mb-2">
              {Array.from({ length: t.stars }).map((_, i) => <span key={i} className="text-[color:var(--gold)] text-[14px]">⭐</span>)}
            </div>
            <p className="text-[13px] text-[color:var(--ink)] leading-relaxed mb-3">"{t.text}"</p>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[color:var(--sage-light)] grid place-items-center font-semibold text-[color:var(--forest)] text-[12px]">{t.name[0]}</div>
              <div>
                <p className="text-[13px] font-semibold text-[color:var(--ink)]">{t.name}</p>
                <p className="text-[11px] text-[color:var(--ink-light)]">{t.handle}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="max-w-[400px] mx-auto space-y-4 mb-8">
        <h3 className="font-display text-[20px] font-bold">Common questions</h3>
        {[
          { q: "Can I cancel any time?", a: "Yes. Cancel instantly from your profile — no questions asked, no fees." },
          { q: "What happens after the free trial?", a: "You'll be charged at the start of day 8. We send a reminder on day 6." },
          { q: "Is my data private?", a: "Your health data is encrypted and never sold to third parties. Ever." },
          { q: "Does it work offline?", a: "Food logging, water tracking, and your diary all work offline. AI features need a connection." },
        ].map((item) => (
          <div key={item.q} className="bg-white rounded-[18px] border border-[color:var(--cream-border)] p-4">
            <p className="text-[14px] font-semibold text-[color:var(--ink)] mb-1.5">{item.q}</p>
            <p className="text-[13px] text-[color:var(--ink-mid)] leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-[color:var(--cream-border)] px-5 py-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}>
        <button
          onClick={startCheckout}
          disabled={loading || isActive}
          className="w-full max-w-[400px] mx-auto h-14 rounded-2xl bg-gradient-cta text-white text-[15px] font-semibold shadow-elev-cta flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Zap className="h-5 w-5 text-[color:var(--gold)]" /> Start free trial · ${monthlyEquiv}/mo</>}
        </button>
      </div>

      {/* Bottom padding for sticky CTA */}
      <div className="h-24" />
    </div>
  );
}
