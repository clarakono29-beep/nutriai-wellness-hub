import { createFileRoute, Outlet, Link, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { BookOpen, ChefHat, NotebookPen, Plus, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/app")({
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/signin", search: { redirect: location.href } });
    }
    const userId = data.session.user.id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("user_id", userId)
      .maybeSingle();
    if (profile && !profile.onboarding_completed) {
      throw redirect({ to: "/onboarding" });
    }
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
  to: "/app" | "/app/progress" | "/app/programs" | "/app/recipes";
  label: string;
  icon: typeof NotebookPen;
  emoji: string;
  exact?: boolean;
}

const leftTabs: Tab[] = [
  { to: "/app", label: "Diary", icon: NotebookPen, emoji: "📓", exact: true },
  { to: "/app/progress", label: "Progress", icon: TrendingUp, emoji: "📊" },
];
const rightTabs: Tab[] = [
  { to: "/app/programs", label: "Programs", icon: BookOpen, emoji: "🎯" },
  { to: "/app/recipes", label: "Recipes", icon: ChefHat, emoji: "🍽️" },
];

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname.replace(/\/$/, "");

  const isActive = (t: Tab) =>
    t.exact ? path === "/app" : path === t.to || path.startsWith(t.to + "/");

  return (
    <div className="mobile-shell pb-[110px] bg-[color:var(--cream)]">
      <Outlet />

      {/* Tab bar */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="relative bg-white/85 backdrop-blur-xl border-t border-[color:var(--cream-border)]">
          {/* Floating center add button */}
          <button
            onClick={() => navigate({ to: "/app/log" })}
            aria-label="Quick log meal"
            className="absolute left-1/2 -translate-x-1/2 -top-7 h-14 w-14 rounded-full bg-gradient-cta grid place-items-center text-white shadow-elev-cta active:scale-95 transition-transform ease-luxury z-10"
          >
            <Plus className="h-6 w-6" strokeWidth={2.6} />
          </button>

          <ul className="grid grid-cols-5 items-end h-[72px] px-2">
            {[...leftTabs, null, ...rightTabs].map((t, i) => {
              if (!t) {
                // Spacer cell where the floating button sits
                return <li key="center-spacer" aria-hidden="true" />;
              }
              const active = isActive(t);
              const Icon = t.icon;
              return (
                <li key={t.to} className="flex justify-center">
                  <Link
                    to={t.to}
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-0.5 py-2 w-full transition-colors ease-luxury",
                      active ? "text-[color:var(--forest)]" : "text-[color:var(--ink-light)]",
                    )}
                  >
                    {active && (
                      <span className="absolute top-0.5 h-1 w-1 rounded-full bg-[color:var(--forest)]" />
                    )}
                    <Icon className={cn("h-6 w-6", active && "stroke-[2.4]")} />
                    <span className="text-[10px] font-medium tracking-wide">
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
