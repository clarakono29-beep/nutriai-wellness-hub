import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setProfile(data ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const update = useCallback(
    async (patch: Partial<Profile>) => {
      if (!user) return { error: new Error("Not signed in") };
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("user_id", user.id)
        .select()
        .maybeSingle();
      if (data) setProfile(data);
      return { data, error };
    },
    [user],
  );

  return { profile, loading, refresh, update };
}
