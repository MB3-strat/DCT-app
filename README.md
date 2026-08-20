# DCT Survival Kit

Production web build for the DCT Survival Kit.

Live production URL:

- `https://www.dctsurvivalkit.co.uk`

## Local Development

```bash
cd web
npm install
cp .env.example .env.local
cp .dev.vars.example .dev.vars
npm run dev
```

`.env.local` is read by Vite and only exposes `VITE_*` keys to the browser
bundle. `.dev.vars` is a separate file read by Wrangler for the Cloudflare
Pages Functions in `web/functions/api/*` (server-side secrets like Stripe
keys never belong in `.env.local`). Both files are gitignored.

`npm run dev` runs the Vite dev server only (no Functions/API routes, no
HMR-safe API proxying). To exercise the full app including `/api/*` routes
locally, build and serve through Wrangler instead:

```bash
npm run dev:cf
```

## Production Plumbing

Implemented:

- Firebase Authentication (email/password) for sign-in; the client SDK
  persists the session across redirects (e.g. back from Stripe Checkout).
- Firestore for profiles, bookmarks, progress, and reported issues, secured
  by `web/firestore.rules` — accessed directly from the client via the
  Firebase SDK, or from Cloudflare Pages Functions via the Firestore REST
  API using the caller's own ID token (there is no Firebase Admin SDK /
  service account key anywhere in this stack).
- Cloudflare Pages + Pages Functions (`web/functions/api/*`) for
  server-side routes: Stripe checkout/portal/webhook, certificate
  generation and download, account deletion, subscription status.
- Cloudflare KV (`SUBSCRIPTIONS` namespace, see `wrangler.toml`) holds
  billing/subscription state (`stripeCustomerId`, `subscriptionStatus`,
  `certificatePaymentStatus`, etc.), keyed by Firebase uid. It is owned
  exclusively by the Stripe webhook handler — nothing else writes to it.
- Stripe Checkout for the annual subscription (`mode: "subscription"`) and
  Stripe Customer Portal for billing/cancellation.
- Stripe Checkout for the one-time CPD certificate payment
  (`mode: "payment"`) after all modules are complete.
- Stripe webhook endpoint (`/api/stripe-webhook`) with signature
  verification (Workers-compatible async/SubtleCrypto variant). Subscription
  and certificate access are never simulated client-side or trusted from
  redirect query params alone — the webhook is the source of truth, and
  `certificate-download.ts` independently re-checks payment status
  server-side before generating a PDF.
- Subscriber-only app routes gated through Firebase Auth session and
  subscription/admin status.
- Disclaimer gate, cookie notice, account deletion (Firebase Auth account +
  Firestore data + KV subscription record — full erasure, not just a data
  reset), and cancellation/billing entry points.

## Firebase Setup

1. Create a Firebase project with Authentication (email/password) and
   Firestore enabled.
2. Add the app's deployed domain(s) under Authentication → Settings →
   Authorized domains (bare hostname, no protocol/path), e.g.
   `dct-app-6px.pages.dev` and `www.dctsurvivalkit.co.uk`.
3. Deploy Firestore security rules: `firebase deploy --only firestore:rules`
   (uses `web/firestore.rules`).
4. Fill in the `VITE_FIREBASE_*` keys in `.env.local` from the Firebase
   project settings, and `FIREBASE_PROJECT_ID` in `.dev.vars` /
   Cloudflare Pages secrets.

## Stripe Setup

1. Create a recurring annual EUR price for DCT Survival Kit access (€20/year).
2. Set `STRIPE_DCT_PRICE_ID` to that yearly subscription `price_...` ID.
3. Create a one-time €5 price for the CPD certificate.
4. Set `STRIPE_CERTIFICATE_PRICE_ID` to that one-time certificate
   `price_...` ID.
5. Configure a webhook to `https://<your-domain>/api/stripe-webhook`.
6. Subscribe it to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
7. Set `STRIPE_WEBHOOK_SECRET`.
8. Configure the Stripe Customer Portal.

Current expected Stripe products:

- DCT Survival Kit access: €20/year recurring subscription.
- CPD certificate: €5 one-time payment.

Stripe prices are immutable. If either amount changes, create a new Price in
Stripe and update the matching Cloudflare Pages secret.

`STRIPE_SECRET_KEY`, `STRIPE_DCT_PRICE_ID`, `STRIPE_CERTIFICATE_PRICE_ID`,
and `STRIPE_WEBHOOK_SECRET` are all server-side secrets — set them with
`wrangler pages secret put <NAME> --project-name dct-app`, never committed
to the repo.

## Cloudflare Pages / Domain

Project root for the Pages build is `web` (`pages_build_output_dir = "dist"`
in `web/wrangler.toml`).

Deploy:

```bash
cd web
npm run build
npx wrangler pages deploy dist --project-name dct-app --branch <branch>
```

Requires a real Cloudflare KV namespace bound as `SUBSCRIPTIONS` in
`wrangler.toml` (`wrangler kv namespace create SUBSCRIPTIONS`), and secrets
set via `wrangler pages secret put` for every value in `.dev.vars.example`.

Production domains:

- `dctsurvivalkit.co.uk`
- `www.dctsurvivalkit.co.uk`

Point DNS at the Cloudflare Pages project. Set `APP_URL` (server-side) and
`VITE_APP_URL` (client-side) to `https://www.dctsurvivalkit.co.uk` in
production — locally both can be left unset, since the app falls back to
the request's own origin.

## Launch Blockers

- Clinical review and sign-off remain required for content marked `Needs clinical review`.
- Legal review is still required for terms, privacy policy, disclaimer, refund/cancellation wording, and clinical risk language.
- Production Firebase, Stripe, Cloudflare, and DNS dashboard settings must stay configured outside the repo. Do not commit secrets.
- The app still includes fallback bundled content for offline/PWA use. For strict server-only content protection, move module/toolkit reads fully behind authenticated API endpoints before launch.
