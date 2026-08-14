import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { sendPasswordResetEmail } from "firebase/auth";
import { AuthShell } from "@/components/public/AuthShell";
import { auth, getRedirectUrl } from "@/lib/firebase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!auth) {
      toast.error("Sign-in is not configured.");
      return;
    }

    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email, {
        url: getRedirectUrl("/login"),
        handleCodeInApp: false,
      });
      setSent(true);
    } catch (error) {
      // Firebase's own email-enumeration protection already returns success
      // for unregistered emails without throwing — so a thrown error here is
      // a real problem (rate limit, bad config, network), not "user doesn't
      // exist." Surface it instead of silently hiding it.
      console.error("sendPasswordResetEmail failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Couldn't send the reset email. Try again shortly.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a link to set a new one."
      footer={
        <Link to="/login" className="font-semibold text-brand-green hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
          If an account exists for that email, a password-reset link has been sent.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="h-11 w-full rounded-full bg-brand-green font-semibold text-white transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
