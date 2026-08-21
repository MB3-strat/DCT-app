import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

// Mirrors functions/api/admin-stripe-check.ts. Kept as a local copy for the
// same reason as AdminUsersTab.tsx's types — the frontend and Functions
// sides have separate tsconfigs, so cross-importing types isn't safe here.
interface PriceCheck {
  label: string;
  id: string;
  ok: boolean;
  error?: string;
  active?: boolean;
  livemode?: boolean;
  unitAmount?: number | null;
  currency?: string;
  productName?: string;
}

interface WebhookCheck {
  ok: boolean;
  error?: string;
  expectedUrl: string;
  found: boolean;
  status?: string;
  url?: string;
  enabledEvents?: string[];
  missingEvents?: string[];
}

interface AdminStripeCheckResponse {
  keyValid: boolean;
  keyError?: string;
  livemode: boolean | null;
  prices: PriceCheck[];
  webhook: WebhookCheck;
}

function formatAmount(unitAmount: number | null | undefined, currency: string | undefined) {
  if (unitAmount == null || !currency) return "—";
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency.toUpperCase() }).format(
      unitAmount / 100,
    );
  } catch {
    return `${(unitAmount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function StatusIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-success" />
  ) : (
    <XCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
  );
}

export function AdminStripeCheckTab() {
  const { getIdToken } = useAuth();
  const [data, setData] = useState<AdminStripeCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      if (!idToken) throw new Error("Please sign in again to run this check.");

      const response = await fetch("/api/admin-stripe-check", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to run Stripe diagnostics.");

      setData(payload as AdminStripeCheckResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run Stripe diagnostics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // Runs once on mount — the refresh button below covers re-checking.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border p-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Running Stripe diagnostics...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-destructive" />
        <p className="text-sm font-semibold text-destructive">{error}</p>
        <button
          onClick={() => void load()}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-sm font-semibold hover:bg-muted"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 rounded-lg border border-brand-gold/40 bg-brand-gold/10 px-4 py-3 text-sm text-brand-gold-ink">
        <p>
          Read-only checks against the Stripe keys configured for this environment. Nothing here creates a
          charge, customer, or subscription — safe to re-run any time.
        </p>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-brand-gold/40 bg-card px-3.5 py-1.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Re-run
        </button>
      </div>

      {/* Secret key */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2.5">
          <StatusIcon ok={data.keyValid} />
          <h3 className="font-serif text-lg font-semibold">Secret key</h3>
          {data.keyValid && (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                data.livemode ? "bg-success/12 text-success" : "bg-brand-gold/20 text-brand-gold-ink",
              )}
            >
              {data.livemode ? "LIVE mode" : "TEST mode"}
            </span>
          )}
        </div>
        {data.keyValid ? (
          <p className="mt-1.5 text-sm text-muted-foreground">
            {data.livemode
              ? "This is a live secret key and can process real charges."
              : "This is a test-mode key — no real money moves through it."}
          </p>
        ) : (
          <p className="mt-1.5 text-sm text-destructive">{data.keyError}</p>
        )}
      </div>

      {/* Prices */}
      {data.prices.map((price) => (
        <div key={price.label} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2.5">
            <StatusIcon ok={price.ok} />
            <h3 className="font-serif text-lg font-semibold">{price.label} price</h3>
            {price.ok && (
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  price.active ? "bg-success/12 text-success" : "bg-destructive/10 text-destructive",
                )}
              >
                {price.active ? "Active" : "Inactive"}
              </span>
            )}
          </div>
          {price.ok ? (
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Amount</dt>
                <dd className="font-medium">{formatAmount(price.unitAmount, price.currency)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Product</dt>
                <dd className="font-medium">{price.productName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Mode</dt>
                <dd className="font-medium">{price.livemode ? "Live" : "Test"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Price ID</dt>
                <dd className="truncate font-mono text-xs">{price.id}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-1.5 text-sm text-destructive">{price.error}</p>
          )}
        </div>
      ))}

      {/* Webhook */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2.5">
          <StatusIcon ok={data.webhook.ok} />
          <h3 className="font-serif text-lg font-semibold">Webhook endpoint</h3>
          {data.webhook.found && (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                data.webhook.status === "enabled" ? "bg-success/12 text-success" : "bg-destructive/10 text-destructive",
              )}
            >
              {data.webhook.status === "enabled" ? "Enabled" : (data.webhook.status ?? "Disabled")}
            </span>
          )}
        </div>
        <p className="mt-1.5 break-all text-sm text-muted-foreground">
          Expected URL: <span className="font-mono text-xs">{data.webhook.expectedUrl}</span>
        </p>
        {data.webhook.found ? (
          <div className="mt-2 space-y-1.5 text-sm">
            <p>
              <span className="text-muted-foreground">Subscribed events: </span>
              {data.webhook.enabledEvents?.length ?? 0}
            </p>
            {data.webhook.missingEvents && (
              <p className="text-destructive">
                Missing required events: {data.webhook.missingEvents.join(", ")}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-1.5 text-sm text-destructive">{data.webhook.error}</p>
        )}
      </div>
    </div>
  );
}
