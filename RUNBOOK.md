# Content & Release Runbook

Step-by-step process for shipping a content or code change to production —
e.g. adding a new module or toolkit. Follow this in order every time. If
you only remember one thing: **the Cloudflare Pages production branch is
`migrate/firebase-cloudflare`, not `main`** (see step 6).

## 0. Before you start

Make sure you're not about to diverge from whatever else has already been
pushed:

```bash
git fetch origin
git status
```

If `git status` shows your branch is behind `origin`, pull first. This
repo has been edited from more than one machine/session in the past, and
resolving a conflict after the fact (two different edits to the same
toolkit, in this case) is much more painful than a `git pull` up front.

## 1. Write/edit the content or code

Module content lives in `web/src/data/modules.json`; toolkit content in
`web/src/data/toolkits.ts`. Shared metadata (categories, urgency labels,
product info) is in `web/src/data/meta.ts`, and the shape of a
module/toolkit is defined in `web/src/data/types.ts` — update `types.ts`
first if a change needs a new field (e.g. the `tables`/`itemsLabel` fields
added for structured red-flag tables).

If the change touches how content renders (not just the data), the
relevant components are `web/src/components/ClinicalText.tsx` and
`web/src/pages/app/ToolkitDetail.tsx`.

## 2. Test in dev

```bash
cd web
npm install          # only needed if dependencies changed
npm run dev           # Vite dev server — fast iteration, but no /api/* routes
```

To exercise the full app including `/api/*` routes (Stripe, auth-gated
content, etc.), build and serve through Wrangler instead:

```bash
npm run dev:cf
```

Run the automated tests before moving on:

```bash
npm run lint
npm test
```

## 3. Generate click-throughs for clinical approval

The `content-review` site is a static, dependency-free click-through of
every module and toolkit — no login, no Stripe, no Firebase — built
specifically so a non-technical reviewer (e.g. Dr Bhatt) can review new or
changed clinical content without needing a deployment.

```bash
npm run content-review
```

This regenerates the `content-review/` folder at the repo root from
whatever is currently in `modules.json`/`toolkits.ts`. It is git-tracked
(not gitignored) on purpose, so a diff of `content-review/` after a
content change shows a reviewer exactly what moved. Re-run it — and
re-commit the result — any time `modules.json` or `toolkits.ts` changes;
it's easy for this to go stale if you forget (it happened once already).

Get clinical sign-off on the regenerated pages before moving on to commit
if the content is clinical (anything marked `Needs clinical review`).

## 4. Commit the code

```bash
git add web/src/data/modules.json web/src/data/toolkits.ts \
        web/src/data/meta.ts web/src/data/types.ts \
        web/src/components/ClinicalText.tsx web/src/pages/app/ToolkitDetail.tsx \
        content-review/
git commit -m "Add M<N> (<module name>) and toolkit(s) T<N>-T<N>"
```

(Adjust the file list to whatever actually changed — the above is the
typical set for a content addition.)

## 5. Push and sync branches

This repo keeps `migrate/firebase-cloudflare` and `main` in sync — `main`
periodically gets a merge commit from `migrate/firebase-cloudflare`. Push
both:

```bash
git push origin migrate/firebase-cloudflare

git checkout main
git pull origin main
git merge migrate/firebase-cloudflare --no-edit
git push origin main

git checkout migrate/firebase-cloudflare
```

## 6. Build

```bash
cd web
npm run build
```

`wrangler pages deploy` uploads whatever's in `web/dist/` — it does not
build for you. Skipping this step deploys a stale or missing build.

## 7. Deploy

**The Cloudflare Pages project's Production branch (Pages project
settings → Builds & deployments) is `migrate/firebase-cloudflare`, not
`main`.** The `--branch` flag below must match that dashboard setting —
it does not need to match your current git branch, it just tells
Cloudflare whether this is a production deploy or a preview deploy. Any
other value creates a preview at its own `*.dct-app.pages.dev` URL instead
of updating the live site.

```bash
npx wrangler pages deploy dist --project-name dct-app --branch migrate/firebase-cloudflare
```

This goes live immediately at:

- `dctsurvivalkit.co.uk`
- `www.dctsurvivalkit.co.uk`

## 8. Tag the release

Tag the commit that was actually deployed, so there's always a known-good
reference to roll back to without having to dig through history:

```bash
git tag -a prod-$(date +%Y%m%d) -m "Deployed to production"
git push origin prod-$(date +%Y%m%d)
```

If you deploy more than once in a day, add a suffix (`prod-20260916-2`).

## 9. If something needs to be rolled back

Two independent options, in order of speed:

1. **Cloudflare Pages dashboard** — every past deployment is retained;
   "Rollback to this deployment" on a prior one is close to instant and
   doesn't require touching git at all.
2. **Git** — `git revert` the bad commit (or check out a `prod-*` tag),
   rebuild, and redeploy per steps 6–7.

## Quick reference

| Step | Command |
|---|---|
| Dev server | `npm run dev` (or `npm run dev:cf` for `/api/*`) |
| Test | `npm run lint && npm test` |
| Regenerate click-throughs | `npm run content-review` |
| Build | `npm run build` |
| Deploy (production) | `npx wrangler pages deploy dist --project-name dct-app --branch migrate/firebase-cloudflare` |
| Production branch | `migrate/firebase-cloudflare` (not `main`) |
| Production domains | `dctsurvivalkit.co.uk`, `www.dctsurvivalkit.co.uk` |
