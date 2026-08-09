# DCT Survival Kit

Production web build for the DCT Survival Kit.

Live production URL:

- `https://www.dctsurvivalkit.co.uk`

## Local Development

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

## Production Plumbing

Implemented:

- Supabase email/password auth.
- Supabase schema for profiles, modules, toolkits, bookmarks, progress, subscriber status, single-session tracking, and reported issues.
- Account sync for bookmarks, read progress, and toolkit checklist state.
- Stripe Checkout for the annual subscription and Stripe Customer Portal for billing/cancellation.
- Stripe webhook endpoint with signature verification. Subscription access is never simulated client-side.
- Subscriber-only app routes gated through Supabase session and subscription/admin status.
- Disclaimer gate, cookie notice, account deletion, and cancellation/billing entry points.
- Vercel configuration for SPA routing, serverless API functions, and deployment under `www.dctsurvivalkit.co.uk`.

## Supabase Setup

1. Create a Supabase project.
2. Run the SQL files in `web/supabase/migrations/` in order, using the Supabase SQL editor or the Supabase CLI.
3. Add the Site URL and redirect URLs:
   - `http://localhost:8080`
   - `http://localhost:8080/app/billing`
   - `https://www.dctsurvivalkit.co.uk`
   - `https://www.dctsurvivalkit.co.uk/app`
   - `https://www.dctsurvivalkit.co.uk/app/billing`
4. Add environment variables from `web/.env.example`.
5. Seed content:

```bash
cd web
npm run db:seed
```

## Stripe Setup

1. Create a recurring annual GBP price for £20.
2. Set `STRIPE_ANNUAL_PRICE_ID` to the Stripe `price_...` ID for that £20/year price.
3. Configure a webhook to `https://dctsurvivalkit.co.uk/api/stripe-webhook`.
4. Subscribe to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Set `STRIPE_WEBHOOK_SECRET`.
6. Configure the Stripe Customer Portal.

Stripe prices are immutable. If the subscription amount changes, create a new yearly recurring Price in Stripe and update `STRIPE_ANNUAL_PRICE_ID` in Vercel.

## Vercel / Domain

Set the Vercel project root to `web`.

Recommended settings:

- Build command: `npm run build`
- Output directory: `dist`

Production domains:

- `dctsurvivalkit.co.uk`
- `www.dctsurvivalkit.co.uk`

Point DNS to Vercel using the records Vercel gives for the project. Set `APP_URL` and `VITE_APP_URL` to `https://www.dctsurvivalkit.co.uk`.

## Launch Blockers

- Clinical review and sign-off remain required for content marked `Needs clinical review`.
- Legal review is still required for terms, privacy policy, disclaimer, refund/cancellation wording, and clinical risk language.
- Production Supabase, Stripe, Vercel, and DNS dashboard settings must stay configured outside the repo. Do not commit secrets.
- The app still includes fallback bundled content for offline/PWA use. For strict server-only content protection, move module/toolkit reads fully behind authenticated API endpoints before launch.
