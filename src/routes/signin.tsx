import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";

import { LeafMark, Wordmark } from "@/components/brand/Logo";
import { PrimaryButton } from "@/components/ui/luxury/PrimaryButton";
import { TextField } from "@/components/ui/luxury/TextField";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/signin")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Sign in — NutriAI" },
      { name: "description", content: "Sign in to continue your transformation." },
    ],
  }),
  component: SignInPage,
});

async function routeAfterAuth(userId: string): Promise<string> {
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

  if (active) return "/app";

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("user_id", userId)
    .maybeSingle();

  if (profile?.onboarding_completed) return "/renewal";
  return "/onboarding";
}

function SignInPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bypassActive, setBypassActive] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const read = () =>
      setBypassActive(window.localStorage.getItem("dev_bypass_auth") === "1");
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      routeAfterAuth(user.id).then((to) => navigate({ to }));
    }
  }, [loading, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        toast.success("Welcome back.");
        const to = await routeAfterAuth(data.user.id);
        navigate({ to });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/signin`,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setSubmitting(false);
    }
    // If redirected, browser navigates away. If tokens received, useEffect handles route.
  };

  return (
    <div className="mobile-shell flex flex-col bg-[color:var(--cream)]">
      <header className="px-6 pt-8 pb-2 flex items-center justify-center">
        <Link to="/" className="flex items-center gap-1.5 text-[color:var(--forest)]">
          <LeafMark size={26} />
          <Wordmark className="text-[color:var(--forest)] text-[18px]" />
        </Link>
      </header>

      <main className="flex-1 px-6 pt-10 pb-10 animate-fade-up">
        <h2 className="font-display text-[34px] font-black text-[color:var(--ink)] leading-tight">
          Welcome back
        </h2>
        <p className="mt-2 text-[15px] text-[color:var(--ink-mid)]">
          Sign in to continue your transformation.
        </p>

        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.localStorage.setItem("dev_bypass_auth", "1");
                window.location.assign("/app");
              }
            }}
            className="mt-6 w-full h-11 rounded-full bg-[color:var(--coral)] text-white text-[13px] font-semibold shadow-elev-sm active:scale-[0.97] transition-transform"
            title="Dev only: skip auth and enter the app"
          >
            ⚠️ Dev: Skip auth and enter app →
          </button>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@nutri.ai"
            required
          />
          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={6}
            required
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-[color:var(--ink-light)] hover:text-[color:var(--forest)]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-[13px] font-medium text-[color:var(--forest)] hover:text-[color:var(--forest-mid)]"
            >
              Forgot password?
            </Link>
          </div>

          <PrimaryButton type="submit" loading={submitting} className="mt-2">
            Sign In
          </PrimaryButton>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[color:var(--cream-border)]" />
          <span className="text-[11px] uppercase tracking-widest text-[color:var(--ink-light)]">
            or continue with
          </span>
          <div className="h-px flex-1 bg-[color:var(--cream-border)]" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={submitting}
          className="w-full h-14 rounded-[20px] bg-white border border-[color:var(--cream-border)] flex items-center justify-center gap-3 text-[15px] font-medium text-[color:var(--ink)] hover:border-[color:var(--forest-mid)] active:scale-[0.97] transition-all duration-200 ease-luxury disabled:opacity-50"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="mt-10 text-center text-[14px] text-[color:var(--ink-mid)]">
          New to NutriAI?{" "}
          <Link
            to="/"
            className="text-[color:var(--forest)] font-semibold underline-offset-4 hover:underline"
          >
            Start your journey →
          </Link>
        </p>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.79 2.72v2.26h2.9c1.7-1.56 2.69-3.87 2.69-6.62z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.95 10.71A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.17.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l2.99-2.33z" fill="#FBBC05"/>
      <path d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.96l3 2.33C4.66 5.16 6.65 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
