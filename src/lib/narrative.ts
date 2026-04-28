/**
 * Local-only "story" narrative generators for the diary header and
 * smart suggestion strip. Pure functions — no API calls.
 *
 * Keeping these here avoids spamming the AI gateway for every render
 * and makes the copy deterministic & testable.
 */

export interface DiaryStoryInput {
  firstName?: string | null;
  caloriesEaten: number;
  calorieTarget: number;
  proteinEaten: number;
  proteinTarget: number;
  waterGlasses: number;
  waterTargetGlasses: number;
  streakDays: number;
  hour?: number; // 0-23, defaults to current local hour
}

export interface DiaryStory {
  greeting: string;
  headline: string;
  subline: string;
  pace: "behind" | "on_track" | "ahead" | "over";
  paceLabel: string;
}

const greetingFor = (h: number) => {
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Late night";
};

/** Expected fraction of daily calories consumed by hour `h`. */
function expectedFraction(h: number): number {
  // Smoothed S-curve: 8% by 8am, 35% by 1pm, 70% by 7pm, 95% by 10pm.
  if (h < 6) return 0.05;
  if (h < 9) return 0.1 + (h - 6) * 0.05;
  if (h < 13) return 0.25 + (h - 9) * 0.07;
  if (h < 19) return 0.55 + (h - 13) * 0.04;
  if (h < 22) return 0.85 + (h - 19) * 0.04;
  return 1;
}

export function buildDiaryStory(input: DiaryStoryInput): DiaryStory {
  const {
    firstName,
    caloriesEaten,
    calorieTarget,
    proteinEaten,
    proteinTarget,
    waterGlasses,
    waterTargetGlasses,
    streakDays,
  } = input;
  const hour = input.hour ?? new Date().getHours();
  const target = Math.max(1, calorieTarget);
  const eaten = Math.max(0, caloriesEaten);
  const ratio = eaten / target;
  const expected = expectedFraction(hour);

  let pace: DiaryStory["pace"] = "on_track";
  let paceLabel = "On pace";
  if (ratio > 1.02) {
    pace = "over";
    paceLabel = "Over goal";
  } else if (ratio > expected + 0.12) {
    pace = "ahead";
    paceLabel = "Ahead of pace";
  } else if (ratio < expected - 0.18 && hour > 9) {
    pace = "behind";
    paceLabel = "Behind pace";
  }

  // Headline & subline composition
  const name = firstName?.trim() || "there";
  const greeting = `${greetingFor(hour)}, ${name}.`;

  let headline = "Your day is unfolding nicely.";
  if (eaten === 0 && hour < 11) headline = "A fresh page — what's for breakfast?";
  else if (eaten === 0 && hour < 16) headline = "Nothing logged yet. Let's get fuelled.";
  else if (eaten === 0) headline = "The day is winding down — log something light.";
  else if (pace === "over") headline = "You've passed today's goal.";
  else if (pace === "ahead") headline = "You're moving fast today.";
  else if (pace === "behind") headline = "Plenty of room left in your day.";
  else if (ratio >= 0.9) headline = "Almost there — last touches matter.";
  else if (ratio >= 0.5) headline = "Halfway home, looking great.";

  const proteinPct = proteinTarget > 0 ? proteinEaten / proteinTarget : 0;
  const waterPct =
    waterTargetGlasses > 0 ? waterGlasses / waterTargetGlasses : 0;

  const bits: string[] = [];
  if (proteinPct >= 0.9) bits.push("protein crushed");
  else if (proteinPct >= 0.5) bits.push("protein on track");
  else if (proteinEaten > 0) bits.push("protein needs love");

  if (waterPct >= 1) bits.push("hydration nailed");
  else if (waterPct >= 0.5) bits.push("hydration solid");
  else if (waterGlasses > 0) bits.push("sip more water");
  else bits.push("no water yet");

  if (streakDays >= 7) bits.push(`${streakDays}-day streak 🔥`);
  else if (streakDays >= 3) bits.push(`${streakDays}-day streak`);

  const subline = bits.slice(0, 3).join(" · ");

  return { greeting, headline, subline, pace, paceLabel };
}

export interface SuggestionInput {
  caloriesRemaining: number;
  proteinRemaining: number;
  fibreEaten?: number;
  hour?: number;
  diet?: string[] | null;
}

export interface MealSuggestion {
  emoji: string;
  title: string;
  why: string;
  prompt: string; // text used to pre-fill the AI log
}

/**
 * Pure local suggestion engine — picks one of a handful of curated ideas
 * tailored to remaining macros and time of day. We use the AI to ESTIMATE
 * macros once the user picks one, but we don't pay for ideation here.
 */
export function buildMealSuggestions(input: SuggestionInput): MealSuggestion[] {
  const hour = input.hour ?? new Date().getHours();
  const kcalLeft = Math.max(0, Math.round(input.caloriesRemaining));
  const protLeft = Math.max(0, Math.round(input.proteinRemaining));
  const isVeg =
    input.diet?.some((d) =>
      ["vegetarian", "vegan", "plant-based", "pescatarian"].includes(
        d.toLowerCase(),
      ),
    ) ?? false;

  const pool: MealSuggestion[] = [];

  // Time-bucketed ideas
  if (hour < 11) {
    pool.push(
      {
        emoji: "🍳",
        title: isVeg ? "Greek yoghurt parfait" : "3-egg veggie omelette",
        why: `${isVeg ? "~280 kcal · 22g protein" : "~340 kcal · 26g protein"} — perfect morning anchor`,
        prompt: isVeg
          ? "Greek yoghurt parfait with berries, oats, honey and almonds"
          : "Three-egg omelette with spinach, tomato and feta, plus a slice of sourdough",
      },
      {
        emoji: "🥣",
        title: "Overnight oats",
        why: "Slow-release carbs · keeps you full till lunch",
        prompt:
          "Overnight oats made with milk, chia seeds, banana and peanut butter",
      },
    );
  } else if (hour < 15) {
    pool.push(
      {
        emoji: "🥗",
        title: isVeg ? "Halloumi grain bowl" : "Chicken & quinoa bowl",
        why: `~${Math.min(560, Math.max(380, kcalLeft / 2))} kcal · big protein hit`,
        prompt: isVeg
          ? "Quinoa bowl with grilled halloumi, roast peppers, chickpeas and tahini"
          : "Quinoa bowl with grilled chicken, avocado, tomato, cucumber and lemon-tahini dressing",
      },
      {
        emoji: "🌯",
        title: "Big protein wrap",
        why: protLeft > 30 ? "Helps close your protein gap" : "Balanced macros",
        prompt: isVeg
          ? "Whole-wheat wrap with hummus, roast veg and falafel"
          : "Whole-wheat wrap with grilled chicken, hummus, lettuce and tomato",
      },
    );
  } else if (hour < 21) {
    pool.push(
      {
        emoji: "🍲",
        title: isVeg ? "Lentil dahl & rice" : "Salmon & sweet potato",
        why: `~${Math.min(620, Math.max(420, kcalLeft - 60))} kcal · rich in micros`,
        prompt: isVeg
          ? "Bowl of red lentil dahl with basmati rice and steamed greens"
          : "Grilled salmon fillet with roast sweet potato wedges and broccoli",
      },
      {
        emoji: "🍝",
        title: "Higher-protein pasta",
        why: "Comfort food, smart macros",
        prompt: isVeg
          ? "Whole-wheat pasta with tomato sauce, ricotta and basil"
          : "Whole-wheat pasta with turkey bolognese and parmesan",
      },
    );
  } else {
    pool.push(
      {
        emoji: "🥛",
        title: "Casein-style snack",
        why: "Slow protein for overnight recovery",
        prompt:
          "Bowl of Greek yoghurt with a spoon of almond butter and cinnamon",
      },
      {
        emoji: "🍵",
        title: "Light evening tea",
        why: "Caffeine-free, gentle on sleep",
        prompt: "Cup of chamomile tea and a piece of dark chocolate",
      },
    );
  }

  // Always-available filler if we want a third option
  pool.push({
    emoji: "🍎",
    title: "Fruit + nuts",
    why: "Easy ~200 kcal · fibre boost",
    prompt: "An apple with a small handful of almonds",
  });

  return pool.slice(0, 3);
}
