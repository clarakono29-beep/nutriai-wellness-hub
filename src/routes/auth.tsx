import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";

import { LeafMark, Wordmark } from "@/components/brand/Logo";
import { PrimaryButton } from "@/components/ui/luxury/PrimaryButton";
import { TextField } from "@/components/ui/luxury/TextField";
import { ArrowLeft } from "lucide-react";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional().default("signin"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Sign in — NutriAI" },
      { name: "description", content: "Sign in or create your NutriAI account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Redirect signed-in users
  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/app" });
    }
  }, [loading, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: { name },
          },
        });
        if (error) throw error;
        toast.success("Welcome to NutriAI! Check your inbox to confirm.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/app`,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setSubmitting(false);
    }
  };

  return (
    <div className="mobile-shell flex flex-col">
      {/* Header */}
      <header className="px-6 pt-6 pb-2 flex items-center justify-between">
        <Link
          to="/"
          className="h-10 w-10 grid place-items-center rounded-full bg-[color:var(--cream-dark)] text-[color:var(--ink-mid)]"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-1.5 text-[color:var(--forest)]">
          <LeafMark size={22} />
          <Wordmark className="text-[color:var(--forest)] text-base" />
        </div>
        <div className="w-10" />
      </header>

      {/* Form */}
      <main className="flex-1 px-6 pt-8 pb-10 animate-fade-up">
        <h1 className="font-display text-[34px] font-black text-[color:var(--ink)] leading-tight">
          {mode === "signin" ? "Welcome back." : "Begin your\njourney."}
        </h1>
        <p className="mt-2 text-[15px] text-[color:var(--ink-mid)]">
          {mode === "signin"
            ? "Sign in to continue your wellness streak."
            : "Create your account to unlock personalised nutrition."}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {mode === "signup" && (
            <TextField
              label="Name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex"
              required
            />
          )}
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
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={6}
            required
          />
          <PrimaryButton type="submit" loading={submitting} className="mt-2">
            {mode === "signin" ? "Sign in" : "Create account"}
          </PrimaryButton>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[color:var(--cream-border)]" />
          <span className="text-[11px] uppercase tracking-widest text-[color:var(--ink-light)]">or</span>
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

        <p className="mt-8 text-center text-[14px] text-[color:var(--ink-mid)]">
          {mode === "signin" ? "New to NutriAI?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-[color:var(--forest)] font-semibold underline-offset-4 hover:underline"
          >
            {mode === "signin" ? "Create account" : "Sign in"}
          </button>
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
