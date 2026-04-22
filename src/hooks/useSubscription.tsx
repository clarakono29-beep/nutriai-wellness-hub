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
  }, [authLoading, refresh]);

  const isActive =
    !!subscription &&
    ACTIVE_STATUSES.has(subscription.status) &&
    (!subscription.current_period_end ||
      new Date(subscription.current_period_end).getTime() > Date.now());

  return { subscription, loading: authLoading || loading, isActive, refresh };
}
