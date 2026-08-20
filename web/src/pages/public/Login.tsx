import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { AuthShell } from "@/components/public/AuthShell";
import { useAuth } from "@/context/AuthContext";
import { friendlyAuthError } from "@/lib/authErrors";

export default function Login() {
  const { login, isAuthed, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { checkEmail?: boolean; email?: string } | null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && isAuthed) {
      navigate("/app", { replace: true });
    }
  }, [isAuthed, loading, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Signed in.");
      navigate("/app", { replace: true });
    } catch (error) {
      toast.error(friendlyAuthError(error, "Unable to sign in. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your survival kit."
      footer={
        <>
          New here?{" "}
          <Link to="/register" className="font-semibold text-brand-green hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {state?.checkEmail && (
          <div className="rounded-lg border border-brand-gold/40 bg-brand-gold/10 p-3 text-sm text-brand-gold-ink">
            Check your email{state.email ? ` at ${state.email}` : ""} to confirm
            your account, then come back here to sign in.
          </div>
        )}
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
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <Link to="/forgot-password" className="text-xs text-brand-green hover:underline">
              Forgot?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="h-11 w-full rounded-full bg-brand-green font-semibold text-white transition-transform hover:scale-[1.01]"
        >
          {busy ? "Please wait..." : "Sign in"}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          Access is verified through Firebase and subscription status is updated
          by Stripe webhook events.
        </p>
      </form>
    </AuthShell>
  );
}
