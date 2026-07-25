# AskChetna — Project Context

Awareness-first Vedic astrology platform. "Understand patterns, not predictions."
Live at https://askchetna.com (Vercel).

## Stack (verify before assuming)

| Layer | Actual |
|---|---|
| Framework | **Next.js 16** App Router, React 19, TypeScript |
| Styling | **CSS Modules** + `src/app/globals.css`. **No Tailwind, no shadcn/ui.** |
| Icons | `lucide-react` |
| Animation | `framer-motion` |
| Auth | **NextAuth v5** (JWT strategy) + Prisma adapter |
| DB | Postgres (Supabase) via **Prisma 5.22** |
| Mobile | **CapacitorJS 8** — native projects in `mobile/`. **Not React Native, not Expo.** |
| Payments | Razorpay (web + Android), **Apple IAP via RevenueCat** (iOS only) |
| Ephemeris | `swisseph-wasm` (WASM, served from `public/`) |
| Deploy | Vercel, auto-deploys from the **`preview`** branch |

## Working agreements

- **Commit directly to `preview`.** Do not create feature branches.
- `preview` auto-deploys to production — confirm before pushing.
- Match the surrounding code's style. Comments explain *why*, not *what*.

## Brand

Dark is the default theme (`<html data-theme="dark">`); light theme also exists.

```
Dark   bg #0B0F2F   fg #DFE0FF   gold #D4AF37   iris #5D3FD3
Light  bg #FDF4E3   fg #2C1B18   gold #B8860B   rose #C48E8E
```

Fonts: **Inter** (`--font-main`), **Playfair Display** (`--font-heading`), both via
`next/font`. App icon and splash use `#0B0F2F` with the gold mark from
`public/chetna_icon.svg`.

## Landmines (each of these has already cost time)

**`src/proxy.ts` runs on the Edge runtime and imports `@/auth`.** Never add a
static import of a Node-only library (`firebase-admin`, anything using
`node:crypto`) to `src/auth.ts` — it breaks the proxy module, which surfaces as a
misleading `Proxy file must export a function named 'proxy'` error and **500s
every route on the site**. Use `await import()` inside the function that needs it,
as the `phone-otp` provider does.

**The Prisma CLI does not read `.env.local`.** Use the npm scripts:
`migrate:status`, `migrate:local`, `migrate:preview`, `migrate:prod` and their
`:status` variants (they wrap `dotenv-cli`).

**Never run `prisma migrate dev`.** It can offer to drop and recreate the schema.
Migrations here are hand-written or generated with `prisma migrate diff`, placed in
`prisma/migrations/<timestamp>_<name>/migration.sql`, and applied with
`migrate deploy`. History was baselined (the DB predates migrations — it was built
with `db push`); `scripts/baseline-migrations.ps1` documents that.

**There are THREE separate Supabase databases**, one per environment, each at a
different point in migration history:

```
.env.local     project klsngrntvpnqyqehcuys
.env.preview   project qtyxqebsdpuflngwczvk
.env.prod      project rrbzhkevlpyfaiesarbo
```

They share the hostname `aws-1-ap-northeast-1.pooler.supabase.com` — that is
Supabase's shared pooler and is identical for every project. The project is
encoded in the **username** (`postgres.<ref>`), so comparing hosts will tell you
they are the same database when they are not.

⚠️ **These files contain COMMENTED-OUT `DATABASE_URL` lines as well as the live
one** (`.env.local` has three, only the last active). Grepping for the first match
reads a disabled line and reports the wrong database — which has already produced
a confidently wrong diagnosis once. Match `^\s*DATABASE_URL=`, or better, let
`dotenv-cli` resolve it.

**Do not infer the deployed database from these files at all.** Vercel holds its
own environment variables, which need not match. Ask the deployment itself:

```
curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/health/db
```

That reports the host, database user, Supabase project ref, any missing
columns/tables, and the last applied migrations.

**Migrating one does NOT migrate the others.** `npm run migrate:local` only
touches the local database; the deployed Preview and Production apps read their
own. A schema change applied locally but not to Preview shows up as
`P2022 The column X does not exist`, and inside NextAuth it surfaces as the far
less helpful `?error=Configuration`.

**Adding a column to a widely-queried model breaks reads before the migration
runs.** Prisma `SELECT`s every column by default, so the code 500s with P2022
until the migration is applied. Deploy migration-first, and prefer an explicit
`select` on money paths (see `grantCreditPack`).

**Free-tier Supabase auto-pauses after ~7 days idle**, which takes the live site
down. Symptom: `FATAL: (ENOTFOUND) tenant/user postgres.<ref> not found`.

## Native app architecture

The apps do **not** bundle the web app. `capacitor.config.ts` sets
`server.url = https://askchetna.com`, so Vercel deploys reach users with no store
resubmission. Rebuild only for plugin changes, permissions, icons, or native config.

- Platform detection: `src/lib/platform.ts`, via a User-Agent token Capacitor
  appends. Deliberately UA-based so **server and client agree** — App Store
  reviewers read server-rendered HTML, so hiding Razorpay on iOS must happen
  server-side.
- All Capacitor plugin usage sits behind `await import()` inside a native guard,
  so browser visitors download none of it. `firebase/auth` is aliased to `false`
  for the client build in `next.config.ts` (bundling it once OOM'd the dev server).
- `mobile/shell/offline.html` is the launch-time offline page and must contain **no
  bridge calls** — Android gives `errorPath` pages no plugin access.
- Safe areas: `viewport-fit=cover` is set globally, so any `position: fixed`
  element anchored to an edge needs `env(safe-area-inset-*)`.

## Store compliance (do not regress these)

- **Account deletion must stay reachable in-app** — required by App Store 5.1.1(v)
  *and* Google Play's data-deletion policy. 7-day grace period;
  `PendingDeletionGate` locks a pending account to a cancellation screen only,
  which is what stops it reading as mere deactivation.
- **No Razorpay or external-purchase reference on iOS** (guideline 3.1.1). Apple
  also forbids *steering* users to outside payment.
- **Sign in with Apple is required** while Google sign-in exists (4.8).
  `APPLE_SECRET` expires every 6 months — regenerate with `npm run apple:secret`.
- Keep the "patterns, not predictions" framing. Deterministic fortune-telling
  claims attract scrutiny.

## Useful scripts

```
npm run dev                     # Next dev server

# Migrations — each targets a DIFFERENT database. Deploying code without
# migrating the matching database is what produces P2022 at runtime.
npm run migrate:status          # .env.local
npm run migrate:status:preview  # .env.preview  <- what the preview site reads
npm run migrate:status:prod     # .env.prod     <- what the live site reads
npm run migrate:local
npm run migrate:preview
npm run migrate:prod

npm run verify:payments         # read-only Razorpay webhook regression check
npm run apple:secret            # regenerate the Sign in with Apple client secret
npm run assets                  # regenerate app icons and splash screens
```

After any schema change, check status against **every** environment you deploy to,
not just local.
