# Firebase Setup — Step by Step

Written for someone who has never used Firebase. Follow top to bottom.

**What Firebase does for AskChetna — only two things:**

1. **Sends the OTP SMS** for phone login and confirms the user typed the right
   code. Google sends the SMS, which is why you don't need TRAI/DLT registration
   for Indian numbers.
2. **Delivers push notifications** to Android and iOS.

It is **not** your login system. NextAuth still owns sessions and your Postgres
database still owns users. Firebase hands us a signed "this person owns
+91XXXXXXXXXX" token, our server verifies it, and then our own session begins.

**Cost:** phone auth is free up to 10,000 verifications/month; push is unlimited
and free. You will not be asked for a card for either.

---

## Part 1 — Create the project (5 min)

1. Go to **https://console.firebase.google.com** and sign in with a Google
   account. Use one you'll keep — this becomes the owner.
2. Click **Create a project**.
3. Project name: `AskChetna`. Accept the auto-generated project ID.
4. **Google Analytics: turn it OFF.** You already have your own analytics, and it
   adds consent obligations you don't need.
5. Click **Create project**, wait, then **Continue**.

You land on the Project Overview page. Keep this tab open.

---

## Part 2 — Turn on Phone sign-in (2 min)

1. Left sidebar → **Build** → **Authentication** → **Get started**
2. **Sign-in method** tab → in the provider list click **Phone**
3. Toggle **Enable** → **Save**

### Add a test number (do this — it saves real SMS during testing)

Still under Phone provider:

1. Expand **Phone numbers for testing**
2. Add your own number in full international format, e.g. `+919876543210`
3. Give it a fixed code, e.g. `123456`
4. **Save**

That number now logs in with `123456` and **no SMS is ever sent**. Real numbers
still get real SMS. Use this while testing so you don't burn your quota or wait
for texts.

---

## Part 3 — Register the Android app (5 min)

1. Project Overview → click the **Android** icon (the little robot)
2. **Android package name** — must match exactly:
   ```
   com.askchetnam.app
   ```
3. App nickname: `AskChetna Android` (cosmetic)
4. **Debug signing certificate SHA-1** — leave blank for now, we come back to it
   in Part 4
5. **Register app**
6. **Download `google-services.json`** — this is the important file. Save it
   somewhere you can find it.
7. Click through **Next → Next → Continue to console** (ignore all the code
   instructions; Capacitor handles that)

---

## Part 4 — The SHA-1 fingerprint (the step everyone gets stuck on)

Android phone auth **will not work** without this. Firebase needs to know your
app's signing fingerprint, or it rejects verification requests.

Your APK is built in GitHub Actions with the standard Android **debug** key, so
you need that key's SHA-1. You don't have Java locally, so get it from CI:

1. GitHub → **Actions** → **Android Debug APK** → **Run workflow**
2. When it finishes, open the run and expand the step
   **Print debug signing fingerprints** (it sits *after* Build debug APK — the
   debug keystore doesn't exist until the first build creates it)
3. Inside the collapsible group *"Debug keystore fingerprints"* you'll see:
   ```
   SHA1: A1:B2:C3:D4:E5:F6:...
   SHA256: 11:22:33:44:55:66:...
   ```
   Copy the whole colon-separated **SHA1** value.

**Keep the SHA256 too** — you'll need it for `public/.well-known/assetlinks.json`
when you set up Android deep links.

> Every debug APK from this workflow uses the same Android debug key, so these
> fingerprints are stable across runs. You only need them once.

Then in Firebase:

1. **⚙️ Project settings** (gear icon, top of the left sidebar)
2. Scroll to **Your apps** → your Android app
3. **Add fingerprint** → paste the SHA-1 → **Save**

**Note:** the debug key differs from your release key. When you later build a
release APK/AAB, add that fingerprint too — including the **Play App Signing**
SHA-1 from the Play Console, or phone login breaks for users who install from
Play but worked fine in your testing.

---

## Part 5 — Register the iOS app (3 min)

Skip if you're only doing Android for now.

1. Project settings → **Your apps** → **Add app** → **iOS**
2. **Bundle ID**:
   ```
   com.askchetnam.app
   ```
3. **Register app** → **Download `GoogleService-Info.plist`** → save it
4. **Continue to console**

### Upload the APNs key (required, and easy to miss)

Without this, iOS gets **no push** *and* **phone OTP silently degrades**, because
iOS verification works by sending a silent push to prove the app is genuine.

1. Go to **https://developer.apple.com/account/resources/authkeys/list**
2. **＋** → name it `AskChetna Push` → tick **Apple Push Notifications service
   (APNs)** → Continue → Register
3. **Download** the `.p8` file — **Apple lets you download it once, ever.** Store
   it safely.
4. Note the **Key ID** shown on that page, and your **Team ID** (top right of the
   Apple developer portal)
5. Back in Firebase: **Project settings** → **Cloud Messaging** tab → under
   **Apple app configuration** → **APNs Authentication Key** → **Upload**
6. Upload the `.p8`, enter the Key ID and Team ID → **Upload**

---

## Part 6 — The service account key (for our server)

This lets our Vercel backend verify OTP tokens and send push.

1. **Project settings** → **Service accounts** tab
2. **Generate new private key** → **Generate key**
3. A JSON file downloads. **This is a secret** — it grants full admin access to
   your Firebase project. Never commit it.

### Convert it to base64

The JSON contains a multi-line private key that gets mangled if pasted into a
dashboard field directly, so we base64 it first.

In PowerShell, from wherever the file downloaded:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$HOME\Downloads\askchetna-firebase-adminsdk-XXXXX.json")) | Set-Clipboard
```

That copies one long single-line string to your clipboard.

---

## Part 7 — Put the values where they belong

### Vercel (for the server side)

Vercel → your project → **Settings** → **Environment Variables**. Add:

| Name | Value | Environments |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | the base64 string from Part 6 | Production, Preview, Development |

Then **redeploy** — env vars only apply to new deployments. Push any commit, or
use Deployments → ⋯ → Redeploy.

### GitHub (for the Android build)

GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New
repository secret**:

| Name | Value |
|---|---|
| `GOOGLE_SERVICES_JSON` | the **entire contents** of `google-services.json` — open it in Notepad, select all, copy |

For iOS later, add `GOOGLE_SERVICE_INFO_PLIST` the same way with the contents of
`GoogleService-Info.plist`.

> Why secrets rather than committing the files: `google-services.json` isn't
> especially sensitive, but the workflow writes it at build time so the repo has a
> single source of truth and you can rotate it without a commit.

---

## Part 8 — Verify it works

1. Re-run **Actions → Android Debug APK**. The log should now say
   *"google-services.json written — phone OTP and push will work"* instead of the
   warning.
2. Install the new APK.
3. Open the app → **Sign In** → **Continue with Phone**
4. Enter your **test number** from Part 2 → you should reach the code screen
   without any SMS
5. Enter the test code `123456` → you should land signed in

Then try a real number to confirm SMS delivery.

### If it fails

| Symptom | Cause |
|---|---|
| "Phone sign-in is temporarily unavailable" | `FIREBASE_SERVICE_ACCOUNT_BASE64` missing on Vercel, or you didn't redeploy |
| Error immediately on tapping Send Code | SHA-1 not added (Part 4), or the wrong one |
| Code screen appears but no SMS arrives | Real number with quota/carrier issue — use the test number to isolate |
| "That code isn't correct" for a definitely-correct code | Server clock/token freshness — tell me, our server rejects OTPs older than 5 minutes |

Turn on notifications afterwards in the app under **Account → Notifications**,
then send yourself one from the admin API to confirm push.

---

## What you'll have collected

Keep these somewhere safe — you'll need them again for the release build:

- `google-services.json` (Android)
- `GoogleService-Info.plist` (iOS)
- The service-account JSON, and its base64 form
- The APNs `.p8`, plus its Key ID and your Team ID
- Debug SHA-1, and later the release + Play App Signing SHA-1s

## What Firebase is NOT doing

Worth being clear, so you don't go looking in the wrong place:

- Not storing your users — that's Postgres via Prisma
- Not managing sessions — that's NextAuth
- Not hosting anything — that's Vercel
- Not your analytics — you have your own

If you ever remove phone login and push, Firebase can be deleted entirely with no
other effect on the app.
