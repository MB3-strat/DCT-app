import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { AuthShell } from "@/components/public/AuthShell";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/AuthContext";
import { PRODUCT } from "@/data/meta";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password || !agree) return;
    setBusy(true);
    try {
      await register(name, email, password);
      toast.success("Account created. Confirm your email, then subscribe through Stripe to unlock the app.");
      navigate("/login", {
        replace: true,
        state: { checkEmail: true, email },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle={`Get the full survival kit — ${PRODUCT.priceLabel}.`}
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand-green hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">Full name</label>
          <input
            id="name"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
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
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Password</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <label className="flex items-start gap-3 rounded-lg border border-border bg-card/60 p-3 text-sm text-muted-foreground">
          <Checkbox
            checked={agree}
            onCheckedChange={(checked) => setAgree(checked === true)}
            className="mt-0.5"
          />
          <span>
            I understand this is an educational aid and not a substitute for
            senior clinical advice, and I agree to the{" "}
            <Link to="/terms" className="text-brand-green hover:underline">Terms</Link> and{" "}
            <Link to="/privacy" className="text-brand-green hover:underline">Privacy policy</Link>.
          </span>
        </label>
        <button
          type="submit"
          disabled={!agree || busy}
          className="h-11 w-full rounded-full bg-brand-green font-semibold text-white transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Please wait..." : "Create account, then subscribe"}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          The app requires a €20/year Stripe subscription. A successful payment
          is only recorded after Stripe sends a verified webhook.
        </p>
      </form>
    </AuthShell>
  );
}
