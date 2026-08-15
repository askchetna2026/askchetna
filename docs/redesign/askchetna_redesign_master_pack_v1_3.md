# AskChetna Unified Master Pack

> Version: 1.3.0  
> Status: Ready for Codex Implementation  
> Purpose: Single-file source of truth for the AskChetna platform across Web, Android, and iOS, including design language, architecture, content model, asset rules, component contracts, implementation order, and quality gates.

---

## Document Control

| Field | Value |
|---|---|
| Product | AskChetna |
| Document Type | Unified Master Pack |
| Version | 1.3.0 |
| Audience | Product, design, frontend, mobile, and AI coding agents |
| Primary Implementation Surface | Web first |
| Secondary Surfaces | Android and iOS apps |
| Source of Truth | This file |

---

## Table of Contents

1. Product Overview
2. Platform Strategy
3. Design DNA
4. Visual System
5. Typography System
6. Layout, Grid, Spacing, and Radius
7. Interaction and Motion
8. Information Architecture
9. Content Model and Data Contracts
10. Asset Strategy and Art Direction
11. Component System
12. Web Page Blueprints
13. Mobile App Screen Blueprints
14. Repository and Folder Architecture
15. Technical Standards
16. Accessibility Standards
17. Performance Standards
18. QA Checklist
19. Build Phases
20. Codex Operating Rules
21. Anti-Patterns
22. Future Expansion
23. Acceptance Criteria

---

# 1. Product Overview

AskChetna is a guidance, self-discovery, and reflective AI platform. It supports users through tools, reading experiences, content, and account-based interactions. The platform should feel trustworthy, calm, premium, and human.

The brand promise is not novelty. The brand promise is clarity, confidence, and thoughtful presentation.

## 1.1 Product Goals

- Build a premium editorial web experience first.
- Reuse the same brand and design system for Android and iOS.
- Ensure mobile apps feel native, task-oriented, and app-like rather than like a shrunken webpage.
- Provide a content model that can scale to tools, articles, guides, onboarding, saved content, and personalised feeds.
- Make Codex implementation deterministic by documenting structure, tokens, data shapes, and component contracts.

## 1.2 Non-Negotiable Principles

1. Use design tokens everywhere.
2. Do not hardcode colours, spacing, radii, shadows, or typography.
3. Keep visuals warm, calm, and premium.
4. Use real photography and human-made artwork for final assets.
5. Avoid generic AI-looking interfaces.
6. Keep motion subtle.
7. Make every component reusable.
8. Make mobile app layouts feel like apps, not web pages.
9. Keep content data-driven.
10. Prefer semantic HTML and accessibility-first patterns.

---

# 2. Platform Strategy

## 2.1 Shared Brand Layer

The following are shared across Web, Android, and iOS:

- Brand voice
- Design tokens
- Colour system
- Typography system
- Icon style
- Illustration style
- Photography style
- Motion language
- Trust indicators
- Content taxonomy
- Naming conventions
- Component semantics

## 2.2 Web Presentation Rules

The website should feel editorial, spacious, and information-rich.

Web traits:

- Large hero compositions
- Multi-column layouts
- Strong section hierarchy
- Scroll-based storytelling
- Hover interactions
- SEO-friendly content structure
- Full footer and utility navigation
- Detailed informational pages
- Magazine-like article previews
- Marketing and discovery surfaces

## 2.3 Android Presentation Rules

Android should feel native, compact, and task-oriented.

Android traits:

- Bottom navigation where appropriate
- Large tap targets
- Compact cards
- Quick action affordances
- Bottom sheets for secondary actions
- Native transitions and gestures
- Short, scannable content blocks
- Clear task entry points
- Minimal visual noise

## 2.4 iOS Presentation Rules

iOS should feel native, elegant, and clear.

iOS traits:

- Tab bar or platform-equivalent navigation
- Large-title patterns where useful
- Native sheet presentation
- Compact premium cards
- Smooth transitions with restrained motion
- iOS-friendly spacing and hierarchy
- Respect for platform expectations
- Avoid web-like section stacking in app home surfaces

## 2.5 Platform Rule

Do not copy the website layout directly into Android or iOS.

The content and brand stay the same, but the presentation and interaction model must change per platform.

---

# 3. Design DNA

## 3.1 Brand Personality

AskChetna is:

- Calm
- Wise
- Elegant
- Human
- Patient
- Trustworthy
- Modern
- Warm
- Grounded
- Premium
- Reflective
- Supportive

AskChetna is never:

- Loud
- Gimmicky
- Fear-based
- Overly mystical
- Cartoonish
- Salesy
- Visually chaotic
- Cheap-looking
- Artificially over-animated

## 3.2 Experience Statement

AskChetna should feel like a beautifully designed journal, a premium wellness publication, and a calm digital guide.

A user should feel safe exploring the product.

## 3.3 Emotional Targets

### First 5 Seconds

- Calm
- Curious
- Safe
- Welcome

### First 20 Seconds

- Interested
- Trusting
- Comfortable

### After Interaction

- Supported
- Clear
- More confident

## 3.4 Design Philosophy

Content is the hero.
Design supports the content rather than competing with it.

Whitespace is an active design element.

Decoration should be subtle and always serve the reading experience.

---

# 4. Visual System

## 4.1 Colour Direction

Use warm neutrals, parchment, cream, sand, olive, sage, terracotta, muted gold, and deep brown tones.

Avoid neon, electric gradients, harsh blue dominance, and saturated synthetic palettes.

## 4.2 Colour Intent by Role

- Backgrounds should feel paper-like, warm, and soft.
- Surfaces should feel like layered cards or panels.
- Borders should be thin and quiet.
- Accents should be limited and intentional.
- CTAs should be noticeable without shouting.
- Trust indicators should use subdued contrast, not loud highlights.

## 4.3 Imagery Direction

Use real, human-made assets:

- Editorial photography
- Hand-crafted illustrations
- Botanical accents
- Celestial ornaments used sparingly
- Soft textures
- Natural light

Never use final AI-generated faces, synthetic lifestyle scenes, or placeholder SVG art as production imagery.

## 4.4 Illustration Direction

Illustrations must be consistent and handcrafted.

Traits:

- monoline or fine line work
- botanical or celestial accents when needed
- subtle rather than dominant
- same stroke weight across the system
- visually calm
- not cartoonish
- not over-detailed

## 4.5 Texture Direction

Use very subtle textures:

- paper grain
- linen texture
- soft noise
- parchment-like overlays

Textures should add depth, not visible clutter.

## 4.6 Icon Direction

Icons should be outline-based, thin, and simple.

Rules:

- consistent stroke width
- rounded ends where appropriate
- no filled icon packs unless the full set is consistent and approved
- icons should support meaning, not decoration

---

# 5. Typography System

## 5.1 Font Strategy

Use at most two font families.

- One refined serif for display, headings, quotes, and special emphasis.
- One clean sans serif for body text, UI text, labels, forms, and navigation.

## 5.2 Typography Goals

Typography must create:

- hierarchy
- calmness
- readability
- confidence
- editorial presence

## 5.3 Typography Behaviour

- Headings should be elegant and balanced.
- Paragraphs should be readable at comfortable lengths.
- Line height should be generous enough for long-form reading.
- Letter spacing should remain restrained.
- Avoid all-caps blocks except small labels or tokens.

## 5.4 Recommended Usage Rules

- Serif font: hero headings, page titles, article headlines, premium pull quotes.
- Sans font: body copy, labels, navigation, buttons, forms, helper text.
- Do not mix more than two fonts.
- Use consistent heading scale across the entire platform.

---

# 6. Layout, Grid, Spacing, and Radius

## 6.1 Grid Strategy

### Web

- Desktop: 12-column grid
- Tablet: 8-column grid
- Mobile: 4-column grid

### Apps

- Use native screen spacing rules and platform-safe gutters.
- Do not force the web grid into app screens.
- Use card stacks, list rows, and bottom navigation patterns where appropriate.

## 6.2 Container Strategy

- Content should be centered within a maximum content width on web.
- The site should breathe and never feel edge-to-edge unless the design requires full-bleed imagery.
- App screens should respect platform padding, safe areas, and touch ergonomics.

## 6.3 Spacing Scale

Use a consistent spacing system based on the project tokens.

Rules:

- Use one shared scale across the platform.
- Never invent one-off spacing values in components.
- Major sections should have more vertical breathing room than card internals.
- Mobile app screens may compress spacing slightly, but must preserve hierarchy and tap comfort.

## 6.4 Radius Strategy

- Cards: soft, rounded, premium
- Buttons: slightly smaller radius than cards
- Inputs: consistent with buttons
- Images in cards: match card radius or clip appropriately
- Avoid mixing sharp and rounded styles in a way that looks accidental

## 6.5 Elevation Strategy

- Elevation should be soft and minimal.
- No heavy, harsh, or exaggerated shadows.
- Use borders and subtle elevation together rather than relying on shadow alone.

## 6.6 Section Rhythm

- Web sections should breathe.
- Do not stack sections too tightly.
- Headlines, supporting copy, cards, and CTAs must have clear internal spacing.
- Mobile screens should feel compact but never cramped.

---

# 7. Interaction and Motion

## 7.1 Motion Philosophy

Motion should improve comprehension and perceived quality, never distract.

## 7.2 Allowed Motion

- Fade in
- Slight translate on reveal
- Gentle scale on hover
- Soft border or background emphasis
- Minimal stagger when presenting a group

## 7.3 Prohibited Motion

- Bouncy motion
- Excessive parallax
- Long chained animations
- Motion with no functional purpose
- Flashy or playful effects that undermine the calm brand

## 7.4 Platform Motion Rules

### Web

- Hover states may be used to indicate interactivity.
- Scroll reveal should be subtle.
- Transitions should feel premium and restrained.

### Android / iOS

- Prefer platform-native transitions and sheet behavior.
- Respect gesture conventions.
- Avoid web-style hover assumptions.
- Keep motion brief and familiar.

---

# 8. Information Architecture

## 8.1 Core Website Areas

- Home
- AI Tools
- Guidance
- Resources
- About
- Contact
- Account

## 8.2 Core App Areas

- Home / Dashboard
- Discover
- AI Chat
- Saved
- Profile

## 8.3 Content Types

- Tool pages
- Category pages
- Article pages
- Guide pages
- Testimonial blocks
- FAQ blocks
- Account views
- Onboarding steps
- Saved content
- Notifications
- Activity history

## 8.4 Website Navigation Intent

The website should prioritise discovery, explanation, SEO, and conversion.

## 8.5 App Navigation Intent

The app should prioritise immediate action, return visits, saved content, and quick access.

---

# 9. Content Model and Data Contracts

## 9.1 Rule

All key content should be data-driven.

Do not hardcode repeated text inside components.

## 9.2 Content Entities

- navigation links
- footer links
- homepage sections
- tool cards
- category cards
- testimonials
- articles
- FAQs
- trust indicators
- app tab items
- onboarding items
- saved content entries
- notification items

## 9.3 Example Entity Shapes

### Navigation Item

```json
{ "label": "AI Tools", "href": "/ai-tools" }
```

### Tool Card

```json
{
  "title": "AI Chat",
  "description": "Get thoughtful guidance in a calm conversational flow.",
  "href": "/ai-tools/ai-chat",
  "icon": "chat"
}
```

### Category Card

```json
{
  "title": "Career",
  "description": "Clarity for work, direction, and decisions.",
  "href": "/guidance/career"
}
```

### Testimonial

```json
{
  "name": "User Name",
  "role": "Reader",
  "quote": "The experience feels calm and genuinely useful.",
  "rating": 5
}
```

### Article Preview

```json
{
  "title": "How to make thoughtful decisions with more confidence",
  "category": "Guides",
  "readingTime": "6 min read",
  "href": "/resources/how-to-make-thoughtful-decisions"
}
```

## 9.4 Data Rules

- Use structured JSON, MDX, or typed content modules.
- Keep content separate from layout.
- Content should be easy to localise later.
- Avoid page-only copy that cannot be reused.
- Use canonical IDs or slugs for repeatable entities.

## 9.5 Content Ownership

- Navigation and footer are global content.
- Homepage sections are page-scoped but data-driven.
- Tools, categories, testimonials, and articles are reusable collections.
- App screens should consume the same content source where relevant, but may present it differently.

---

# 10. Asset Strategy and Art Direction

## 10.1 Photography

Use editorial, real photography only.

Recommended traits:

- warm natural light
- calm compositions
- soft shadows
- authentic human presence
- reflective or lifestyle scenes
- premium editorial framing

### Photography Do

- Use real people and authentic environments.
- Keep colour grading consistent.
- Ensure the subject and scene support the calm brand.
- Crop with intention.

### Photography Do Not

- Use obvious stock imagery that feels generic.
- Use AI-generated faces for final production.
- Use photos with harsh colour casts that break the mood.
- Mix inconsistent shooting styles.

## 10.2 Illustrations

Illustrations should be handcrafted and consistent.

Traits:

- monoline or fine line work
- botanical or celestial accents when needed
- subtle rather than dominant
- same stroke style across the system

## 10.3 Textures

Use subtle textures and keep them low-contrast.

Types:

- paper grain
- linen texture
- parchment wash
- soft noise
- light shadow overlays

## 10.4 Image Standards

- Hero: 16:9 or editorial split layout
- Cards: 4:3, 1:1, or platform-appropriate crop
- Avatars: 1:1
- App screenshots: device-safe ratios
- Prefer WebP and AVIF for web
- Keep filenames descriptive and structured

## 10.5 Naming Convention

Use descriptive asset names with consistent parts:

```text
category_purpose_variant_version.ext
```

Example:

```text
hero_journaling_softlight_v1.webp
```

## 10.6 Asset Governance

Before any asset is used in production, confirm:

1. It matches the brand mood.
2. It is consistent with other assets.
3. It is correctly sized and optimised.
4. It has suitable alt text or decorative treatment.
5. Licensing or ownership is confirmed.
6. It works across breakpoints and platform contexts.

---

# 11. Component System

## 11.1 Component Principles

- One component should solve one clear problem.
- Prefer variants over duplicate components.
- Make components composable.
- Keep component APIs explicit.
- Use semantic HTML by default.
- Use data-driven props where possible.

## 11.2 Core Component Categories

- layout primitives
- navigation components
- card components
- section components
- form controls
- feedback states
- content blocks
- media blocks
- utility components
- platform shell components

## 11.3 Dependency Rule

Low-level UI components should not depend on page-specific logic.

Page sections may compose multiple lower-level components.

## 11.4 Core Reusable Components

### Layout and Shell

- Container
- SectionWrapper
- PageShell
- Stack
- Grid
- SidebarLayout
- AppShell
- WebShell

### Navigation

- AnnouncementBar
- HeaderNavigation
- DesktopNav
- MobileDrawerNav
- BottomTabBar
- SearchTrigger
- ProfileMenu

### Content and Cards

- SectionHeading
- ToolCard
- CategoryCard
- FeatureCard
- TestimonialCard
- ArticleCard
- ProofCard
- StatCard
- SavedItemCard
- NotificationCard

### Form and Input

- Button
- Input
- TextArea
- Select
- SearchField
- NewsletterForm
- FilterChips

### Feedback and UI States

- Badge
- EmptyState
- Skeleton
- LoadingState
- Accordion
- Tabs
- Divider
- Ornament
- Toast
- Dialog
- Sheet

### Media

- ImageFrame
- Avatar
- HeroMedia
- IconMark
- IllustrationMark

## 11.5 Component Ownership Rules

- Layout components handle spacing and page structure.
- UI primitives handle appearance and interaction.
- Section components handle composition for a page section.
- Data collections feed cards and lists.

---

# 12. Web Page Blueprints

## 12.1 Homepage

### Desktop Structure

1. Announcement bar
2. Header navigation
3. Hero section
4. Featured AI tools
5. Why AskChetna
6. How it works
7. Guidance categories
8. Assistant preview
9. Testimonials
10. Latest articles
11. Newsletter signup
12. Footer

### Desktop Intent

The homepage should feel editorial, premium, and information-rich.

### Mobile Web Behaviour

- sections stack vertically
- cards compress to one or two columns depending on density
- navigation becomes a drawer
- hero remains visually calm and readable
- touch targets remain large enough for comfortable interaction

## 12.2 AI Tools Listing Page

Includes:

- page header
- category/filter controls
- tool grid
- featured tool callout
- FAQ
- related guide links
- footer

## 12.3 Guidance Category Page

Includes:

- category hero
- overview copy
- related tools
- featured article links
- testimonial or trust block
- FAQ

## 12.4 Article Page

Includes:

- hero or cover image
- title
- metadata
- table of contents where relevant
- long-form content sections
- related articles
- related tools
- author or publication detail

## 12.5 About Page

Includes:

- mission section
- story section
- values section
- credibility section
- CTA

## 12.6 Contact Page

Includes:

- contact intro
- form
- support options
- FAQ
- response expectation copy

## 12.7 Account Pages

Includes:

- dashboard
- saved content
- history
- settings
- subscription or plan area

---

# 13. Mobile App Screen Blueprints

## 13.1 Mobile App Home

The app home must not look like a website pasted into a phone.

It should feel like a real app surface.

Recommended pattern:

- greeting / header
- search or quick action entry point
- continue or recent activity block
- featured guidance shortcuts
- quick tools grid
- saved items or recommended content
- recent insights
- bottom navigation

## 13.2 Discover Screen

Includes:

- browse categories
- trending tools
- recommended content
- filter access

## 13.3 AI Chat Screen

Includes:

- conversational interface
- prompt suggestions
- session controls
- saved responses access
- calm empty state

## 13.4 Saved Screen

Includes:

- saved readings
- saved articles
- saved tools
- grouped content

## 13.5 Profile Screen

Includes:

- account summary
- settings
- notifications
- privacy
- subscription
- sign out

## 13.6 Mobile App Navigation

Prefer bottom navigation or platform-equivalent patterns rather than a desktop-style top navigation.

Typical labels:

- Home
- Discover
- Chat
- Saved
- Profile

## 13.7 Mobile App Presentation Rule

Use the same brand and design system, but present content in an app-native way with short surfaces, quick actions, and system-friendly navigation.

---

# 14. Repository and Folder Architecture

## 14.1 Web Repository Structure

```text
src/
  app/
  components/
    layout/
    navigation/
    sections/
    cards/
    forms/
    ui/
    media/
    feedback/
  content/
    homepage/
    navigation/
    footer/
    tools/
    categories/
    articles/
    testimonials/
    faq/
  data/
  lib/
  hooks/
  styles/
public/
  assets/
    images/
    illustrations/
    textures/
    icons/
```

## 14.2 Shared Design System Future Structure

```text
packages/
  design-tokens/
  content-schema/
  icons/
  assets/
  ui-kit/
```

## 14.3 Folder Rules

- Keep components grouped by function.
- Keep shared UI primitives separate from page sections.
- Keep content files separate from components.
- Keep assets structured by media type.
- Avoid dumping everything into a single components folder.
- Keep platform-specific shells separated from shared primitives.

---

# 15. Technical Standards

## 15.1 Web Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Framer Motion where appropriate
- next/image
- Semantic HTML

## 15.2 Implementation Requirements

- all reusable UI in shared components
- page content driven by structured data
- no hardcoded repeated styling
- no duplicate component variants for the same purpose
- responsive from the start
- accessible by default
- performance-first approach
- web and app architecture separated cleanly

## 15.3 Web SEO Requirements

- metadata per page
- Open Graph support
- structured content headings
- internal linking
- clean URLs
- image alt text
- semantic landmarks
- crawlable content architecture

## 15.4 Platform Architecture Requirements

- web implementation first
- mobile app presentation should be derived from the same design language
- platform shells must not assume the same navigation model
- shared content entities should power web and app experiences where possible

---

# 16. Accessibility Standards

- visible focus states
- keyboard operable controls
- sufficient colour contrast
- reduced motion support
- semantic headings
- labels for form fields
- meaningful alt text
- screen-reader friendly nav and dialogs
- proper ARIA only where semantically required
- no interaction patterns that trap keyboard users

---

# 17. Performance Standards

- use optimised image formats
- lazy load non-critical media
- use route-level code splitting where appropriate
- avoid oversized bundles
- avoid unnecessary client components
- keep the first view lightweight
- prefer static or server-rendered content where practical
- avoid autoplay video backgrounds and other expensive decorative effects

---

# 18. QA Checklist

Before a task is marked complete, verify:

- design tokens used consistently
- components are reusable
- content is data-driven where it should be
- mobile presentation feels native
- web presentation feels editorial
- content hierarchy is clear
- spacing is consistent
- text is readable
- images are optimised
- accessibility passes
- code is maintainable
- no hardcoded theme values remain
- navigation matches platform expectations
- assets match the approved art direction

---

# 19. Build Phases

## Phase 1

Create the project scaffold, tokens, shared layout, core primitives, and content structure.

## Phase 2

Build the web homepage and shared marketing sections.

## Phase 3

Build the core web content pages and tool pages.

## Phase 4

Create the mobile app presentation rules and app-specific navigation shell.

## Phase 5

Adapt the shared system for Android and iOS using native patterns.

## Phase 6

Expand to saved content, onboarding, notifications, and personalised feed surfaces.

---

# 20. Codex Operating Rules

Codex must:

1. Read this master pack first.
2. Inspect the repository before coding.
3. Build only what the current phase requires.
4. Preserve the shared design system.
5. Use tokens and shared components.
6. Avoid inventing a new visual language.
7. Preserve web and mobile separation.
8. Keep implementation data-driven.
9. Produce clear file-change summaries.
10. Stop and report if a requirement is contradictory or missing, rather than guessing.

## 20.1 Implementation Order

For the web implementation, follow this order:

1. scaffold the project
2. create design tokens
3. create base layout and shell
4. create reusable primitives
5. create shared marketing sections
6. implement the homepage
7. prepare content collections for additional pages

## 20.2 Decision Rule

If two approaches are possible, choose the one that is more reusable, more accessible, and more consistent with the master pack.

---

# 21. Anti-Patterns

Do not:

- build a webpage and call it a mobile app
- copy web layout into Android or iOS without redesign
- add random colours or borders
- add unnecessary animation
- create one-off components without reason
- hardcode visual values
- use AI-generated final imagery
- mix incompatible illustration styles
- create brittle page-only data structures
- hide content inside visual-only blocks that hurt SEO or accessibility

---

# 22. Future Expansion

This system must support future additions such as:

- subscriptions
- saved content
- onboarding flows
- tool dashboards
- community features
- notifications
- personalised home feeds
- localisation
- A/B testing
- editorial campaigns
- push-notification surfaces
- in-app recommendations

The system should scale without breaking visual coherence.

---

# 23. Acceptance Criteria

The platform documentation is implementation-ready when:

- the web app can be scaffolded without design ambiguity
- the homepage can be built from documented sections and components
- mobile app surfaces can be designed without copying web layouts directly
- shared data entities can drive web and app content
- design tokens and component contracts are explicit
- QA and anti-pattern rules are clear enough for Codex to enforce
- the document is internally consistent and does not leave major platform decisions unspecified

---

# END OF MASTER PACK
