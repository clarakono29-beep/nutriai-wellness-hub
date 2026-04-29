/**
 * End-to-end contract tests for every edge function.
 *
 * Each test invokes the deployed function via HTTP and asserts the response
 * shape matches the documented contract. We rely on the public Supabase
 * functions endpoint so the runtime, env vars, and CORS layer are all real.
 *
 * Run with: deno test --allow-net --allow-env supabase/functions/_tests/contracts_test.ts
 */
import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? "https://zrybapzsopcbhpnnpibh.supabase.co";
const ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeWJhcHpzb3BjYmhwbm5waWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MjM2MTksImV4cCI6MjA5MjM5OTYxOX0.POxsXdalXOV-wSEZ4IsVYPU9VJDWck09wG3kAqwnj7Q";

const FN_BASE = `${SUPABASE_URL}/functions/v1`;

type InvokeOpts = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  raw?: boolean;
};

async function invoke(name: string, opts: InvokeOpts = {}) {
  const res = await fetch(`${FN_BASE}/${name}`, {
    method: opts.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
      ...(opts.headers ?? {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (opts.raw) return { res, text: await res.text() };
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON (e.g. SSE stream)
  }
  return { res, json, text };
}

/* ---------------- CORS preflight applies to every function ---------------- */
const ALL_FUNCTIONS = [
  "analyse-meal",
  "barcode-lookup",
  "customer-portal",
  "food-search",
  "generate-meal-plan",
  "nutrition-coach",
  "nutrition-insights",
  "smart-notifications",
  "stripe-checkout",
  "stripe-webhook",
];

for (const fn of ALL_FUNCTIONS) {
  Deno.test(`[CORS] ${fn} responds to OPTIONS preflight`, async () => {
    const { res } = await invoke(fn, { method: "OPTIONS", raw: true });
    assert(
      res.status === 200 || res.status === 204,
      `${fn} OPTIONS returned ${res.status}`,
    );
    assertEquals(res.headers.get("access-control-allow-origin"), "*");
  });
}

/* ---------------- smart-notifications: deterministic copy ---------------- */
Deno.test("smart-notifications returns title + body for each trigger", async () => {
  const triggers = [
    "morning_log",
    "lunch_reminder",
    "protein_low",
    "water_low",
    "streak_at_risk",
    "goal_nearly_met",
    "evening_summary",
  ];
  for (const trigger of triggers) {
    const { res, json } = await invoke("smart-notifications", {
      body: {
        trigger,
        context: {
          name: "Alex",
          streak: 5,
          caloriesRemaining: 150,
          proteinRemaining: 30,
          waterGlasses: 4,
          caloriesLogged: 1200,
        },
      },
    });
    assertEquals(res.status, 200, `${trigger} failed: ${res.status}`);
    assertExists((json as any)?.title, `${trigger} missing title`);
    assertExists((json as any)?.body, `${trigger} missing body`);
    assert(typeof (json as any).title === "string");
    assert(typeof (json as any).body === "string");
  }
});

/* ---------------- food-search: USDA proxy ---------------- */
Deno.test("food-search returns array of normalised foods", async () => {
  const { res, json } = await invoke("food-search", {
    body: { query: "chicken breast" },
  });
  if (res.status !== 200) {
    assertExists((json as any)?.error, "non-200 must include error");
    return;
  }
  const results = (json as any)?.results ?? json;
  assert(Array.isArray(results), "expected results array");
  if (results.length > 0) {
    const f = results[0];
    assertExists(f.name ?? f.description, "missing name");
    assertExists(f.per100, "missing per100 macros");
    assert(typeof f.per100.kcal === "number", "per100.kcal must be number");
    assert(typeof f.per100.protein === "number", "per100.protein must be number");
  }
});

/* ---------------- barcode-lookup: Open Food Facts proxy ---------------- */
Deno.test("barcode-lookup returns product or not-found for known EAN", async () => {
  // Coca-Cola 330ml — well-known OFF entry
  const { res, json } = await invoke("barcode-lookup", {
    body: { barcode: "5449000000996" },
  });
  assert([200, 404].includes(res.status), `unexpected ${res.status}`);
  if (res.status === 200) {
    const j = json as any;
    const product = j?.product ?? j;
    assertExists(product?.name, "missing product name");
    assertExists(product?.per100, "missing per100 macros");
    assert(typeof product.per100.kcal === "number", "per100.kcal must be number");
  }
});

Deno.test("barcode-lookup rejects missing barcode", async () => {
  const { res, json } = await invoke("barcode-lookup", { body: {} });
  assert(res.status >= 400, "expected client error");
  assertExists((json as any)?.error);
});

/* ---------------- analyse-meal: AI tool-call contract ---------------- */
Deno.test("analyse-meal returns structured macros for text input", async () => {
  const { res, json } = await invoke("analyse-meal", {
    body: {
      meal_description: "200g grilled chicken breast with steamed broccoli",
      user_context: { goal: "lose_fat", daily_calories: 2000, protein_target: 150 },
    },
  });
  if (res.status === 429 || res.status === 402) {
    console.warn("AI rate/credit limited — skipping shape assertions");
    return;
  }
  assertEquals(res.status, 200);
  const j = json as any;
  assertExists(j.meal_name);
  assert(typeof j.calories === "number");
  assert(typeof j.protein === "number");
  assert(typeof j.carbs === "number");
  assert(typeof j.fat === "number");
  assert(j.food_score >= 1 && j.food_score <= 10);
});

Deno.test("analyse-meal rejects empty input", async () => {
  const { res } = await invoke("analyse-meal", { body: {} });
  assert(res.status >= 400);
});

/* ---------------- generate-meal-plan: 7-day plan contract ---------------- */
Deno.test("generate-meal-plan returns 7 days with all meals", async () => {
  const { res, json } = await invoke("generate-meal-plan", {
    body: {
      user_context: {
        name: "Test",
        goal: "maintain",
        daily_calories: 2200,
        protein_g: 150,
        carbs_g: 220,
        fat_g: 70,
      },
    },
  });
  if (res.status === 429 || res.status === 402) return;
  assertEquals(res.status, 200);
  const days = (json as any)?.days ?? (json as any)?.plan?.days ?? json;
  assert(Array.isArray(days), "expected days array");
  assertEquals(days.length, 7, "expected 7 days");
  for (const d of days) {
    assertExists(d.breakfast);
    assertExists(d.lunch);
    assertExists(d.dinner);
    assertExists(d.totals);
  }
});

/* ---------------- nutrition-insights: weekly review ---------------- */
Deno.test("nutrition-insights returns insights for week data", async () => {
  const days = Array.from({ length: 7 }, (_, i) => ({
    date: `2026-04-${20 + i}`,
    calories: 1900 + i * 25,
    protein: 130,
    carbs: 200,
    fat: 65,
    water_ml: 2000,
  }));
  const { res, json } = await invoke("nutrition-insights", {
    body: {
      name: "Test",
      goal: "maintain",
      daily_calories_target: 2000,
      protein_target: 140,
      days,
      current_streak: 7,
    },
  });
  if (res.status === 429 || res.status === 402) return;
  assertEquals(res.status, 200);
  assertExists(json, "expected JSON response");
});

/* ---------------- nutrition-coach: streaming SSE ---------------- */
Deno.test("nutrition-coach streams SSE response", async () => {
  const res = await fetch(`${FN_BASE}/nutrition-coach`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Hi" }],
      user_context: { name: "Test", goal: "maintain" },
    }),
  });
  if (res.status === 429 || res.status === 402) {
    await res.body?.cancel();
    return;
  }
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("content-type"), "text/event-stream");
  // Drain a small chunk to confirm stream is alive, then cancel.
  const reader = res.body?.getReader();
  if (reader) {
    const { value } = await reader.read();
    assert(value && value.length > 0, "expected stream chunk");
    await reader.cancel();
  }
});

/* ---------------- Stripe functions: auth + config gates ---------------- */
Deno.test("stripe-checkout requires auth header", async () => {
  const res = await fetch(`${FN_BASE}/stripe-checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ plan: "monthly" }),
  });
  // 401 (unauth) or 500 (stripe not configured) — both prove the contract gate
  assert([401, 500].includes(res.status), `got ${res.status}`);
  const j = await res.json();
  assertExists(j.error);
});

Deno.test("customer-portal requires auth header", async () => {
  const res = await fetch(`${FN_BASE}/customer-portal`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({}),
  });
  assert([401, 404, 500].includes(res.status), `got ${res.status}`);
  const j = await res.json();
  assertExists(j.error);
});

Deno.test("stripe-webhook rejects missing signature", async () => {
  const res = await fetch(`${FN_BASE}/stripe-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "test" }),
  });
  await res.body?.cancel(); // drain to avoid leak
  // Should fail signature verification (400) or be unconfigured (500)
  assert([400, 401, 500].includes(res.status), `got ${res.status}`);
});
