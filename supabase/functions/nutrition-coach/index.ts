import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface Body {
  messages: ChatMessage[];
  user_context?: {
    name?: string | null;
    goal?: string | null;
    daily_calories?: number | null;
    protein_target?: number | null;
    carbs_target?: number | null;
    fat_target?: number | null;
    streak?: number | null;
    diet_preferences?: string[] | null;
    todays_log_summary?: string | null;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY missing — enable Lovable AI." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json()) as Body;
    const ctx = body.user_context ?? {};

    const diet = (ctx.diet_preferences ?? []).filter(Boolean).join(", ") || "no specific preferences";
    const systemPrompt = [
      "You are a warm, knowledgeable, and encouraging personal nutrition coach for NutriAI.",
      "Your client's profile:",
      `- Name: ${ctx.name ?? "the user"}`,
      `- Goal: ${ctx.goal ?? "general health"}`,
      `- Daily calorie target: ${ctx.daily_calories ?? "unknown"} kcal`,
      `- Macros: ${ctx.protein_target ?? "?"}g protein, ${ctx.carbs_target ?? "?"}g carbs, ${ctx.fat_target ?? "?"}g fat`,
      `- Today's intake so far: ${ctx.todays_log_summary ?? "no entries yet"}`,
      `- Current streak: ${ctx.streak ?? 0} days`,
      `- Diet: ${diet}`,
      "",
      "Guidelines:",
      "- Keep responses concise (under 150 words unless explaining something complex)",
      "- Always be encouraging and positive",
      "- Give specific, actionable advice",
      "- Reference their actual data when relevant",
      "- If they ask about specific foods, give honest nutritional guidance",
      "- Never recommend below 1200 kcal/day",
      "- If they mention medical conditions, recommend seeing a doctor",
      "- Use light emojis occasionally to feel warm, not excessive",
      "- Address them by first name occasionally, never repeatedly",
      "- Never invent macros for foods the user did not log",
    ].join("\n");

    const cleaned = (body.messages ?? []).filter((m) => m.role !== "system");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [{ role: "system", content: systemPrompt }, ...cleaned],
      }),
    });

    if (resp.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit reached, try again soon." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (resp.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("coach gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(resp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("nutrition-coach error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
