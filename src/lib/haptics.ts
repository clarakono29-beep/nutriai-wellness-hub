/**
 * Haptic feedback helpers. Silently no-op on unsupported devices.
 */
function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  try {
    nav.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}

export const haptics = {
  light: () => vibrate(15),
  tap: () => vibrate(25),
  success: () => vibrate(50),
  achievement: () => vibrate([100, 50, 100]),
  goal: () => vibrate([50, 30, 50, 30, 50]),
  error: () => vibrate([60, 40, 60]),
};
