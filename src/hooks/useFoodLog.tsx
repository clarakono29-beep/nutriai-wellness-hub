import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { todayISO } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

export type FoodLog = Database["public"]["Tables"]["food_logs"]["Row"];
type Insert = Database["public"]["Tables"]["food_logs"]["Insert"];

export function useFoodLog(date: string = todayISO()) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setLogs([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("food_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date)
      .order("logged_at", { ascending: false });
    setLogs(data ?? []);
    setLoading(false);
  }, [user, date]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const addLog = useCallback(
    async (entry: Omit<Insert, "user_id" | "date">) => {
      if (!user) return { error: new Error("Not signed in") };
      const { data, error } = await supabase
        .from("food_logs")
        .insert({ ...entry, user_id: user.id, date })
        .select()
        .single();
      if (data) setLogs((prev) => [data, ...prev]);
      return { data, error };
    },
    [user, date],
  );

  const removeLog = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("food_logs").delete().eq("id", id);
      if (!error) setLogs((prev) => prev.filter((l) => l.id !== id));
      return { error };
    },
    [],
  );

  const totals = logs.reduce(
    (acc, l) => ({
      calories: acc.calories + Number(l.calories ?? 0),
      protein: acc.protein + Number(l.protein ?? 0),
      carbs: acc.carbs + Number(l.carbs ?? 0),
      fat: acc.fat + Number(l.fat ?? 0),
      fibre: acc.fibre + Number(l.fibre ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 },
  );

  return { logs, totals, loading, refresh, addLog, removeLog };
}
