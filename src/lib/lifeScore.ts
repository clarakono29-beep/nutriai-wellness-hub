/**
 * Weekly Life Score (0-150) computed locally from food + water logs.
 */

export interface DailyTotals {
  date: string;
  calories: number;
  protein: number;
  mealTypes: Set<string>;
  waterGlasses: number;
}

export interface LifeScoreInput {
  days: DailyTotals[]; // up to 7 days
  calorieTarget: number;
  proteinTarget: number;
}

export interface LifeScoreResult {
  score: number;
  label: string;
  breakdown: {
    base: number;
    consistency: number;
    protein: number;
    variety: number;
    hydration: number;
  };
}

export function computeLifeScore({
  days,
  calorieTarget,
  proteinTarget,
}: LifeScoreInput): LifeScoreResult {
  const base = 60;

  // Consistency: 75%+ of calorie goal logged. Up to 35 + 5 bonus all-7.
  const consistentDays = days.filter(
    (d) => calorieTarget > 0 && d.calories >= calorieTarget * 0.75,
  ).length;
  const consistency =
    Math.min(35, consistentDays * 5) + (days.length === 7 && consistentDays === 7 ? 5 : 0);

  // Protein: hit protein target. Up to 25.
  const proteinDays = days.filter(
    (d) => proteinTarget > 0 && d.protein >= proteinTarget,
  ).length;
  const protein = Math.min(25, +(proteinDays * 3.5).toFixed(1));

  // Variety: 3+ different meal types in a day. Up to 15.
  const varietyDays = days.filter((d) => d.mealTypes.size >= 3).length;
  const variety = Math.min(15, varietyDays * 5);

  // Hydration: 8 glasses. Up to 10.
  const hydrationDays = days.filter((d) => d.waterGlasses >= 8).length;
  const hydration = Math.min(10, +(hydrationDays * 1.4).toFixed(1));

  const raw = base + consistency + protein + variety + hydration;
  const score = Math.min(150, Math.round(raw));

  return { score, label: scoreLabel(score), breakdown: { base, consistency, protein, variety, hydration } };
}

export function scoreLabel(score: number): string {
  if (score <= 50) return "Off Track";
  if (score <= 90) return "Getting Started";
  if (score <= 120) return "Good";
  if (score <= 140) return "Great";
  return "Optimal";
}
