import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Pathless layout that gates all child routes behind authentication.
 * Anything under src/routes/_authed/ requires a signed-in user.
 */
export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ location }) => {
    // DEV BYPASS: skip auth entirely when flag is set in localStorage.
    // Toggle from the landing page "Dev: Skip auth" link (dev builds only).
    if (
      import.meta.env.DEV &&
      typeof window !== "undefined" &&
      window.localStorage.getItem("dev_bypass_auth") === "1"
    ) {
      return;
    }
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({
        to: "/signin",
        search: { redirect: location.href },
      });
    }
  },
  component: () => <Outlet />,
});
