import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  meal_description?: string;
  image_base64?: string;
  user_context?: {
    goal?: string | null;
    daily_calories?: number | null;
    protein_target?: number | null;
  };
}

const SYSTEM_PROMPT =
  "You are a precision nutritionist for NutriAI, a luxury wellness app. " +
  "You estimate macros conservatively but realistically and give warm, expert verdicts that respect the user's goal. " +
  "Always reply by calling the `analyse_meal` tool with structured fields. Never reply in plain text.";

const TOOL = {
  type: "function" as const,
  function: {
    name: "analyse_meal",
    description: "Return the nutritional analysis of the meal as a structured object.",
    parameters: {
      type: "object",
      properties: {
        meal_name: { type: "string", description: "Concise display name (max 50 chars)" },
        emoji: { type: "string", description: "Single most relevant food emoji" },
        calories: { type: "integer", description: "Total kcal" },
        protein: { type: "integer", description: "Grams of protein" },
        carbs: { type: "integer", description: "Grams of carbohydrate" },
        fat: { type: "integer", description: "Grams of fat" },
        fibre: { type: "integer", description: "Grams of fibre" },
        food_score: {
          type: "integer",
          minimum: 1,
          maximum: 10,
          description: "Nutritional quality score from 1 (poor) to 10 (excellent).",
        },
        verdict: {
          type: "string",
          description: "One encouraging sentence about this food choice (max 80 chars).",
        },
        reasoning: {
          type: "string",
          description: "Brief 1-sentence explanation of the score.",
        },
      },
      required: [
        "meal_name",
        "emoji",
        "calories",
        "protein",
        "carbs",
        "fat",
        "fibre",
        "food_score",
        "verdict",
        "reasoning",
      ],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return json({ error: "LOVABLE_API_KEY missing — enable Lovable AI." }, 500);
    }

    const body = (await req.json()) as Body;

    if (!body.meal_description?.trim() && !body.image_base64) {
      return json({ error: "Provide meal_description or image_base64." }, 400);
    }

    const ctx = body.user_context ?? {};
    const ctxLine =
      `User context — goal: ${ctx.goal ?? "general health"}, ` +
      `daily kcal target: ${ctx.daily_calories ?? "unknown"}, ` +
      `daily protein target: ${ctx.protein_target ?? "unknown"} g.`;

    // Build user message — multimodal if image provided
    let userContent: unknown;
    if (body.image_base64) {
      const dataUrl = body.image_base64.startsWith("data:")
        ? body.image_base64
        : `data:image/jpeg;base64,${body.image_base64}`;
      userContent = [
        {
          type: "text",
          text: `${ctxLine}\n\nAnalyse this food photograph for nutritional content.${
            body.meal_description ? `\nUser note: "${body.meal_description}"` : ""
          }`,
        },
        { type: "image_url", image_url: { url: dataUrl } },
      ];
    } else {
      userContent = `${ctxLine}\n\nAnalyse this meal: "${body.meal_description}"`;
    }

    // Use a vision-capable model when an image is sent.
    const model = body.image_base64 ? "google/gemini-2.5-flash" : "google/gemini-3-flash-preview";

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "analyse_meal" } },
      }),
    });

    if (resp.status === 429) {
      return json({ error: "Rate limit reached. Try again in a moment." }, 429);
    }
    if (resp.status === 402) {
      return json(
        { error: "AI credits exhausted. Add funds in Lovable workspace settings." },
        402,
      );
    }
    if (!resp.ok) {
      const text = await resp.text();
      console.error("AI gateway error:", resp.status, text);
      return json({ error: `AI gateway error: ${resp.status}` }, 502);
    }

    const data = await resp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;
    if (!argsRaw) {
      console.error("No tool call in response", JSON.stringify(data));
      return json({ error: "AI did not return structured analysis." }, 502);
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(argsRaw);
    } catch (e) {
      console.error("Failed to parse tool arguments:", argsRaw, e);
      return json({ error: "Could not parse AI response." }, 502);
    }

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
