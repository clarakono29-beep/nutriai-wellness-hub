import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  meal_description: string;
  user_context?: {
    goal?: string | null;
    daily_calories?: number | null;
    protein_target?: number | null;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return json({ error: "ANTHROPIC_API_KEY not set in Cloud secrets" }, 500);
    }

    const body = (await req.json()) as Body;
    if (!body.meal_description?.trim()) {
      return json({ error: "meal_description is required" }, 400);
    }

    const ctx = body.user_context ?? {};
    const userMsg = `Analyse this meal: "${body.meal_description}"

User context:
- Goal: ${ctx.goal ?? "general health"}
- Daily calorie target: ${ctx.daily_calories ?? "unknown"} kcal
- Daily protein target: ${ctx.protein_target ?? "unknown"} g

Return ONLY a JSON object — no prose, no markdown — with these exact keys:
{
  "meal_name": "Concise descriptive name (max 6 words)",
  "calories": number (kcal, integer),
  "protein": number (g),
  "carbs": number (g),
  "fat": number (g),
  "fibre": number (g),
  "food_score": number 1-10 (longevity/nutrition density score),
  "verdict": "1 short sentence — warm, expert tone, addresses user's goal",
  "emoji": "single most representative food emoji"
}`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        system:
          "You are a precision nutritionist for NutriAI, a luxury wellness app. You estimate macros conservatively and give warm, expert verdicts that respect the user's goal. Always reply with valid JSON only.",
        messages: [{ role: "user", content: userMsg }],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("Anthropic error:", resp.status, text);
      return json({ error: `Anthropic API error: ${resp.status}` }, 502);
    }

    const data = await resp.json();
    const text: string = data?.content?.[0]?.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return json({ error: "Could not parse AI response" }, 502);
    }

    const parsed = JSON.parse(match[0]);
    return json(parsed, 200);
  } catch (e) {
    console.error("analyse-meal error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
