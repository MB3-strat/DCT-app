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

      // No metadata.firebase_uid means this subscription wasn't created
      // through our checkout flow (or metadata wasn't copied onto it) —
      // nothing to update.
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

      if (uid && session.customer && checkoutKind === "certificate" && session.payment_status === "paid") {
        await putSubscriptionRecord(env.SUBSCRIPTIONS, uid, {
          stripeCustomerId: String(session.customer),
          stripeCertificateSessionId: session.id,
          certificatePaymentStatus: "paid",
          certificatePaidAt: new Date().toISOString(),
        });
      }
      // Deliberately NOT writing here for a subscription checkout (or when
      // uid/customer is missing). Stripe sends checkout.session.completed
      // and customer.subscription.created back-to-back for a new
      // subscription, often close enough together that they can be
      // processed concurrently. Both handlers do a KV read-modify-write
      // (getSubscriptionRecord then putSubscriptionRecord) against the
      // *same* record — if this one's read happened before the other
      // handler's write landed, this write would clobber the
      // subscriptionStatus the other handler just set, silently reverting
      // an active subscription back to looking unpaid. customer.subscription
      // events already carry the customer ID, so there's nothing this
      // branch needs to contribute for subscriptions — only skip it here
      // rather than trying to make two racing writers cooperate.
    }

    if (event.type === "invoice.upcoming") {
      // Fired when Stripe's own "upcoming renewal" customer email goes out
      // (Settings > Customer emails in the Stripe Dashboard) — this app
      // doesn't compose or send that email itself, just records that it
      // fired so the admin user list can show a "reminder sent" date.
      // Subscription metadata (including firebase_uid) is snapshotted onto
      // the invoice's parent.subscription_details at finalization, so no
      // extra API call is needed to resolve which user this is for.
      const invoice = event.data.object as Stripe.Invoice;
      const uid = invoice.parent?.subscription_details?.metadata?.firebase_uid;

      if (uid) {
        await putSubscriptionRecord(env.SUBSCRIPTIONS, uid, {
          renewalReminderSentAt: new Date().toISOString(),
        });
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
