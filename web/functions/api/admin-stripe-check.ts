import Stripe from "stripe";
import { getBearerToken, verifyIdToken } from "./_shared/firebase.js";
import { getDoc } from "./_shared/firestore.js";
import { getAppUrl, getStripe, type Env } from "./_shared/stripe.js";

// Admin-only, read-only Stripe diagnostics. Every call here is a pure GET
// against Stripe (balance / price / webhook-endpoint lookups) — nothing
// that creates a customer, charge, subscription, or any other object, so
// this is safe to run repeatedly against LIVE keys with no financial or
// data side effects and no real card required.

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

export interface AdminStripeCheckResponse {
  keyValid: boolean;
  keyError?: string;
  livemode: boolean | null;
  prices: PriceCheck[];
  webhook: WebhookCheck;
}

// The event types stripe-webhook.ts actually handles — flagged if the live
// endpoint isn't subscribed to one of these, since that would silently
// break the corresponding feature (e.g. missing invoice.upcoming means
// renewal-reminder tracking never fires) without ever throwing an error.
const REQUIRED_WEBHOOK_EVENTS = [
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "checkout.session.completed",
  "invoice.upcoming",
];

async function checkPrice(stripe: Stripe, label: string, id: string | undefined): Promise<PriceCheck> {
  if (!id) {
    return { label, id: "", ok: false, error: "No price ID configured for this environment" };
  }

  try {
    const price = await stripe.prices.retrieve(id, { expand: ["product"] });
    const product = price.product;
    const productName =
      product && typeof product !== "string" && !("deleted" in product && product.deleted)
        ? (product as Stripe.Product).name
        : undefined;

    return {
      label,
      id,
      ok: true,
      active: price.active,
      livemode: price.livemode,
      unitAmount: price.unit_amount,
      currency: price.currency,
      productName,
    };
  } catch (error) {
    return {
      label,
      id,
      ok: false,
      error: error instanceof Error ? error.message : "Failed to retrieve this price",
    };
  }
}

async function checkWebhook(stripe: Stripe, expectedUrl: string): Promise<WebhookCheck> {
  try {
    const list = await stripe.webhookEndpoints.list({ limit: 100 });
    const match = list.data.find((endpoint) => endpoint.url === expectedUrl);

    if (!match) {
      return {
        ok: false,
        expectedUrl,
        found: false,
        error: "No webhook endpoint in this Stripe account points at this URL",
      };
    }

    const missingEvents = REQUIRED_WEBHOOK_EVENTS.filter((event) => !match.enabled_events.includes(event));

    return {
      ok: match.status === "enabled" && missingEvents.length === 0,
      expectedUrl,
      found: true,
      status: match.status,
      url: match.url,
      enabledEvents: match.enabled_events,
      missingEvents: missingEvents.length > 0 ? missingEvents : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      expectedUrl,
      found: false,
      error: error instanceof Error ? error.message : "Failed to list webhook endpoints",
    };
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const caller = await verifyIdToken(request, env.FIREBASE_PROJECT_ID);
  if (!caller) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const idToken = getBearerToken(request)!;

  try {
    // Same admin gate as admin-users.ts: confirm the caller is an admin by
    // reading their own profile doc before running anything else.
    const callerProfile = await getDoc(env.FIREBASE_PROJECT_ID, idToken, `profiles/${caller.uid}`);
    const callerRoles = (callerProfile?.roles as string[] | undefined) ?? [];
    if (!callerRoles.includes("admin")) {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const stripe = getStripe(env);

    let keyValid = true;
    let keyError: string | undefined;
    let livemode: boolean | null = null;
    try {
      // Balance retrieval is the lightest possible authenticated call —
      // succeeds only with a valid secret key, and the response itself
      // reports whether that key is live or test mode.
      const balance = await stripe.balance.retrieve();
      livemode = balance.livemode;
    } catch (error) {
      keyValid = false;
      keyError = error instanceof Error ? error.message : "Failed to verify the Stripe secret key";
    }

    const [subscriptionPrice, certificatePrice] = await Promise.all([
      checkPrice(stripe, "Subscription", env.STRIPE_DCT_PRICE_ID),
      checkPrice(stripe, "CPD certificate", env.STRIPE_CERTIFICATE_PRICE_ID),
    ]);

    const expectedWebhookUrl = `${getAppUrl(env, request)}/api/stripe-webhook`;
    const webhook = await checkWebhook(stripe, expectedWebhookUrl);

    return Response.json({
      keyValid,
      keyError,
      livemode,
      prices: [subscriptionPrice, certificatePrice],
      webhook,
    } satisfies AdminStripeCheckResponse);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to run Stripe diagnostics" },
      { status: 500 },
    );
  }
};
