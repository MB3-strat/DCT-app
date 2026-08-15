import Stripe from "stripe";
import { verifyIdToken } from "./_shared/firebase.js";
import { getStripe, getSubscriptionRecord, type Env } from "./_shared/stripe.js";

// The one piece of a user's data this app holds that the client can never
// reach directly: their Cloudflare KV subscription/billing record. Firestore
// deletion and Firebase Auth account deletion both happen client-side (see
// Account.tsx) since this app has no Firebase Admin SDK credentials
// available server-side — everything else is done as the user, via rules.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await verifyIdToken(request, env.FIREBASE_PROJECT_ID);
  if (!user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const record = await getSubscriptionRecord(env.SUBSCRIPTIONS, user.uid);

    // Deleting the account has to stop billing, not just erase our own
    // record of it — otherwise Stripe keeps charging a subscription the
    // user can no longer see or manage from the app. Cancel it directly
    // with Stripe (immediately, not at period end — this is a deletion)
    // before wiping the KV record that points to it.
    if (record.stripeSubscriptionId) {
      const stripe = getStripe(env);
      try {
        await stripe.subscriptions.cancel(record.stripeSubscriptionId);
      } catch (error) {
        // Nothing left to cancel — already canceled, or the id is stale in
        // Stripe (e.g. removed manually in the dashboard). Any other kind
        // of error (auth failure, network, etc.) should still fail the
        // request rather than silently leave billing active.
        if (!(error instanceof Stripe.errors.StripeInvalidRequestError)) throw error;
      }
    }

    await env.SUBSCRIPTIONS.delete(user.uid);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to delete subscription record" },
      { status: 500 },
    );
  }
};
