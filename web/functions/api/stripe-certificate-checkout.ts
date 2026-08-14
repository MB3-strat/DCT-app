import { getBearerToken, verifyIdToken } from "./_shared/firebase.js";
import { listDocs } from "./_shared/firestore.js";
import {
  getAppUrl,
  getOrCreateStripeCustomer,
  getStripe,
  getSubscriptionRecord,
  type Env,
} from "./_shared/stripe.js";
import MODULES from "../../src/data/modules.json";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await verifyIdToken(request, env.FIREBASE_PROJECT_ID);
  if (!user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  if (!env.STRIPE_CERTIFICATE_PRICE_ID) {
    return Response.json({ error: "STRIPE_CERTIFICATE_PRICE_ID is required" }, { status: 503 });
  }

  try {
    const record = await getSubscriptionRecord(env.SUBSCRIPTIONS, user.uid);

    if (record.certificatePaymentStatus === "paid") {
      return Response.json({ url: `${getAppUrl(env)}/app/feedback-cpd?certificate=paid` });
    }

    const hasClinicalAccess =
      record.subscriptionStatus === "active" || record.subscriptionStatus === "trialing";

    if (!hasClinicalAccess) {
      return Response.json(
        { error: "Active DCT Survival Kit subscription required before purchasing the CPD certificate." },
        { status: 403 },
      );
    }

    const idToken = getBearerToken(request)!;
    const progressDocs = await listDocs(env.FIREBASE_PROJECT_ID, idToken, `profiles/${user.uid}/progress`);
    const completedCount = progressDocs.filter((d) => d.kind === "module" && d.read === true).length;

    if (completedCount < MODULES.length) {
      return Response.json(
        { error: "Complete all modules before purchasing the CPD certificate." },
        { status: 403 },
      );
    }

    const stripe = getStripe(env);
    const customerId = await getOrCreateStripeCustomer(stripe, env.SUBSCRIPTIONS, user.uid, user.email);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: env.STRIPE_CERTIFICATE_PRICE_ID, quantity: 1 }],
      success_url: `${getAppUrl(env)}/app/feedback-cpd?certificate=success`,
      cancel_url: `${getAppUrl(env)}/app/feedback-cpd?certificate=cancelled`,
      allow_promotion_codes: true,
      metadata: { firebase_uid: user.uid, checkout_kind: "certificate" },
      payment_intent_data: { metadata: { firebase_uid: user.uid, checkout_kind: "certificate" } },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Certificate checkout failed" },
      { status: 500 },
    );
  }
};
