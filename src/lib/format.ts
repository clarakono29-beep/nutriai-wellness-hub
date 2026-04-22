export function fmtKcal(n: number | null | undefined) {
  if (n == null) return "—";
  return Math.round(n).toLocaleString();
}

export function fmtGrams(n: number | null | undefined) {
  if (n == null) return "0g";
  return `${Math.round(n)}g`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
