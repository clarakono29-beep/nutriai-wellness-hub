import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  trigger: "morning_log" | "lunch_reminder" | "protein_low" | "water_low" | "streak_at_risk" | "goal_nearly_met" | "evening_summary";
  context: {
    name?: string;
    streak?: number;
    caloriesRemaining?: number;
    proteinRemaining?: number;
    waterGlasses?: number;
    caloriesLogged?: number;
    goal?: string;
  };
}

// Deterministic notification copy — no AI needed, just smart personalisation
function generateNotification(body: Body): { title: string; body: string } {
  const { trigger, context: ctx } = body;
  const name = ctx.name?.split(" ")[0] ?? "";
  const firstName = name ? `${name}, ` : "";

  switch (trigger) {
    case "morning_log":
      return {
        title: ctx.streak && ctx.streak > 3 ? `🔥 Day ${ctx.streak + 1} starts now` : "🌅 Morning check-in",
        body: ctx.streak && ctx.streak > 3
          ? `Keep your ${ctx.streak}-day streak alive. Log breakfast and you're set.`
          : `${firstName}log breakfast to kick off strong. AI handles the macros — takes 5 seconds.`,
      };

    case "lunch_reminder":
      return {
        title: "☀️ Lunch time",
        body: ctx.caloriesLogged && ctx.caloriesLogged < 300
          ? `${firstName}you've only had ${ctx.caloriesLogged} kcal. Make lunch count — your body needs fuel.`
          : `${firstName}log your lunch and stay on track for today.`,
      };

    case "protein_low":
      return {
        title: "💪 Protein check",
        body: `${firstName}you're ${Math.round(ctx.proteinRemaining ?? 30)}g short of your protein goal. Time for a high-protein snack.`,
      };

    case "water_low":
      return {
        title: "💧 Hydration check",
        body: ctx.waterGlasses !== undefined
          ? `${firstName}${ctx.waterGlasses} glasses so far. Aim for ${8 - ctx.waterGlasses} more before bed.`
          : `${firstName}don't forget to stay hydrated. Your metabolism depends on it.`,
      };

    case "streak_at_risk":
      return {
        title: ctx.streak && ctx.streak > 7 ? `⚠️ ${ctx.streak}-day streak at risk` : "⚠️ Don't break the chain",
        body: `${firstName}you haven't logged today. Quick log to protect your streak — takes 10 seconds.`,
      };

    case "goal_nearly_met":
      return {
        title: "🎯 Almost there",
        body: ctx.caloriesRemaining !== undefined && ctx.caloriesRemaining < 200
          ? `${firstName}only ${ctx.caloriesRemaining} kcal left today. You're crushing it!`
          : `${firstName}great progress today. You're close to hitting your daily goal.`,
      };

    case "evening_summary":
      return {
        title: "🌙 Today's wrap-up",
        body: ctx.caloriesLogged
          ? `${firstName}you logged ${ctx.caloriesLogged} kcal today. ${(ctx.caloriesLogged > 0 && ctx.caloriesRemaining !== undefined && ctx.caloriesRemaining < 100) ? "Goal hit! Great job. 🎉" : "Every day logged is a day in the right direction."}`
          : `${firstName}wrap up your day — log anything you had tonight to keep your streak.`,
      };

    default:
      return { title: "NutriAI", body: "Tap to check in with your nutrition today." };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const notification = generateNotification(body);
    return new Response(JSON.stringify(notification), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
