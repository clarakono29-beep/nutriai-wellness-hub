import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map USDA food data to a uniform NutriAI structure
function mapUSDAFood(food: Record<string, unknown>) {
  const nutrients = (food.foodNutrients as Record<string, unknown>[]) ?? [];

  const get = (id: number) => {
    const n = nutrients.find((n) => (n.nutrientId as number) === id);
    return Math.round(((n?.value as number) ?? 0) * 10) / 10;
  };

  // USDA nutrient IDs:
  // 1008 = Energy (kcal), 1003 = Protein, 1005 = Carbs, 1004 = Fat, 1079 = Fibre
  const kcal = get(1008);
  const protein = get(1003);
  const carbs = get(1005);
  const fat = get(1004);
  const fibre = get(1079);

  // Assign emoji by category keywords
  const desc = ((food.description as string) ?? "").toLowerCase();
  let emoji = "🍽️";
  if (desc.includes("chicken")) emoji = "🍗";
  else if (desc.includes("salmon") || desc.includes("fish") || desc.includes("tuna")) emoji = "🐟";
  else if (desc.includes("egg")) emoji = "🥚";
  else if (desc.includes("milk") || desc.includes("dairy") || desc.includes("yogurt") || desc.includes("yoghurt")) emoji = "🥛";
  else if (desc.includes("cheese")) emoji = "🧀";
  else if (desc.includes("bread") || desc.includes("toast")) emoji = "🍞";
  else if (desc.includes("rice")) emoji = "🍚";
  else if (desc.includes("pasta") || desc.includes("spaghetti") || desc.includes("noodle")) emoji = "🍝";
  else if (desc.includes("banana")) emoji = "🍌";
  else if (desc.includes("apple")) emoji = "🍎";
  else if (desc.includes("orange")) emoji = "🍊";
  else if (desc.includes("berry") || desc.includes("strawberr") || desc.includes("blueberr")) emoji = "🍓";
  else if (desc.includes("avocado")) emoji = "🥑";
  else if (desc.includes("broccoli") || desc.includes("spinach") || desc.includes("kale")) emoji = "🥦";
  else if (desc.includes("carrot")) emoji = "🥕";
  else if (desc.includes("tomato")) emoji = "🍅";
  else if (desc.includes("beef") || desc.includes("steak")) emoji = "🥩";
  else if (desc.includes("pork") || desc.includes("bacon")) emoji = "🥓";
  else if (desc.includes("almond") || desc.includes("nut") || desc.includes("peanut")) emoji = "🥜";
  else if (desc.includes("oil") || desc.includes("olive")) emoji = "🫒";
  else if (desc.includes("coffee")) emoji = "☕";
  else if (desc.includes("tea")) emoji = "🍵";
  else if (desc.includes("juice")) emoji = "🥤";
  else if (desc.includes("potato")) emoji = "🥔";
  else if (desc.includes("oat") || desc.includes("cereal")) emoji = "🥣";
  else if (desc.includes("soup")) emoji = "🍲";
  else if (desc.includes("salad")) emoji = "🥗";

  // Simple nutrition score
  let score = 5;
  const per100kcal = kcal > 0 ? (protein / kcal) * 100 : 0;
  if (protein >= 20) score += 2;
  else if (protein >= 10) score += 1;
  if (fibre >= 5) score += 1;
  if (fat > 30) score -= 1;
  if (carbs > 60 && fibre < 3) score -= 1;
  score = Math.max(1, Math.min(10, score));

  const name = (food.description as string) ?? "Unknown food";
  // Clean up USDA naming conventions
  const cleanName = name
    .replace(/,\s*UPC:.*/i, "")
    .replace(/,\s*NFS$/i, "")
    .split(",")
    .slice(0, 2)
    .join(", ")
    .trim();

  return {
    fdcId: food.fdcId,
    name: cleanName,
    emoji,
    per100: { kcal, protein, carbs, fat, fibre },
    source: (food.dataType as string) === "Branded" ? "Brand" : "USDA",
    brandOwner: food.brandOwner ?? null,
    servingSize: food.servingSize ?? 100,
    servingSizeUnit: food.servingSizeUnit ?? "g",
    score,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, pageSize = 20 } = await req.json();
    if (!query?.trim()) {
      return json({ results: [] }, 200);
    }

    // Use USDA FoodData Central API — DEMO_KEY works for dev, set USDA_API_KEY for production
    const apiKey = Deno.env.get("USDA_API_KEY") ?? "DEMO_KEY";
    const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("query", query.trim());
    url.searchParams.set("pageSize", String(Math.min(pageSize, 25)));
    url.searchParams.set("dataType", "Foundation,SR Legacy,Branded");

    const resp = await fetch(url.toString(), {
      headers: { "Content-Type": "application/json" },
    });

    if (!resp.ok) {
      console.error("USDA API error:", resp.status, await resp.text());
      return json({ error: "Food database unavailable", results: [] }, 200);
    }

    const data = await resp.json();
    const foods = (data.foods ?? []) as Record<string, unknown>[];

    // Prioritise Foundation/SR Legacy (more complete nutrient data) over Branded
    const sorted = [...foods].sort((a, b) => {
      const order: Record<string, number> = { Foundation: 0, "SR Legacy": 1, "Survey (FNDDS)": 2, Branded: 3 };
      return (order[a.dataType as string] ?? 4) - (order[b.dataType as string] ?? 4);
    });

    const results = sorted.slice(0, pageSize).map(mapUSDAFood);
    return json({ results, totalHits: data.totalHits ?? results.length }, 200);
  } catch (e) {
    console.error("food-search error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error", results: [] }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
