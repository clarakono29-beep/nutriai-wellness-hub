import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

import { SurfaceCard } from "@/components/ui/luxury/SurfaceCard";
import { Pill } from "@/components/ui/luxury/Pill";
import { LeafMark } from "@/components/brand/Logo";
import { LogOut, Crown, Settings, Bell, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authed/app/profile")({
  head: () => ({ meta: [{ title: "Profile — NutriAI" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("See you soon.");
    navigate({ to: "/" });
  };

  const initials = (profile?.name ?? user?.email ?? "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="px-6 pt-8 pb-6 stagger">
      {/* Identity card */}
      <SurfaceCard tone="forest" className="text-center py-8">
        <div className="mx-auto h-20 w-20 rounded-full bg-[color:var(--gold)] grid place-items-center font-display text-[28px] text-[color:var(--forest)] shadow-elev-gold">
          {initials}
        </div>
        <h2 className="font-display text-[22px] text-white mt-4">{profile?.name ?? "Friend"}</h2>
        <p className="text-[13px] text-white/60 mt-1">{user?.email}</p>
        <div className="mt-3 flex justify-center">
          <Pill tone="gold">Free plan</Pill>
        </div>
      </SurfaceCard>

      {/* Targets summary */}
      <SurfaceCard className="mt-4">
        <h4 className="font-body font-semibold text-[15px]">Daily targets</h4>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          <Mini label="kcal" value={profile?.daily_calories} />
          <Mini label="P" value={profile?.protein_g} unit="g" />
          <Mini label="C" value={profile?.carbs_g} unit="g" />
          <Mini label="F" value={profile?.fat_g} unit="g" />
        </div>
        <Link
          to="/onboarding"
          className="mt-4 inline-flex items-center text-[13px] font-semibold text-[color:var(--forest)]"
        >
          Recalibrate <ChevronRight className="h-4 w-4" />
        </Link>
      </SurfaceCard>

      {/* Upgrade */}
      <Link to="/pricing" className="block mt-4">
        <SurfaceCard tone="gold" className="flex items-center justify-between">
          <div>
            <p className="text-caption opacity-80">Unlock everything</p>
            <h4 className="font-display text-[18px] mt-1">Go Pro</h4>
            <p className="text-[12px] opacity-80 mt-0.5">Unlimited AI, all programs, deeper insights.</p>
          </div>
          <Crown className="h-6 w-6 shrink-0" />
        </SurfaceCard>
      </Link>

      {/* Settings list */}
      <div className="mt-4 bg-white rounded-[20px] border border-[color:var(--cream-border)] divide-y divide-[color:var(--cream-border)]">
        <SettingsRow icon={<Bell className="h-4 w-4" />} label="Notifications" />
        <SettingsRow icon={<Settings className="h-4 w-4" />} label="Preferences" />
        <button
          onClick={handleSignOut}
          className="w-full px-5 py-4 flex items-center gap-3 text-[14px] text-[color:var(--coral)] hover:bg-[color:var(--coral-light)] transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>

      <div className="mt-10 flex flex-col items-center gap-2 text-[color:var(--ink-light)]">
        <LeafMark size={22} />
        <p className="text-[10px] uppercase tracking-widest">NutriAI · v0.1</p>
      </div>
    </div>
  );
}

function Mini({ label, value, unit = "" }: { label: string; value: number | null | undefined; unit?: string }) {
  return (
    <div className="rounded-[12px] bg-[color:var(--cream-dark)] py-2.5">
      <div className="font-display text-[16px] text-[color:var(--forest)]">{value ?? "—"}{unit}</div>
      <div className="text-[10px] uppercase tracking-widest text-[color:var(--ink-light)]">{label}</div>
    </div>
  );
}

function SettingsRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="w-full px-5 py-4 flex items-center gap-3 text-[14px] text-[color:var(--ink)] hover:bg-[color:var(--cream-dark)] transition-colors">
      <span className="text-[color:var(--ink-mid)]">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      <ChevronRight className="h-4 w-4 text-[color:var(--ink-light)]" />
    </button>
  );
}
