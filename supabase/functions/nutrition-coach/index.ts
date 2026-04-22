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

    const systemPrompt =
      "You are a supportive, knowledgeable nutrition coach for NutriAI, a luxury wellness app. " +
      `The user's goal is "${ctx.goal ?? "general health"}". ` +
      `Their daily target is ${ctx.daily_calories ?? "unknown"} kcal and ${ctx.protein_target ?? "unknown"} g protein. ` +
      `Today's log so far: ${ctx.todays_log_summary ?? "no entries yet"}. ` +
      "Give concise, actionable, encouraging advice. Keep responses under 100 words. " +
      "Use plain markdown (lists, bold) sparingly. Never recommend calorie restriction below 1200 kcal. " +
      "Always be positive. Never invent macros for foods the user did not log.";

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
