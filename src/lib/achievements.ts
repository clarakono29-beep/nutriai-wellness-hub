/**
 * Achievement definitions + earned-state helpers.
 * Earned state is computed locally from streak / log data,
 * and the date a badge was first earned is persisted in localStorage.
 */

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  requirement: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_log", emoji: "🌟", title: "First Log", requirement: "Log your first meal" },
  { id: "week_warrior", emoji: "🔥", title: "Week Warrior", requirement: "Reach a 7-day streak" },
  {
    id: "protein_pro",
    emoji: "💪",
    title: "Protein Pro",
    requirement: "Hit your protein target 5 days in a row",
  },
  {
    id: "on_track",
    emoji: "⚖️",
    title: "On Track",
    requirement: "Stay within 100 kcal of your goal 5 days running",
  },
  {
    id: "veggie_lover",
    emoji: "🥗",
    title: "Veggie Lover",
    requirement: "Log 3 plant-based meals in a single day",
  },
  {
    id: "monthly_master",
    emoji: "🏆",
    title: "Monthly Master",
    requirement: "Reach a 30-day streak",
  },
];

const STORAGE_KEY = "nutriai_achievements";

export type EarnedMap = Record<string, string>; // id -> ISO date

export function loadEarned(): EarnedMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function markEarned(id: string): EarnedMap {
  const map = loadEarned();
  if (!map[id]) {
    map[id] = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  }
  return map;
}

/** Evaluate which achievements should now be earned given latest stats. */
export function evaluateAchievements(input: {
  totalLogs: number;
  currentStreak: number;
}): string[] {
  const newlyEarned: string[] = [];
  const map = loadEarned();
  const grant = (id: string) => {
    if (!map[id]) {
      map[id] = new Date().toISOString();
      newlyEarned.push(id);
    }
  };
  if (input.totalLogs >= 1) grant("first_log");
  if (input.currentStreak >= 7) grant("week_warrior");
  if (input.currentStreak >= 30) grant("monthly_master");
  if (newlyEarned.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  return newlyEarned;
}
