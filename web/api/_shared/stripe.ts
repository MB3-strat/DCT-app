import Stripe from "stripe";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is required.");
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-06-24.dahlia",
  });
}

export function getAppUrl() {
  return process.env.APP_URL || process.env.VITE_APP_URL || "http://localhost:8080";
}

export function isMissingStripeResource(error: unknown) {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    error.code === "resource_missing"
  );
}

export async function getOrCreateStripeCustomer({
  stripe,
  supabase,
  user,
  existingCustomerId,
}: {
  stripe: Stripe;
  supabase: SupabaseClient;
  user: User;
  existingCustomerId?: string | null;
}) {
  if (existingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId);
      if (!customer.deleted) return customer.id;
    } catch (error) {
      if (!isMissingStripeResource(error)) throw error;
    }
  }

  const customer = await stripe.customers.create({
    email: user.email || undefined,
    metadata: { supabase_user_id: user.id },
  });

  await supabase.from("profiles").update({ stripe_customer_id: customer.id }).eq("id", user.id);
  return customer.id;
}
