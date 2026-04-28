import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/renewal")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/signin", search: {} });
    }
    // Check if user actually has an active subscription now
    const userId = data.session.user.id;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const isActive =
      sub &&
      ["active", "trialing", "past_due"].includes(sub.status) &&
      (!sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now());

    if (isActive) {
      throw redirect({ to: "/app" });
    }
  },
  head: () => ({ meta: [{ title: "Start your free trial — NutriAI" }] }),
  component: RenewalRedirect,
});

function RenewalRedirect() {
  const nav = useNavigate();

  useEffect(() => {
    // Redirect straight to the new pricing page
    nav({ to: "/pricing" });
  }, [nav]);

  return (
    <div className="min-h-screen bg-[color:var(--cream)] grid place-items-center">
      <div className="text-center">
        <div className="h-12 w-12 rounded-full border-4 border-[color:var(--forest)] border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-[14px] text-[color:var(--ink-mid)]">Loading plans…</p>
      </div>
    </div>
  );
}
