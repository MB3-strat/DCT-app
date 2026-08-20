import { verifyIdToken } from "./_shared/firebase.js";
import { getSubscriptionRecord, type Env } from "./_shared/stripe.js";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await verifyIdToken(request, env.FIREBASE_PROJECT_ID);
  if (!user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const record = await getSubscriptionRecord(env.SUBSCRIPTIONS, user.uid);
  return Response.json(record);
};
