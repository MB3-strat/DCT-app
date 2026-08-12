import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminSupabase, getUserFromRequest } from "./_shared/supabase.js";
import { getAppUrl, getOrCreateStripeCustomer, getStripe } from "./_shared/stripe.js";

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

    const priceId = process.env.STRIPE_DCT_PRICE_ID || process.env.STRIPE_ANNUAL_PRICE_ID;

    if (!priceId) {
      res.status(503).json({ error: "STRIPE_DCT_PRICE_ID is required" });
      return;
    }

    const stripe = getStripe();
    const supabase = getAdminSupabase();
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    const customerId = await getOrCreateStripeCustomer({
      stripe,
      supabase,
      user,
      existingCustomerId: profile?.stripe_customer_id,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${getAppUrl()}/app/billing?checkout=success`,
      cancel_url: `${getAppUrl()}/app/billing?checkout=cancelled`,
      allow_promotion_codes: true,
      metadata: { supabase_user_id: user.id, checkout_kind: "subscription" },
      subscription_data: { metadata: { supabase_user_id: user.id, checkout_kind: "subscription" } },
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Checkout failed" });
  }
}
