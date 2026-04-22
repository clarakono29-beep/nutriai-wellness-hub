import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, ArrowLeft } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { LeafMark, Wordmark } from "@/components/brand/Logo";
import { PrimaryButton } from "@/components/ui/luxury/PrimaryButton";
import { TextField } from "@/components/ui/luxury/TextField";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ title: "Reset your password — NutriAI" }],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset link");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mobile-shell flex flex-col bg-[color:var(--cream)]">
      <header className="px-6 pt-6 pb-2 flex items-center justify-between">
        <Link
          to="/signin"
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

      <main className="flex-1 px-6 pt-10 pb-10 animate-fade-up">
        {!sent ? (
          <>
            <h2 className="font-display text-[32px] font-black text-[color:var(--ink)] leading-tight">
              Forgot password?
            </h2>
            <p className="mt-2 text-[15px] text-[color:var(--ink-mid)]">
              Enter your email and we'll send you a link to reset it.
            </p>

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
              <PrimaryButton type="submit" loading={submitting} className="mt-2">
                Send reset link
              </PrimaryButton>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center text-center pt-6">
            <div className="h-20 w-20 rounded-full bg-[color:var(--sage-light)] grid place-items-center text-[color:var(--forest)] animate-fade-up">
              <Mail className="h-9 w-9" />
            </div>
            <h2 className="mt-6 font-display text-[28px] font-black text-[color:var(--ink)] leading-tight">
              Check your email
            </h2>
            <p className="mt-2 text-[15px] text-[color:var(--ink-mid)] max-w-[300px]">
              We sent a reset link to <span className="font-semibold text-[color:var(--ink)]">{email}</span>. Tap the link to set a new password.
            </p>
            <Link
              to="/signin"
              className="mt-10 text-[14px] font-medium text-[color:var(--forest)] hover:text-[color:var(--forest-mid)]"
            >
              ← Back to sign in
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
