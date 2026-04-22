/**
 * Nutrition / metabolic calculations.
 * Mifflin-St Jeor for BMR, activity multipliers for TDEE,
 * and goal-based calorie/macro split.
 */

export type Gender = "male" | "female" | "other";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type Goal = "lose" | "maintain" | "gain";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calculateBMR(input: {
  gender: Gender;
  weight_kg: number;
  height_cm: number;
  age: number;
}): number {
  const { gender, weight_kg, height_cm, age } = input;
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  if (gender === "male") return base + 5;
  if (gender === "female") return base - 161;
  return base - 78; // average for "other"
}

export function calculateTDEE(bmr: number, activity: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activity];
}

export function calculateTargets(input: {
  gender: Gender;
  age: number;
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  goal: Goal;
}) {
  const bmr = calculateBMR(input);
  const tdee = calculateTDEE(bmr, input.activity_level);

  let daily_calories = tdee;
  if (input.goal === "lose") daily_calories = tdee - 500;
  if (input.goal === "gain") daily_calories = tdee + 350;
  daily_calories = Math.round(daily_calories);

  // Macro split: 30% protein, 40% carbs, 30% fat (calorie-balanced)
  const protein_g = Math.round((daily_calories * 0.3) / 4);
  const carbs_g = Math.round((daily_calories * 0.4) / 4);
  const fat_g = Math.round((daily_calories * 0.3) / 9);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    daily_calories,
    protein_g,
    carbs_g,
    fat_g,
  };
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
