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
- **Pushing `preview` does NOT reach production.** `preview` and `www` are
  separate Vercel deployments. Confirmed on 2026-08-07: pushing `11742ef` moved
  `preview.askchetna.com` to v3.2.0 while `www.askchetna.com` stayed on v3.1.10
  and build `82e7de7`. This line previously claimed the opposite, which makes
  every push feel more dangerous than it is — and, worse, invites the assumption
  that a fix has shipped when it has not. Ask the deployments rather than this
  file: `curl -s https://<host>/api/version`.
- Match the surrounding code's style. Comments explain *why*, not *what*.
- **Commit subjects carry the shipping version**, e.g. `fix(env): … [v3.1.8]`.
  Stamped automatically by the `prepare-commit-msg` hook — do not add it by
  hand. Several commits sharing a version is correct: the patch bump happens
  once per push cycle, so they ship together under that number. To see what a
  deployed version contains: `git log --oneline --grep='\[v3\.1\.8\]'`.

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
`migrate deploy`.

**History was squashed to a single baseline on 2026-08-07** —
`00000000000000_baseline`, generated from the schema and creating all 33 tables.
The sixteen migrations it replaced are kept for reference in
`prisma/migrations-archive/`, outside Prisma's view.

The reason matters, because it is the trap to avoid recreating: the old history
had itself been baselined onto a database built with `db push`, so `init`
created **7 tables while the schema declared 33**. Replaying it against an empty
project died on the first migration that `ALTER`ed a table nothing had created
(`P3018 — relation "AnalyticsEvent" does not exist`), which meant production
could not be rebuilt from this repo. Every new migration from here must be
replayable from empty; if you ever find yourself baselining onto an existing
database again, the history stops being able to do that.

All four environments (local, preview, prod, backup1) are baselined onto it and
report a single applied migration.

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

**`DATABASE_URL` must use port 6543 with `?pgbouncer=true`; `DIRECT_URL` uses
5432.** Port 5432 is Supabase's session mode, capped at 15 clients — a `next build`
runs 7 workers and exhausts it, and serverless functions will fail intermittently
under real traffic. Symptom:
`FATAL: (EMAXCONNSESSION) max clients reached in session mode`. Prisma needs both:
the pooled URL for queries, the direct one for migrations. `.env.prod` has this
right; check any environment showing that error, including Vercel's own variables.

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

## AI providers

Four are supported: `gemini`, `openai`, `deepseek`, `kimi` (alias `moonshot`).
Keys: `GOOGLE_AI_API_KEY`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `KIMI_API_KEY`.
Kimi also takes `KIMI_BASE_URL` — Moonshot serves `.ai` and `.cn` endpoints and
an account only works on the one it was created for; the wrong one returns 401
with nothing mentioning the region.

Selection, highest priority first:

```
AI_PROVIDER_<FLOW> / AI_MODEL_<FLOW>   per-flow override, e.g. AI_PROVIDER_CLARITY_ASK=kimi
AI_STRATEGY=HYBRID                     per-flow best-of-breed defaults
AI_PROVIDER                            single provider for everything (default gemini)
```

Flows: `CLARITY_ASK`, `TIMING_INSIGHT`, `PLANET_INSIGHTS`, `JOURNAL_ANALYSIS`,
`SYNASTRY_ANALYSIS`, `REPORT_GENERATION`, `CONSULTATION_REPLY`.

**Fallback is automatic and no longer Gemini-specific.** A missing key, a 429,
a 401/403, a 5xx or a network failure moves to the next *configured* provider
in order (openai, deepseek, kimi, gemini) and only throws once all of them
fail. The earlier code fell back to Gemini specifically, which could not help in
the case that actually matters — Gemini being the provider that is down.

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
npm run apple:secret            # regenerate the Sign in with Apple client secret (expires 6mo)
npm run assets                  # regenerate app icons and splash screens
npm run cap:sync                # sync config into native projects (before building)
npm run shell:prepare           # points offline page at correct deployment (CAP_SERVER_URL)
```

After any schema change, check status against **every** environment you deploy to,
not just local.

## Mobile App Build & Deployment

### Quick Start (Development)

**iOS (macOS only):**
```bash
npm run cap:sync              # Syncs web + Capacitor config into Xcode project
open mobile/ios/App/App.xcodeproj
# In Xcode: Cmd+R to build and run on simulator/device
```

**Android:**
```bash
npm run cap:sync              # Syncs web + Capacitor config into Gradle
npx cap run android           # Builds and runs on first connected emulator/device
# Or open mobile/android in Android Studio and run from IDE
```

### Building for Store Submission

**Android Release:**
```bash
export ASKCHETNA_KEYSTORE_PATH="/path/to/release.jks"
export ASKCHETNA_KEYSTORE_PASSWORD="keystore_password"
export ASKCHETNA_KEY_ALIAS="askchetna-prod"
export ASKCHETNA_KEY_PASSWORD="key_password"

cd mobile/android
./gradlew bundleRelease
# Outputs: app/build/outputs/bundle/release/app-release.aab → upload to Google Play
```

**iOS Release:**
```bash
# Create archive in Xcode (Product → Archive) or CLI:
xcodebuild -scheme App -archivePath App.xcarchive -configuration Release archive

# Export and upload via Transporter or Xcode Organizer
xcodebuild -exportArchive -archivePath App.xcarchive \
  -exportOptionsPlist exportOptions.plist -exportPath ./build
# Outputs: build/*.ipa → upload to App Store Connect
```

### Preview vs Production

**Web deployment** is automatic, but only to the **preview** deployment. Getting
a change onto `www.askchetna.com` is a separate step — see the working
agreements above.

**Mobile apps** are locked to a URL at build time, and `capacitor.config.ts`
defaults to `https://www.askchetna.com`. So a default build — including anything
already installed or in a store — reads **production**, and a push to `preview`
does not change what those users see. To test preview:

```bash
CAP_SERVER_URL=https://preview.askchetna.com npm run cap:sync
# Rebuild and run — now loading from preview.askchetna.com instead of production

# Remember to switch back before production build:
npm run cap:sync  # Uses default: https://www.askchetna.com
```

### Key Mobile Files

| File | Purpose |
|---|---|
| `capacitor.config.ts` | Platform config, URL, plugin setup, safe areas |
| `src/lib/platform.ts` | Platform detection (server + client via User-Agent) |
| `src/lib/native/phoneAuth.ts` | Phone OTP flow (detailed error messages, timeout tracking) |
| `src/lib/native/googleAuth.ts` | Native Google sign-in (system account picker) |
| `src/lib/native/iap.ts` | RevenueCat integration (iOS only, App Store IAP) |
| `src/lib/native/push.ts` | Push notifications (FCM + APNs, token management) |
| `mobile/shell/offline.html` | Offline fallback (STATIC ONLY — no plugin calls) |
| `scripts/prepare-shell.mjs` | Updates offline page URL to match CAP_SERVER_URL |
| `.github/workflows/android-*.yml` | CI/CD for Android builds (signing + upload) |
| `.github/workflows/ios-release.yml` | CI/CD for iOS builds (archive + upload) |

### Store Compliance (Do Not Regress)

**iOS App Store:**
- **3.1.1**: Razorpay must NOT appear (checked server-side via `isIosApp()`)
- **4.8**: Sign in with Apple required if Google sign-in exists
- **5.1.1(v)**: Account deletion must be in-app with 7-day grace period

**Android Google Play:**
- Data deletion policy: Same as iOS account deletion
- No blocking payment methods
- Permissions aligned with features

### Firebase Configuration

**Phone OTP + Google sign-in** use Firebase Authentication. Both require:

1. **SHA-1 and SHA-256 fingerprints** registered in Firebase Console
   ```bash
   # Extract from debug APK:
   apksigner verify --print-certs app-debug.apk | grep -E "SHA-1|SHA-256"
   
   # Copy both to Firebase Console > Authentication > Settings > Android
   ```

2. **google-services.json** (Android)
   - Downloaded from Firebase Console
   - Not in git (contains keys)
   - For CI builds: Supply as environment variable

3. **GoogleService-Info.plist** (iOS)
   - Downloaded from Firebase Console
   - Checked into `mobile/ios/App/App/`
   - Must match the Firebase project from web app

**Test Numbers** (Firebase Console):
- Can register phone numbers for OTP testing without real SMS
- Useful for QA before production

### iOS-Specific Gotchas

- **Signing certificates expire** — must be renewed in Apple Developer Portal and added to Xcode
- **Provisioning profiles expire** — need renewal too (affects both dev and production)
- **App Store review can take 24-48 hours** — test in TestFlight first
- **`APPLE_SECRET` expires every 6 months** — regenerate with `npm run apple:secret` proactively
- **Safe area insets** — `viewport-fit=cover` with `env(safe-area-inset-*)` (see globals.css)

### Android-Specific Gotchas

- **Emulator is slow** — consider physical device for testing
- **App signing key** — debug and release keys are separate; fingerprints differ
- **google-services.json** — must match the Firebase project or phone OTP will fail with DEVELOPER_ERROR
- **Keystore password** — if lost, app cannot be updated (must create new release under different package ID)
- **Gradle sync errors** — usually network issues; try invalidating cache in Android Studio

## Detailed Documentation

For complete technical details, setup instructions, and troubleshooting:
- **Technical Deep Dive:** See `docs/TECHNICAL-MOBILE-DOCUMENTATION.md`
- **Status Summary:** See `docs/MOBILE-STATUS-SUMMARY.md`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
