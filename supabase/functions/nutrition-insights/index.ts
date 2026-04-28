import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeekData {
  name?: string;
  goal?: string;
  daily_calories_target?: number;
  protein_target?: number;
  days: Array<{
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water_ml?: number;
  }>;
  current_streak?: number;
  weight_change_kg?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI not configured" }, 500);

    const weekData: WeekData = await req.json();

    const daysWithData = weekData.days.filter((d) => d.calories > 0);
    const avgCalories = daysWithData.length
      ? Math.round(daysWithData.reduce((a, d) => a + d.calories, 0) / daysWithData.length)
      : 0;
    const avgProtein = daysWithData.length
      ? Math.round(daysWithData.reduce((a, d) => a + d.protein, 0) / daysWithData.length)
      : 0;
    const avgWater = daysWithData.length
      ? Math.round(daysWithData.reduce((a, d) => a + (d.water_ml ?? 0), 0) / daysWithData.length)
      : 0;

    const dataStr = weekData.days
      .map((d) => `${d.date}: ${d.calories}kcal P:${d.protein}g C:${d.carbs}g F:${d.fat}g Water:${(d.water_ml ?? 0) / 250} glasses`)
      .join("\n");

    const prompt = [
      `Analyse this week's nutrition data for ${weekData.name ?? "the user"} and provide personalised insights.`,
      `Their goal: ${weekData.goal ?? "general health"}`,
      `Daily calorie target: ${weekData.daily_calories_target ?? 2000} kcal`,
      `Protein target: ${weekData.protein_target ?? 100}g/day`,
      `Current streak: ${weekData.current_streak ?? 0} days`,
      weekData.weight_change_kg != null
        ? `Weight change this period: ${weekData.weight_change_kg > 0 ? "+" : ""}${weekData.weight_change_kg.toFixed(1)} kg`
        : "",
      "",
      "Daily breakdown:",
      dataStr,
      "",
      `Weekly averages: ${avgCalories} kcal/day, ${avgProtein}g protein/day, ${avgWater}ml water/day`,
    ].filter(Boolean).join("\n");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: [
              "You are a warm, expert nutrition coach writing a weekly review for a NutriAI user.",
              "Be specific, data-driven, and genuinely encouraging.",
              "Respond ONLY with valid JSON — no markdown, no backticks.",
              "Format: {",
              '  "headline": "string (max 10 words, impactful weekly summary)",',
              '  "highlights": [{"icon": "emoji", "title": "string", "body": "string (2 sentences max)"}] (3-4 items),',
              '  "focus_next_week": {"icon": "emoji", "title": "string", "action": "string (specific, actionable, 1 sentence)"},',
              '  "motivational_note": "string (personalised, max 40 words, warm tone)"',
              "}",
            ].join("\n"),
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 800,
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI insights error:", resp.status, t);
      return json({ error: "Could not generate insights" }, 502);
    }

    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content ?? "";

    let insights: Record<string, unknown>;
    try {
      const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
      insights = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse insights JSON:", text);
      return json({ error: "Invalid AI response format" }, 502);
    }

    return json({ insights, generated_at: new Date().toISOString() }, 200);
  } catch (e) {
    console.error("nutrition-insights error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
