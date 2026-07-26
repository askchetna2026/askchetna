# AskChetna Mobile Apps — Status Summary

**Last Updated:** July 26, 2026  
**Overall Status:** Production Ready (Core Features) / Pending Enhancements (Polish & Compliance)

---

## Executive Summary

The AskChetna mobile apps (iOS + Android) are **live in production** with core authentication, payment, and push notification features fully functional. The architecture is optimized for rapid deployment (web changes update over-the-air without app rebuild). 

**Current Deployment:** 
- Production apps load from https://www.askchetna.com
- Preview builds load from https://preview.askchetna.com (via `CAP_SERVER_URL`)
- Both auto-update as web content deploys

**Next Steps:**
1. Finalize account deletion flow (blocking iOS re-submission)
2. Complete deep linking verification (Android + iOS)
3. Add optional enhancements (biometric auth, offline mode)

---

## ✅ Implemented Features

### Authentication & Authorization

| Feature | Status | Details |
|---|---|---|
| **Phone OTP Sign-in** | ✅ Production | SMS verification via Firebase (iOS + Android) |
| **Google Sign-in (Native)** | ✅ Production | System account picker, no WebView (iOS + Android) |
| **Sign in with Apple** | ✅ Production | Required for iOS (App Store guideline 4.8) |
| **Email/Password Sign-in** | ✅ Production | Web only (via NextAuth, no native UI needed) |
| **Session Management** | ✅ Production | JWT-based NextAuth, secure cookies |
| **User Profile Management** | ✅ Production | Edit name, email, phone in account settings |
| **Account Logout** | ✅ Production | Clears NextAuth session + Firebase session |

### Payments & Monetization

| Feature | Status | Platform | Details |
|---|---|---|---|
| **Razorpay Payments** | ✅ Production | Android only | Credit pack purchases via Indian gateway |
| **Apple In-App Purchase** | ✅ Production | iOS only | RevenueCat integration for credit packs |
| **Free Reading Limit** | ✅ Production | All | 3 free readings/month per user |
| **Credit System** | ✅ Production | All | Pay-per-reading or credit pack |
| **Purchase History** | ✅ Production | All | View past transactions in account |
| **Payment Webhooks** | ✅ Production | All | Razorpay + RevenueCat verified webhooks |
| **Restore Purchases** | ✅ Production | iOS | Users can re-sync App Store purchases |

**Payment Platform Branching:**
```
if (iOS) → RevenueCat IAP (App Store)
else → Razorpay (web + Android)
```

### Push Notifications

| Feature | Status | Platform | Details |
|---|---|---|---|
| **Permission Management** | ✅ Production | iOS + Android | Explicit opt-in in account settings |
| **Token Registration** | ✅ Production | iOS + Android | FCM (Android) + APNs (iOS) |
| **Foreground Display** | ✅ Production | iOS + Android | Banner + sound while app is active |
| **Background Delivery** | ✅ Production | iOS + Android | Notification center storage |
| **Deep Link Handling** | ✅ Production | iOS + Android | Tap notification → navigate to page |
| **Token Refresh** | ✅ Production | iOS + Android | Re-syncs on app load (FCM rotates tokens) |
| **Channel Management** | ✅ Production | Android | Custom notification channel (heads-up banner) |

### Native Capabilities

| Feature | Status | Platform | Details |
|---|---|---|---|
| **App Lifecycle** | ✅ Production | iOS + Android | App resume, pause, terminate hooks |
| **Device Info** | ✅ Production | iOS + Android | Device model, OS version, app version |
| **Network Status** | ✅ Production | iOS + Android | Online/offline detection |
| **Haptics** | ✅ Production | iOS + Android | Vibration feedback (paid action confirmation) |
| **Share Sheet** | ⚠️ Partial | iOS + Android | External links work; internal share not implemented |
| **Splash Screen** | ✅ Production | iOS + Android | 2-second branding splash with auto-hide |
| **Status Bar** | ✅ Production | iOS + Android | Dark theme with safe-area support |

### Platform Optimization

| Feature | Status | Details |
|---|---|---|
| **Server-Side Platform Detection** | ✅ Production | User-Agent parsing (no hydration mismatch) |
| **Client-Side Platform Detection** | ✅ Production | Same parsing logic on client |
| **Safe Area Support** | ✅ Production | Notch/Dynamic Island safe-area insets |
| **Dark Theme Default** | ✅ Production | Apps launch in dark mode (matches web) |
| **Responsive UI** | ✅ Production | Layouts adapt to mobile viewports |

### Store Compliance

| Requirement | Status | Details |
|---|---|---|
| **App Store Guideline 3.1.1** | ✅ Complete | Razorpay hidden on iOS; IAP-only for credits |
| **App Store Guideline 4.8** | ✅ Complete | Sign in with Apple available alongside Google |
| **App Store Guideline 5.1.1(v)** | ⚠️ Partial | Account deletion logic exists; needs final UX |
| **Google Play Data Deletion Policy** | ⚠️ Partial | Same as above |
| **Privacy Policy** | ✅ Complete | Published and linked in app settings |
| **Age-Appropriate Content** | ✅ Complete | No adult/gambling content |

---

## ⚠️ Partially Implemented Features

### Account Deletion (High Priority - Blocking iOS)

**Status:** Logic implemented; final UX pending

**Current State:**
- Deletion initiates via account settings
- 7-day grace period (PendingDeletionGate)
- User cannot sign in during grace period
- Final deletion via API endpoint exists

**Pending:**
- [ ] Grace period countdown UI (e.g., "Your account will be permanently deleted in 5 days")
- [ ] Cancellation affordance during grace period
- [ ] Confirmation email with grace period reminder
- [ ] Final deletion confirmation page
- [ ] Post-deletion message (e.g., "Your data has been removed")

**Why it matters:**
- App Store 5.1.1(v) requires in-app deletion (not email form)
- Google Play data deletion policy requires same
- **Blocking:** Cannot re-submit iOS until this is complete

**Implementation effort:** ~2-3 hours

---

### Deep Linking (Medium Priority)

#### Android Deep Links

**Status:** Configuration complete; testing pending

**Implemented:**
- `assetlinks.json` generated and served at `/.well-known/assetlinks.json`
- Correct MIME type set (application/json)
- Fingerprints match release signing certificate

**Pending:**
- [ ] Manual testing: Share link → tap → opens in app (not browser)
- [ ] Verify on multiple Android versions (8.0, 10, 12, 13, 14)
- [ ] Test on physical devices + emulator

**Expected behavior:**
```
https://askchetna.com/readings/123
  → tap in SMS/email/browser
  → Opens in app to /readings/123
  → If not installed: Opens in browser
```

#### iOS Universal Links

**Status:** Configuration complete; testing pending

**Implemented:**
- `apple-app-site-association` generated and served at `/.well-known/apple-app-site-association`
- Correct MIME type set (application/json)
- App ID and team ID registered

**Pending:**
- [ ] Manual testing: Similar to Android
- [ ] Verify on iOS 14, 15, 16, 17+
- [ ] Test on simulator + physical device
- [ ] Verify does NOT open Safari (common issue)

---

### Offline Support (Low Priority)

**Status:** Partial (offline detection only)

**Implemented:**
- Network status detection (`@capacitor/network`)
- Graceful error handling for offline scenarios
- Static offline fallback page (`mobile/shell/offline.html`)

**Pending:**
- [ ] Service Worker caching (already exists in web; needs optimization for app)
- [ ] Offline reading list (cache recent readings)
- [ ] Offline message composition (queue until online)
- [ ] Sync on reconnect

---

## 🔄 Under Development / Planned

### Biometric Authentication

**Priority:** Medium  
**Complexity:** Low  
**Estimated Effort:** 4-6 hours

**Goal:** Fingerprint/Face ID for quick re-auth (optional, not required)

**Implementation:**
- Dependency: `@capacitor-community/biometric` or native plugin
- Use case: Lock screen (confirm with biometric to sign in)
- Fallback: Always allow password as fallback

**Status:**
- [ ] Design: Decide on UX (optional feature? settings toggle?)
- [ ] Implementation: Wrap biometric call
- [ ] Testing: Test on multiple devices (Face ID, Touch ID, Android biometric)
- [ ] Compliance: Ensure Secure Enclave/TEE usage (no jailbreak bypasses)

---

### Camera Integration

**Priority:** Low  
**Complexity:** Medium  
**Estimated Effort:** 6-8 hours (if photo upload needed)

**Goal:** Profile photo upload via camera or gallery

**Implementation:**
- Dependency: `@capacitor/camera`
- Workflow: User taps camera icon → chooses camera or gallery → crops image → uploads
- Server-side: Store in CDN (Supabase bucket or Vercel Blob)

**Status:**
- [ ] Design: Finalize photo UX
- [ ] Implementation: Camera + cropping library
- [ ] Server: Set up image storage
- [ ] Testing: Test on iOS + Android

---

### App Shortcuts (Android)

**Priority:** Low  
**Complexity:** Low  
**Estimated Effort:** 2-3 hours

**Goal:** Long-press app icon → "New Reading" / "View Profile" shortcuts

**Implementation:**
- Dependency: `@capacitor/app` (shortcuts plugin)
- Shortcuts: "Get Your Insights", "View Upcoming Events", "Account Settings"

**Status:**
- [ ] Define shortcuts
- [ ] Implement action handlers
- [ ] Test on Android 7+

---

### Enhanced Offline Mode

**Priority:** Low  
**Complexity:** High  
**Estimated Effort:** 16-20 hours

**Goal:** Read cached content when offline; queue actions for sync when online

**Implementation:**
- Service Worker caching strategy (already in place for web)
- IndexedDB for reading cache
- Request queue (SQLite or IndexedDB)
- Sync on reconnect

**Status:**
- [ ] Audit current service worker
- [ ] Expand caching rules for app
- [ ] Test offline workflows
- [ ] Measure cache size impact

---

## 📊 Feature Matrix

### By Platform

```
                  Web    Android  iOS
─────────────────────────────────────
Auth:
  Phone OTP       ✅     ✅      ✅
  Google          ✅     ✅      ✅
  Apple           ⚠️*    ⚠️*     ✅
  
Payments:
  Razorpay        ✅     ✅      ❌
  Apple IAP       ❌     ❌      ✅
  
Notifications:
  Push            ✅     ✅      ✅
  
Native:
  Biometric       ❌     ❌      ❌
  Camera          ❌     ❌      ❌
  Shortcuts       ❌     ❌      ❌

* Apple sign-in web available (OAuth redirect)
```

### By Completion Status

**✅ Production Ready:** 15 features
- Phone OTP, Google sign-in, Apple sign-in
- Razorpay, RevenueCat, webhooks
- Push notifications (FCM + APNs)
- Account management, logout, profiles
- Device info, network status, haptics
- Splash screen, status bar styling

**⚠️ Partial:** 4 features
- Account deletion (UX pending)
- Deep linking (testing pending)
- Offline support (caching pending)

**❌ Not Started:** 5 features
- Biometric auth
- Camera integration
- App shortcuts
- Enhanced offline mode
- Advanced push (local notifications)

---

## 🚀 Release Readiness

### Current State: **Ready for Production**

✅ Core features (auth, payments, push) fully implemented and tested  
✅ Compliant with store guidelines (with caveat below)  
✅ Zero critical bugs (as of 2026-07-26)  

### Blocking iOS Re-submission

❌ Account deletion UX (App Store 5.1.1(v) requirement)

**Timeline to unblock:** 2-3 hours of implementation

### Recommended Before Next Major Release

- [ ] Complete account deletion flow (HIGH)
- [ ] Test deep linking on real devices (MEDIUM)
- [ ] Migrate NextAuth to stable v5 (MEDIUM)
- [ ] Update Firebase plugin if v9 available (LOW)

---

## 📋 Testing Checklist

### Before Publishing Release

- [ ] **Phone OTP**
  - Sent SMS on first attempt
  - Code auto-filled on Android
  - Timeout error message names exact stage
  - Firebase session cleared after sign-in
  
- [ ] **Google Sign-in**
  - Native account picker opens
  - Returns to app (not browser)
  - Token verified and session created
  
- [ ] **Apple Sign-in**
  - iOS: Shows "Sign in with Apple" button
  - Web/Android: Button absent or disabled
  
- [ ] **Payments (Android)**
  - Razorpay checkout opens and accepts payment
  - Webhook credits account
  - Purchase history updated
  
- [ ] **Payments (iOS)**
  - RevenueCat IAP opens
  - App Store accepts payment
  - Credits awarded within 1 minute
  - Restore Purchases works
  
- [ ] **Push Notifications**
  - Token registered on permission grant
  - Notification received in foreground
  - Notification received in background
  - Tap notification → navigates to correct page
  
- [ ] **Offline**
  - Offline page shown when unreachable
  - "Try Again" button retries correctly
  
- [ ] **Platform Detection**
  - Razorpay hidden on iOS
  - Correct User-Agent in network inspector
  - No console errors about platform

---

## 📞 Support & Escalation

| Issue Type | Owner | Escalation |
|---|---|---|
| iOS app crash | App + Firebase | Apple crash report + Firebase Crashlytics |
| Android ANR | App + Firebase | Google Play Console crash report |
| Auth failure | Firebase | Firebase support + authentication logs |
| Payment webhook delayed | Razorpay / RevenueCat | Payment provider support |
| App Store rejection | Apple | App Store Connect review feedback |
| Google Play rejection | Google | Google Play Console review feedback |

---

## 🔐 Security & Compliance Notes

### Data Privacy

- ✅ GDPR/CCPA compliant account deletion (7-day grace period)
- ✅ No third-party analytics (only Vercel analytics, first-party)
- ✅ Encrypted database at rest (Supabase)
- ✅ HTTPS-only (no plaintext HTTP)

### Authentication Security

- ✅ JWT tokens expire (default 30 days)
- ✅ Refresh tokens rotated on use
- ✅ Firebase ID tokens verified server-side
- ✅ Phone OTP tokens expire in 5 minutes (MAX_AUTH_AGE_SECONDS)

### Payment Security

- ✅ Razorpay: Webhook signature verified (HMAC-SHA256)
- ✅ RevenueCat: Webhook JWT verified (RS256)
- ✅ IAP: Only granted server-side (not client-trusted)

---

## 📈 Metrics & Monitoring

### Current Monitoring

- Firebase Crashlytics (crash reporting)
- Vercel analytics (web performance)
- Google Play Console (Android installs, crashes, rating)
- App Store Connect (iOS installs, crashes, rating)

### Recommended Additions

- [ ] Push notification delivery rate (RevenueCat + FCM metrics)
- [ ] Payment completion rate (Razorpay + RevenueCat dashboards)
- [ ] App session length (Segment or Mixpanel)
- [ ] Native feature adoption (biometric, camera, etc. when added)

---

## Version History

| Version | Date | Key Changes |
|---|---|---|
| 1.0 | 2026-07-26 | Initial production release with phone OTP, payments, push |
| (Future) | TBD | Account deletion UX, deep linking verification |

---

**Document Status:** Ready for team review and stakeholder communication.

