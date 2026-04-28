import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OFFProduct {
  product_name?: string;
  brands?: string;
  image_url?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    "energy_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
    sugars_100g?: number;
    salt_100g?: number;
    sodium_100g?: number;
  };
  serving_size?: string;
  serving_quantity?: number;
  ecoscore_grade?: string;
  nutriscore_grade?: string;
  categories_tags?: string[];
}

function gradeToScore(grade: string | undefined): number {
  const map: Record<string, number> = { a: 9, b: 7, c: 5, d: 3, e: 2 };
  return map[grade?.toLowerCase() ?? ""] ?? 5;
}

function emojiFromName(name: string, categories: string[]): string {
  const haystack = [...name.toLowerCase().split(" "), ...categories.join(",").toLowerCase().split(",")];
  const h = haystack.join(" ");
  if (h.includes("milk") || h.includes("dairy")) return "🥛";
  if (h.includes("cheese")) return "🧀";
  if (h.includes("yogurt") || h.includes("yoghurt")) return "🥣";
  if (h.includes("bread") || h.includes("toast") || h.includes("biscuit")) return "🍞";
  if (h.includes("chocolate") || h.includes("cocoa")) return "🍫";
  if (h.includes("coffee")) return "☕";
  if (h.includes("tea")) return "🍵";
  if (h.includes("juice") || h.includes("smoothie")) return "🥤";
  if (h.includes("water")) return "💧";
  if (h.includes("beer") || h.includes("wine")) return "🍺";
  if (h.includes("cereal") || h.includes("oat") || h.includes("granola")) return "🥣";
  if (h.includes("chip") || h.includes("crisp") || h.includes("snack")) return "🥨";
  if (h.includes("cookie") || h.includes("biscuit")) return "🍪";
  if (h.includes("pasta") || h.includes("noodle")) return "🍝";
  if (h.includes("rice")) return "🍚";
  if (h.includes("soup")) return "🍲";
  if (h.includes("sauce") || h.includes("ketchup")) return "🍅";
  if (h.includes("nut") || h.includes("almond") || h.includes("peanut")) return "🥜";
  if (h.includes("protein") || h.includes("bar")) return "💪";
  return "🍽️";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { barcode } = await req.json();
    if (!barcode?.trim()) {
      return json({ error: "Barcode required" }, 400);
    }

    // OpenFoodFacts — free, no API key needed, 3M+ products
    const offUrl = `https://world.openfoodfacts.org/api/v2/product/${barcode.trim()}.json?fields=product_name,brands,nutriments,serving_size,serving_quantity,nutriscore_grade,ecoscore_grade,categories_tags,image_url`;

    const resp = await fetch(offUrl, {
      headers: {
        "User-Agent": "NutriAI/1.0 (https://nutriai.app; contact@nutriai.app)",
      },
    });

    if (!resp.ok) {
      return json({ error: "Barcode lookup failed", found: false }, 200);
    }

    const data = await resp.json();
    if (data.status !== 1 || !data.product) {
      return json({ found: false, message: "Product not found in database" }, 200);
    }

    const p: OFFProduct = data.product;
    const n = p.nutriments ?? {};

    const kcal = n["energy-kcal_100g"] ?? (n["energy_100g"] ? n["energy_100g"] / 4.184 : 0);
    const protein = n.proteins_100g ?? 0;
    const carbs = n.carbohydrates_100g ?? 0;
    const fat = n.fat_100g ?? 0;
    const fibre = n.fiber_100g ?? 0;

    const name = [p.product_name, p.brands].filter(Boolean).join(" — ").trim() || "Unknown product";
    const categories = p.categories_tags ?? [];
    const emoji = emojiFromName(name, categories);
    const score = gradeToScore(p.nutriscore_grade ?? p.ecoscore_grade);

    const servingSize = p.serving_quantity ?? 100;

    return json({
      found: true,
      product: {
        barcode,
        name,
        emoji,
        brand: p.brands ?? null,
        imageUrl: p.image_url ?? null,
        per100: {
          kcal: Math.round(kcal * 10) / 10,
          protein: Math.round(protein * 10) / 10,
          carbs: Math.round(carbs * 10) / 10,
          fat: Math.round(fat * 10) / 10,
          fibre: Math.round(fibre * 10) / 10,
        },
        serving: {
          size: servingSize,
          unit: "g",
          kcal: Math.round((kcal * servingSize) / 100),
          protein: Math.round((protein * servingSize) / 100 * 10) / 10,
          carbs: Math.round((carbs * servingSize) / 100 * 10) / 10,
          fat: Math.round((fat * servingSize) / 100 * 10) / 10,
          fibre: Math.round((fibre * servingSize) / 100 * 10) / 10,
        },
        nutriScore: p.nutriscore_grade?.toUpperCase() ?? null,
        score,
        source: "OpenFoodFacts",
      },
    }, 200);
  } catch (e) {
    console.error("barcode-lookup error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error", found: false }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
