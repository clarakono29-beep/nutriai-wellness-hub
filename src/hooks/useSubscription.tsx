import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export function useSubscription() {
  const { user, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription(data ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    refresh();

    // Listen for real-time subscription changes (Stripe webhook updates)
    if (!user) return;
    const channel = supabase
      .channel(`sub_${user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "subscriptions",
        filter: `user_id=eq.${user.id}`,
      }, () => { refresh(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [authLoading, refresh, user]);

  const isActive =
    !!subscription &&
    ACTIVE_STATUSES.has(subscription.status) &&
    (!subscription.current_period_end ||
      new Date(subscription.current_period_end).getTime() > Date.now());

  const isTrialing = subscription?.status === "trialing";
  const isPastDue = subscription?.status === "past_due";

  // Stripe checkout — redirect to Stripe-hosted checkout page
  const startCheckout = useCallback(async (plan: "monthly" | "annual" = "monthly") => {
    if (!user) return null;
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: {
          plan,
          successUrl: `${window.location.origin}/app?checkout=success`,
          cancelUrl: `${window.location.origin}/pricing`,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
        return data.url as string;
      }
      return null;
    } catch (e) {
      console.error("Checkout error:", e);
      return null;
    } finally {
      setCheckoutLoading(false);
    }
  }, [user]);

  // Days remaining in trial
  const trialDaysLeft = isTrialing && subscription?.trial_end
    ? Math.max(0, Math.ceil((new Date(subscription.trial_end).getTime() - Date.now()) / 86400000))
    : null;

  return {
    subscription,
    loading: authLoading || loading,
    isActive,
    isTrialing,
    isPastDue,
    trialDaysLeft,
    refresh,
    startCheckout,
    checkoutLoading,
  };
}
