import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserContext {
  name?: string | null;
  goal?: string | null;
  daily_calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  diet_preferences?: string[] | null;
  allergies?: string[] | null;
  cuisine_preferences?: string[] | null;
  budget?: "budget" | "moderate" | "premium" | null;
  cooking_time?: "quick" | "moderate" | "leisurely" | null;
}

interface MealPlanDay {
  day: string;
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snack: Meal;
  totals: { calories: number; protein: number; carbs: number; fat: number };
}

interface Meal {
  name: string;
  emoji: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time: number;
  ingredients: string[];
  method: string;
  tip: string;
}

const SYSTEM_PROMPT = `You are an expert nutritionist and meal planner for NutriAI, a luxury wellness app.
Your task is to create a personalised 7-day meal plan.
Always respond by calling the create_meal_plan tool with valid JSON.
Never reply in plain text. Every meal must be realistic, delicious, and nutritionally precise.
Prioritise whole foods. Include variety across the week. Match the user's goals exactly.`;

const TOOL = {
  type: "function" as const,
  function: {
    name: "create_meal_plan",
    description: "Generate a complete 7-day personalised meal plan",
    parameters: {
      type: "object",
      properties: {
        days: {
          type: "array",
          minItems: 7,
          maxItems: 7,
          items: {
            type: "object",
            properties: {
              day: { type: "string" },
              breakfast: { $ref: "#/definitions/meal" },
              lunch: { $ref: "#/definitions/meal" },
              dinner: { $ref: "#/definitions/meal" },
              snack: { $ref: "#/definitions/meal" },
              totals: {
                type: "object",
                properties: {
                  calories: { type: "integer" },
                  protein: { type: "integer" },
                  carbs: { type: "integer" },
                  fat: { type: "integer" },
                },
                required: ["calories", "protein", "carbs", "fat"],
              },
            },
            required: ["day", "breakfast", "lunch", "dinner", "snack", "totals"],
          },
        },
        shopping_list: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string" },
              items: { type: "array", items: { type: "string" } },
            },
          },
        },
        weekly_overview: { type: "string", description: "2-3 sentences summarising the plan's nutritional approach" },
        coach_notes: { type: "string", description: "Personal motivational note from the nutrition coach (max 80 words)" },
      },
      required: ["days", "shopping_list", "weekly_overview", "coach_notes"],
      definitions: {
        meal: {
          type: "object",
          properties: {
            name: { type: "string" },
            emoji: { type: "string" },
            calories: { type: "integer" },
            protein: { type: "integer" },
            carbs: { type: "integer" },
            fat: { type: "integer" },
            prep_time: { type: "integer", description: "Minutes" },
            ingredients: { type: "array", items: { type: "string" } },
            method: { type: "string", description: "2-3 sentence cooking method" },
            tip: { type: "string", description: "One nutrition or cooking tip for this meal" },
          },
          required: ["name", "emoji", "calories", "protein", "carbs", "fat", "prep_time", "ingredients", "method", "tip"],
        },
      },
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI not configured" }, 500);

    const ctx: UserContext = await req.json();

    const diet = (ctx.diet_preferences ?? []).filter(Boolean).join(", ") || "no restrictions";
    const allergies = (ctx.allergies ?? []).filter(Boolean).join(", ") || "none";
    const cuisines = (ctx.cuisine_preferences ?? []).filter(Boolean).join(", ") || "varied international";

    const prompt = [
      `Create a complete 7-day meal plan for ${ctx.name ?? "the user"}.`,
      `Goal: ${ctx.goal ?? "general health and weight management"}`,
      `Daily targets: ${ctx.daily_calories ?? 2000} kcal, ${ctx.protein_g ?? 100}g protein, ${ctx.carbs_g ?? 200}g carbs, ${ctx.fat_g ?? 65}g fat`,
      `Dietary preferences: ${diet}`,
      `Allergies/intolerances: ${allergies}`,
      `Cuisine preferences: ${cuisines}`,
      `Budget: ${ctx.budget ?? "moderate"}`,
      `Cooking time preference: ${ctx.cooking_time ?? "moderate"} (quick = under 20 min, moderate = 20-45 min, leisurely = any)`,
      "",
      "Requirements:",
      "- Each day must hit within 5% of the calorie target",
      "- Distribute macros evenly across meals",
      "- Include variety — no repeated main proteins in the same day",
      "- Breakfast should be quick (under 15 min on weekdays)",
      "- Shopping list must be grouped by category (Produce, Protein, Dairy, Pantry, etc.)",
    ].join("\n");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "create_meal_plan" } },
        max_tokens: 8000,
      }),
    });

    if (resp.status === 429) return json({ error: "Rate limit — try again shortly" }, 429);
    if (resp.status === 402) return json({ error: "AI credits exhausted" }, 402);
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI error:", resp.status, t);
      return json({ error: "AI service error" }, 502);
    }

    const data = await resp.json();
    const argsRaw = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argsRaw) return json({ error: "No meal plan generated" }, 502);

    const plan = JSON.parse(argsRaw);
    return json({ plan, generated_at: new Date().toISOString() }, 200);
  } catch (e) {
    console.error("generate-meal-plan error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
