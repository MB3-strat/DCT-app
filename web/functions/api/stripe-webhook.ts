import Stripe from "stripe";
import { getStripe, putSubscriptionRecord, type Env } from "./_shared/stripe.js";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: "STRIPE_WEBHOOK_SECRET is required" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  try {
    const stripe = getStripe(env);
    const body = await request.text();
    // Workers have no Node sync crypto, so signature verification must use
    // the async + SubtleCrypto variant (the sync constructEvent() throws here).
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription & { current_period_end?: number };
      const uid = subscription.metadata.firebase_uid;

      if (uid) {
        await putSubscriptionRecord(env.SUBSCRIPTIONS, uid, {
          stripeCustomerId: String(subscription.customer),
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          subscriptionCurrentPeriodEnd: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : undefined,
        });
      }
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const uid = session.metadata?.firebase_uid;
      const checkoutKind = session.metadata?.checkout_kind;

      if (uid && session.customer) {
        if (checkoutKind === "certificate" && session.payment_status === "paid") {
          await putSubscriptionRecord(env.SUBSCRIPTIONS, uid, {
            stripeCustomerId: String(session.customer),
            stripeCertificateSessionId: session.id,
            certificatePaymentStatus: "paid",
            certificatePaidAt: new Date().toISOString(),
          });
        } else {
          await putSubscriptionRecord(env.SUBSCRIPTIONS, uid, {
            stripeCustomerId: String(session.customer),
          });
        }
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Webhook failed" },
      { status: 400 },
    );
  }
};
