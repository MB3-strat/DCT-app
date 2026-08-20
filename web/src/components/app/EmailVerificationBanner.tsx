import { useEffect, useState } from "react";
import { Mail, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { friendlyAuthError } from "@/lib/authErrors";

// Nothing in the app currently blocks on emailVerified — this is a reminder
// only, not a gate. It exists because password reset (and any future
// account-recovery email) depends on the address on file actually being
// reachable, and verification is the only checkpoint that confirms that.
// Dismissal is session-scoped (mirrors the disclaimer gate pattern in
// AppLayout) so it reliably reappears next session rather than being
// silenced forever by one click.
const DISMISS_KEY = "dct:verify-banner-dismissed";
const RESEND_COOLDOWN_S = 60;

export function EmailVerificationBanner() {
  const { user, resendVerificationEmail } = useAuth();
  const [dismissed, setDismissed] = useState(
    () => window.sessionStorage.getItem(DISMISS_KEY) === "true",
  );
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  if (!user || user.emailVerified || dismissed) return null;

  async function resend() {
    setSending(true);
    try {
      await resendVerificationEmail();
      toast.success(`Verification email sent to ${user!.email}.`);
      setCooldown(RESEND_COOLDOWN_S);
    } catch (error) {
      toast.error(friendlyAuthError(error, "Couldn't send the verification email. Try again shortly."));
    } finally {
      setSending(false);
    }
  }

  function dismiss() {
    window.sessionStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  }

  return (
    <div className="flex items-start gap-2.5 border-b border-brand-gold/40 bg-brand-gold/10 px-4 py-2.5 text-brand-gold-ink md:px-6">
      <Mail className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <p className="min-w-0 flex-1 text-xs leading-relaxed md:text-sm">
        Please verify your email address ({user.email}) — it's what we'll use to reach you, including for password
        resets.{" "}
        <button
          type="button"
          onClick={resend}
          disabled={sending || cooldown > 0}
          className="font-semibold underline underline-offset-2 hover:no-underline disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : sending ? "Sending..." : "Resend verification email"}
        </button>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="flex-shrink-0 text-brand-gold-ink/70 hover:text-brand-gold-ink"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
