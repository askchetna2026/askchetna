# AskChetna Mobile Apps

Native iOS and Android apps built with **Capacitor 8**, wrapping the live site at
`https://askchetna.com`.

```
mobile/
├── android/          Android Studio / Gradle project
├── ios/              Xcode project (pods installed by CI on macOS)
├── shell/            Local fallback bundle — offline.html only, NOT the web app
└── assets/
    ├── src/*.svg     Editable brand sources
    └── *.png         Generated inputs for @capacitor/assets
```

`capacitor.config.ts` lives at the **repo root**, not here, and points `android`/
`ios` into this directory. The Capacitor npm packages are in the root
`package.json` on purpose: the JS half of every plugin is imported by the Next app
while the native half is synced into these projects, so a second `package.json`
would eventually drift out of version lockstep and cause native/JS mismatches.

---

## The update workflow (the important part)

`server.url` points the WebView at the live site, so most changes need **no app
release at all**.

### Ships instantly — just `git push` to `preview`

Vercel deploys, and every installed app picks it up on next launch.

- Pages, components, styling, copy
- New features and whole new screens
- API routes and business logic
- Pricing rows, credit costs, service costs (all database-driven)
- Blog posts, legal pages
- Bug fixes in anything under `src/`

### Needs a rebuild and store resubmission

- Adding, removing or upgrading a Capacitor plugin
- Changing anything in `capacitor.config.ts`
- New native permissions (`AndroidManifest.xml`, `Info.plist`)
- App icon or splash screen changes
- App name or bundle id
- Version bumps for a store release

> Rule of thumb: if the change is inside `src/` or `public/`, it ships over the
> air. If it touches `mobile/`, `capacitor.config.ts`, or `package.json`
> dependencies, it needs a rebuild.

---

## First-time setup

### 1. Firebase (phone OTP + push)

Phone verification and push both run through one Firebase project.

1. Create a Firebase project; enable **Authentication → Phone**.
2. Add an **Android app** with package `com.askchetnam.app`. Download
   `google-services.json` → `mobile/android/app/`.
   - Add your SHA-1 **and** SHA-256 debug and release fingerprints, or Android
     phone auth fails with a "app not authorized" style error.
3. Add an **iOS app** with bundle id `com.askchetnam.app`. Download
   `GoogleService-Info.plist` → `mobile/ios/App/App/`.
4. Upload your **APNs auth key** (`.p8`) under Project Settings → Cloud Messaging.
   Without this, iOS gets no push *and* phone OTP silently degrades, because iOS
   verification works by sending a silent push.
5. Create a service account key and set `FIREBASE_SERVICE_ACCOUNT_BASE64` in
   Vercel (base64 of the whole JSON — the private key is multi-line PEM and gets
   mangled if pasted raw).

### 2. RevenueCat (Apple IAP — iOS only)

Apple requires In-App Purchase for credits (guideline 3.1.1), so iOS cannot use
Razorpay.

1. Create App Store Connect **consumable** products, one per credit pack.
2. Set `PricingPlan.appleProductId` for each pack (editable from the pricing
   admin). Packs without one are simply not offered on iOS.
3. In RevenueCat: add the iOS app, import the products, and set the webhook to
   `https://askchetna.com/api/payment/iap/revenuecat-webhook` with an
   `Authorization` value matching `REVENUECAT_WEBHOOK_SECRET`.
4. Set `NEXT_PUBLIC_REVENUECAT_IOS_KEY` in Vercel.

### 3. Sign in with Apple

Required because the app also offers Google sign-in (guideline 4.8).

1. Create a **Services ID** (e.g. `com.askchetnam.app.signin`) and a Sign in with
   Apple key; download the `.p8`.
2. Generate the client secret:
   ```bash
   APPLE_TEAM_ID=XXXXXXXXXX APPLE_KEY_ID=YYYYYYYYYY \
   APPLE_SERVICES_ID=com.askchetnam.app.signin \
   APPLE_P8_PATH=./AuthKey_YYYYYYYYYY.p8 \
   npm run apple:secret
   ```
3. Set `APPLE_ID` and `APPLE_SECRET` in Vercel.

⚠️ **`APPLE_SECRET` expires within 6 months and fails silently.** `src/auth.ts`
warns in the logs from 30 days out. Put a calendar reminder on it.

### 4. Deep links

Fill in the placeholders, then deploy — both files are served from the site.

- `public/.well-known/apple-app-site-association` → replace `TEAMID`
- `public/.well-known/assetlinks.json` → replace both SHA-256 fingerprints with
  your **upload key** and your **Play App Signing** key. Using only the first is
  a common cause of Android deep links silently not working.

### 5. Environment variables

| Variable | Purpose |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | Verify phone tokens, send push |
| `REVENUECAT_WEBHOOK_SECRET` | Authenticate the IAP webhook |
| `NEXT_PUBLIC_REVENUECAT_IOS_KEY` | RevenueCat SDK in the iOS app |
| `APPLE_ID` / `APPLE_SECRET` | Sign in with Apple |
| `CRON_SECRET` | Authenticate the account-purge cron |

---

## Building

### Assets

```bash
npm run assets        # render SVGs -> PNGs, then generate all native densities
```

Only edit `mobile/assets/src/*.svg`; everything else is generated.

> `capacitor-assets` must be run with `--ios --android` (as the npm script does).
> Its PWA mode rewrites `public/manifest.webmanifest` with broken relative paths
> and marks the full-bleed icon `maskable`, and it deletes existing icons from
> `public/icons/`. The web manifest is maintained by hand.

### Android

CI is the easy path — **Actions → Android Release → Run workflow** produces:

- `askchetna-release-aab` → upload to Play Console
- `askchetna-release-apk` → **sideload this onto a device to test**

Locally (needs JDK 21 and the Android SDK):

```bash
npx cap sync android
cd mobile/android && ./gradlew assembleDebug
```

### iOS

**iOS cannot be built on Windows or Linux** — Xcode is macOS-only. Use
**Actions → iOS Release** to build and upload to TestFlight.

With a Mac:

```bash
npx cap sync ios
npx cap open ios     # then Product → Archive
```

### Debugging on a device

Remote WebView inspection is off by default, so a release build cannot be
inspected by anyone holding the device. To enable it for a test build:

```bash
CAP_DEBUG_WEBVIEW=1 npx cap sync
```

Then Safari → Develop (iOS) or `chrome://inspect` (Android).

---

## Testing checklist before submitting

Things that only break on a real device:

- [ ] Phone OTP — SMS auto-fill on Android, silent-push verification on iOS
- [ ] Push received in foreground, background, and killed states
- [ ] Notification tap opens the right screen
- [ ] Airplane mode on launch shows `mobile/shell/offline.html`
- [ ] Airplane mode mid-session shows the offline banner
- [ ] Android hardware back navigates, then exits at the root
- [ ] Safe areas correct on a notched device (header, FABs, drawers)
- [ ] External links open in the system browser, not the WebView
- [ ] Razorpay checkout works on Android
- [ ] **iOS: no Razorpay or "buy on our website" reference anywhere**
- [ ] iOS: IAP sandbox purchase grants credits; Restore Purchases works
- [ ] Account deletion completes, and signing back in shows only the cancel screen
- [ ] Sign in with Apple works on iOS

## Store listing assets

Generated icons and splash screens are handled by `npm run assets`. Still needed
by hand:

- **Play**: feature graphic 1024×500, plus phone screenshots (min 2)
- **App Store**: 6.7" and 5.5" iPhone screenshots
- Both: description, privacy policy URL (`/privacy`), support URL, category
- **App Privacy questionnaire** (Apple) and **Data Safety form** (Play) — declare
  account info, purchases, device identifiers for push, and user content
