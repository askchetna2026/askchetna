# AskChetna Unified Master Pack

> Version: 1.2.0
> Status: Ready for Implementation Planning
> Purpose: Single-file source of truth for design, architecture, content model, component system, asset rules, web implementation, and future Android / iOS presentation strategy.

---

## Table of Contents

1. README
2. Master Design Specification
3. Platform Design Strategy
4. Site Architecture
5. Project Requirements
6. Design Tokens
7. Data Architecture
8. Asset Pipeline
9. Component Library
10. Homepage Blueprint
11. Homepage Implementation Specification
12. Codex Execution Rules
13. QA Checklist
14. Build Phases
15. Future Expansion

---

# README

## Overview

This repository package defines the AskChetna design system and implementation rules for the web experience now, with future reuse for Android and iOS apps.

The shared brand must stay consistent across all platforms. The presentation must change by platform so the website feels like a premium editorial experience, while mobile apps feel native, task-oriented, and app-like rather than like a shrunk webpage.

## Project Goal

Create a premium AI-powered guidance platform that feels calm, elegant, editorial, human, warm, modern, and trustworthy.

## Primary Objectives

- Redesign the visual identity
- Build a reusable design system
- Support web, Android, and iOS from one shared language
- Make the website feel editorial and premium
- Make mobile apps feel native and gesture-friendly
- Improve accessibility, performance, SEO, and maintainability
- Make Codex implementation predictable and low ambiguity

## Non-Negotiable Principles

1. Use design tokens everywhere.
2. Do not hardcode colours, spacing, radii, shadows, or typography.
3. Keep visuals warm, calm, and premium.
4. Use real photography and human-made artwork for final assets.
5. Avoid generic AI-looking interfaces.
6. Keep motion subtle.
7. Make every component reusable.
8. Make mobile app layouts feel like apps, not web pages.

## Success Definition

The project is successful when the same brand can be experienced across web, Android, and iOS while each platform still feels native, polished, and appropriately structured.

---

# MASTER DESIGN SPECIFICATION

## 1. Product Definition

AskChetna is a guidance and self-discovery platform powered by AI. It supports users through tools, reading experiences, reflective content, and account-based interactions.

The brand promise is not novelty. The brand promise is clarity, trust, and thoughtful presentation.

## 2. Design Vision

AskChetna should feel like a premium editorial publication combined with a calm wellness brand and a modern AI product.

The interface should never feel noisy or overdesigned.

## 3. Brand Personality

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

AskChetna is never:

- Loud
- Gimmicky
- Fear based
- Overly mystical
- Cartoonish
- Salesy
- Visually chaotic

## 4. Shared Design DNA

The shared design DNA across all platforms is:

- Warm neutral base colours
- Editorial typography
- Thin borders
- Soft elevation
- Rounded cards
- Gentle spacing rhythm
- Real imagery
- Handcrafted illustration style
- Calm motion language
- Minimal decorative use

## 5. Platform Design Strategy

### 5.1 Shared Across All Platforms

These elements must stay consistent everywhere:

- Brand voice
- Colour system
- Typography system
- Spacing scale
- Icon style
- Illustration style
- Photography style
- Motion language
- Trust indicators
- Core content taxonomy
- Component naming patterns

### 5.2 Web Presentation Rules

The website should feel editorial and spacious.

Web traits:

- Large hero sections
- Multi-column grids
- Rich storytelling
- Hover interactions
- Scroll-based section flow
- SEO-friendly content structure
- Desktop navigation with clear hierarchy
- Footer with full information architecture

### 5.3 Android Presentation Rules

Android should feel native and task-oriented.

Android traits:

- Bottom navigation where appropriate
- Large tap targets
- Compact cards
- Gesture-friendly controls
- Bottom sheets for actions
- Shorter, more direct content blocks
- Quick access to primary tasks
- Native-like transitions rather than web-style section stacking

### 5.4 iOS Presentation Rules

iOS should feel native and polished.

iOS traits:

- Tab bar or bottom navigation patterns where appropriate
- Large title patterns where useful
- Native-feeling sheet presentation
- Clear hierarchy and strong spacing
- Compact but elegant cards
- Smooth transitions with restrained motion
- Respect for iOS interface expectations

### 5.5 Important Platform Rule

Do not copy the website layout directly into mobile apps.

The content and brand must remain the same, but the mobile apps must reorganise that content into native app patterns.

## 6. Visual Language

### 6.1 Colour Direction

Use warm neutrals, parchment, cream, sand, olive, sage, terracotta, muted gold, and deep brown tones.

Avoid neon, electric gradients, harsh blue dominance, and saturated synthetic palettes.

### 6.2 Typography Direction

Use at most two font families:

- A refined serif for display and headings
- A clean sans serif for body and UI text

Typography must create hierarchy, calmness, and readability.

### 6.3 Imagery Direction

Use real, human-made assets:

- Editorial photography
- Hand-crafted illustrations
- Botanical accents
- Soft textures
- Natural light

Never use final AI-generated faces or placeholder SVG art as production imagery.

### 6.4 Motion Direction

Motion should be subtle and functional.

Allowed:

- Fade
- Soft translate
- Gentle scale
- Border emphasis
- Minimal stagger

Avoid:

- Bouncy motion
- Excessive parallax
- Long chained animations
- Attention-seeking effects

## 7. Information Architecture

### 7.1 Core Website Areas

- Home
- AI Tools
- Guidance
- Resources
- About
- Contact
- Account

### 7.2 Core App Areas

- Home / Dashboard
- Discover
- AI Chat
- Saved
- Profile

### 7.3 Content Types

- Tool pages
- Category pages
- Article pages
- Guide pages
- Testimonial blocks
- FAQ blocks
- Account views

## 8. Content Model

All key content should be data-driven.

### 8.1 Content Entities

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

### 8.2 Example Data Shapes

```json
{
  "navigation": [
    { "label": "AI Tools", "href": "/ai-tools" },
    { "label": "Guidance", "href": "/guidance" }
  ]
}
```

```json
{
  "toolCard": {
    "title": "AI Chat",
    "description": "Get thoughtful guidance in a calm conversational flow.",
    "href": "/ai-tools/ai-chat"
  }
}
```

### 8.3 Data Rules

- Use structured JSON, MDX, or typed content modules
- Keep content separate from layout
- Do not hardcode repeated copy inside components
- Keep content easy to translate later if localisation is added

## 9. Folder Architecture

### 9.1 Web Repository Structure

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
  content/
    homepage/
    navigation/
    footer/
    tools/
    categories/
    articles/
    testimonials/
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

### 9.2 Shared Design System Future Structure

```text
packages/
  design-tokens/
  content-schema/
  icons/
  assets/
  ui-kit/
```

### 9.3 Folder Rules

- Keep components grouped by function
- Keep shared UI primitives separate from page sections
- Keep content files separate from components
- Keep assets structured by media type
- Avoid dumping everything into a single components folder

## 10. Asset Pipeline

### 10.1 Photography

Use editorial, real photography only.

Recommended traits:

- warm natural light
- calm compositions
- soft shadows
- authentic human presence
- lifestyle or reflective scenes
- premium editorial framing

### 10.2 Illustrations

Illustrations should be handcrafted and consistent.

Traits:

- monoline or fine line work
- botanical or celestial accents when needed
- subtle rather than dominant
- same stroke style across the system

### 10.3 Textures

Use very subtle textures:

- paper grain
- linen texture
- soft noise
- parchment-like overlays

### 10.4 Image Standards

- Hero: 16:9 or editorial split layout
- Cards: 4:3 or 1:1 depending on use
- Avatars: 1:1
- App screenshots: device-safe ratios
- Prefer WebP and AVIF for web
- Keep filenames descriptive and structured

### 10.5 Naming Convention

```text
category_purpose_variant_version.ext
```

Example:

```text
hero_journaling_softlight_v1.webp
```

### 10.6 Asset Governance

Before any asset is used in production:

1. confirm it matches the brand mood
2. confirm it is consistent with the other assets
3. confirm it is resized and optimised
4. confirm alt text or accessibility treatment
5. confirm licensing or ownership

## 11. Design Tokens

The design tokens are defined in the dedicated token document and must be treated as the only source of truth for colours, typography, spacing, radii, shadows, motion, and breakpoints.

Token examples:

- colour-primary-500
- color-neutral-900
- spacing-24
- radius-lg
- shadow-sm
- motion-default
- breakpoint-lg

## 12. Component System

### 12.1 Component Principles

- One component should solve one clear problem
- Prefer variants over duplicate components
- Make components composable
- Keep component APIs explicit
- Use semantic HTML by default

### 12.2 Core Component Categories

- layout primitives
- navigation components
- card components
- section components
- form controls
- feedback states
- content blocks
- media blocks
- utility components

### 12.3 Dependency Rule

Low-level UI components should not depend on page-specific logic.

Page sections may compose multiple lower-level components.

## 13. Homepage Blueprint

The homepage should follow an editorial landing pattern on web and a more app-native discovery pattern on mobile app surfaces.

### 13.1 Web Homepage Sections

- announcement bar
- header navigation
- hero
- featured AI tools
- why AskChetna
- how it works
- guidance categories
- assistant preview
- testimonials
- latest articles
- newsletter signup
- footer

### 13.2 Mobile App Home Pattern

- greeting or dashboard header
- search or quick action entry point
- continue / recent activity block
- featured guidance shortcuts
- quick tools grid
- saved items or recommended content
- lightweight recent articles or insights
- bottom navigation

### 13.3 Homepage Rule

Do not present the mobile app home as a long webpage.

It should feel like an app home screen.

## 14. Technical Standards

### 14.1 Web Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Framer Motion where appropriate
- next/image
- semantic HTML

### 14.2 Implementation Requirements

- all reusable UI in shared components
- page content driven by structured data
- no hardcoded repeated styling
- no duplicate component variants for the same purpose
- responsive from the start
- accessible by default
- performance-first approach

### 14.3 Web SEO Requirements

- metadata per page
- Open Graph support
- structured content headings
- internal linking
- clean URLs
- image alt text

## 15. Accessibility Standards

- visible focus states
- keyboard operable controls
- sufficient colour contrast
- reduced motion support
- semantic headings
- labels for form fields
- meaningful alt text
- screen-reader friendly nav and dialogs

## 16. Motion Standards

Use motion only when it improves comprehension or perceived quality.

Default motion:

- duration: short
- easing: gentle
- distance: small

## 17. QA Checklist

Before a task is marked complete, verify:

- design tokens used consistently
- components are reusable
- mobile presentation feels native
- web presentation feels editorial
- content hierarchy is clear
- spacing is consistent
- text is readable
- images are optimised
- accessibility passes
- code is maintainable
- no hardcoded theme values remain

## 18. Build Phases

### Phase 1

Create the project scaffold, tokens, shared layout, and core primitives.

### Phase 2

Build the web homepage and shared marketing sections.

### Phase 3

Build the core web content pages and tool pages.

### Phase 4

Create the mobile app presentation rules and app-specific navigation shell.

### Phase 5

Adapt the shared system for Android and iOS using native patterns.

## 19. Codex Workflow Rules

Codex must:

1. read this master pack first
2. inspect the repository before coding
3. create an implementation plan before large changes if needed
4. keep changes aligned with the design system
5. use shared components and tokens
6. avoid inventing new UI language
7. preserve web and mobile separation
8. summarise files changed after implementation

## 20. Anti-Patterns

Do not:

- build a webpage and call it a mobile app
- copy web layout into Android or iOS without redesign
- add random colours or borders
- add unnecessary animation
- create one-off components without reason
- hardcode visual values
- use AI-generated final imagery
- mix incompatible illustration styles

## 21. Future Expansion

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

The system should scale without breaking visual coherence.

---

# HOME PAGE IMPLEMENTATION NOTES

The homepage implementation must remain consistent with the master spec and platform strategy.

- Web homepage: editorial and SEO-rich
- Mobile app home: compact, task-oriented, and native
- Same brand system, different presentation
- The content model should support both surfaces without rewriting the brand language

---

# PLATFORM DESIGN STRATEGY

## Shared Rules

The following are shared across web, Android, and iOS:

- brand voice
- design tokens
- typography hierarchy
- iconography style
- image treatment
- component naming
- motion language
- content taxonomy

## Web Rules

- wide layouts
- hover states
- multi-column storytelling
- long-scroll sections
- full footer
- SEO content depth

## Android Rules

- compact discovery home
- bottom navigation
- large tap targets
- bottom sheets
- quick actions
- concise cards
- native gestures

## iOS Rules

- tab bar or native equivalent
- large titles where relevant
- smooth sheet interaction
- compact but premium cards
- native-feeling transitions

---

# PROJECT REQUIREMENTS

AskChetna must satisfy:

- premium visual design
- responsive web implementation
- native-feeling mobile presentation
- reusable component architecture
- data-driven content structure
- accessibility compliance
- fast performance
- SEO readiness
- maintainable codebase

---

# CODEx MASTER PROMPT

Use the attached master pack as the authoritative source.

## Prompt Objectives

- build the web implementation first
- keep the architecture reusable for Android and iOS
- make the web UI editorial and premium
- make future mobile layouts native, not web-like

## Prompt Rules

- use design tokens only
- do not invent new visual language
- do not create one-off components if reusable components can solve the problem
- keep the homepage calm, premium, and editorial
- keep mobile app presentation native and compact
- use semantic HTML and accessibility best practices

## Implementation Order

1. scaffold the project
2. create design tokens
3. create shared layout and primitives
4. build the homepage
5. prepare the architecture for future web pages
6. document how Android and iOS should adapt the same system

---

# END OF MASTER PACK
