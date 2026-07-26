# AskChetna Mobile App — Technical Documentation

**Last Updated:** July 26, 2026  
**Version:** 1.0  
**Platforms:** iOS (14+) | Android (8.0+)  
**Status:** Production Ready (with pending enhancements)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Development Environment Setup](#development-environment-setup)
4. [Build Process](#build-process)
5. [Native Plugin Integration](#native-plugin-integration)
6. [Authentication Flows](#authentication-flows)
7. [Payment Integration](#payment-integration)
8. [Push Notifications](#push-notifications)
9. [Deployment & Store Submission](#deployment--store-submission)
10. [Troubleshooting Guide](#troubleshooting-guide)
11. [Known Issues & Workarounds](#known-issues--workarounds)
12. [Pending Implementation](#pending-implementation)

---

## Architecture Overview

### Design Philosophy

The AskChetna mobile apps are **Capacitor shells** that load the same Next.js web app from `https://askchetna.com`. This architecture provides:

- **No app bundle duplication**: Updates deploy instantly via web deployment (Vercel)
- **Native capability on demand**: Plugins add device features (camera, biometrics, IAP) as needed
- **Single codebase**: Server-rendered HTML and client logic are identical between web and app
- **Platform detection at runtime**: User-Agent parsing ensures server and client agree on platform

**Key consequence:** Rebuilt only for native config changes, plugin upgrades, icon updates, or store resubmission. Web content updates reach users immediately.

### High-Level Data Flow

```
User Device
    ↓
WebView (iOS: WKWebView | Android: Android WebView)
    ↓
JavaScript Bridge (Capacitor)
    ↓
Native Plugins (Firebase Auth, RevenueCat, Push, etc.)
    ↓
API Server (Next.js route handlers)
    ↓
Database (Postgres via Prisma)
```

---

## Technology Stack

### Frontend (Shared Web + Native)

| Component | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Next.js App Router | 16.1.0 | Full-stack, server components |
| React | React + React DOM | 19.2.3 | UI library |
| Styling | CSS Modules + `globals.css` | N/A | NO Tailwind; dark theme default |
| Icons | lucide-react | 0.562.0 | Icon system |
| Animation | framer-motion | 12.23.26 | UI animations |
| Ephemeris | swisseph-wasm | 0.0.2 | Vedic astrology calculations (WASM) |

### Mobile (Native Layer)

| Component | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Capacitor | 8.4.2 | WebView bridge to native |
| iOS | Swift + Xcode | Latest | Native iOS app shell |
| Android | Kotlin + Gradle | 8.13.0 | Native Android app shell |
| Build Tool | Xcode / Android Studio | Latest | IDE and build orchestration |

### Authentication & Security

| Component | Technology | Version | Purpose |
|---|---|---|---|
| Session Auth | NextAuth.js | 5.0.0-beta.30 | Server-side session management (JWT) |
| Identity Broker | Firebase Authentication | 12.16.0 | OTP + Google sign-in flows |
| Firebase Admin | firebase-admin | 14.2.0 | Server-side token verification |
| Crypto | bcryptjs | 3.0.3 | Password hashing |

### Database & Data Layer

| Component | Technology | Version | Purpose |
|---|---|---|---|
| Database | Postgres | Latest (Supabase) | Primary data store |
| ORM | Prisma | 5.22.0 | Type-safe database client |
| Adapter | @auth/prisma-adapter | 2.11.1 | NextAuth ↔ Prisma bridge |

### Payments & Monetization

| Component | Technology | Version | Purpose |
|---|---|---|---|
| Android Pay | Razorpay | 2.9.6 | Payment gateway (India) |
| iOS IAP | RevenueCat | 13.2.4 | App Store subscriptions & credits |
| Sign in with Apple | NextAuth + jwt | 5.0.0-beta.30 | Apple authentication |

### Native Plugins (Capacitor)

| Plugin | Version | Purpose | Platforms |
|---|---|---|---|
| @capacitor-firebase/authentication | 8.3.0 | Phone OTP + Google native sign-in | iOS, Android |
| @capacitor/push-notifications | 8.1.2 | FCM (Android) + APNs (iOS) | iOS, Android |
| @revenuecat/purchases-capacitor | 13.2.4 | In-app purchases (App Store) | iOS only |
| @capacitor/app | 8.1.1 | App lifecycle, info, deep links | iOS, Android |
| @capacitor/share | 8.0.1 | Native share sheet | iOS, Android |
| @capacitor/browser | 8.0.4 | External URL handling | iOS, Android |
| @capacitor/filesystem | 8.1.2 | File I/O (offline storage) | iOS, Android |
| @capacitor/network | 8.0.1 | Network status | iOS, Android |
| @capacitor/device | 8.0.3 | Device info (for push metadata) | iOS, Android |
| @capacitor/haptics | 8.0.2 | Haptic feedback | iOS, Android |
| @capacitor/splash-screen | 8.0.2 | Splash screen control | iOS, Android |
| @capacitor/status-bar | 8.0.3 | Status bar styling | iOS, Android |

---

## Development Environment Setup

### Prerequisites

**macOS (for iOS) or Windows/Linux (for Android only)**

```bash
# Global dependencies
node --version          # >= 18.x
npm --version           # >= 9.x
xcode-select --install  # macOS only: Xcode Command Line Tools
java -version           # Android: Java 11+

# Android only
android-sdk             # via Android Studio or homebrew
gradle --version        # >= 8.0
```

### Initial Setup

```bash
# Clone and install
git clone https://github.com/askchetna/askchetna.git
cd askchetna
npm install

# Configure environment
cp .env.local.example .env.local  # Populate with local secrets
# Required: DATABASE_URL, NEXT_PUBLIC_*_KEY, APPLE_SECRET, etc.

# Generate Prisma client
npm run prisma:generate

# Verify web app works first
npm run dev
# Navigate to http://localhost:3000
```

### For iOS Development (macOS Only)

```bash
# Install iOS dependencies
npm install -g @capacitor/cli
npm run cap:sync              # Syncs mobile/ config into Xcode project

# Open Xcode
open mobile/ios/App/App.xcodeproj

# From Xcode:
# - Select "App" target (top-left)
# - Select your connected device or simulator
# - Press Cmd+R to build and run
```

**Simulator:**
```bash
xcrun simctl list devices  # List available simulators
xcrun simctl boot <UDID>   # Boot a simulator (if not auto-started by Xcode)
```

### For Android Development (Windows/Linux/macOS)

```bash
# Install Android dependencies via Android Studio
# 1. Download Android Studio
# 2. Install SDK: API 33+ (target), API 28+ (minimum)
# 3. Set $ANDROID_SDK_ROOT environment variable

# Install emulator or connect physical device
adb devices -l  # List connected devices/emulators

# Sync and build
npm run cap:sync
npx cap run android   # Runs on first device in adb

# From Android Studio:
# File > Open > mobile/android
# Wait for Gradle sync
# Run > Run 'app'
```

**Device Debugging:**
```bash
adb logcat | grep "askchetnam\|Capacitor\|Firebase"  # Real-time logs
adb shell input keyevent 66                          # Send Home key
adb install -r app-debug.apk                         # Manual APK install
```

### Environment Variables

Create `.env.local`:

```bash
# Database (Supabase pooler — port 6543 required!)
DATABASE_URL="postgresql://postgres.XXX:password@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.XXX:password@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"

# Firebase Console (phone OTP, Google sign-in)
NEXT_PUBLIC_FIREBASE_PROJECT_ID="askchetna-prod"
NEXT_PUBLIC_FIREBASE_CONFIG="..."  # JSON string from Firebase Console

# Apple Sign-in (6-month expiry — regenerate with: npm run apple:secret)
APPLE_SECRET="..."
APPLE_TEAM_ID="..."
APPLE_KEY_ID="..."

# RevenueCat (iOS IAP)
NEXT_PUBLIC_REVENUECAT_IOS_KEY="appl_..."
REVENUECAT_API_KEY="cr_..."

# Razorpay (Android payments)
NEXT_PUBLIC_RAZORPAY_KEY_ID="razorpay_..."
RAZORPAY_KEY_SECRET="..."

# NextAuth
NEXTAUTH_SECRET="random-string-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"  # Change to https://askchetna.com on production

# For preview builds (testing before production)
# See .env.preview
```

---

## Build Process

### Web Build (Vercel Auto-Deploy)

```bash
npm run build  # Generates .next/ and Prisma client
# Automatically deploys from 'preview' branch to vercel.askchetna.com
```

### Android Build

#### Debug APK (Development)

```bash
cd mobile/android
./gradlew assembleDebug

# Outputs to: app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/debug/app-debug.apk

# Or via Capacitor:
npx cap run android
```

#### Release APK (Store Submission)

**Prerequisites:**

1. **Keystore file** (`release.jks` — created once, stored securely):
```bash
keytool -genkey -v -keystore release.jks -keyalg RSA -keysize 2048 -validity 10000 \
  -alias askchetna-prod -storepass <PASSWORD> -keypass <PASSWORD>
```

2. **Environment variables:**
```bash
export ASKCHETNA_KEYSTORE_PATH="/path/to/release.jks"
export ASKCHETNA_KEYSTORE_PASSWORD="keystore_password"
export ASKCHETNA_KEY_ALIAS="askchetna-prod"
export ASKCHETNA_KEY_PASSWORD="key_password"
```

**Build:**

```bash
cd mobile/android
./gradlew bundleRelease  # Creates AAB (Android App Bundle)

# Outputs to: app/build/outputs/bundle/release/app-release.aab
# Upload to Google Play Console
```

**Signing verification:**

```bash
# Extract SHA-1 and SHA-256 fingerprints
cd mobile/android/app/build/outputs/bundle/release
apksigner verify --print-certs app-release.aab | grep -E "SHA-1|SHA-256"

# These MUST match Firebase Console for phone OTP to work
```

### iOS Build

#### Debug Build (Development)

```bash
# From Xcode: Product > Build For > Running
# Or via CLI:
xcodebuild -scheme App -configuration Debug -destination 'generic/platform=iOS'
```

#### Release Build (App Store)

**Prerequisites:**

1. **Apple Developer account** (paid)
2. **Signing certificate** and **provisioning profile** (from Apple Developer Portal)
3. **App ID** (com.askchetnam.app)

**Build & Archive:**

```bash
# Create an archive
xcodebuild -scheme App -archivePath ./App.xcarchive \
  -configuration Release archive

# Export for App Store
xcodebuild -exportArchive -archivePath ./App.xcarchive \
  -exportOptionsPlist exportOptions.plist \
  -exportPath ./build

# Outputs IPA file for upload
```

**Upload to App Store:**

```bash
# Using Xcode Organizer (GUI)
# Or via Transporter (CLI)
xcrun altool --upload-app --file App.ipa --type ios \
  --apiKey <KEY_ID> --apiIssuer <ISSUER_ID>
```

---

## Native Plugin Integration

### Platform Detection (`src/lib/platform.ts`)

The app injects a User-Agent token at Capacitor config time:

```typescript
// capacitor.config.ts
android: {
  appendUserAgent: 'AskChetnaApp/1 (android)',
},
ios: {
  appendUserAgent: 'AskChetnaApp/1 (ios)',
},
```

This allows **server and client to agree** on platform without hydration mismatch:

```typescript
// src/lib/platform.ts
export async function getAppPlatform(): Promise<AppPlatform> {
  const { headers } = await import('next/headers');
  const headerList = await headers();
  return parseAppPlatform(headerList.get('user-agent'));
}

// Hide Razorpay on iOS (App Store guideline 3.1.1)
export async function isIosApp(): Promise<boolean> {
  return (await getAppPlatform()) === 'ios';
}
```

**Client-side equivalent** (safe to call during render):

```typescript
export function getClientAppPlatform(): AppPlatform {
  if (typeof navigator === 'undefined') return 'web';
  return parseAppPlatform(navigator.userAgent);
}
```

### Firebase Authentication Plugin

**Configuration:**
```typescript
// capacitor.config.ts
plugins: {
  FirebaseAuthentication: {
    skipNativeAuth: false,
    providers: ['phone', 'google.com'],
  },
}
```

**Phone OTP Flow** (`src/lib/native/phoneAuth.ts`):

1. **startPhoneVerification(phoneNumber)** → SMS sent or auto-verified (Android)
   - Loads Firebase plugin from injected bridge (not JS chunk)
   - Registers verification listeners BEFORE sending request
   - 50-second timeout with stage tracking (not generic "timed out")

2. **confirmCode(verificationId, code)** → Firebase ID token
   - User enters SMS code
   - Token verified server-side at `/api/auth/phone/check`
   - Token is ephemeral; never persisted client-side

3. **Session Exchange** → NextAuth session
   - Firebase token → `/api/auth/callback/phone-otp`
   - Server verifies, creates NextAuth JWT
   - **Firebase session released** (Firebase is identity broker only)

**Error Handling:**
- Detailed, user-friendly error messages (not raw Firebase codes)
- Maps `operation-not-allowed`, `invalid-phone-number`, `recaptcha-failed`, etc.
- Recommends actions (e.g., "register test number in Firebase")

**Google Sign-in** (`src/lib/native/googleAuth.ts`):

1. Clear Firebase session (force fresh auth_time)
2. Call `FirebaseAuthentication.signInWithGoogle()`
3. Account picker: native system UI (no WebView)
4. Exchange token for NextAuth session
5. Release Firebase session

**Why native?** Google's `disallowed_useragent` policy blocks OAuth in WebViews to prevent phishing. Native SDK bypasses this by using system browser + session cookie.

---

## Authentication Flows

### Phone OTP (All Platforms, Primary in Apps)

```
User enters phone number
            ↓
startPhoneVerification("+919876543210")
            ↓
Firebase sends SMS (or auto-verifies Android)
            ↓
confirmCode(verificationId, userEnteredCode)
            ↓
Firebase ID token (fresh, ephemeral)
            ↓
POST /api/auth/phone/check { token: "..." }
            ↓
Server verifies with Firebase Admin SDK
            ↓
signIn('phone-otp', { phone, token })
            ↓
NextAuth mints JWT session cookie
            ↓
releaseFirebaseSession() — logout from Firebase
```

**Server Verification** (`src/lib/firebaseAdmin.ts`):

```typescript
const decoded = await firebaseAdmin.auth().verifyIdToken(token);

// Checks:
// 1. Token valid and signed by Firebase
// 2. auth_time ≤ 5 minutes old (MAX_AUTH_AGE_SECONDS = 300)
// 3. Payload contains 'phone_number' claim
```

**Why verify auth_time?**
- Prevents token replay if a failed attempt gets retried later
- Firebase can return existing sessions; this forces fresh auth

### Google Sign-in (All Platforms, Apps Only)

```
signInWithGoogleNative()
            ↓
[Clear Firebase session]
            ↓
Call native SDK
            ↓
System account picker (not WebView)
            ↓
User taps account
            ↓
Firebase ID token (fresh, ephemeral)
            ↓
signIn('google-native', { token })
            ↓
Server looks up or creates user by email
            ↓
NextAuth JWT session
            ↓
releaseGoogleFirebaseSession()
```

**Web Fallback:**
```typescript
// Web uses standard OAuth redirect (WebView-safe)
signIn('google')  // Redirects to /api/auth/signin/google
// vs.
signInWithGoogleNative()  // Native SDK only
```

### Sign in with Apple (iOS Only, Required by App Store)

```
User taps "Sign in with Apple"
            ↓
NextAuth calls Apple OAuth endpoint
            ↓
Apple returns identity token + user info
            ↓
signIn('apple', { token, email, name })
            ↓
Server verifies token with Apple's keys
            ↓
Account created or merged (by email)
            ↓
NextAuth JWT session
```

**Token Verification:**
- Apple's public keys fetched from `https://appleid.apple.com/auth/keys`
- Token verified using RS256 (asymmetric)
- `APPLE_SECRET` (generated via `npm run apple:secret`) allows ID verification
- **6-month expiry**: Regenerate regularly

---

## Payment Integration

### Android (Razorpay)

**Visible only on Android** (checked server-side via `isIosApp()`):

```typescript
// src/app/(app)/pricing/page.tsx
const iosApp = await isIosApp();

if (iosApp) {
  // Show RevenueCat IAP
} else {
  // Show Razorpay
}
```

**Flow:**

1. **Create payment order** → `/api/payment/razorpay/order`
   - Returns `orderId`, `amount`, `currency`
   - Stored in database (linked to user + credit pack)

2. **Present Razorpay checkout**
   - Webview opens payment gateway
   - User enters card/UPI details

3. **Webhook verification** → `/api/payment/razorpay-webhook`
   - Razorpay POSTs payment status
   - Signature verified with `RAZORPAY_KEY_SECRET`
   - Credits granted on SUCCESS

4. **Client polls** → `/api/payment/razorpay/status/{orderId}`
   - Confirms credits arrived
   - Redirects to success page

### iOS (RevenueCat + App Store IAP)

**App Store requirement:** All digital content (credits) must use IAP (guideline 3.1.1).

**RevenueCat Bridge** (`src/lib/native/iap.ts`):

1. **configureIap(userId)**
   - Called after sign-in
   - RevenueCat tracks user by `appUserID` (must match!)
   - Returns false on error (non-blocking)

2. **getIapProducts(productIds)**
   - Fetches App Store prices + metadata
   - Prices displayed exactly as App Store reports (required by review)

3. **purchaseIapProduct(productId)**
   - Opens native purchase sheet
   - Returns `{ status: 'purchased', productId }`
   - ⚠️ Does NOT grant credits yet (StoreKit took payment only)

4. **Webhook** → `/api/payment/iap/revenuecat-webhook`
   - RevenueCat verifies purchase with App Store
   - RevenueCat POSTs to your server
   - Credits granted here (not on client)

5. **restoreIapPurchases()**
   - User taps "Restore" in settings
   - Re-syncs entitlements with App Store
   - Recovers purchases if webhook was delayed

**Why this complexity?**
- Client-side "purchase success" is forgeable
- Only App Store + RevenueCat can prove a payment occurred
- Webhook verification uses RevenueCat's JWT signature

**Configuration:**
```
.env.local / .env.preview / .env.prod:
  NEXT_PUBLIC_REVENUECAT_IOS_KEY="appl_..."
  REVENUECAT_API_KEY="cr_..."          # Webhook verification
```

---

## Push Notifications

### Architecture

**FCM** (Android) + **APNs** (iOS)

- Registration is **not automatic** (Apple HIG 5.1.1 — permission prompt must have context)
- Toggled explicitly in account settings
- Token re-synced on every app load (FCM rotates tokens)

### Implementation

**Enable flow** (`src/lib/native/push.ts`):

```typescript
await enablePushNotifications()  // Asks permission
// ↓
PushNotifications.register()     // Gets token from FCM/APNs
// ↓
registerToken(token)             // POST /api/notifications/register-token
// ↓
Server stores {token, platform, userId, deviceModel}
```

**On load** (app shell):

```typescript
syncExistingRegistration()  // Re-register if already granted
attachPushListeners((path) => router.push(path))
```

### Android Notifications

**Channel setup:**
```typescript
await PushNotifications.createChannel({
  id: 'askchetna-default',
  name: 'AskChetna',
  importance: 4,    // Shows heads-up banner
  visibility: 1,    // Visible on lock screen
  lightColor: '#D4AF37',
  vibration: true,
})
```

**Payload format:**
```json
{
  "notification": {
    "title": "Your insights are ready",
    "body": "Check your latest timing"
  },
  "data": {
    "path": "/dashboard",
    "alert": "true"
  },
  "android": {
    "channelId": "askchetna-default"
  }
}
```

### iOS Notifications

**Configuration:**
```typescript
// capacitor.config.ts
PushNotifications: {
  presentationOptions: ['badge', 'sound', 'alert'],
}
```

**Behavior:**
- Foreground: Shows banner + sound
- Background: Posted to notification center

**Payload format:**
```json
{
  "aps": {
    "alert": {
      "title": "Your insights are ready",
      "body": "Check your latest timing"
    },
    "sound": "default",
    "badge": 1
  },
  "data": {
    "path": "/dashboard"
  }
}
```

### Deep Linking from Notifications

```typescript
attachPushListeners(async (path) => {
  // Called when user taps notification
  router.push(path)  // e.g., /dashboard, /readings/12345
})
```

---

## Deployment & Store Submission

### Android (Google Play)

**Prerequisites:**
- Signed AAB (Android App Bundle)
- App Store Listing (title, description, screenshots, privacy policy)
- Content rating questionnaire
- Firebase configuration (google-services.json with SHA-1 + SHA-256)

**Process:**

1. **Build Release Bundle:**
```bash
cd mobile/android
./gradlew bundleRelease  # Creates app-release.aab
```

2. **Verify Signatures:**
```bash
apksigner verify --print-certs app/build/outputs/bundle/release/app-release.aab
# Compare SHA-1 and SHA-256 with Firebase Console
```

3. **Upload to Google Play Console:**
   - Create release → Upload AAB
   - Set version code (increment each release)
   - Add release notes
   - Submit for review (24-48 hours)

4. **Post-Launch Issues:**
   - Monitor crashes (Crashlytics)
   - Test on preview version before rolling out
   - Can update via managed rollout (10% → 25% → 100%)

### iOS (App Store)

**Prerequisites:**
- Signed IPA (iOS App Archive)
- App Store Listing (similar to Play)
- Privacy Policy (required)
- Screenshots (at least one per supported device size)
- Sign in with Apple (required if Google sign-in exists)
- IDFA declaration (if using analytics)

**Process:**

1. **Archive & Export:**
```bash
xcodebuild -scheme App -archivePath App.xcarchive -configuration Release archive
xcodebuild -exportArchive -archivePath App.xcarchive -exportOptionsPlist exportOptions.plist -exportPath ./build
# Generates App.ipa
```

2. **Upload via App Store Connect:**
   - Open Xcode Organizer → Distribute App
   - Select "App Store Connect"
   - Choose signing certificate and provisioning profile
   - Select "Upload"
   - Wait for processing (~10-30 min)

3. **App Store Connect:**
   - Add version to TestFlight (QA)
   - Submit to App Review
   - Review turnaround: 24-48 hours

4. **Review Guidelines:**
   - **3.1.1**: IAP required for digital content (credits) — Razorpay must NOT appear
   - **4.8**: If Google sign-in exists, Sign in with Apple required
   - **5.1.1(v)**: Account deletion must stay in-app

**Post-Approval:**
- Phased rollout (5% → 10% → 25% → 100%)
- TestFlight for internal testing
- Beta testing via TestFlight link

---

## Troubleshooting Guide

### "Proxy file must export a function named 'proxy'" (500 on every route)

**Cause:** Node-only library imported in `src/auth.ts` (Firebase Admin, etc.) is bundled into `src/proxy.ts`, which runs on Edge runtime.

**Fix:**
```typescript
// ❌ WRONG: breaks proxy
import * as admin from 'firebase-admin';

// ✅ CORRECT: dynamic import only where needed
const { initializeApp } = await import('firebase-admin/app');
```

---

### Phone OTP Timeout: "timed out while: loading the Firebase plugin"

**Cause:** `await import('@capacitor-firebase/authentication')` hangs indefinitely on slow networks.

**Fix:** Already implemented (v0.1+):
- Prefers Capacitor's injected proxy (no network required)
- Falls back to dynamic import with 8-second timeout
- Timeout names the exact stuck stage (loading, signing out, sending, etc.)

---

### Phone OTP: DEVELOPER_ERROR or SHA fingerprint mismatch

**Cause:** Build's SHA-1 or SHA-256 doesn't match Firebase Console.

**Fix:**
```bash
# Extract signing fingerprint from APK
apksigner verify --print-certs app-debug.apk | grep -E "SHA-1|SHA-256"

# Copy both to Firebase Console > Authentication > Settings > Android > SHA fingerprints
# If building in CI, this MUST be done before the APK is signed
```

---

### Google Sign-in: "10: DEVELOPER_ERROR"

**Cause:** Same as above — SHA-1 fingerprint mismatch.

**Fix:** See phone OTP above.

---

### Razorpay Not Appearing on iOS

**Cause:** Correctly hidden by server-side check.

**Verify:**
```typescript
// /pricing route should see isIosApp() === true
const iosApp = await isIosApp();
// Razorpay rendered only if iosApp === false
```

---

### RevenueCat: "Webhook could not attribute payment"

**Cause:** User not configured in RevenueCat before purchase.

**Flow:**
1. User signs in
2. **configureIap(userId)** called — sets `appUserID`
3. User makes purchase
4. Webhook uses `appUserID` to credit account

**Fix:** Ensure `configureIap()` is called AFTER successful sign-in, not before.

---

### Push Notifications Not Received (Android)

**Cause #1: Missing Channel**
```typescript
// MUST create channel before registering
await PushNotifications.createChannel({ id: 'askchetna-default', ... })
await PushNotifications.register()
```

**Cause #2: Missing google-services.json**
- Build includes `google-services.json` (from Firebase Console)
- File NOT in git (contains keys)
- CI must supply it as environment variable

**Cause #3: Permissions**
- Android 13+: App must request `POST_NOTIFICATIONS` permission
- Already handled in capacitor.config.ts (requestPermissions)

---

### Push Notifications Not Received (iOS)

**Cause #1: APNs Certificate Expired**
- Must be renewed in Apple Developer Portal
- Needs re-downloading and installation in Firebase

**Cause #2: Missing aps-environment**
- Provisioning profile must include APNs capability
- Check Xcode > Signing & Capabilities

**Cause #3: App in Background**
- iOS batches background notifications (user won't see every one)
- Foreground: Always shown (banner + sound)

---

### App Crashes After Database Migration

**Symptom:** "The column X does not exist" or "?error=Configuration"

**Cause:** Migration applied to production DB but not to preview DB (or vice versa).

```bash
# Check status on ALL environments
npm run migrate:status        # .env.local
npm run migrate:status:preview # .env.preview
npm run migrate:status:prod   # .env.prod

# They should all match before deploying
```

**Fix:**
```bash
# Apply pending migrations
npm run migrate:preview
npm run migrate:prod

# Then redeploy web app
```

---

## Known Issues & Workarounds

### Issue #1: Firebase Session Timeout on Retry

**Symptom:** Phone OTP works the first time, but retry always fails with same error.

**Root Cause:** Firebase caches the failed session. On retry, `signInWithPhoneNumber()` returns instantly without re-authenticating, and the cached token's `auth_time` is stale (fails server check).

**Status:** ✅ **FIXED** in commit 177fb6d
- Now clears Firebase session before each verify attempt (unless `resend: true`)
- Guarantees fresh `auth_time` on every attempt

---

### Issue #2: Phone OTP Plugin Load Hangs on Slow Networks

**Symptom:** "Sending code…" spinner never updates; takes >60 seconds or times out.

**Root Cause:** `await import('@capacitor-firebase/authentication')` fetches JS chunk over network. Slow network or fetch failure left the UI hanging forever.

**Status:** ✅ **FIXED** in commits 622be88 + de29d01
- Now prefers Capacitor's injected proxy (no network needed)
- Falls back with 8-second timeout (not infinite)
- Reports exact stuck stage (loading, signing out, sending, waiting for Google)

---

### Issue #3: Mixed Content Warnings on Android

**Symptom:** WebView refuses to load non-HTTPS resources.

**Status:** ✅ **FIXED** in capacitor.config.ts
```typescript
server: {
  androidScheme: 'https',
  cleartext: false,  // No plaintext HTTP
}
```

---

### Issue #4: Supabase Free Tier Auto-Pauses

**Symptom:** After ~7 days idle: `ENOTFOUND` or `FATAL: max clients reached`.

**Status:** ⚠️ **KNOWN** (not a code issue — infrastructure)

**Workaround:** Keep project active (makes a test query weekly) or upgrade to paid tier.

---

### Issue #5: iOS Status Bar White on Notch Devices

**Symptom:** Status bar icons (clock, signal) are white but background is light.

**Status:** ✅ **FIXED** via CSS
```css
.native-app[data-app-platform="ios"] {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: env(safe-area-inset-top);
  background: #0B0F2F;
  z-index: 9999;
}
```

Capacitor config:
```typescript
ios: {
  contentInset: 'never',  // Don't double-inset
}
```

---

## Pending Implementation

### High Priority (Store Compliance)

- [ ] **Account deletion affordance** (App Store 5.1.1(v), Google Play data policy)
  - Already in code (PendingDeletionGate)
  - Needs 7-day grace period + final deletion endpoint
  - Impact: Blocking iOS submission

- [ ] **Offline error page enhancement**
  - Current: Static HTML with "Try Again" button
  - Pending: Add instructions (check WiFi, airplane mode)
  - Status: Non-blocking but improves UX

### Medium Priority (Feature Completeness)

- [ ] **Deep linking (Android)**
  - Assetlinks.json exists and served with correct MIME type
  - Testing needed: Verify links open app (not browser)
  - Impact: Moderately important for user retention

- [ ] **Deep linking (iOS)**
  - Apple app-site-association exists
  - Testing needed: Verify universal links work
  - Impact: Same as Android

- [ ] **Biometric authentication**
  - Framework: @capacitor-community/biometric
  - Not yet integrated
  - Optional: Adds security for existing sessions

- [ ] **Camera plugin**
  - Dependency available (@capacitor/camera)
  - Use case: Profile photo upload (future feature)
  - Not blocking current release

- [ ] **Offline support (Service Worker)**
  - Web app has service worker
  - Currently: Only static offline.html in mobile/shell
  - Future: Cache navigation and API responses

### Low Priority (Polish)

- [ ] **App shortcuts** (Android long-press)
  - E.g., "Quick Reading" opens reading creation
  - Dependency: @capacitor/app (shortcuts plugin)

- [ ] **Share sheet integration**
  - Currently: External share button (Razorpay, insights)
  - Enhancement: Use native @capacitor/share

- [ ] **Background tasks**
  - E.g., periodic sync of new messages
  - Dependency: @capacitor-community/background-tasks

### Known Technical Debt

- [ ] **Firebase plugin version update**
  - Current: 8.3.0
  - Check for breaking changes in 9.x

- [ ] **NextAuth upgrade**
  - Current: 5.0.0-beta.30 (beta)
  - Plan: Move to stable v5 LTS

- [ ] **Prisma migration review**
  - Baseline migrations documented but manual
  - Consider: Auto-check for unapplied migrations on startup

---

## Reference Materials

### Key Files

| File | Purpose |
|---|---|
| `capacitor.config.ts` | Capacitor platform config, plugin setup |
| `src/lib/platform.ts` | Platform detection (server + client) |
| `src/lib/native/phoneAuth.ts` | Phone OTP flow + error handling |
| `src/lib/native/googleAuth.ts` | Native Google sign-in |
| `src/lib/native/iap.ts` | RevenueCat integration |
| `src/lib/native/push.ts` | Push notification setup |
| `mobile/shell/offline.html` | Offline fallback (no plugin calls) |
| `scripts/prepare-shell.mjs` | Deploy-target sync script |
| `scripts/build-app-assets.mjs` | Icon/splash asset generator |
| `.github/workflows/android-*.yml` | CI/CD for Android builds |
| `.github/workflows/ios-release.yml` | CI/CD for iOS builds |

### External Documentation

- **Capacitor:** https://capacitorjs.com/docs
- **Firebase Authentication:** https://firebase.google.com/docs/auth
- **RevenueCat:** https://www.revenuecat.com/docs
- **Razorpay:** https://razorpay.com/docs
- **Next.js:** https://nextjs.org/docs
- **NextAuth.js:** https://authjs.dev
- **Xcode:** https://developer.apple.com/xcode
- **Android Studio:** https://developer.android.com/studio

### Contact & Escalation

- **iOS Issues:** Apple Developer Support + RevenueCat support
- **Android Issues:** Google Play Console support + Firebase support
- **Payment Issues:** Razorpay + RevenueCat technical teams
- **Authentication:** Firebase support
- **Deployment:** Vercel support

---

**Document Revision History:**

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-07-26 | Initial comprehensive documentation |

