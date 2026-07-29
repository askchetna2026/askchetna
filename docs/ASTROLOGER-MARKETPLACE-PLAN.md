# Astrologer Marketplace — Implementation Plan

**Drafted:** 2026-07-29 · against `preview` @ 2.1.10

Consultations with registered astrologers, metered against user credits, with
earnings tracked per astrologer and paid out on a schedule.

---

## 0. Two corrections before anything is designed

### Platform parity is already automatic — that is not what needs attention

> *"I expect it is implemented for all i.e. web, android app, ios app."*

It already is, by construction. `capacitor.config.ts` sets
`server.url = https://askchetna.com`, so both apps **load the web app**. There is
no separate Android or iOS implementation to keep in step — a Vercel deploy
reaches every installed app immediately, with no store resubmission.

What *can* diverge is only this, and it is a short list:

| Diverges | Why |
|---|---|
| Payment UI | Razorpay must not appear on iOS (guideline 3.1.1) |
| Native capabilities | mic, camera, push, haptics — behind `isNativeApp()` |
| Anything gated on `.native-app` | tab bar, drawer, safe areas |
| Store metadata | permissions, Data Safety, privacy labels |

So the risk is not "we forgot to build it for iOS". It is "we built it for web
and it needs a permission, a plist key, or a store declaration the apps do not
have yet". This plan flags those individually.

### RESOLVED — block-based sessions keep credits whole

The original draft of this plan flagged fractional credit consumption as the
largest blocker. The agreed session design removes it entirely: a session buys
one whole block, and continuing requires an explicit extension that buys another
whole block. Credits are never divided, so the existing pack model stands and no
migration is needed. The analysis below is kept because the `CreditPack` /
`CreditTransaction` duplication is still worth tidying, but it no longer blocks.

### The credit model cannot express *continuous* metering as it stands

Today credits are **pack-based and whole-numbered**:

```
balance = Σ (CreditPack.questionsTotal − CreditPack.questionsUsed)
```

Consumption increments `questionsUsed` by 1 — one credit, one question. There is
no way to represent "1.4 credits consumed", which is exactly what a 7-minute
chat is under the proposed 1 credit = 5 minutes rule.

There is also a second, parallel representation: `CreditTransaction` is a signed
ledger used for history, while `CreditPack` is the actual source of truth for
balance. Two representations that must agree, with nothing enforcing it.

**This has to be resolved before metering is built**, and it is the single
largest prerequisite in this plan. Options in §3.

---

## 1. Scope

**Phase 1** — astrologer registration and approval, text chat, credit metering,
earnings ledger, payout records, astrologer and admin history views.

**Phase 2** — audio calls (native apps only).

**Phase 3** — video calls (native apps only).

Web is chat-only throughout, by decision.

---

## 2. Domain model

New Prisma models. Names follow the existing convention.

```
Astrologer
  id, userId (unique, FK User)      one user = at most one astrologer profile
  displayName, bio, photoUrl
  languages[]        e.g. ["hi","en","bn"]
  specialities[]     e.g. ["career","relationships"]
  status             PENDING | APPROVED | SUSPENDED | REJECTED
  approvedAt, approvedBy
  ratePaisePerCredit Int            what WE pay them per credit served
  isAvailable        Boolean        manual online toggle
  lastSeenAt         DateTime       for a real presence signal

Consultation
  id
  userId, astrologerId
  kind               CHAT | AUDIO | VIDEO
  status             REQUESTED | ACTIVE | ENDED_BY_USER | ENDED_BY_ASTROLOGER
                     | ENDED_NO_CREDIT | ENDED_TIMEOUT | FAILED
  startedAt, endedAt
  billedSeconds      Int            server-measured, authoritative
  creditsCharged     Int            settled whole credits
  creditMilliCharged Int            precise consumption, see §3
  ratePaisePerCredit Int            snapshot at session start, never a live FK
  earningsPaise      Int            derived, snapshotted

ConsultationMessage        (chat transcript)
  id, consultationId, senderId, body, sentAt, readAt

AstrologerEarning          (append-only, one row per consultation)
  id, astrologerId, consultationId (unique)
  creditsServed, amountPaise
  payoutId?                null until included in a payout run
  createdAt

Payout
  id, astrologerId
  periodStart, periodEnd
  amountPaise, creditsServed
  status             PENDING | PROCESSING | PAID | FAILED
  reference          bank/Razorpay payout id
  paidAt, notes
```

**Why rates are snapshotted onto `Consultation`:** an astrologer's rate will
change. If earnings join live to `Astrologer.ratePaisePerCredit`, every
historical figure silently rewrites itself the moment a rate is edited, and past
payouts stop reconciling. Snapshot at session start.

**Why `AstrologerEarning` is separate from `Consultation`:** payouts need an
append-only ledger that can be summed and marked paid without touching session
records. It also gives a natural idempotency key — one earning row per
consultation, enforced by a unique constraint.

---

## 3. Credit metering — the hard part

### 3.1 The unit problem

| Option | Trade-off |
|---|---|
| **A. Credit-milliunits** — store balance ×1000 internally, display whole | Precise, no rounding drift, one migration. Touches every existing read. |
| **B. Session-seconds ledger** — meter seconds, settle whole credits at end | Leaves existing credit code untouched. Needs a hold/reserve so a user cannot start a session with 0 credits. |
| **C. Keep whole credits, charge per started block** | Simplest. User pays 1 credit the moment a 5-minute block starts, even at 10 seconds. Predictable, and arguably fairer to astrologers, but feels punitive. |

**Recommendation: B, with C's block rule as the billing policy.** Meter precisely
in seconds server-side, but bill in whole credits per *started* block, disclosed
up front ("1 credit = 5 minutes; part blocks are charged in full"). That avoids
migrating the entire credit system while keeping the maths honest and the UI
truthful.

### 3.2 Rates and revenue split — admin-configurable, no deploy

All of these live in the existing `ServiceCost` table and are editable **only by
admin**. None may be hardcoded.

```
CHAT_SECONDS_PER_CREDIT    300    1 credit = 5 minutes
AUDIO_SECONDS_PER_CREDIT   120    1 credit = 2 minutes
VIDEO_SECONDS_PER_CREDIT   120    Phase 3, revisit
EXTEND_PROMPT_AT_SECONDS    60    offer the extension with 1 minute left
ASTROLOGER_REVENUE_PCT      30    astrologer's share; AskChetna keeps 70
```

`ASTROLOGER_REVENUE_PCT` is the default. An individual astrologer may carry an
override on their record, so tiers can be paid differently without changing the
global figure.

### 3.3 Session lifecycle — block-based with explicit extension

```
1  PRE-FLIGHT   balance >= 1 credit, astrologer APPROVED and available
2  CHARGE       deduct 1 credit, open a block of N seconds
3  ACTIVE       visible countdown, server holds authoritative deadline
4  OFFER        at 60s remaining: if balance >= 1, offer "extend +5 min"
                  accepted  -> deduct 1 credit, extend deadline by N seconds
                  declined  -> countdown continues to zero
                  no balance -> tell them, with a link to top up
5  TERMINATE    at deadline with no extension, the SERVER closes the session
6  SETTLE       write AstrologerEarning for every block charged
```

**Charge on block entry, not on completion.** A user who closes the app 10
seconds in has still occupied the astrologer's slot. This is also what keeps
credits whole and avoids refund arithmetic.

**The extension offer is a client prompt against a server decision.** The client
asks; the server verifies balance, deducts, and extends. A client cannot extend
itself.

**Server-authoritative, always.** Timing must never come from the client — not
because users are dishonest, but because clocks drift, apps background, and
networks stall. The server owns `startedAt`, the tick, and the decision to close.

**The tick must be idempotent.** Reconnects, duplicate deliveries and retries are
normal. Every tick carries a sequence number and settles against
`Consultation.billedSeconds`, never `+= elapsed`.

**Termination is a server action, not a client courtesy.** When credit runs out
the server revokes the transport token and closes the room. A client that
"forgets" to hang up must not be able to continue.

### 3.4 Failure modes that must be designed for, not discovered

- **App backgrounded mid-call** — grace window, then auto-end. Android and iOS
  both suspend timers.
- **Astrologer drops** — do not bill the user for the gap. Needs a
  both-parties-present check on the tick.
- **Double-spend** — same user starting two sessions at once. The credit hold
  must be transactional with row-level locking.
- **Clock skew between app and server** — only server time is ever used.
- **Refunds** — a session that failed in under N seconds should not bill. Decide
  the threshold up front and write it down.

---

## 4. Real-time transport

### 4.1 Chat (Phase 1, all platforms)

**Recommendation: Supabase Realtime.** Already a dependency
(`@supabase/supabase-js`), already the database, no new vendor, no extra cost at
this scale. Postgres row inserts broadcast to subscribers.

Alternative if it proves limiting: a managed service (Ably, Pusher). Not worth
adding a vendor before there is evidence.

### 4.2 Audio / video (Phases 2–3, native only)

WebRTC needs a provider for signalling, TURN relay, and — importantly — a
**server-side "kick participant" API**, without which §3.3's termination
requirement cannot be met.

| Provider | Notes |
|---|---|
| **100ms** | India-based, good India latency, Capacitor-friendly, per-minute pricing |
| **Agora** | Very widely used for exactly this in India, mature SDKs |
| **LiveKit** | Open source, self-hostable — cheapest at scale, most ops burden |
| **Twilio Video** | Being wound down; do not start here |

**Recommendation: evaluate 100ms and Agora on one criterion first —** can the
server forcibly remove a participant and invalidate their token mid-session? If
not, the product's core rule is unenforceable and the provider is unusable
regardless of price.

**Native-only is a real constraint, not a preference.** These SDKs ship as native
Capacitor plugins, which means audio and video **require an app store release**.
Unlike everything else in this codebase, they are not deployable from Vercel.
Plan the release cadence accordingly.

---

## 5. Money

### 5.1 What users pay

Consultations spend already-purchased credits, so no new payment surface is
introduced and the existing 3.1.1 separation holds.

**Do not** let astrologers set prices users pay directly in rupees — that turns a
credit spend into a marketplace transaction and reopens the IAP question on iOS.

#### iOS — In-App Purchase only. Apple Pay is not an option.

These are different mechanisms and are often conflated:

| | What it is | Applies to |
|---|---|---|
| **Apple Pay** | a payment method, like a saved card | *physical* goods and real-world services |
| **In-App Purchase** | Apple's billing for digital content | anything consumed inside the app |

Credits are digital content consumed in-app, so **IAP via StoreKit is mandatory**
and Apple Pay would be rejected under 3.1.1. Already implemented through
RevenueCat — there is no second option to add, and that is the correct end state
rather than a gap.

#### Android — Play Billing alongside Razorpay, via User Choice Billing

Google Play also requires Play Billing for digital goods, so **Razorpay alone on
Android carries policy risk today.**

India is a specific case: following the CCI rulings, Google operates a **User
Choice Billing** programme permitting an alternative processor *alongside* Play
Billing at a reduced service fee. That makes "Razorpay and Google Play" the right
target — but it requires enrolment in the programme, not merely adding a second
button in the UI. **Verify the current programme terms and fee before building.**

### 5.2 What astrologers earn

`ratePaisePerCredit` per astrologer, so different tiers can be paid differently
for the same credit spend. Earnings accrue per consultation into
`AstrologerEarning`.

### 5.3 Payouts

- A scheduled job groups unpaid `AstrologerEarning` rows into a `Payout` per
  astrologer per period (weekly or fortnightly, configurable).
- Payout runs must be **idempotent** — re-running must never double-pay. The
  `payoutId` foreign key on the earning row is the guard.
- Disbursement via **RazorpayX Payouts**, or manual bank transfer with the
  reference recorded, in Phase 1.

**Not covered here, and needs proper advice:** Indian tax handling — TDS on
professional fees, GST registration thresholds, and whether astrologers are
contractors or a marketplace supply. I am not able to advise on this and it
should not be guessed at. It affects the data model (you may need PAN, GSTIN,
bank details on `Astrologer`), so get the answer before the migration, not after.

### 5.4 History views

- **Astrologer**: sessions served, credits served, earned, paid, outstanding.
- **Admin**: the same across all astrologers, plus payout runs and per-session
  drill-down.

Both read from `AstrologerEarning` + `Payout`, never recomputed from
consultations — recomputation drifts the moment a rate changes.

---

## 6. Platform and compliance work

Items the web build does **not** give you for free.

| Item | Platform | Note |
|---|---|---|
| `Permissions-Policy` header | **all** | **Blocks audio today.** `vercel.json` sends `microphone=()`, which disables the mic for every surface including the webview. Phase 2 cannot work until this becomes `microphone=(self)`. Camera is already `camera=(self)` |
| `NSMicrophoneUsageDescription` | iOS | **Missing.** `Info.plist` currently has only `NSPhotoLibraryAddUsageDescription` |
| `NSCameraUsageDescription` | iOS | **Missing.** Needed for Phase 3 |
| `RECORD_AUDIO`, `CAMERA` | Android | Runtime permissions + rationale UI |
| Play **Data Safety** update | Android | Must declare audio/video collection |
| Apple **privacy labels** | iOS | Same |
| Background audio mode | iOS | If calls survive backgrounding |
| CallKit / ConnectionService | both | Only if you want OS-level call UI — significant work |
| Astrologer verification | both | Stores scrutinise consultation marketplaces |
| Reporting and blocking | both | **Required.** Any app with user-to-user communication needs a report path and a moderation response |
| Updated privacy policy | all | Consultations, retention, whether transcripts are stored |

**The moderation requirement is not optional.** Both stores reject apps with
one-to-one communication and no way to report abuse.

---

## 7. Phasing

**Phase 0 — foundations (no user-visible change)**
Resolve the credit-unit question (§3.1). Add the models. Reconcile
`CreditPack` vs `CreditTransaction` so balance has one source of truth.

**Phase 1 — chat**
Astrologer registration + admin approval. Astrologer directory and profiles.
Availability toggle. Chat over Supabase Realtime. Metering, hold/settle,
server-side termination. Earnings ledger. Astrologer and admin history. Payout
run + manual disbursement. Report/block.

*Ships to all three platforms from one Vercel deploy.*

**Phase 2 — audio (native only)**
Provider selection on the kick-participant criterion. Permissions, plist keys,
store declarations. App release required.

**Phase 3 — video (native only)**
Camera permission, bandwidth handling, and a decision on video pricing.

**Designing now so Phase 3 is not a rewrite:** `Consultation.kind` carries the
mode from day one, rates live in `ServiceCost`, and the metering loop is written
against seconds rather than anything chat-specific. Adding a mode should be a
row in a config table and a transport adapter, not a new billing path.

---

## 8. WhatsApp

Three separate questions, with three different answers.

### 8.1 As the consultation channel — no

Do not run metered consultations over WhatsApp. You cannot measure session time
reliably, you cannot force-terminate a conversation when credit runs out, and
Meta's terms do not contemplate metered paid sessions brokered this way. The
core product rule becomes unenforceable.

### 8.2 For notifications — yes, and worth it

This is the strong use case, especially in India: session requests, "your
astrologer is ready", credit-low warnings, payout confirmations.

Needs a Meta Business account, a WhatsApp Business Account, and **pre-approved
message templates** — you cannot send free-form text outside a 24-hour customer
service window. Via Meta Cloud API directly, or an Indian reseller (MSG91,
Gupshup, Interakt) which is usually simpler for GST invoicing.

### 8.3 For login OTP — possible, but it is a build

Firebase Phone Auth is **SMS-only**; there is no WhatsApp channel. Your
`phone-otp` provider currently accepts a **Firebase ID token** and verifies the
signature server-side. WhatsApp means owning the whole lifecycle: generate,
hash, store, expire, verify, and issue the session yourself.

The comment already in `src/auth.ts` says it plainly: *"Brute force isn't
feasible against a signed token."* That stops being true with self-issued
6-digit codes — one million combinations — so you would need per-number rate
limiting, attempt lockout and enumeration protection that Firebase currently
provides for free.

**Recommendation:** enable Blaze to unblock SMS now; revisit WhatsApp OTP later
as a cost optimisation, not as a fix.

---

## 9. Open decisions

1. **Credit unit** (§3.1) — blocks everything else.
2. **Part-block billing** — charge full blocks, or pro-rate?
3. **Transcripts** — stored or ephemeral? Changes privacy policy and retention.
4. **Astrologer tax status** (§5.3) — changes the schema.
5. **Payout cadence** — weekly or fortnightly, and the minimum threshold.
6. **Free first session?** — affects fraud surface materially.
7. **Ratings and reviews** — in Phase 1 or later?
8. **Concurrency** — may an astrologer take two chats at once? Audio, clearly no.
