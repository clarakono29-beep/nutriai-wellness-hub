/**
 * NutriAI — TDEE & macro calculation engine
 * Based on Mifflin-St Jeor BMR formula (most accurate for general populations)
 */

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose_aggressive" | "lose" | "maintain" | "gain" | "gain_aggressive";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,       // Desk job, little/no exercise
  light: 1.375,          // Light exercise 1-3 days/week
  moderate: 1.55,        // Moderate exercise 3-5 days/week
  active: 1.725,         // Hard exercise 6-7 days/week
  very_active: 1.9,     // Physical job + hard training
};

const GOAL_ADJUSTMENTS: Record<Goal, number> = {
  lose_aggressive: -750,  // ~0.7kg/week loss
  lose: -500,             // ~0.5kg/week loss
  maintain: 0,
  gain: 300,              // ~0.25kg/week gain (lean bulk)
  gain_aggressive: 500,   // ~0.4kg/week gain
};

export interface TDEEInput {
  weight_kg: number;
  height_cm: number;
  age: number;
  sex: Sex;
  activity: ActivityLevel;
  goal: Goal;
}

export interface TDEEResult {
  bmr: number;
  tdee: number;
  targetCalories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
  water_ml: number;
}

/**
 * Calculate BMR using Mifflin-St Jeor equation
 */
export function calcBMR(weight_kg: number, height_cm: number, age: number, sex: Sex): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return Math.round(sex === "male" ? base + 5 : base - 161);
}

/**
 * Full TDEE and macro calculation
 */
export function calcTDEE(input: TDEEInput): TDEEResult {
  const bmr = calcBMR(input.weight_kg, input.height_cm, input.age, input.sex);
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[input.activity]);
  const adjustment = GOAL_ADJUSTMENTS[input.goal];
  const targetCalories = Math.max(1200, tdee + adjustment);

  // Protein: 1.8-2.2g per kg body weight (higher for aggressive cut/bulk)
  const proteinMultiplier = input.goal.includes("aggressive") ? 2.2 : input.goal === "maintain" ? 1.8 : 2.0;
  const protein_g = Math.round(input.weight_kg * proteinMultiplier);

  // Fat: 25-30% of calories
  const fatCalories = targetCalories * 0.27;
  const fat_g = Math.round(fatCalories / 9);

  // Carbs: remaining calories
  const proteinCalories = protein_g * 4;
  const remainingCalories = targetCalories - proteinCalories - fatCalories;
  const carbs_g = Math.max(50, Math.round(remainingCalories / 4));

  // Fibre: 14g per 1000 kcal (DRI recommendation)
  const fibre_g = Math.round((targetCalories / 1000) * 14);

  // Water: 35ml per kg body weight
  const water_ml = Math.round(input.weight_kg * 35);

  return { bmr, tdee, targetCalories, protein_g, carbs_g, fat_g, fibre_g, water_ml };
}

/**
 * Estimate weight loss timeline
 */
export function weightLossTimeline(
  currentWeight: number,
  targetWeight: number,
  weeklyDeficit: number, // kcal/week
): { weeksToGoal: number; projectedDate: Date } {
  const kgToLose = Math.abs(currentWeight - targetWeight);
  const kgPerWeek = weeklyDeficit / 7700; // 1kg fat = ~7700 kcal
  const weeksToGoal = Math.ceil(kgToLose / kgPerWeek);
  const projectedDate = new Date();
  projectedDate.setDate(projectedDate.getDate() + weeksToGoal * 7);
  return { weeksToGoal, projectedDate };
}

/**
 * Body Mass Index
 */
export function calcBMI(weight_kg: number, height_cm: number): { bmi: number; category: string } {
  const bmi = weight_kg / Math.pow(height_cm / 100, 2);
  let category = "Normal weight";
  if (bmi < 18.5) category = "Underweight";
  else if (bmi >= 25 && bmi < 30) category = "Overweight";
  else if (bmi >= 30) category = "Obese";
  return { bmi: Math.round(bmi * 10) / 10, category };
}

/**
 * Ideal weight ranges (Devine formula)
 */
export function idealWeightRange(height_cm: number, sex: Sex): { min: number; max: number } {
  const inchesOver5Feet = Math.max(0, height_cm / 2.54 - 60);
  const base = sex === "male" ? 50 : 45.5;
  const ideal = base + 2.3 * inchesOver5Feet;
  return { min: Math.round(ideal * 0.9), max: Math.round(ideal * 1.1) };
}

/**
 * Label helpers
 */
export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (desk job, no exercise)",
  light: "Lightly active (1–3 workouts/week)",
  moderate: "Moderately active (3–5 workouts/week)",
  active: "Very active (6–7 workouts/week)",
  very_active: "Extremely active (physical job + training)",
};

export const GOAL_LABELS: Record<Goal, string> = {
  lose_aggressive: "Lose weight fast (–0.7kg/week)",
  lose: "Lose weight steadily (–0.5kg/week)",
  maintain: "Maintain current weight",
  gain: "Gain lean muscle (lean bulk)",
  gain_aggressive: "Gain mass (aggressive bulk)",
};
