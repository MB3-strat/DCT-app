import { verifyIdToken } from "./_shared/firebase.js";
import { type Env } from "./_shared/stripe.js";

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
    await env.SUBSCRIPTIONS.delete(user.uid);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to delete subscription record" },
      { status: 500 },
    );
  }
};
