import { useEffect, useState } from "react";
import { ArrowLeft, CreditCard, Check, ExternalLink, Loader2, ShieldAlert, XCircle, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { PageContainer, PageHeading } from "@/components/app/PageContainer";
import { useAuth } from "@/context/AuthContext";
import { PRODUCT } from "@/data/meta";
import { toast } from "sonner";

const POLL_INTERVAL_MS = 2000;
// Cloudflare KV is eventually consistent — a write from the webhook can take
// up to roughly a minute to become visible to a read landing on a different
// edge location, even though the write itself completed immediately. 30
// attempts at 2s covers that with room to spare (a 9s window measurably
// wasn't enough in production testing — it kept giving up before the write
// had propagated, even though the webhook had already succeeded).
const MAX_POLL_ATTEMPTS = 30;

export default function Billing() {
  const { user, getIdToken, refreshUser, logout } = useAuth();
  const [confirming, setConfirming] = useState(false);

  // Firebase Auth persists the sign-in across the redirect to Stripe and
  // back, so a user who just registered/logged in and completed checkout
  // lands here already authenticated — no second login required. What can
  // lag is *subscription* status: the webhook writes subscriptionStatus to
  // Cloudflare KV as soon as Stripe's customer.subscription.created event
  // arrives, but KV is eventually consistent — that write can take up to
  // roughly a minute to become visible to a read from this page, even
  // though the write itself already succeeded. Poll for a while instead of
  // making the user click "Refresh" themselves.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "cancelled") {
      toast.message("Checkout was cancelled.");
    }
    if (params.get("checkout") === "success") {
      toast.success("Payment received — confirming your subscription...");
      setConfirming(true);
    }
    if (params.has("checkout")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    // Runs once on mount to handle the Stripe redirect query param.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!confirming) return;
    if (user && (user.subscription === "active" || user.subscription === "trialing")) {
      setConfirming(false);
      toast.success("You're subscribed — welcome in.");
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let timeoutId: number;

    const poll = async () => {
      attempts += 1;
      await refreshUser();
      if (cancelled) return;
      if (attempts >= MAX_POLL_ATTEMPTS) {
        setConfirming(false);
        return;
      }
      timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS);
    };

    timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirming, user?.subscription]);

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

      {confirming && (
        <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-brand-green/40 bg-brand-green/10 px-4 py-3 text-brand-green">
          <Loader2 className="mt-0.5 h-5 w-5 flex-shrink-0 animate-spin" />
          <p className="text-sm">
            Confirming your subscription with Stripe — this is usually quick, but can occasionally take up to a
            minute. No need to refresh; this will update on its own.
          </p>
        </div>
      )}

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
