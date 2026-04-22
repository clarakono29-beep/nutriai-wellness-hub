import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Flame, TrendingUp, Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

import { LeafMark, Wordmark } from "@/components/brand/Logo";
import { PrimaryButton } from "@/components/ui/luxury/PrimaryButton";
import { Pill } from "@/components/ui/luxury/Pill";

export const Route = createFileRoute("/renewal")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/signin", search: {} });
    }
  },
  head: () => ({ meta: [{ title: "Renew your plan — NutriAI" }] }),
  component: RenewalPage,
});

type PlanId = "monthly" | "quarterly" | "annual";

const PLANS: {
  id: PlanId;
  label: string;
  price: string;
  per: string;
  total: string;
  badge?: { text: string; tone: "gold" | "coral" };
}[] = [
  { id: "monthly", label: "Monthly", price: "$12.99", per: "/month", total: "Billed monthly" },
  {
    id: "quarterly",
    label: "3 Months",
    price: "$8.99",
    per: "/month",
    total: "$26.99 every 3 months",
    badge: { text: "POPULAR", tone: "gold" },
  },
  {
    id: "annual",
    label: "Annual",
    price: "$4.99",
    per: "/month",
    total: "$59.99 billed yearly",
    badge: { text: "BEST VALUE 🔥", tone: "coral" },
  },
];

function RenewalPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [streak, setStreak] = useState<number>(0);
  const [selected, setSelected] = useState<PlanId>("quarterly");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("streaks")
      .select("current_streak,longest_streak")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setStreak(data.current_streak ?? 0);
      });
  }, [user]);

  const handleRenew = async () => {
    setSubmitting(true);
    // TODO: Stripe checkout. For now, mark active for the chosen plan.
    try {
      // Placeholder — payments not wired yet
      toast.success("Renewal coming soon — payments will activate here.");
    } finally {
      setSubmitting(false);
    }
  };

  const name = profile?.name ?? "there";

  return (
    <div className="mobile-shell bg-[color:var(--cream)]">
      <section
        className="relative overflow-hidden text-white px-6 pt-12 pb-10 rounded-b-[28px]"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center justify-center gap-1.5 text-white/90">
          <LeafMark size={22} className="text-[color:var(--gold)]" />
          <Wordmark className="text-white text-base" />
        </div>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[color:var(--gold)]/60 px-4 py-1.5 text-[12px] font-medium text-[color:var(--gold-light)]">
          ⏳ Your plan has expired
        </div>

        <h1 className="mt-4 font-display font-black text-[34px] leading-[1.1]">
          Don't lose your<br />
          <span className="italic font-light text-[color:var(--gold-light)]">progress, {name}.</span>
        </h1>

        <p className="mt-3 text-[15px] text-white/75 leading-relaxed">
          Renew to continue your {streak}-day streak and pick up exactly where you left off.
        </p>

        {/* Mini stats */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <StatCard icon={<Flame className="h-4 w-4" />} label="Current streak" value={`${streak} days`} />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Daily target"
            value={profile?.daily_calories ? `${profile.daily_calories} kcal` : "—"}
          />
        </div>
      </section>

      {/* Plans */}
      <section className="px-6 pt-8 pb-6 stagger">
        <h2 className="font-display text-[22px] text-[color:var(--ink)]">Choose your plan</h2>
        <p className="mt-1 text-[13px] text-[color:var(--ink-mid)]">All plans include every feature. Cancel anytime.</p>

        <div className="mt-5 space-y-3">
          {PLANS.map((p) => {
            const isSelected = selected === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p.id)}
                className={`relative w-full text-left rounded-[20px] px-5 py-4 transition-all ease-luxury ${
                  isSelected
                    ? "bg-[color:var(--forest)]/[0.06] border-[2.5px] border-[color:var(--forest)]"
                    : "bg-white border border-[color:var(--cream-border)]"
                }`}
              >
                {p.badge && (
                  <span
                    className={`absolute -top-2.5 left-5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                      p.badge.tone === "gold"
                        ? "bg-[color:var(--gold)] text-[color:var(--forest)]"
                        : "bg-[color:var(--coral)] text-white"
                    }`}
                  >
                    {p.badge.text}
                  </span>
                )}
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-[13px] font-medium text-[color:var(--ink-mid)] uppercase tracking-widest">
                      {p.label}
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="font-display font-bold text-[28px] text-[color:var(--forest)]">{p.price}</span>
                      <span className="text-[13px] text-[color:var(--ink-mid)]">{p.per}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-[color:var(--ink-light)]">{p.total}</div>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-full border-2 ${
                      isSelected
                        ? "bg-[color:var(--forest)] border-[color:var(--forest)]"
                        : "border-[color:var(--cream-border)]"
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-7">
          <PrimaryButton onClick={handleRenew} loading={submitting}>
            Renew My Plan <Sparkles className="ml-2 h-4 w-4" />
          </PrimaryButton>
          <p className="mt-3 text-center text-[12px] text-[color:var(--ink-light)]">
            🔒 Secure payment via Stripe · Cancel anytime
          </p>
          <p className="mt-1 text-center text-[12px] text-[color:var(--ink-light)]">
            💰 30-day money-back guarantee
          </p>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/signin", search: {} });
            }}
            className="text-[13px] text-[color:var(--ink-light)] hover:text-[color:var(--ink-mid)]"
          >
            Sign out
          </button>
          <Link to="/" className="text-[13px] text-[color:var(--ink-light)] hover:text-[color:var(--ink-mid)]">
            Back to home
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-3">
      <div className="flex items-center gap-1.5 text-white/70">
        {icon}
        <span className="text-[11px] uppercase tracking-widest">{label}</span>
      </div>
      <div className="mt-1 font-display font-bold text-[20px] text-[color:var(--gold-light)]">{value}</div>
    </div>
  );
}
