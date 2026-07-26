# AskChetna — Skills, MCPs & Connectors Roadmap

**Document Version:** 1.0  
**Date:** July 26, 2026  
**Scope:** Claude integrations, external tools, and infrastructure for production + commercial scaling

---

## Executive Summary

Your AskChetna project has solid fundamentals (Next.js 16, Capacitor, Postgres, NextAuth). To scale to commercial production with confidence, add tools across 8 critical dimensions:

1. **Observability & Monitoring** (critical for production stability)
2. **Secrets & Security** (non-negotiable for PII, payments)
3. **Payment Processing & Subscriptions** (revenue stream)
4. **Testing & Quality** (mobile + backend automation)
5. **API Documentation & Developer Experience** (if you expand to platform/API)
6. **Localization** (expand to international markets)
7. **Design System & Component Library** (speed up UI development)
8. **Customer Support & Analytics** (understand your users)

**Estimated Total Implementation Timeline:** 8-16 weeks (can be parallelized)  
**Estimated Cost:** $500-$3,000/month (depends on traffic/scale; some tools have generous free tiers)

---

## 1. Critical: Observability & Monitoring

### Why Now?
You're about to go live. You need to see: crashes, performance degradation, database errors, payment failures. Without visibility, you'll find out issues via angry users, not logs.

### Recommended Stack

#### **A. Application Performance Monitoring (APM)**

##### 🥇 **Datadog** (Recommended if budget allows)
- **What it does:** Real-time monitoring, logs, APM, RUM, error tracking
- **Platforms:** Web + Mobile (iOS/Android)
- **Cost:** ~$32/month (basic) → $500+/month (production scale)
- **Why:** Industry standard, integrates with everything, strong mobile support
- **Setup effort:** 4 hours
- **Alternatives:** Dynatrace, New Relic, Sumo Logic

##### 🥈 **Sentry** (Best value for startups)
- **What it does:** Error tracking, performance monitoring, release tracking
- **Platforms:** Web + Mobile + Native
- **Cost:** FREE tier (7,500 events/month), $25/month (production)
- **Why:** Exceptional error context, great Slack integration, MCP available
- **Setup effort:** 2 hours
- **Firebase Crashlytics alternative:** You already use Firebase; Crashlytics is free but less detailed

#### **B. Log Aggregation**

##### **Axiom** or **Logz.io**
- Cost: $10-50/month
- Purpose: Centralize logs from Next.js, mobile crash reports, webhook logs
- Why: Critical for debugging production issues without SSH

#### **C. Real User Monitoring (RUM)**

##### **PostHog** (Combined Analytics + RUM + Feature Flags)
- **What it does:** Session replay, funnels, heatmaps, A/B testing, feature flags
- **Cost:** FREE tier (1M events/month), $450+/month (production)
- **Why:** Combines 3 tools in 1; strong open-source community
- **Setup effort:** 3 hours

---

### Implementation Plan

**Phase 1 (Week 1):**
- ✅ Install Sentry (free tier, immediate ROI)
- ✅ Add Firebase Crashlytics integration (you have it; configure it properly)
- ✅ Set up Vercel Analytics dashboard

**Phase 2 (Week 3-4):**
- ✅ Evaluate Datadog vs Sentry vs self-hosted stack
- ✅ Set up log aggregation (Axiom or Logz.io)
- ✅ Configure alerts (PagerDuty or Slack)

**Phase 3 (Month 2):**
- ✅ Implement RUM (PostHog or Datadog)
- ✅ Create runbooks for common alerts

---

## 2. Critical: Secrets & Security Management

### Why Now?
You have API keys (Firebase, Razorpay, RevenueCat, APPLE_SECRET, databases). `.env` files in Vercel are fragile. One developer's laptop gets compromised = all your secrets leak.

### Recommended Solutions

#### **A. Secrets Management (Primary)**

##### 🥇 **Doppler** (Recommended for startups)
- **What it does:** Centralized secrets, rotation, audit logs, team access control
- **Cost:** FREE tier (1 project, 50 secrets), $50+/month (production)
- **Why:** Best developer experience, Vercel integration native, instant secret rotation
- **Setup effort:** 2 hours
- **MCP:** Not yet, but Vercel integrates natively
- **Alternatives:** Infisical (open-source), HashiCorp Vault (enterprise), Akeyless

##### 🥈 **Infisical** (Open-source alternative)
- **Cost:** FREE (self-hosted) or $50+/month (managed)
- **Why:** If you want open-source + full control
- **Setup effort:** 4 hours (self-hosted) vs 1 hour (managed)

#### **B. API Key & Credential Scanning**

##### **TruffleHog** (Free, runs in CI)
- Scans repos for leaked secrets before commit
- GitHub Actions integration (free)
- Setup effort: 30 minutes

##### **GitGuardian** (GitHub-native)
- Scans every push for secrets
- FREE tier (1 repo), $10+/month (unlimited)
- Setup effort: 5 minutes

---

### Implementation Plan

**Week 1:**
- ✅ Set up Doppler, migrate all `.env` secrets from Vercel
- ✅ Enable secret rotation for API keys (30-day cycle)
- ✅ Add TruffleHog to GitHub Actions CI

**Week 2:**
- ✅ Audit all developers' local `.env.local` files
- ✅ Document secret rotation schedule

---

## 3. Critical: Payment & Subscription Management (For Commercial)

### Current State
You have:
- ✅ Razorpay (Android)
- ✅ RevenueCat (iOS)
- ❌ Subscription management (tied to RevenueCat + custom logic)
- ❌ Invoice generation
- ❌ Tax handling

### For Commercial Launch, Add:

#### **A. Billing & Subscription Platform**

##### 🥇 **Stripe Billing** (Recommended for global SaaS)
- **What it does:** Subscriptions, invoicing, taxes, dunning (retry failed payments)
- **Cost:** 2.9% + $0.30 per transaction
- **Why:** Handles Indian + global, integrates with payments you already use, webhook verification built-in
- **Setup effort:** 8 hours (first time), 2 hours (with docs)
- **Next.js SDK:** Yes (@stripe/react-stripe-js)
- **Database schema:** Add to Prisma

**Stripe vs Razorpay:**
- Razorpay: India-centric, lower fees (2%)
- Stripe: Global, enterprise features (tax, invoices), higher fees (2.9%)
- **Recommendation:** Use Stripe for subscriptions (handles renewal), Razorpay for one-time payments

##### 🥈 **Paddle** (PayPal-owned, simplest)
- **What it does:** Subscriptions + billing + global payments
- **Cost:** 5% + $0.50/transaction (or 2.5% if using their payments)
- **Why:** White-glove support, handles EU VAT/GST automatically
- **Setup effort:** 6 hours
- **Recommendation:** If you want single vendor for all payments

#### **B. Invoice Generation & Tax**

##### **Stripe Invoicing** (Built-in)
- Automatically generates invoices from subscriptions
- Handles GST India compliance (via Stripe Tax)
- No extra cost

##### **Alternative: Orion Billing** (Standalone)
- If you want invoices outside Stripe
- Cost: $20-50/month

---

### Implementation Plan (Month 2-3)

**Phase 1: Evaluate**
- [ ] Set up Stripe test environment
- [ ] Set up Paddle test environment
- [ ] Compare tax handling for India + US + EU customers
- [ ] Decide: Stripe vs Paddle vs hybrid (Razorpay + Stripe)

**Phase 2: Implement Stripe**
- [ ] Add Stripe Billing products (credit packs)
- [ ] Set up Stripe webhook at `/api/webhooks/stripe`
- [ ] Update Prisma schema (add `stripeCustomerId`, `stripeSubscriptionId`)
- [ ] Update pricing page (show Stripe checkout)
- [ ] Test payment flow end-to-end
- [ ] Add invoice emails via Resend

**Phase 3: Migrate Revenue**
- [ ] Keep Razorpay for existing Android customers
- [ ] Offer Stripe for new subscriptions
- [ ] Eventually consolidate to single platform

---

## 4. Testing & Quality Assurance

### Current State
- ❌ No automated mobile testing
- ❌ No E2E testing
- ✅ TypeScript (good foundation)
- ❌ No visual regression testing

### Add These:

#### **A. Mobile App Testing**

##### 🥇 **Detox** (React Native–inspired, works with Capacitor)
- **What it does:** Gray-box E2E testing for iOS + Android apps
- **Cost:** FREE (open-source)
- **Setup effort:** 8-12 hours (first test suite)
- **Why:** Runs against real APK/IPA, synchronizes with async operations
- **Example:** Test full phone OTP flow, payment checkout
- **GitHub Actions:** Native support

##### 🥈 **Appium** (Industry standard)
- **What it does:** WebDriver protocol for iOS + Android
- **Cost:** FREE
- **Setup effort:** 12-16 hours
- **Why:** More mature than Detox, larger community

##### **Firebase Test Lab** (Cloud-based device testing)
- **What it does:** Run tests on real devices in Google's cloud
- **Cost:** $0.05/device/hour
- **Why:** No need to own physical devices for CI
- **Setup:** 4 hours

#### **B. Web E2E Testing**

##### **Playwright** (Recommended)
- **What it does:** Browser automation, API testing, visual regression
- **Cost:** FREE (open-source)
- **Setup effort:** 6 hours (first suite)
- **Why:** Faster than Cypress, better API testing
- **MCP:** Playwright MCP available (you have it)

##### **Cypress** (Alternative, more visual)
- **What it does:** Browser automation with great debugging
- **Cost:** FREE open-source, $150+/month (Cypress Cloud)
- **Setup effort:** 4 hours
- **Why:** Excellent time-travel debugging

#### **C. Visual Regression Testing**

##### **Chromatic** (Storybook-integrated)
- **What it does:** Screenshot diff testing for UI changes
- **Cost:** FREE (5k snapshots/month), $500+/month (enterprise)
- **Why:** Catches unintended CSS changes
- **Setup effort:** 2 hours

##### **Percy** (or **Baseline**)
- **Cost:** $25-500/month
- **Why:** Integrates with CI/CD

#### **D. Performance Testing**

##### **Lighthouse CI** (FREE, built-in)
- Runs Lighthouse on every PR
- Fails if performance degrades
- Setup: 30 minutes

##### **Panto AI** (AI-native, mobile-focused)
- **What it does:** AI detects performance regressions in mobile apps
- **Cost:** $30-300/month
- **Why:** Purpose-built for mobile, AI-powered anomaly detection
- **Setup effort:** 3 hours

---

### Implementation Plan

**Month 1:**
- [ ] Add Playwright E2E tests for critical flows (sign-in, payment, push notifications)
- [ ] Integrate Lighthouse CI into GitHub Actions
- [ ] Set up Firebase Test Lab for Android
- [ ] Run tests on simulator/emulator for iOS

**Month 2:**
- [ ] Add Detox tests for native flows (phone OTP, biometric)
- [ ] Set up visual regression testing (Chromatic)
- [ ] Add performance budgets

**Month 3:**
- [ ] Expand E2E coverage to 80% of critical paths
- [ ] Set up daily performance monitoring

---

## 5. Design System & Component Library

### Current State
- ✅ CSS Modules + globals.css
- ❌ No component library (all bespoke)
- ❌ No Figma → code sync
- ❌ No design tokens

### Add These:

#### **A. Component Library (Code-First)**

##### **Storybook** (Documentation + development)
- **What it does:** Develop, test, document components in isolation
- **Cost:** FREE
- **Setup effort:** 6 hours
- **Why:** Speed up component iteration, catch accessibility issues early
- **Next.js support:** Full via Next.js integration

##### **Chromatic** (Optional, cloud version of Storybook)
- **Cost:** FREE-500/month
- **Why:** Host Storybook online, visual regression testing built-in

#### **B. Design-to-Code Sync**

##### 🥇 **Figma Code Connect** (MCP available)
- **What it does:** Link Figma components to your React components
- **Cost:** FREE
- **Setup effort:** 4 hours (first 10 components)
- **Why:** Designers see which components exist in code; prevents duplication
- **Status:** You have Figma MCP; leverage it for Code Connect

##### **Figma Tokens & Variables**
- Define design tokens in Figma
- Sync to CSS variables (token-transformer)
- Cost: Built into Figma
- Setup: 3 hours

#### **C. Design System Documentation**

##### **Zeroheight** or **Supernova**
- Auto-generate design system docs from Figma + code
- Cost: $200-1000/month
- Alternative: Use Storybook Docs (free)

---

### Implementation Plan

**Month 1:**
- [ ] Set up Storybook for all existing components
- [ ] Document current design tokens (colors, typography, spacing)
- [ ] Create Figma token system in Figma

**Month 2:**
- [ ] Add Code Connect for top 20 components
- [ ] Sync Figma tokens to CSS
- [ ] Document component API (props, usage)

**Month 3:**
- [ ] Scale Code Connect to all components
- [ ] Set up Chromatic for visual regression
- [ ] Create component contribution guide

---

## 6. Localization & Internationalization

### Current State
- ❌ English only
- ❌ No i18n infrastructure

### For Commercial/Expansion:

#### **A. i18n Framework (Code-Side)**

##### **i18next** (Most popular)
- **What it does:** Translation framework for Next.js
- **Cost:** FREE
- **Setup effort:** 4 hours
- **Ecosystem:** Hundreds of plugins, MCP servers available

##### **next-intl** (Next.js–optimized)
- **Cost:** FREE
- **Setup effort:** 3 hours
- **Why:** Built for Next.js 16 App Router

#### **B. Translation Management**

##### 🥇 **Locize** (i18next–integrated)
- **What it does:** Manage translations, crowdsource, version control
- **Cost:** FREE (1 project), $15+/month (production)
- **Why:** Official i18next provider, AI translation, MCP available
- **Setup effort:** 2 hours
- **MCP:** Official Locize MCP exists; you can manage translations from Claude

##### 🥈 **Crowdin** (Most popular globally)
- **What it does:** Translation workflow, OCR, QA checks
- **Cost:** $40+/month
- **Why:** 1000+ integrations, native GitHub sync
- **Setup effort:** 3 hours
- **Supports:** 500+ languages

##### 🥉 **Lokalise** (Middle ground)
- **Cost:** $40-400/month
- **Why:** Great UX, good for small teams
- **Setup effort:** 3 hours

#### **C. AI-Powered Translations**

**Better I18N**
- **What it does:** AI auto-translates, then sends PRs with translations
- **Cost:** FREE tier (50 keys), $50+/month
- **Why:** Eliminates manual translation management
- **MCP:** Available
- **Setup effort:** 2 hours

---

### Implementation Plan (Month 4+)

**Phase 1: Core Setup**
- [ ] Choose i18n library (i18next recommended)
- [ ] Add English translations to code
- [ ] Set up dev environment for testing Hindi/other languages

**Phase 2: TMS Setup**
- [ ] Choose TMS (Locize recommended)
- [ ] Create workflow (engineer adds keys → translator updates TMS → auto-PR)
- [ ] Add AI translation provider (Better I18N)

**Phase 3: Launch Languages**
- [ ] Prioritize: Hindi (India primary), English (already done), Spanish (global)
- [ ] Translate + QA
- [ ] Deploy with language selector

---

## 7. API Documentation & Developer Experience

### Current State
- ❌ No API docs
- ❌ OpenAPI/Swagger schema missing

### Why Add:
If you expand to API partners (other astrology apps, content providers), you need beautiful docs.

#### **A. API Documentation Generator**

##### 🥇 **Mintlify** (Best for SaaS APIs)
- **What it does:** Auto-generate docs from OpenAPI, add SDK generation
- **Cost:** FREE (basic), $500+/month (enterprise)
- **Why:** Looks professional, integrates with GitHub, MCP-ready
- **Setup effort:** 4 hours (if OpenAPI exists)

##### 🥈 **Postman** (Industry standard)
- **What it does:** API design, documentation, testing
- **Cost:** FREE (basic), $20+/month
- **Why:** Already familiar to engineers
- **Setup effort:** 3 hours

##### **Swagger UI** (Open-source)
- **Cost:** FREE
- **Setup effort:** 2 hours
- **Why:** Self-hosted, lightweight

#### **B. OpenAPI Schema**

Generate from route handlers using:
- **tRPC** (TypeScript RPC; auto-generates types)
- **Zod** + **API Route Documentation Tool**
- **Next.js OpenAPI** (Middleware)

---

### Implementation Plan (Month 3+)

- [ ] Generate OpenAPI schema for `/api/*` routes
- [ ] Set up Swagger UI or Mintlify
- [ ] Document auth, payments, notifications endpoints
- [ ] Add to developer portal (if API partners needed)

---

## 8. Customer Support & Community

### Current State
- ❌ No support ticketing
- ❌ No user analytics
- ❌ No in-app messaging

### For Commercial:

#### **A. Support Ticketing**

##### 🥇 **Intercom** (Best for SaaS)
- **What it does:** Chat widget, ticketing, user engagement
- **Cost:** $50-200/month
- **Why:** Mobile-friendly, AI chatbot, messaging campaigns
- **Setup effort:** 3 hours
- **MCP:** Not yet, but API-first

##### 🥈 **Zendesk** (Enterprise)
- **Cost:** $49-400/month
- **Why:** If you grow to large support team

##### 🥉 **Help Scout** (Lightweight)
- **Cost:** $25-165/month
- **Why:** Small team friendly

#### **B. User Analytics**

##### 🥇 **PostHog** (Recommended; you already have it for A/B testing)
- **What it does:** Session replay, funnels, heatmaps, analytics
- **Cost:** FREE (1M events), $450+/month
- **Setup:** 2 hours
- **Why:** Don't need separate analytics tool

##### 🥈 **Mixpanel** (Product analytics)
- **Cost:** FREE-2000/month
- **Why:** Strong cohort analysis

##### **Amplitude** (Growth analytics)
- **Cost:** Similar to Mixpanel

#### **C. In-App Messaging**

##### **Segment** (Data layer)
- Route events to multiple destinations (Intercom, PostHog, etc.)
- Cost: FREE-$500/month

---

### Implementation Plan (Month 2+)

- [ ] Deploy Intercom chat widget to web + mobile
- [ ] Set up automated welcome message
- [ ] Create FAQ bot (Intercom AI)
- [ ] Monitor user feedback via PostHog

---

## 9. A/B Testing & Feature Flags

### Current State
- ❌ No feature flags
- ❌ No A/B testing framework

### Recommended:

#### **A. Feature Flags (Server-Side)**

##### 🥇 **PostHog Feature Flags** (Already included if you use PostHog)
- **Cost:** Included in PostHog plan
- **Setup:** 1 hour
- **Why:** Can rollout features to 5% → 25% → 100% of users

##### **Statsig** (Dedicated platform)
- **Cost:** $500+/month
- **Why:** Better for data-heavy experiments

##### **Unleash** (Open-source)
- **Cost:** FREE (self-hosted)
- **Setup:** 4 hours

#### **B. A/B Testing (Client-Side)**

##### **PostHog Experiments** (If using PostHog)
- Included in plan
- Good for UI/onboarding tests

##### **Split.io** (Dedicated)
- **Cost:** $1000+/month
- **Why:** If you run many concurrent tests

---

### Implementation Plan

- [ ] Choose PostHog (simplest) or Statsig
- [ ] Create a feature flag for new features before rollout
- [ ] Set up gradual rollout (5% → 100%)
- [ ] A/B test credit pack pricing variants

---

## 10. Infrastructure & DevOps

### Current State
- ✅ Vercel (web deployment)
- ✅ GitHub Actions (CI for mobile)
- ✅ Supabase (database)
- ❌ No infrastructure-as-code
- ❌ No automated database backups

### Add:

#### **A. Infrastructure as Code**

##### **Terraform** (Industry standard)
- **What it does:** Define infrastructure (Vercel, Supabase, etc.) as code
- **Cost:** FREE
- **Setup effort:** 8 hours (first time)
- **Why:** Reproducible, version-controlled infrastructure
- **MCP:** Several Terraform MCPs available

##### **Supabase Vector & Auth** (Already using Supabase; leverage more)
- Use Supabase's built-in Vector DB for embeddings (if you expand to AI features)
- Use Supabase's built-in Auth (though you use NextAuth; consider consolidation)

#### **B. Database Backups**

##### **Supabase Backups** (Built-in)
- Daily backups included
- Cost: Included in Supabase plan
- Enable point-in-time recovery

#### **C. Monitoring & Incident Response**

##### **Incident.io** or **Opsgenie**
- On-call scheduling, incident response
- Cost: $10-100/month
- Why: If support team grows

---

### Implementation Plan

- [ ] Set up daily Supabase backups with retention
- [ ] Document disaster recovery procedure
- [ ] Eventually: Write Terraform for reproducible infrastructure

---

## 11. Code Quality & Developer Experience

### Recommended Additions:

#### **A. Type Safety**

##### **TypeScript** (Already using ✅)
Enhance with:
- **strict: true** in tsconfig.json (if not already)
- **type-coverage**: Report % of codebase with types
- **tRPC**: Type-safe RPC for API routes (optional but recommended)

#### **B. Linting & Formatting**

##### **ESLint** (Already using via Next.js ✅)
Enhance with:
- `eslint-plugin-security`: Catch security issues
- `eslint-plugin-unicorn`: Best practices

##### **Prettier** (Code formatting)
- Built into Next.js, ensure enabled

#### **C. Pre-commit Hooks**

##### **Husky** + **lint-staged**
- Run linting + tests before commit
- Cost: FREE
- Setup: 30 minutes
- Why: Catch issues before push

---

## 12. Specialized Tools for Vedic Astrology Content

### If You Expand Content/Community:

#### **A. Content Management**

##### **Sanity.io** (Headless CMS)
- **What it does:** Manage astrology content (articles, remedies, event calendars)
- **Cost:** FREE tier, $99+/month (production)
- **Why:** Structured content for web + mobile
- **Setup:** 8 hours
- **MCP:** Sanity MCP available

##### **Contentful** (Alternative)
- **Cost:** $489+/month
- **Why:** Industry standard, strong API

#### **B. Community/Forum**

##### **Mighty Networks** or **Circle**
- Build community around astrology platform
- Cost: $200-500/month
- Why: Pre-built moderation, payments integration

#### **C. Event Management**

##### **Eventbrite** integration
- If you host online astrology sessions
- Cost: 1-2% commission
- Why: Handles registrations + payments

---

## Summary Table: Quick Reference

| Tool | Category | Cost | Priority | Setup | MCP? |
|---|---|---|---|---|---|
| **Sentry** | Monitoring | FREE-$25/mo | 🔴 Critical | 2h | ✅ |
| **Doppler** | Secrets | FREE-$50/mo | 🔴 Critical | 2h | ❌ |
| **Stripe Billing** | Payments | 2.9%+$0.30 | 🔴 Critical | 8h | ✅ |
| **Playwright** | Testing | FREE | 🟡 High | 6h | ✅ |
| **Storybook** | Design | FREE | 🟡 High | 6h | ❌ |
| **Figma Code Connect** | Design | FREE | 🟡 High | 4h | ✅ |
| **i18next** | Localization | FREE | 🟡 High | 4h | ❌ |
| **Locize** | Localization | FREE-$15/mo | 🟡 High | 2h | ✅ |
| **PostHog** | Analytics+Flags | FREE-$450/mo | 🟡 High | 3h | ✅ |
| **Intercom** | Support | $50-200/mo | 🟢 Medium | 3h | ❌ |
| **Mintlify** | API Docs | FREE-$500/mo | 🟢 Medium | 4h | ✅ |
| **Detox** | Mobile Testing | FREE | 🟢 Medium | 12h | ❌ |
| **Datadog** | Monitoring | $32-500/mo | 🟢 Medium | 4h | ❌ |
| **Terraform** | Infrastructure | FREE | 🟢 Medium | 8h | ✅ |
| **Sanity** | CMS | FREE-$99/mo | 🟢 Medium | 8h | ✅ |
| **Better I18N** | Localization | FREE-$50/mo | 🟢 Medium | 2h | ✅ |

---

## Phased Implementation Roadmap

### **Week 1-2: Foundation (Do First)**
```
✅ Sentry setup (error tracking)
✅ Doppler setup (secrets management)
✅ TruffleHog + GitGuardian (secret scanning)
✅ Enable Vercel Analytics
```

### **Week 3-4: Production Readiness**
```
✅ Playwright E2E tests (critical flows)
✅ Lighthouse CI (performance tracking)
✅ Firebase Test Lab setup (mobile)
✅ Backup strategy documentation
```

### **Month 2: Quality & Observability**
```
✅ Storybook (component library)
✅ PostHog (analytics + feature flags + A/B testing)
✅ Chromatic (visual regression)
✅ Datadog or Sentry advanced features
```

### **Month 3: Commercial Preparation**
```
✅ Stripe Billing (subscriptions)
✅ Intercom (support widget)
✅ Figma Code Connect (design-to-code)
✅ API documentation (Mintlify)
```

### **Month 4+: Expansion**
```
✅ Localization (i18next + Locize)
✅ Detox (mobile automation tests)
✅ Terraform (IaC)
✅ Sanity CMS (if content-heavy)
✅ Community platform (Mighty Networks)
```

---

## MCP Servers You Should Prioritize

Based on the ecosystem, these MCPs provide the highest value for your stack:

| MCP | Purpose | Priority |
|---|---|---|
| **GitHub** | Pull requests, issues, CI/CD | 🔴 Critical (you have it) |
| **Figma** | Design system, Code Connect | 🔴 Critical (you have it) |
| **Playwright** | E2E testing | 🟡 High (you have it) |
| **Postgres** | Database queries, schema | 🟡 High (Anthropic reference) |
| **Locize** | Translation management | 🟡 High (when doing i18n) |
| **Better I18N** | AI translation management | 🟡 High (when doing i18n) |
| **Stripe** | Payment info lookup | 🟡 High (when using Stripe) |
| **Sanity** | CMS content management | 🟢 Medium (if using CMS) |
| **PostHog** | Analytics/feature flags | 🟢 Medium (when using PostHog) |
| **Doppler** | Secret management | 🟢 Medium (when using Doppler) |

---

## Cost Summary (Annual, at scale)

| Category | Low | Medium | High |
|---|---|---|---|
| Monitoring | $0 (Firebase) | $500 (Sentry) | $5,000 (Datadog) |
| Secrets | $0 (env vars) | $600 (Doppler) | $1,200 (HashiCorp Vault) |
| Payments | 2% (Razorpay) | 2.9% (Stripe) | 5% (Paddle) |
| Testing | $0 (Jest + Playwright) | $500 (Firebase Test Lab) | $2,000 (BrowserStack) |
| Analytics | $0 (Firebase) | $450 (PostHog) | $5,000 (Mixpanel) |
| Support | $0 (email) | $50 (Help Scout) | $400 (Zendesk) |
| Localization | $0 (i18next) | $180 (Locize) | $500 (Crowdin) |
| Design | $0 (Figma free) | $240 (Storybook + Chromatic) | $1,000 (Zeroheight) |
| **Total Range** | **$0** | **~$2,500-3,000/yr** | **~$15,000+/yr** |

**Recommendation:** Start with "Medium" tier (~$3k/yr, easy to absorb). Add "High" tier tools only when you have revenue to justify them.

---

## Next Steps

1. **This week:** Implement Sentry + Doppler (2 hours)
2. **Next week:** Add Playwright E2E tests (6 hours)
3. **Week 3-4:** Evaluate Stripe vs Paddle for subscriptions (4 hours research)
4. **Month 2:** Implement chosen billing platform (8-16 hours)
5. **Month 3:** Add PostHog for analytics (3 hours)
6. **Month 4:** Plan localization strategy if expanding internationally

---

## Reference Sources

All recommendations sourced from 2026 industry research:

- [MCP in 2026: Complete Guide](https://agence-scroll.com/en/blog/mcp-claude-guide-2026)
- [Best Payment Processing for SaaS 2026](https://viasocket.com/discovery/blog/hprbrf/Payment%20Processing%20Platforms/11-best-payment-processing-platforms-for-saas-subscriptions)
- [Top Observability Platforms 2026](https://openobserve.ai/blog/top-10-observability-platforms/)
- [Best Secrets Management Tools 2026](https://infisical.com/blog/best-secret-management-tools)
- [Mobile Testing Tools 2026](https://autify.com/blog/mobile-testing-tools-2026)
- [i18n Platforms 2026](https://better-i18n.com/en/i18n/best-tms/)
- [A/B Testing Platforms 2026](https://www.growthbook.io/blog/best-a-b-testing-platforms)
- [API Documentation Tools 2026](https://www.mintlify.com/library/best-api-docs-and-sdk-generation-tools)
- [Customer Support Platforms 2026](https://www.zendesk.com/service/help-desk-software/ticketing-system/)
- [Design Systems in Figma 2026](https://story.to.design/blog/best-design-system-plugins-of-2026)

