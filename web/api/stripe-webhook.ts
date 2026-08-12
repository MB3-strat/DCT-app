import type { VercelRequest, VercelResponse } from "@vercel/node";
import type Stripe from "stripe";
import { getAdminSupabase } from "./_shared/supabase.js";
import { getStripe } from "./_shared/stripe.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req: VercelRequest) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      res.status(503).json({ error: "STRIPE_WEBHOOK_SECRET is required" });
      return;
    }

    const signature = req.headers["stripe-signature"];
    if (!signature || Array.isArray(signature)) {
      res.status(400).json({ error: "Missing Stripe signature" });
      return;
    }

    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(await readRawBody(req), signature, secret);
    const supabase = getAdminSupabase();

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription & { current_period_end?: number };
      const userId = subscription.metadata.supabase_user_id;

      if (userId) {
        await supabase
          .from("profiles")
          .update({
            stripe_customer_id: String(subscription.customer),
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status,
            subscription_current_period_end: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      }
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const checkoutKind = session.metadata?.checkout_kind;

      if (userId && session.customer) {
        const update =
          checkoutKind === "certificate" && session.payment_status === "paid"
            ? {
                stripe_customer_id: String(session.customer),
                stripe_certificate_session_id: session.id,
                certificate_payment_status: "paid",
                certificate_paid_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            : {
                stripe_customer_id: String(session.customer),
                updated_at: new Date().toISOString(),
              };

        await supabase.from("profiles").update(update).eq("id", userId);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Webhook failed" });
  }
}
