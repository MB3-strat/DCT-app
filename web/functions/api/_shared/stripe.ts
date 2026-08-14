import Stripe from "stripe";

export interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_DCT_PRICE_ID: string;
  STRIPE_CERTIFICATE_PRICE_ID: string;
  FIREBASE_PROJECT_ID: string;
  APP_URL: string;
  SUBSCRIPTIONS: KVNamespace;
}

export function getStripe(env: Env) {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion,
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export function getAppUrl(env: Env) {
  return env.APP_URL || "http://localhost:8788";
}

export function isMissingStripeResource(error: unknown) {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    error.code === "resource_missing"
  );
}

export interface SubscriptionRecord {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: string;
  subscriptionCurrentPeriodEnd?: string;
  certificatePaymentStatus?: string;
  certificatePaidAt?: string;
  stripeCertificateSessionId?: string;
}

export async function getSubscriptionRecord(kv: KVNamespace, uid: string): Promise<SubscriptionRecord> {
  const raw = await kv.get(uid);
  return raw ? (JSON.parse(raw) as SubscriptionRecord) : {};
}

export async function putSubscriptionRecord(
  kv: KVNamespace,
  uid: string,
  patch: Partial<SubscriptionRecord>,
): Promise<SubscriptionRecord> {
  const current = await getSubscriptionRecord(kv, uid);
  const next = { ...current, ...patch };
  await kv.put(uid, JSON.stringify(next));
  return next;
}

// Gets the caller's Stripe customer, creating one if needed. If a
// previously-stored customer id no longer exists in Stripe (e.g. deleted in
// the dashboard), transparently creates a fresh one — mirrors the original
// app's stale-customer recovery.
export async function getOrCreateStripeCustomer(
  stripe: Stripe,
  kv: KVNamespace,
  uid: string,
  email: string | undefined,
): Promise<string> {
  const record = await getSubscriptionRecord(kv, uid);

  if (record.stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(record.stripeCustomerId);
      if (!customer.deleted) return record.stripeCustomerId;
    } catch (error) {
      if (!isMissingStripeResource(error)) throw error;
      // Falls through to create a new customer below.
    }
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { firebase_uid: uid },
  });
  await putSubscriptionRecord(kv, uid, { stripeCustomerId: customer.id });
  return customer.id;
}
