import { verifyIdToken } from "./_shared/firebase.js";
import {
  getAppUrl,
  getStripe,
  getSubscriptionRecord,
  isMissingStripeResource,
  putSubscriptionRecord,
  type Env,
} from "./_shared/stripe.js";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await verifyIdToken(request, env.FIREBASE_PROJECT_ID);
  if (!user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const record = await getSubscriptionRecord(env.SUBSCRIPTIONS, user.uid);
    if (!record.stripeCustomerId) {
      return Response.json({ error: "No Stripe customer exists for this account" }, { status: 400 });
    }

    const stripe = getStripe(env);

    try {
      await stripe.customers.retrieve(record.stripeCustomerId);
      const session = await stripe.billingPortal.sessions.create({
        customer: record.stripeCustomerId,
        return_url: `${getAppUrl(env)}/app/billing`,
      });
      return Response.json({ url: session.url });
    } catch (error) {
      if (!isMissingStripeResource(error)) throw error;

      await putSubscriptionRecord(env.SUBSCRIPTIONS, user.uid, {
        stripeCustomerId: undefined,
        stripeSubscriptionId: undefined,
        subscriptionStatus: "none",
        subscriptionCurrentPeriodEnd: undefined,
      });

      return Response.json(
        {
          error:
            "Your saved Stripe customer belonged to an old Stripe account. Start checkout again to create a fresh customer.",
        },
        { status: 409 },
      );
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Portal failed" },
      { status: 500 },
    );
  }
};
