import { verifyIdToken } from "./_shared/firebase.js";
import { getAppUrl, getOrCreateStripeCustomer, getStripe, type Env } from "./_shared/stripe.js";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await verifyIdToken(request, env.FIREBASE_PROJECT_ID);
  if (!user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const priceId = env.STRIPE_DCT_PRICE_ID;
  if (!priceId) {
    return Response.json({ error: "STRIPE_DCT_PRICE_ID is required" }, { status: 503 });
  }

  try {
    const stripe = getStripe(env);
    const customerId = await getOrCreateStripeCustomer(stripe, env.SUBSCRIPTIONS, user.uid, user.email);

    // Authoritative anti-duplicate check, asked directly of Stripe rather
    // than our own Cloudflare KV record. KV is eventually consistent — right
    // after a real successful checkout, our webhook may have already
    // written subscriptionStatus, but a read here could still see a stale
    // pre-write value for up to ~60s. If this checked *our* KV instead, a
    // user re-clicking "Subscribe" during exactly that window could create
    // a genuine second paid subscription. Stripe's own subscriptions list
    // has no such lag, so check there instead.
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });
    const alreadySubscribed = existingSubscriptions.data.some(
      (sub) => sub.status === "active" || sub.status === "trialing",
    );
    if (alreadySubscribed) {
      return Response.json({ url: `${getAppUrl(env, request)}/app/billing?checkout=already-active` });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${getAppUrl(env, request)}/app/billing?checkout=success`,
      cancel_url: `${getAppUrl(env, request)}/app/billing?checkout=cancelled`,
      allow_promotion_codes: true,
      metadata: { firebase_uid: user.uid, checkout_kind: "subscription" },
      subscription_data: { metadata: { firebase_uid: user.uid, checkout_kind: "subscription" } },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 500 },
    );
  }
};
