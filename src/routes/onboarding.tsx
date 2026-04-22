import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Public /onboarding URL — checks auth then routes user to the right place.
 */
export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth", search: { mode: "signin" as const } });
    }
    throw redirect({ to: "/app" as never });
  },
  component: () => null,
});
