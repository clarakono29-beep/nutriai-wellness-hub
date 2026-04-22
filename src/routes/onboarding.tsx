import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Convenience redirect: /onboarding → /_authed/onboarding (auth-gated).
 * Beautiful URL for users without exposing the layout segment.
 */
export const Route = createFileRoute("/onboarding")({
  beforeLoad: () => {
    throw redirect({ to: "/app" }); // _authed.app.tsx will redirect to onboarding if not complete
  },
  component: () => null,
});
