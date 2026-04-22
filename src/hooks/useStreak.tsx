import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { todayISO } from "@/lib/format";

export interface StreakRow {
  current_streak: number;
  longest_streak: number;
  last_logged_date: string | null;
}

const MILESTONES = [3, 7, 14, 30, 60, 90, 180, 365];

export interface MilestoneEvent {
  days: number;
  title: string;
  message: string;
}

function milestoneFor(days: number): MilestoneEvent | null {
  if (!MILESTONES.includes(days)) return null;
  switch (days) {
    case 3:
      return { days, title: "3-Day Streak! 🔥", message: "You're building a habit!" };
    case 7:
      return { days, title: "1-Week Warrior! 💪", message: "Seven days strong — momentum unlocked." };
    case 14:
      return { days, title: "2-Week Champion! 🏆", message: "You're now in the top 10% of users." };
    case 30:
      return { days, title: "Monthly Master! 👑", message: "You're unstoppable. Keep going!" };
    default:
      return { days, title: `${days}-Day Streak! 🌟`, message: "Legendary commitment." };
  }
}

export function useStreak() {
  const { user } = useAuth();
  const [streak, setStreak] = useState<StreakRow>({
    current_streak: 0,
    longest_streak: 0,
    last_logged_date: null,
  });
  const [milestone, setMilestone] = useState<MilestoneEvent | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("streaks")
      .select("current_streak,longest_streak,last_logged_date")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setStreak(data);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Call after a meaningful daily log event.
   * Increments streak when first qualifying log of the day happens, resets if a day was missed.
   */
  const recordDailyActivity = useCallback(async () => {
    if (!user) return;
    const today = todayISO();
    const { data: existing } = await supabase
      .from("streaks")
      .select("current_streak,longest_streak,last_logged_date")
      .eq("user_id", user.id)
      .maybeSingle();

    const last = existing?.last_logged_date ?? null;
    if (last === today) {
      // Already counted today
      if (existing) setStreak(existing);
      return;
    }

    // Determine new current streak
    let next = 1;
    if (last) {
      const diff =
        (new Date(today + "T00:00:00").getTime() -
          new Date(last + "T00:00:00").getTime()) /
        (1000 * 60 * 60 * 24);
      if (diff === 1) next = (existing?.current_streak ?? 0) + 1;
      else next = 1; // reset
    }
    const longest = Math.max(existing?.longest_streak ?? 0, next);

    const { data: updated } = await supabase
      .from("streaks")
      .upsert(
        {
          user_id: user.id,
          current_streak: next,
          longest_streak: longest,
          last_logged_date: today,
        },
        { onConflict: "user_id" },
      )
      .select("current_streak,longest_streak,last_logged_date")
      .maybeSingle();

    if (updated) setStreak(updated);

    const m = milestoneFor(next);
    if (m) setMilestone(m);
  }, [user]);

  return { streak, milestone, clearMilestone: () => setMilestone(null), recordDailyActivity, refresh };
}
