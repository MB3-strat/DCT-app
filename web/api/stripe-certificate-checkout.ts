import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminSupabase, getUserFromRequest } from "./_shared/supabase.js";
import { getAppUrl, getOrCreateStripeCustomer, getStripe } from "./_shared/stripe.js";

const FALLBACK_MODULE_COUNT = 36;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const user = await getUserFromRequest(new Request("https://local", { headers: req.headers as HeadersInit }));
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!process.env.STRIPE_CERTIFICATE_PRICE_ID) {
      res.status(503).json({ error: "STRIPE_CERTIFICATE_PRICE_ID is required" });
      return;
    }

    const stripe = getStripe();
    const supabase = getAdminSupabase();

    const [{ data: profile }, { count: moduleCount }, { count: completedCount }] = await Promise.all([
      supabase
        .from("profiles")
        .select("stripe_customer_id,certificate_payment_status,roles,subscription_status")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("modules")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("progress")
        .select("content_id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("kind", "module")
        .eq("read", true),
    ]);

    if (profile?.certificate_payment_status === "paid") {
      res.status(200).json({ url: `${getAppUrl()}/app/feedback-cpd?certificate=paid` });
      return;
    }

    const roles = Array.isArray(profile?.roles) ? profile.roles : [];
    const hasClinicalAccess =
      profile?.subscription_status === "active" ||
      profile?.subscription_status === "trialing" ||
      roles.includes("admin");

    if (!hasClinicalAccess) {
      res.status(403).json({ error: "Active DCT Survival Kit subscription required before purchasing the CPD certificate." });
      return;
    }

    const requiredModules = moduleCount && moduleCount > 0 ? moduleCount : FALLBACK_MODULE_COUNT;
    if ((completedCount ?? 0) < requiredModules) {
      res.status(403).json({ error: "Complete all modules before purchasing the CPD certificate." });
      return;
    }

    const customerId = await getOrCreateStripeCustomer({
      stripe,
      supabase,
      user,
      existingCustomerId: profile?.stripe_customer_id,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_CERTIFICATE_PRICE_ID, quantity: 1 }],
      success_url: `${getAppUrl()}/app/feedback-cpd?certificate=success`,
      cancel_url: `${getAppUrl()}/app/feedback-cpd?certificate=cancelled`,
      allow_promotion_codes: true,
      metadata: {
        supabase_user_id: user.id,
        checkout_kind: "certificate",
      },
      payment_intent_data: {
        metadata: {
          supabase_user_id: user.id,
          checkout_kind: "certificate",
        },
      },
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Certificate checkout failed" });
  }
}
