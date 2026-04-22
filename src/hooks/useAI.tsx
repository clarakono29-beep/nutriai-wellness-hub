import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MealAnalysis {
  meal_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  food_score: number;
  verdict: string;
  emoji: string;
}

export function useAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyseMeal = useCallback(
    async (input: {
      meal_description: string;
      user_context?: { goal?: string | null; daily_calories?: number | null; protein_target?: number | null };
    }): Promise<MealAnalysis | null> => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("analyse-meal", {
          body: input,
        });
        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);
        return data as MealAnalysis;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not analyse meal";
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { analyseMeal, loading, error };
}
