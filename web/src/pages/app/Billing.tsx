import { ArrowLeft, CreditCard, Check, ExternalLink, ShieldAlert, XCircle, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { PageContainer, PageHeading } from "@/components/app/PageContainer";
import { useAuth } from "@/context/AuthContext";
import { PRODUCT } from "@/data/meta";
import { toast } from "sonner";

export default function Billing() {
  const { user, getIdToken, refreshUser, logout } = useAuth();
  if (!user) return null;
  const hasStripeCustomer = Boolean(user.stripeCustomerId);
  const hasPaidSubscription = user.subscription === "active" || user.subscription === "trialing";

  async function openStripe(path: "/api/stripe-checkout" | "/api/stripe-portal") {
    const idToken = await getIdToken();
    if (!idToken) {
      toast.error("Please sign in again before opening billing.");
      return;
    }

    const response = await fetch(path, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const payload = await response.json();

    if (!response.ok || !payload.url) {
      toast.error(payload.error || "Billing is not available yet.");
      return;
    }

    window.location.assign(payload.url);
  }

  return (
    <PageContainer className="max-w-2xl">
      <Link to="/app/account" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Account
      </Link>
      <PageHeading kicker="Subscription" title="Billing" description="Manage your annual subscription through Stripe." />

      <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-brand-gold/40 bg-brand-gold/10 px-4 py-3 text-brand-gold-ink">
        <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <p className="text-sm">
          Payments are handled by Stripe. Access is updated only after Stripe
          sends a verified webhook to this application.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="hero-gradient p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-white/60">Current plan</div>
              <div className="mt-1 font-serif text-2xl font-semibold">Annual — {PRODUCT.priceLabel}</div>
            </div>
            <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold capitalize">
              {user.subscription}
            </span>
          </div>
          {user.renewsOn && <p className="mt-2 text-sm text-white/70">Renews on {user.renewsOn}</p>}
        </div>
        <div className="p-6">
          <ul className="space-y-2 text-sm">
            {["Full access to all modules & toolkits", "Offline-ready access", "Content updates for the year"].map((i) => (
              <li key={i} className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> {i}</li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => openStripe(hasPaidSubscription && hasStripeCustomer ? "/api/stripe-portal" : "/api/stripe-checkout")}
              className="inline-flex items-center gap-2 rounded-full bg-brand-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-green-mid"
            >
              <ExternalLink className="h-4 w-4" />
              {hasPaidSubscription && hasStripeCustomer ? "Open billing portal" : `Subscribe — ${PRODUCT.priceLabel}`}
            </button>
            {hasStripeCustomer && (
              <button
                onClick={() => openStripe("/api/stripe-portal")}
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                <CreditCard className="h-4 w-4" /> Update payment method
              </button>
            )}
          </div>

          <div className="mt-6 border-t border-border pt-4">
            {hasStripeCustomer && (
              <button onClick={() => openStripe("/api/stripe-portal")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-destructive hover:underline">
                <XCircle className="h-4 w-4" /> Cancel subscription
              </button>
            )}
            <button onClick={() => refreshUser()} className="ml-4 text-sm font-semibold text-muted-foreground hover:underline">
              Refresh subscription status
            </button>
            <button onClick={logout} className="ml-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:underline">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
            <p className="mt-1 text-xs text-muted-foreground">
              Cancellation opens Stripe's secure billing portal. Access normally
              continues until the end of your paid year.
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
