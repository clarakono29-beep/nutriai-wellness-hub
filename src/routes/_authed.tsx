import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Pathless layout that gates all child routes behind authentication.
 * Anything under src/routes/_authed/ requires a signed-in user.
 */
export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({
        to: "/auth",
        search: { mode: "signin" as const },
      });
    }
  },
  component: () => <Outlet />,
});
