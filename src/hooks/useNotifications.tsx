import { useCallback, useEffect, useState } from "react";

export interface ReminderSettings {
  morningWeighIn: { enabled: boolean; time: string };
  breakfast: { enabled: boolean; time: string };
  lunch: { enabled: boolean; time: string };
  dinner: { enabled: boolean; time: string };
  water: { enabled: boolean; everyHours: number };
  weeklyLifeScore: { enabled: boolean };
  streakReminder: { enabled: boolean; time: string };
}

const STORAGE_KEY = "nutriai_reminders";
const PROMPT_DISMISSED_KEY = "nutriai_notif_prompt_dismissed";

const DEFAULT_SETTINGS: ReminderSettings = {
  morningWeighIn: { enabled: false, time: "07:30" },
  breakfast: { enabled: true, time: "08:00" },
  lunch: { enabled: true, time: "12:30" },
  dinner: { enabled: true, time: "19:00" },
  water: { enabled: true, everyHours: 2 },
  weeklyLifeScore: { enabled: true },
  streakReminder: { enabled: true, time: "21:00" },
};

function load(): ReminderSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_SETTINGS);
  const [promptDismissed, setPromptDismissed] = useState(false);

  useEffect(() => {
    setSettings(load());
    setPromptDismissed(localStorage.getItem(PROMPT_DISMISSED_KEY) === "1");
  }, []);

  const updateSettings = useCallback((patch: Partial<ReminderSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "unsupported" as const;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const dismissPrompt = useCallback(() => {
    localStorage.setItem(PROMPT_DISMISSED_KEY, "1");
    setPromptDismissed(true);
  }, []);

  const shouldShowPrompt =
    permission === "default" && !promptDismissed && typeof Notification !== "undefined";

  /** Fire a notification immediately (used as a preview / test). */
  const notify = useCallback(
    (title: string, body: string) => {
      if (permission !== "granted") return;
      try {
        new Notification(title, { body, icon: "/favicon.ico" });
      } catch {
        // ignore
      }
    },
    [permission],
  );

  return {
    permission,
    settings,
    updateSettings,
    requestPermission,
    shouldShowPrompt,
    dismissPrompt,
    notify,
  };
}
