import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminSupabase, getUserFromRequest } from "./_shared/supabase.js";
import { getAppUrl, getStripe, isMissingStripeResource } from "./_shared/stripe.js";

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

    const supabase = getAdminSupabase();
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.stripe_customer_id) {
      res.status(400).json({ error: "No Stripe customer exists for this account" });
      return;
    }

    const stripe = getStripe();
    let session;

    try {
      await stripe.customers.retrieve(profile.stripe_customer_id);
      session = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: `${getAppUrl()}/app/billing`,
      });
    } catch (error) {
      if (!isMissingStripeResource(error)) throw error;

      await supabase
        .from("profiles")
        .update({
          stripe_customer_id: null,
          stripe_subscription_id: null,
          subscription_status: "none",
          subscription_current_period_end: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      res.status(409).json({
        error: "Your saved Stripe customer belonged to an old Stripe account. Start checkout again to create a fresh customer.",
      });
      return;
    }

    res.status(200).json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Portal failed" });
  }
}
