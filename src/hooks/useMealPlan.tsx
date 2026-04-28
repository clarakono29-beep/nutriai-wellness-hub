import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface MealItem {
  name: string;
  emoji: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time: number;
  ingredients: string[];
  method: string;
  tip: string;
}

export interface MealPlanDay {
  day: string;
  breakfast: MealItem;
  lunch: MealItem;
  dinner: MealItem;
  snack: MealItem;
  totals: { calories: number; protein: number; carbs: number; fat: number };
}

export interface ShoppingListCategory {
  category: string;
  items: string[];
}

export interface MealPlan {
  days: MealPlanDay[];
  shopping_list: ShoppingListCategory[];
  weekly_overview: string;
  coach_notes: string;
  generated_at: string;
}

interface GenerateInput {
  name?: string | null;
  goal?: string | null;
  daily_calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  diet_preferences?: string[] | null;
  allergies?: string[] | null;
  cuisine_preferences?: string[] | null;
  budget?: "budget" | "moderate" | "premium";
  cooking_time?: "quick" | "moderate" | "leisurely";
}

const STORAGE_KEY = "nutriai_meal_plan_v2";

export function useMealPlan() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<MealPlan | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (input: GenerateInput): Promise<MealPlan | null> => {
    if (!user) return null;
    setGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-meal-plan", {
        body: input,
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const mealPlan = data.plan as MealPlan;
      mealPlan.generated_at = data.generated_at ?? new Date().toISOString();

      // Cache locally
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mealPlan));
      setPlan(mealPlan);
      return mealPlan;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not generate meal plan";
      setError(msg);
      return null;
    } finally {
      setGenerating(false);
    }
  }, [user]);

  const clearPlan = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setPlan(null);
  }, []);

  const isStale = plan
    ? Date.now() - new Date(plan.generated_at).getTime() > 7 * 24 * 60 * 60 * 1000 // 7 days
    : true;

  return { plan, generating, error, generate, clearPlan, isStale };
}
