import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface NutritionInsight {
  icon: string;
  title: string;
  body: string;
}

export interface NutritionInsightsResult {
  headline: string;
  highlights: NutritionInsight[];
  focus_next_week: {
    icon: string;
    title: string;
    action: string;
  };
  motivational_note: string;
  generated_at: string;
}

interface WeekDayData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water_ml?: number;
}

interface InsightsInput {
  name?: string | null;
  goal?: string | null;
  daily_calories_target?: number | null;
  protein_target?: number | null;
  days: WeekDayData[];
  current_streak?: number;
  weight_change_kg?: number | null;
}

const CACHE_KEY = "nutriai_insights_v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function useNutritionInsights() {
  const [insights, setInsights] = useState<NutritionInsightsResult | null>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      const age = Date.now() - new Date(parsed.generated_at).getTime();
      return age < CACHE_TTL_MS ? parsed : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (input: InsightsInput): Promise<NutritionInsightsResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("nutrition-insights", {
        body: input,
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const result: NutritionInsightsResult = {
        ...data.insights,
        generated_at: data.generated_at ?? new Date().toISOString(),
      };

      localStorage.setItem(CACHE_KEY, JSON.stringify(result));
      setInsights(result);
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not generate insights";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    setInsights(null);
  }, []);

  return { insights, loading, error, generate, clearCache };
}
