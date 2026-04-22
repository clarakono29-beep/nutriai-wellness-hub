import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { LeafMark, Wordmark } from "@/components/brand/Logo";
import { PrimaryButton } from "@/components/ui/luxury/PrimaryButton";
import { TextField } from "@/components/ui/luxury/TextField";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set a new password — NutriAI" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);

  useEffect(() => {
    // Supabase places #access_token=...&type=recovery in the hash.
    // The client auto-handles the session; we just confirm via auth change.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setRecoveryReady(true);
      }
    });
    // Also accept existing session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setRecoveryReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated");
      await supabase.auth.signOut();
      navigate({ to: "/signin", search: {} });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mobile-shell flex flex-col bg-[color:var(--cream)]">
      <header className="px-6 pt-8 pb-2 flex items-center justify-center">
        <div className="flex items-center gap-1.5 text-[color:var(--forest)]">
          <LeafMark size={22} />
          <Wordmark className="text-[color:var(--forest)] text-base" />
        </div>
      </header>

      <main className="flex-1 px-6 pt-10 pb-10 animate-fade-up">
        <h2 className="font-display text-[32px] font-black text-[color:var(--ink)] leading-tight">
          Set a new password
        </h2>
        <p className="mt-2 text-[15px] text-[color:var(--ink-mid)]">
          Choose something memorable but secure.
        </p>

        {!recoveryReady && (
          <div className="mt-6 rounded-[14px] border border-[color:var(--cream-border)] bg-white p-4 text-[13px] text-[color:var(--ink-mid)]">
            Verifying your reset link…
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <TextField
            label="New password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={6}
            required
            trailing={
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="text-[color:var(--ink-light)] hover:text-[color:var(--forest)]"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
          <TextField
            label="Confirm password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            minLength={6}
            required
          />
          <PrimaryButton type="submit" loading={submitting} disabled={!recoveryReady} className="mt-2">
            Update password
          </PrimaryButton>
        </form>
      </main>
    </div>
  );
}
