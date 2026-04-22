import { createFileRoute, Outlet, Link, redirect, useLocation } from "@tanstack/react-router";
import { Home, Utensils, TrendingUp, BookOpen, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/app")({
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/signin", search: { redirect: location.href } });
    }
    const userId = data.session.user.id;
    // Check onboarding completion
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("user_id", userId)
      .maybeSingle();
    if (profile && !profile.onboarding_completed) {
      throw redirect({ to: "/onboarding" });
    }
    // Check active subscription
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const active =
      sub &&
      ["active", "trialing", "past_due"].includes(sub.status) &&
      (!sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now());
    if (!active) {
      throw redirect({ to: "/renewal" });
    }
  },
  component: AppLayout,
});

interface Tab {
  to: "/app" | "/app/log" | "/app/progress" | "/app/programs" | "/app/profile";
  label: string;
  icon: typeof Home;
  exact?: boolean;
}

const tabs: Tab[] = [
  { to: "/app", label: "Home", icon: Home, exact: true },
  { to: "/app/log", label: "Log", icon: Utensils },
  { to: "/app/progress", label: "Progress", icon: TrendingUp },
  { to: "/app/programs", label: "Programs", icon: BookOpen },
  { to: "/app/profile", label: "Profile", icon: User },
];

function AppLayout() {
  const location = useLocation();
  const path = location.pathname.replace(/\/$/, "");

  return (
    <div className="mobile-shell pb-24 bg-[color:var(--cream)]">
      <Outlet />

      {/* Tab bar */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40">
        <div className="mx-3 mb-3 rounded-[24px] bg-white/95 backdrop-blur-xl border border-[color:var(--cream-border)] shadow-elev-md">
          <ul className="flex items-stretch justify-between px-2 py-2">
            {tabs.map((t) => {
              const isActive = t.exact
                ? path === "/app"
                : path === t.to || path.startsWith(t.to + "/");
              const Icon = t.icon;
              return (
                <li key={t.to} className="flex-1">
                  <Link
                    to={t.to}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 py-2 rounded-[16px] transition-all ease-luxury",
                      isActive ? "text-[color:var(--forest)]" : "text-[color:var(--ink-light)]",
                    )}
                  >
                    <Icon className={cn("h-[22px] w-[22px]", isActive && "stroke-[2.4]")} />
                    <span className="text-[10px] uppercase tracking-widest font-semibold">
                      {t.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </div>
  );
}
