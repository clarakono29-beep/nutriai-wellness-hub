import { createFileRoute, Outlet, Link, redirect, useLocation } from "@tanstack/react-router";
import { Home, Utensils, TrendingUp, BookOpen, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/app")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth", search: { mode: "signin" as const } });
    }
    // Check onboarding completion
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("user_id", data.session.user.id)
      .maybeSingle();
    if (profile && !profile.onboarding_completed) {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: AppLayout,
});

const tabs = [
  { to: "/app", label: "Home", icon: Home, exact: true },
  { to: "/app/log", label: "Log", icon: Utensils },
  { to: "/app/progress", label: "Progress", icon: TrendingUp },
  { to: "/app/programs", label: "Programs", icon: BookOpen },
  { to: "/app/profile", label: "Profile", icon: User },
] as const;

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
