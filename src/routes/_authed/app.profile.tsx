import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  Camera,
  ChevronRight,
  Crown,
  Edit3,
  Flame,
  LogOut,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useProfile, type Profile } from "@/hooks/useProfile";
import { useStreak } from "@/hooks/useStreak";
import { useFoodLog } from "@/hooks/useFoodLog";
import { useSubscription } from "@/hooks/useSubscription";
import { useNotifications, type ReminderSettings } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateTargets,
  type ActivityLevel,
  type Gender,
  type Goal,
} from "@/lib/calculations";
import {
  ACHIEVEMENTS,
  loadEarned,
  type EarnedMap,
} from "@/lib/achievements";
import { LeafMark } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/app/profile")({
  head: () => ({ meta: [{ title: "Profile — NutriAI" }] }),
  component: ProfilePage,
});

const DIET_OPTIONS = [
  { id: "balanced", emoji: "🥗", label: "Balanced" },
  { id: "high-protein", emoji: "🍗", label: "High Protein" },
  { id: "low-carb", emoji: "🥑", label: "Low Carb" },
  { id: "keto", emoji: "🥓", label: "Keto" },
  { id: "vegetarian", emoji: "🥦", label: "Vegetarian" },
  { id: "vegan", emoji: "🌱", label: "Vegan" },
  { id: "mediterranean", emoji: "🫒", label: "Mediterranean" },
  { id: "paleo", emoji: "🥩", label: "Paleo" },
];

const GOAL_OPTIONS: { id: Goal; emoji: string; title: string; sub: string }[] = [
  { id: "lose", emoji: "📉", title: "Lose weight", sub: "Steady, sustainable fat loss" },
  { id: "maintain", emoji: "⚖️", title: "Maintain", sub: "Stay where you are, eat better" },
  { id: "gain", emoji: "📈", title: "Build muscle", sub: "Lean gains with structure" },
];

function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, refresh: refreshProfile, update: updateProfile } = useProfile();
  const { streak } = useStreak();
  const { logs } = useFoodLog();
  const { subscription, isActive } = useSubscription();

  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [earned, setEarned] = useState<EarnedMap>({});
  const [editPanel, setEditPanel] = useState<null | "body" | "diet" | "goal">(null);
  const [tooltip, setTooltip] = useState<{ id: string; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setEarned(loadEarned());
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("food_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => setTotalLogs(count ?? 0));
  }, [user, logs.length]);

  const initials = useMemo(() => {
    const src = profile?.name ?? user?.email ?? "U";
    return src
      .split(/[\s@.]/)
      .filter(Boolean)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [profile?.name, user?.email]);

  const weightDelta =
    profile?.weight_kg && profile?.target_weight_kg
      ? +(profile.weight_kg - profile.target_weight_kg).toFixed(1)
      : null;

  const goalMeta =
    GOAL_OPTIONS.find((g) => g.id === profile?.goal) ??
    { emoji: "🎯", title: "No goal set", sub: "" };

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    toast.success("See you soon.");
    navigate({ to: "/" });
  };

  const handleManageSubscription = () => {
    // Stripe Customer Portal placeholder
    toast.message("Subscription management coming soon", {
      description: "We'll open the Stripe Customer Portal here.",
    });
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    // Soft-delete pattern: clear profile data + sign out. Hard delete needs an edge fn.
    await supabase.from("profiles").update({ onboarding_completed: false }).eq("user_id", user.id);
    await signOut();
    toast.success("Account deletion requested. Contact support to remove all data.");
    navigate({ to: "/" });
  };

  return (
    <div className="pb-8 stagger">
      {/* Header banner */}
      <div
        className="relative h-[180px] text-white px-6 pt-10 rounded-b-[28px] overflow-hidden"
        style={{ background: "var(--gradient-hero)" }}
      >
        <Link
          to="/app"
          className="absolute top-4 left-4 h-9 w-9 rounded-full bg-white/10 grid place-items-center text-white/80 hover:bg-white/15"
          aria-label="Back to diary"
        >
          <X className="h-4 w-4" />
        </Link>
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-[color:var(--forest)] border-2 border-[color:var(--gold)] grid place-items-center font-display font-bold text-[28px] text-white shadow-elev-gold">
              {initials}
            </div>
            <button
              aria-label="Change photo"
              className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-[color:var(--gold)] text-[color:var(--forest)] grid place-items-center shadow-elev-sm"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>
          <h2 className="font-display font-bold text-[24px] text-white mt-3">
            {profile?.name ?? "Friend"}
          </h2>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[color:var(--gold)] text-[color:var(--forest)] text-[12px] font-semibold">
            <span>{goalMeta.emoji}</span>
            <span className="capitalize">{goalMeta.title}</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="px-5 -mt-8 relative z-10">
        <div className="grid grid-cols-3 gap-2 bg-white rounded-[20px] border border-[color:var(--cream-border)] shadow-elev-sm p-4">
          <StatCell value={`${streak.current_streak}`} label="Streak" />
          <StatCell
            value={
              weightDelta == null
                ? "—"
                : `${weightDelta > 0 ? "-" : "+"}${Math.abs(weightDelta)}kg`
            }
            label="Progress"
          />
          <StatCell value={`${totalLogs}`} label="Days logged" />
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4">
        {/* Current plan */}
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold">
                Current plan
              </p>
              <p className="mt-1 font-display text-[18px] text-[color:var(--ink)]">
                {subscription?.plan ?? "Free"}
                {subscription?.current_period_end && (
                  <span className="text-[13px] text-[color:var(--ink-mid)] font-body font-normal">
                    {" "}
                    · Renews{" "}
                    {new Date(subscription.current_period_end).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                )}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider",
                isActive
                  ? "bg-[color:var(--success)]/10 text-[color:var(--success)]"
                  : "bg-[color:var(--coral-light)] text-[color:var(--coral)]",
              )}
            >
              {isActive ? "Active ✓" : "Inactive"}
            </span>
          </div>
          {isActive ? (
            <button
              onClick={handleManageSubscription}
              className="mt-3 inline-flex items-center text-[13px] font-semibold text-[color:var(--forest)]"
            >
              Manage subscription <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <Link
              to="/renewal"
              className="mt-3 inline-flex items-center text-[13px] font-semibold text-[color:var(--coral)]"
            >
              Renew plan <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </Card>

        {/* Body Profile */}
        <Card>
          <SectionHeader
            title="Body Profile"
            onEdit={() => setEditPanel("body")}
          />
          <div className="mt-3 grid grid-cols-2 gap-3 text-center">
            <Mini label="Height" value={profile?.height_cm ? `${profile.height_cm} cm` : "—"} />
            <Mini label="Weight" value={profile?.weight_kg ? `${profile.weight_kg} kg` : "—"} />
            <Mini label="Age" value={profile?.age ? `${profile.age} yrs` : "—"} />
            <Mini
              label="Goal weight"
              value={profile?.target_weight_kg ? `${profile.target_weight_kg} kg` : "—"}
            />
          </div>
        </Card>

        {/* Dietary preferences */}
        <Card>
          <SectionHeader title="Dietary Style" onEdit={() => setEditPanel("diet")} />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(profile?.diet_preferences ?? []).length === 0 ? (
              <span className="text-[12px] text-[color:var(--ink-light)]">No preferences set</span>
            ) : (
              profile?.diet_preferences?.map((d) => {
                const meta = DIET_OPTIONS.find((o) => o.id === d);
                return (
                  <span
                    key={d}
                    className="px-2.5 py-1 rounded-full bg-[color:var(--gold-light)] text-[color:var(--gold)] text-[12px] font-semibold"
                  >
                    {meta?.emoji} {meta?.label ?? d}
                  </span>
                );
              })
            )}
          </div>
        </Card>

        {/* Goal */}
        <Card>
          <SectionHeader title="My Goal" onEdit={() => setEditPanel("goal")} />
          <div className="mt-3 rounded-[14px] bg-[color:var(--cream-dark)] p-3 flex items-center gap-3">
            <div className="text-[28px]">{goalMeta.emoji}</div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-[16px] text-[color:var(--ink)]">{goalMeta.title}</p>
              <p className="text-[12px] text-[color:var(--ink-mid)]">{goalMeta.sub}</p>
            </div>
          </div>
        </Card>

        {/* Achievements */}
        <Card>
          <p className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold">
            Achievements
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {ACHIEVEMENTS.map((a) => {
              const date = earned[a.id];
              const isEarned = !!date;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() =>
                    setTooltip({
                      id: a.id,
                      text: isEarned
                        ? `Earned ${new Date(date!).toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}`
                        : `How to earn: ${a.requirement}`,
                    })
                  }
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2 rounded-[14px] transition-colors",
                    tooltip?.id === a.id && "bg-[color:var(--cream-dark)]",
                  )}
                >
                  <div
                    className={cn(
                      "h-16 w-16 rounded-full grid place-items-center text-[28px] transition-all",
                      isEarned
                        ? "bg-[color:var(--gold-light)] border-2 border-[color:var(--gold)] shadow-elev-gold"
                        : "bg-[color:var(--cream-dark)] border border-[color:var(--cream-border)] grayscale opacity-60",
                    )}
                  >
                    {a.emoji}
                  </div>
                  <span className="text-[11px] font-semibold text-[color:var(--ink-mid)] text-center leading-tight">
                    {a.title}
                  </span>
                </button>
              );
            })}
          </div>
          {tooltip && (
            <div className="mt-3 rounded-[12px] bg-[color:var(--ink)] text-white text-[12px] px-3 py-2 leading-relaxed flex items-start gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[color:var(--gold)] mt-0.5 shrink-0" />
              <span className="flex-1">{tooltip.text}</span>
              <button
                onClick={() => setTooltip(null)}
                className="text-white/60 hover:text-white"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </Card>

        {/* Reminders */}
        <RemindersCard />

        {/* Upgrade hook (only if free) */}
        {!isActive && (
          <Link to="/pricing">
            <div
              className="rounded-[20px] p-5 text-[color:var(--forest)] flex items-center justify-between"
              style={{ background: "var(--gradient-gold)" }}
            >
              <div>
                <p className="text-[11px] uppercase tracking-widest opacity-80">Unlock everything</p>
                <h4 className="font-display text-[18px] mt-1">Go Pro</h4>
                <p className="text-[12px] opacity-80 mt-0.5">
                  Unlimited AI, all programs, deeper insights.
                </p>
              </div>
              <Crown className="h-6 w-6 shrink-0" />
            </div>
          </Link>
        )}

        {/* Danger zone */}
        <div className="mt-6 pt-4 border-t border-[color:var(--cream-border)]">
          <p className="text-[11px] uppercase tracking-widest text-[color:var(--ink-light)] font-semibold mb-3">
            Account
          </p>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full h-12 rounded-[14px] border border-[color:var(--cream-border)] text-[color:var(--ink)] text-[14px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-[color:var(--cream-dark)]"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full mt-2 h-11 rounded-[14px] text-[13px] text-[color:var(--coral)] hover:bg-[color:var(--coral-light)] inline-flex items-center justify-center gap-2"
          >
            <Trash2 className="h-4 w-4" /> Delete account
          </button>
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 text-[color:var(--ink-light)]">
          <LeafMark size={22} />
          <p className="text-[10px] uppercase tracking-widest">NutriAI · v0.1</p>
        </div>
      </div>

      {/* Edit panels */}
      {editPanel === "body" && profile && (
        <BodyEditPanel
          profile={profile}
          onClose={() => setEditPanel(null)}
          onSave={async (patch) => {
            const merged = { ...profile, ...patch };
            const ok =
              merged.gender &&
              merged.age &&
              merged.height_cm &&
              merged.weight_kg &&
              merged.activity_level &&
              merged.goal;
            const recalc = ok
              ? calculateTargets({
                  gender: merged.gender as Gender,
                  age: Number(merged.age),
                  height_cm: Number(merged.height_cm),
                  weight_kg: Number(merged.weight_kg),
                  activity_level: merged.activity_level as ActivityLevel,
                  goal: merged.goal as Goal,
                })
              : null;
            const { error } = await updateProfile({
              ...patch,
              ...(recalc ?? {}),
            });
            if (error) toast.error(error.message);
            else {
              toast.success("Targets recalibrated.");
              refreshProfile();
              setEditPanel(null);
            }
          }}
        />
      )}
      {editPanel === "diet" && profile && (
        <DietEditPanel
          current={profile.diet_preferences ?? []}
          onClose={() => setEditPanel(null)}
          onSave={async (next) => {
            const { error } = await updateProfile({ diet_preferences: next });
            if (error) toast.error(error.message);
            else {
              toast.success("Preferences updated.");
              setEditPanel(null);
            }
          }}
        />
      )}
      {editPanel === "goal" && profile && (
        <GoalEditPanel
          current={(profile.goal as Goal) ?? "maintain"}
          onClose={() => setEditPanel(null)}
          onSave={async (g) => {
            const merged = { ...profile, goal: g };
            const recalc =
              merged.gender && merged.age && merged.height_cm && merged.weight_kg && merged.activity_level
                ? calculateTargets({
                    gender: merged.gender as Gender,
                    age: Number(merged.age),
                    height_cm: Number(merged.height_cm),
                    weight_kg: Number(merged.weight_kg),
                    activity_level: merged.activity_level as ActivityLevel,
                    goal: g,
                  })
                : null;
            const { error } = await updateProfile({ goal: g, ...(recalc ?? {}) });
            if (error) toast.error(error.message);
            else {
              toast.success("Goal updated.");
              setEditPanel(null);
            }
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDeleteAccount}
        />
      )}
    </div>
  );
}

/* ------------ Subcomponents ------------ */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[20px] border border-[color:var(--cream-border)] p-5 shadow-elev-sm">
      {children}
    </div>
  );
}

function SectionHeader({ title, onEdit }: { title: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold">
        {title}
      </p>
      <button
        onClick={onEdit}
        aria-label={`Edit ${title}`}
        className="h-8 w-8 grid place-items-center rounded-full text-[color:var(--ink-mid)] hover:bg-[color:var(--cream-dark)]"
      >
        <Edit3 className="h-4 w-4" />
      </button>
    </div>
  );
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-display font-bold text-[24px] text-[color:var(--forest)] leading-none">
        {value}
      </div>
      <div className="mt-1 text-[11px] text-[color:var(--ink-mid)]">{label}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-[color:var(--cream-dark)] py-3 px-2">
      <div className="font-display font-semibold text-[16px] text-[color:var(--forest)]">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-[color:var(--ink-light)] mt-1">
        {label}
      </div>
    </div>
  );
}

/* ------------ Reminders Card ------------ */

function RemindersCard() {
  const { permission, settings, updateSettings, requestPermission } = useNotifications();
  const granted = permission === "granted";

  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-widest text-[color:var(--sage)] font-semibold">
          Reminders
        </p>
        {!granted && permission !== "unsupported" && (
          <button
            onClick={() => requestPermission()}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[color:var(--forest)]"
          >
            <Bell className="h-3.5 w-3.5" /> Enable
          </button>
        )}
      </div>
      <div className="mt-3 divide-y divide-[color:var(--cream-border)]">
        <ReminderRow
          label="Morning weigh-in"
          enabled={settings.morningWeighIn.enabled}
          time={settings.morningWeighIn.time}
          onToggle={(v) =>
            updateSettings({ morningWeighIn: { ...settings.morningWeighIn, enabled: v } })
          }
          onTime={(t) =>
            updateSettings({ morningWeighIn: { ...settings.morningWeighIn, time: t } })
          }
        />
        <ReminderRow
          label="Breakfast"
          enabled={settings.breakfast.enabled}
          time={settings.breakfast.time}
          onToggle={(v) => updateSettings({ breakfast: { ...settings.breakfast, enabled: v } })}
          onTime={(t) => updateSettings({ breakfast: { ...settings.breakfast, time: t } })}
        />
        <ReminderRow
          label="Lunch"
          enabled={settings.lunch.enabled}
          time={settings.lunch.time}
          onToggle={(v) => updateSettings({ lunch: { ...settings.lunch, enabled: v } })}
          onTime={(t) => updateSettings({ lunch: { ...settings.lunch, time: t } })}
        />
        <ReminderRow
          label="Dinner"
          enabled={settings.dinner.enabled}
          time={settings.dinner.time}
          onToggle={(v) => updateSettings({ dinner: { ...settings.dinner, enabled: v } })}
          onTime={(t) => updateSettings({ dinner: { ...settings.dinner, time: t } })}
        />
        <ReminderRow
          label="Water"
          enabled={settings.water.enabled}
          rightControl={
            <select
              value={settings.water.everyHours}
              onChange={(e) =>
                updateSettings({
                  water: { ...settings.water, everyHours: Number(e.target.value) },
                })
              }
              className="h-8 px-2 rounded-md border border-[color:var(--cream-border)] bg-white text-[12px] text-[color:var(--ink)]"
            >
              {[1, 2, 3, 4].map((h) => (
                <option key={h} value={h}>
                  Every {h}h
                </option>
              ))}
            </select>
          }
          onToggle={(v) => updateSettings({ water: { ...settings.water, enabled: v } })}
        />
        <ReminderRow
          label="Weekly Life Score"
          enabled={settings.weeklyLifeScore.enabled}
          rightControl={<span className="text-[11px] text-[color:var(--ink-light)]">Mondays</span>}
          onToggle={(v) =>
            updateSettings({ weeklyLifeScore: { ...settings.weeklyLifeScore, enabled: v } })
          }
        />
        <ReminderRow
          label="Streak reminder"
          enabled={settings.streakReminder.enabled}
          time={settings.streakReminder.time}
          onToggle={(v) =>
            updateSettings({ streakReminder: { ...settings.streakReminder, enabled: v } })
          }
          onTime={(t) =>
            updateSettings({ streakReminder: { ...settings.streakReminder, time: t } })
          }
        />
      </div>
    </Card>
  );
}

function ReminderRow({
  label,
  enabled,
  time,
  rightControl,
  onToggle,
  onTime,
}: {
  label: string;
  enabled: boolean;
  time?: string;
  rightControl?: React.ReactNode;
  onToggle: (v: boolean) => void;
  onTime?: (t: string) => void;
}) {
  return (
    <div className="py-3 flex items-center gap-3">
      <span className="flex-1 text-[14px] text-[color:var(--ink)]">{label}</span>
      {time && onTime && enabled && (
        <input
          type="time"
          value={time}
          onChange={(e) => onTime(e.target.value)}
          className="h-8 px-2 rounded-md border border-[color:var(--cream-border)] bg-white text-[12px] text-[color:var(--ink)]"
        />
      )}
      {rightControl && enabled && rightControl}
      <Toggle on={enabled} onChange={onToggle} />
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors ease-luxury",
        on ? "bg-[color:var(--forest)]" : "bg-[color:var(--cream-border)]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ease-luxury",
          on ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}

/* ------------ Edit panels ------------ */

function PanelShell({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-[430px] bg-white rounded-t-[28px] shadow-elev-lg max-h-[85vh] overflow-y-auto animate-scale-in"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      >
        <div className="sticky top-0 bg-white pt-3 pb-1 rounded-t-[28px] z-10">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-[color:var(--cream-border)]" />
          <div className="px-5 pt-3 flex items-center justify-between">
            <h3 className="font-display text-[20px] text-[color:var(--ink)]">{title}</h3>
            <button onClick={onClose} aria-label="Close" className="h-8 w-8 grid place-items-center rounded-full hover:bg-[color:var(--cream-dark)]">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="px-5 pt-4">{children}</div>
        <div className="px-5 pt-5">{footer}</div>
      </div>
    </div>
  );
}

function BodyEditPanel({
  profile,
  onClose,
  onSave,
}: {
  profile: Profile;
  onClose: () => void;
  onSave: (patch: Partial<Profile>) => void | Promise<void>;
}) {
  const [height, setHeight] = useState<number>(Number(profile.height_cm) || 170);
  const [weight, setWeight] = useState<number>(Number(profile.weight_kg) || 70);
  const [target, setTarget] = useState<number>(Number(profile.target_weight_kg) || 65);
  const [age, setAge] = useState<number>(Number(profile.age) || 30);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    await onSave({
      height_cm: height,
      weight_kg: weight,
      target_weight_kg: target,
      age,
    });
    setSubmitting(false);
  };

  return (
    <PanelShell
      title="Body Profile"
      onClose={onClose}
      footer={
        <button
          onClick={submit}
          disabled={submitting}
          className="w-full h-13 py-4 rounded-[16px] bg-gradient-cta text-white font-semibold text-[15px] active:scale-[0.97] ease-luxury transition-transform disabled:opacity-60"
        >
          {submitting ? "Recalculating…" : "Save & recalibrate"}
        </button>
      }
    >
      <div className="space-y-5">
        <SliderRow label="Height" suffix="cm" min={120} max={220} value={height} onChange={setHeight} />
        <SliderRow label="Weight" suffix="kg" min={35} max={200} step={0.5} value={weight} onChange={setWeight} />
        <SliderRow label="Goal weight" suffix="kg" min={35} max={200} step={0.5} value={target} onChange={setTarget} />
        <SliderRow label="Age" suffix="yrs" min={13} max={100} value={age} onChange={setAge} />
      </div>
      <p className="mt-4 text-[12px] text-[color:var(--ink-light)] leading-relaxed">
        We'll recalculate your daily calories and macros based on these values.
      </p>
    </PanelShell>
  );
}

function SliderRow({
  label,
  suffix,
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  label: string;
  suffix: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-[13px] font-medium text-[color:var(--ink-mid)]">{label}</label>
        <span className="font-display text-[20px] text-[color:var(--forest)] font-semibold">
          {value}
          <span className="text-[12px] text-[color:var(--ink-light)] ml-1">{suffix}</span>
        </span>
      </div>
      <input
        type="range"
        className="luxury-range mt-2"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function DietEditPanel({
  current,
  onClose,
  onSave,
}: {
  current: string[];
  onClose: () => void;
  onSave: (next: string[]) => void | Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>(current);
  const [submitting, setSubmitting] = useState(false);
  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  return (
    <PanelShell
      title="Dietary Style"
      onClose={onClose}
      footer={
        <button
          onClick={async () => {
            setSubmitting(true);
            await onSave(selected);
            setSubmitting(false);
          }}
          disabled={submitting}
          className="w-full h-13 py-4 rounded-[16px] bg-gradient-cta text-white font-semibold text-[15px] active:scale-[0.97] ease-luxury transition-transform disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save preferences"}
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {DIET_OPTIONS.map((d) => {
          const on = selected.includes(d.id);
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => toggle(d.id)}
              className={cn(
                "flex items-center gap-2 p-3 rounded-[14px] border transition-all text-left",
                on
                  ? "bg-[color:var(--gold-light)] border-[color:var(--gold)] text-[color:var(--forest)]"
                  : "bg-white border-[color:var(--cream-border)] text-[color:var(--ink)]",
              )}
            >
              <span className="text-[20px]">{d.emoji}</span>
              <span className="text-[13px] font-semibold">{d.label}</span>
            </button>
          );
        })}
      </div>
    </PanelShell>
  );
}

function GoalEditPanel({
  current,
  onClose,
  onSave,
}: {
  current: Goal;
  onClose: () => void;
  onSave: (g: Goal) => void | Promise<void>;
}) {
  const [selected, setSelected] = useState<Goal>(current);
  const [submitting, setSubmitting] = useState(false);
  return (
    <PanelShell
      title="My Goal"
      onClose={onClose}
      footer={
        <button
          onClick={async () => {
            setSubmitting(true);
            await onSave(selected);
            setSubmitting(false);
          }}
          disabled={submitting}
          className="w-full h-13 py-4 rounded-[16px] bg-gradient-cta text-white font-semibold text-[15px] active:scale-[0.97] ease-luxury transition-transform disabled:opacity-60"
        >
          {submitting ? "Recalculating…" : "Save & recalibrate"}
        </button>
      }
    >
      <div className="space-y-2">
        {GOAL_OPTIONS.map((g) => {
          const on = selected === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelected(g.id)}
              className={cn(
                "w-full text-left p-4 rounded-[16px] border transition-all flex items-center gap-3",
                on
                  ? "bg-[color:var(--forest)]/[0.06] border-[2.5px] border-[color:var(--forest)]"
                  : "bg-white border border-[color:var(--cream-border)]",
              )}
            >
              <span className="text-[28px]">{g.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-display text-[16px] text-[color:var(--ink)]">{g.title}</p>
                <p className="text-[12px] text-[color:var(--ink-mid)]">{g.sub}</p>
              </div>
            </button>
          );
        })}
      </div>
    </PanelShell>
  );
}

function ConfirmDeleteModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center animate-fade-in px-5">
      <button aria-label="Close" onClick={onCancel} className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-[360px] bg-white rounded-[24px] p-6 text-center shadow-elev-lg animate-scale-in">
        <div className="text-[40px]">⚠️</div>
        <h3 className="mt-2 font-display text-[20px] text-[color:var(--ink)]">Delete account?</h3>
        <p className="mt-2 text-[13px] text-[color:var(--ink-mid)] leading-relaxed">
          This will sign you out and request removal of your data. This action cannot be undone.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={onCancel}
            className="h-11 rounded-[14px] border border-[color:var(--cream-border)] text-[14px] font-semibold text-[color:var(--ink)]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="h-11 rounded-[14px] bg-[color:var(--coral)] text-white text-[14px] font-semibold active:scale-[0.97] ease-luxury transition-transform"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
