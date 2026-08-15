# AskChetna Premium Redesign Master Pack

> **Version:** 1.1.0  
> **Status:** Consolidated Project Documentation  
> **Purpose:** Single-file repository for design, architecture, homepage implementation, component specifications, and multi-platform presentation rules.

---

# Table of Contents

1. [README](#readme)
2. [Master Design Specification](#master-design-specification)
3. [Site Architecture](#site-architecture)
4. [Project Requirements](#project-requirements)
5. [Design Tokens](#design-tokens)
6. [Homepage Blueprint](#homepage-blueprint)
7. [Homepage Implementation Specification](#homepage-implementation-specification)
8. [Component Library](#component-library)
9. [Platform Design Strategy](#platform-design-strategy)

---

# README

## Overview

This document package contains the complete design, UX, frontend architecture, visual guidelines, and AI coding instructions required to redesign AskChetna across web, Android, and iOS.

This is the single source of truth for the redesign. Every design decision, UI component, colour, typography rule, animation, layout, image style, and coding standard should align with the documents in this file.

The goal is to ensure that every AI coding tool and every human developer follows the same design language throughout the project, while allowing each platform to present that language in a native way.

## Project Goal

Create one of the most premium AI-powered guidance platforms across web and mobile.

The redesigned website should feel:

- Calm
- Elegant
- Editorial
- Human
- Warm
- Modern
- Premium
- Trustworthy

The experience should never feel like a generic AI-generated website.

## Design Philosophy

Design should communicate trust before functionality.

Visitors should immediately feel that AskChetna is carefully crafted, thoughtful, and professional. The interface should disappear into the background so users can focus on guidance, self-discovery, and learning.

The shared design system must work across web, Android, and iOS, but the presentation on each platform must feel native rather than copied from another surface.

## Primary Objectives

- Completely redesign the visual identity
- Build a reusable design system
- Create a scalable component library
- Standardise every UI element
- Improve usability
- Improve accessibility
- Improve responsiveness
- Improve SEO
- Improve frontend performance
- Create documentation suitable for AI-assisted development
- Support platform-specific presentation for web, Android, and iOS

## Project Principles

1. Simplicity before decoration.
2. Editorial layouts over traditional landing pages.
3. Real photography over AI-generated artwork.
4. Human-centred design.
5. Calm interfaces.
6. Large whitespace.
7. Elegant typography.
8. Consistent components.
9. Accessibility first.
10. Performance first.
11. Design system first, platform presentation second.

## Repository Structure

```text
askchetna-design-system/

README.md
MASTER_DESIGN_SPECIFICATION.md
PROJECT_REQUIREMENTS.md
SITE_ARCHITECTURE.md
DESIGN_TOKENS.md
PLATFORM_DESIGN_STRATEGY.md

05_Page_Blueprints/HOMEPAGE_BLUEPRINT.md
05_Page_Blueprints/HOMEPAGE_IMPLEMENTATION_SPEC.md
04_UI_Components/COMPONENT_LIBRARY.md

platforms/
  web/
  android/
  ios/

prompts/
  CODEX_MASTER_PROMPT.md
```

## Documentation Standards

Every document should include:

- Title
- Version
- Status
- Last Updated
- Purpose
- Scope
- References
- Notes
- Revision History

## Design Source of Truth

`MASTER_DESIGN_SPECIFICATION.md` controls the complete redesign. If there is any conflict, the master specification wins.

## Technology Direction

The frontend implementation is expected to use modern technologies for the web surface:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- shadcn/ui where appropriate
- next/image
- MDX optional

The design system must remain reusable for Android and iOS clients, even when their implementation uses native platform toolkits later.

## Image Strategy

Preferred assets include:

- Editorial photography
- Commissioned illustrations
- Botanical artwork
- Natural textures
- Premium iconography

All visual assets should follow one consistent artistic direction.

## Success Criteria

The redesign is complete when:

- Every page follows the same design language
- Every component is reusable
- Every image follows the image guide
- Every animation follows the motion guide
- Every page passes accessibility review
- Every page is responsive
- Lighthouse score exceeds 95 where practical
- Documentation is sufficient for AI-assisted development without ambiguity

---

# MASTER DESIGN SPECIFICATION

## Document Control

| Property | Value |
|---|---|
| Project | AskChetna Premium Redesign |
| Version | 1.0.0 |
| Status | In Progress |
| Owner | AskChetna |
| Document Type | Master Design Specification |
| Purpose | Single Source of Truth for Complete Website Redesign |

## Table of Contents

1. Introduction
2. Design Vision
3. Brand Identity
4. Design DNA
5. Design Constraints

## 1. Introduction

This document defines every visual, structural and interaction rule used throughout the AskChetna platform. Every designer, developer and AI coding assistant must follow this specification. If something is not documented here, it should not be invented during implementation.

AskChetna is not designed to look like an AI product. It is designed to feel like a premium editorial publication that happens to be powered by AI.

The website should create the same emotional response as walking into a beautifully designed bookstore, a premium wellness studio, a luxury journal shop, or a quiet reading room.

## 2. Design Vision

Create the most elegant AI guidance platform available on the web.

The interface should disappear and the content should become the focus. Whitespace is an active design element. Every section should breathe.

The design formula is:

Editorial Layout + Luxury Wellness + Human Photography + Modern Frontend + Minimal Ornamentation = AskChetna

## 3. Brand Identity

AskChetna combines thoughtful guidance with modern AI technology. It supports users in reflection, learning, planning and self-discovery through intelligent tools presented in a calm and trustworthy environment.

### Brand Values

- Trust
- Clarity
- Simplicity
- Warmth
- Consistency
- Longevity

### Brand Personality

If AskChetna were a person, it would be:

Calm, Intelligent, Patient, Warm, Thoughtful, Elegant, Curious, Supportive, Grounded, Authentic.

Never:

Aggressive, Pushy, Flashy, Fear-based, Overly mystical, Sales-driven.

## 4. Design DNA

Mandatory rules:

1. Everything must feel handcrafted.
2. Photography always has priority over illustration.
3. Editorial typography is the hero.
4. Every page uses the same rhythm.
5. Every component should be reusable.
6. Every design decision should increase trust.
7. Decoration should never compete with content.
8. The interface should encourage slower reading.

## 5. Design Constraints

Prohibited unless explicitly approved:

- Neon colours
- Heavy gradients
- Glassmorphism
- Excessive blur
- Cartoon illustrations
- Generic AI artwork
- Random icon styles
- Different radius values across components
- Different shadows across pages
- Multiple button styles solving the same purpose
- Decorative animations
- Infinite scrolling effects
- Autoplay video backgrounds
- Flashing elements
- Text over busy images
- Inconsistent spacing


## 6. Platform Design Strategy

AskChetna is a multi-platform product. The shared brand system is the same across all surfaces, but the presentation must adapt to the platform.

### Shared Across All Platforms

- colour tokens
- typography scale and hierarchy
- photography style
- illustration style
- icon style
- motion language
- tone of voice
- accessibility expectations
- design principles

### Web Presentation Rules

The web experience should feel editorial and content-rich.

Use:

- large hero compositions
- multi-column layouts
- scrolling narrative sections
- hover interactions
- keyboard-first navigation
- SEO-oriented content hierarchy
- footer-heavy information architecture

The website may use broader storytelling, richer content blocks, and denser information than the mobile apps.

### Android Presentation Rules

Android should feel like a native app, not a webpage scaled down.

Use:

- bottom navigation
- concise cards
- quick actions
- gesture-friendly controls
- compact headers
- native sheets and dialogs when appropriate
- short, task-oriented flows

Avoid copying long webpage sections into the app home screen.

### iOS Presentation Rules

iOS should follow native iOS expectations.

Use:

- tab bar navigation
- large title patterns where suitable
- native transitions
- swipe-friendly interactions
- compact content grouping
- clean and calm list structures
- platform-appropriate controls

Do not mirror the web homepage layout directly inside the app.

### App Home Rule

Mobile app home screens should be action-oriented, not page-oriented.

They should prioritise:

- current guidance
- quick access to tools
- recent activity
- saved items
- alerts or reminders
- personalised shortcuts

The app home should feel like a product dashboard or guidance hub, not a homepage article.

### Implementation Rule

Build shared UI language first, then adapt presentation patterns per platform.

Do not hardcode web-only assumptions into the design system.
Do not force mobile apps to imitate website layouts.
Do not force the website to mimic app navigation patterns.

---

# SITE ARCHITECTURE

## Document Control

| Property | Value |
|---|---|
| Project | AskChetna Premium Redesign |
| Version | 1.0.0 |
| Status | Draft |
| Document Type | Information Architecture |
| Owner | AskChetna |

## Purpose

This document defines the complete information architecture of AskChetna. It acts as the blueprint for navigation, sitemap, page hierarchy, user journeys, internal linking, global layout consistency, and future scalability.

## Information Architecture Principles

1. Simple Navigation
2. Progressive Discovery
3. Consistency
4. Scalability
5. SEO Friendly

## Primary Navigation

- Home
- AI Tools
- Guidance
- Resources
- About
- Contact
- Search
- Login
- Get Started

## Homepage Structure

Hero -> Featured AI Tools -> Popular Categories -> How AskChetna Works -> Why Trust AskChetna -> Featured Guidance -> Testimonials -> Latest Articles -> Newsletter -> Footer

## Global Sitemap

```text
/

├── Home

├── AI Tools
│   ├── Chat Assistant
│   ├── Birth Chart
│   ├── Compatibility
│   ├── Tarot
│   ├── Numerology
│   ├── Name Analysis
│   ├── Dream Interpretation
│   ├── Daily Guidance
│   ├── Journal
│   └── All Tools

├── Guidance
│   ├── Personal Growth
│   ├── Relationships
│   ├── Career
│   ├── Finance
│   ├── Health
│   ├── Spirituality
│   └── Mindfulness

├── Resources
│   ├── Blog
│   ├── Learning Centre
│   ├── FAQ
│   ├── Glossary
│   ├── Guides
│   └── News

├── Community
│   ├── Testimonials
│   ├── Stories
│   ├── Discussions
│   └── Newsletter

├── About
│   ├── Our Story
│   ├── Mission
│   ├── Team
│   ├── Privacy
│   ├── Terms
│   └── Contact

└── Account
    ├── Dashboard
    ├── Saved Readings
    ├── History
    ├── Settings
    └── Subscription
```

## Page Template Types

- Landing Page
- Listing Page
- Detail Page
- Interactive Tool
- Account Page

## Global Header Rules

Every page should contain:

- Logo
- Navigation
- Search
- Profile/Login
- Primary CTA

The header becomes sticky after scrolling.

## Global Footer

Every page shares the same footer containing quick links, popular tools, resources, company, legal, newsletter, and social links.

## URL Standards

Good:

```text
/ai-tools
/blog
/contact
/numerology
/dream-interpretation
```

Avoid:

```text
/page?id=14
/blog123
/service_new
/index.php?id=4
```

---

# PROJECT REQUIREMENTS

## Document Control

| Property | Value |
|---|---|
| Project | AskChetna Premium Redesign |
| Version | 1.0.0 |
| Status | Active |
| Owner | AskChetna |
| Document Type | Functional & Design Requirements |

## 1. Project Objective

Redesign AskChetna into a premium, modern, scalable AI-powered guidance platform with a consistent design language across all pages.

The redesign must improve:

- User Experience
- Visual Identity
- Performance
- Accessibility
- SEO
- Mobile Experience
- Code Maintainability
- Component Reusability

## 2. Existing Problems

### Visual

- Visual inconsistency between pages
- Limited design hierarchy
- Generic AI-generated appearance
- Weak premium feel
- Inconsistent section spacing
- Limited use of imagery
- Weak storytelling

### UX

- Homepage does not immediately communicate value
- Navigation hierarchy can be simplified
- Calls-to-action need better placement
- Better trust-building sections required
- Improve content discoverability

### Technical

- Components should become reusable
- Remove duplicated styling
- Introduce design tokens
- Standardise layouts
- Improve responsiveness
- Optimise images

## 3. Functional Requirements

### Homepage

- Hero Section
- Featured AI Tools
- Featured Categories
- Why AskChetna
- How It Works
- Testimonials
- Blog Preview
- Newsletter
- Footer

### AI Tools

Every tool page should support:

- Hero
- Description
- Tool Interface
- Related Guides
- FAQ
- CTA

### Blog

Each blog should include:

- Hero Image
- Author
- Date
- Reading Time
- Table of Contents
- Share Buttons
- Related Articles
- Related AI Tools

### Contact

- Support
- Contact Form
- Location optional
- FAQ

### About

- Mission
- Vision
- Story
- Values
- Platform Overview

## 4. Non-Functional Requirements

- Performance target: Lighthouse 95+
- Accessibility: WCAG AA
- Mobile-first responsive design
- SEO: semantic HTML, structured data, meta info, OpenGraph, Twitter cards, XML sitemap, robots.txt, canonical URLs
- Browser support: latest Chrome, Edge, Firefox, Safari

## 5. Design Requirements

The design must feel warm, premium, elegant, editorial, human, and trustworthy. Never corporate, generic, template-like, or overdesigned.

## 6. Image Requirements

Preferred:

- Real Photography
- Professional Portraits
- Editorial Lifestyle Images
- Custom Illustrations
- Botanical Decorations
- Paper Textures

Avoid:

- Fake AI Images
- Pixelated Graphics
- Random Stock Images
- Different Illustration Styles

## 7. Typography Requirements

Maximum of two font families: one serif and one sans serif. Clear hierarchy and excellent readability.

## 8. Colour Requirements

Neutral backgrounds, warm palette, natural colours, high contrast, accessible colour ratios. No neon colours and no overly saturated gradients.

## 9. Animation Requirements

Subtle motion only: fade, scale, slide, micro-interactions. No distracting animations.

## 10. Coding Requirements

Use TypeScript, React, Next.js App Router, Tailwind CSS. Avoid inline styling and duplicated code. Use semantic HTML and reusable components.

## 11. AI Coding Requirements

AI tools must read the design specification first, read the component library, read the design tokens, never invent colours or spacing, and always use existing components.

## 12. Success Metrics

- Every page follows the design system
- No inconsistent components exist
- Navigation is intuitive
- Homepage clearly communicates value
- Mobile experience is excellent
- Performance targets are achieved
- Documentation is complete
- AI tools can generate new pages consistently

## 13. Out of Scope

- Backend APIs
- Business logic
- Database design
- Authentication logic
- Payment gateway implementation
- AI model development
- Infrastructure
- Deployment

## 14. Deliverables

- Design System
- UI Kit
- Component Library
- Page Blueprints
- Prompt Library
- Visual Asset Guide
- Technical Documentation
- AI Coding Rules
- Frontend Architecture
- Production-ready UI Specifications

---

# DESIGN TOKENS

## Document Control

| Property | Value |
|---|---|
| Project | AskChetna Premium Redesign |
| Version | 1.0.0 |
| Status | Approved |
| Type | Design Foundation |
| Used By | Figma, Tailwind CSS, React, Next.js, Codex |

## Purpose

This document defines the design primitives used throughout the AskChetna platform. Every UI component must consume these tokens. Never hardcode values inside components.

## Token Naming Convention

```text
category-purpose-variant-state
```

Example:

```text
color-primary-500
spacing-xl
radius-lg
shadow-md
```

## Colour Tokens

### Primary Brand Colours

| Token | HEX | Usage |
|---|---|---|
| color-primary-50 | #FCF8F3 | Light backgrounds |
| color-primary-100 | #F7F0E7 | Page background |
| color-primary-200 | #EEDFCB | Cards |
| color-primary-300 | #D8C0A1 | Decorative elements |
| color-primary-400 | #C09A74 | Secondary accents |
| color-primary-500 | #A56E43 | Primary brand colour |
| color-primary-600 | #875732 | Hover |
| color-primary-700 | #6A4326 | Active |
| color-primary-800 | #4A2F1C | Dark |
| color-primary-900 | #2C1B10 | Deep accents |

### Neutral Colours

| Token | HEX |
|---|---|
| color-neutral-0 | #FFFFFF |
| color-neutral-50 | #FAFAF9 |
| color-neutral-100 | #F5F5F4 |
| color-neutral-200 | #E7E5E4 |
| color-neutral-300 | #D6D3D1 |
| color-neutral-400 | #A8A29E |
| color-neutral-500 | #78716C |
| color-neutral-600 | #57534E |
| color-neutral-700 | #44403C |
| color-neutral-800 | #292524 |
| color-neutral-900 | #1C1917 |

### Accent Colours

- Sage: #78866B
- Olive: #6B705C
- Terracotta: #B36A4C
- Gold: #C8A96A

### Semantic Colours

- Success: #5C8D5C
- Warning: #D9A441
- Danger: #B85450
- Info: #5E81AC

## Typography Tokens

### Heading Font

Cormorant Garamond, fallback Georgia, serif.

### Body Font

Inter, fallback System UI, sans-serif.

### Typography Scale

- Display XL: 64px
- Display L: 56px
- H1: 48px
- H2: 40px
- H3: 32px
- H4: 28px
- H5: 24px
- H6: 20px
- Body XL: 20px
- Body L: 18px
- Body: 16px
- Small: 14px
- Caption: 12px

### Font Weight

- Light: 300
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

### Line Height

- Display: 110%
- Heading: 120%
- Paragraph: 170%
- Small: 150%

## Spacing Tokens

Base unit: 8px

Scale:

```text
0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 72, 80, 96, 120, 160
```

## Container Widths

- Small: 640px
- Medium: 768px
- Large: 1024px
- XL: 1200px
- Maximum content width: 1280px

## Border Radius

- XS: 4px
- SM: 8px
- MD: 12px
- LG: 20px
- XL: 28px
- 2XL: 36px

Cards use 20px. Buttons and inputs use 12px.

## Border Width

- Hairline: 1px
- Standard: 1px
- Heavy: 2px

## Shadow Tokens

None, XS, SM, MD, LG, XL. Shadows must remain soft and natural.

## Icon Tokens

- Stroke: 1.5px
- Rounded ends
- Outline only
- Never filled

## Button Heights

- Small: 40px
- Medium: 48px
- Large: 56px
- Extra Large: 64px

## Input Heights

- Small: 40px
- Default: 48px
- Large: 56px

## Z Index Scale

- Dropdown: 100
- Sticky Header: 200
- Drawer: 300
- Modal: 500
- Toast: 700
- Tooltip: 900

## Motion Tokens

- Fast: 150ms
- Default: 250ms
- Slow: 400ms
- Very Slow: 600ms
- Ease: ease-out
- Default cubic-bezier: cubic-bezier(0.4,0,0.2,1)

## Grid

- Desktop: 12 columns
- Tablet: 8 columns
- Mobile: 4 columns

## Image Rules

- Hero: 16:9
- Card: 4:3
- Blog: 16:9
- Avatar: 1:1
- Gallery: 3:2
- Always use WebP and AVIF

## Component Rules

Every component must use design tokens, be reusable, responsive, accessible, dark-mode ready, and avoid hardcoded colours or spacing.

---

# HOMEPAGE BLUEPRINT (WEB)

## Document Control

| Property | Value |
|---|---|
| Page | Homepage |
| Version | 1.0.0 |
| Status | Approved |
| Layout Type | Editorial Landing Page |
| Max Width | 1280px |

## Purpose

The homepage has four primary objectives:

1. Build trust
2. Clearly communicate the platform
3. Encourage first interaction
4. Convert visitors into users

## Overall Flow

Announcement Bar -> Navigation -> Hero -> Featured AI Experiences -> Why AskChetna -> How It Works -> Popular Guidance Categories -> Featured AI Assistant -> Testimonials -> Latest Articles -> Newsletter -> Footer

## Section 01: Announcement Bar

- Height: 40px
- Dismissible
- Sticky
- Background: primary brand colour or a dark neutral
- Text: small and centered

## Section 02: Navigation

- Logo
- Navigation links
- Search
- Login
- Primary CTA
- Sticky after scrolling
- Transparent initially, solid after scroll

## Section 03: Hero Section

Layout: left content column, right editorial image column.

Hero should immediately communicate what AskChetna is, what it does, and why users should trust it.

### Suggested Structure

- Eyebrow
- Headline (max 2 lines)
- Subheadline (max 3 lines)
- Primary CTA
- Secondary CTA
- Trust row
- Editorial hero image
- Optional decorative botanical or celestial overlay

## Section 04: Featured AI Experiences

- AI Chat
- Tarot
- Birth Chart
- Compatibility
- Dream Analysis
- Numerology

Grid: 3 columns desktop, 2 tablet, 1 mobile.

## Section 05: Why AskChetna

Explain differentiation using proof cards and supporting editorial image.

## Section 06: How It Works

Three-step layout:

1. Choose
2. Ask
3. Receive Guidance

## Section 07: Popular Guidance Categories

- Career
- Relationships
- Personal Growth
- Health
- Finance
- Mindfulness
- Spirituality
- Learning

## Section 08: Featured AI Assistant

Large product preview, short explanation, feature list, CTA.

## Section 09: Testimonials

Editorial cards with real profile photos and concise testimonials.

## Section 10: Latest Articles

Three featured articles with cover image, category, title, reading time, CTA.

## Section 11: Newsletter

Single input, one button, privacy note.

## Section 12: Footer

Four-column layout: Company, Resources, AI Tools, Legal.

## Spacing

Section padding: 120px desktop, 72px mobile. Card gap: 32px. Container: 1280px.

## Animation

Fade into view. Cards lift subtly. Buttons may scale slightly on hover. Images fade only.

## Accessibility

Keyboard accessible CTAs, alt text for all images, proper heading hierarchy, WCAG AA contrast, visible focus states.

## Performance

Use next/image, WebP, AVIF, lazy loading, no autoplay video.

## Mobile Behaviour

All sections stack vertically. Navigation becomes a full-screen drawer. Buttons become full width where useful.

## Success Criteria

Within 10 seconds, users should know what AskChetna is, why to trust it, what they can do, and where to start.

---

# HOMEPAGE IMPLEMENTATION SPECIFICATION (WEB)

## Document Control

| Property | Value |
|---|---|
| Project | AskChetna Premium Redesign |
| Document | Homepage Implementation Specification |
| Version | 1.0.0 |
| Status | Production Ready |
| Framework Target | Next.js 15 + React + TypeScript + Tailwind CSS |
| Dependencies | Master Design Specification, Design Tokens, Homepage Blueprint |

## Purpose

This document defines the exact implementation requirements for the AskChetna homepage. It specifies component hierarchy, layout behaviour, responsive behaviour, assets, animation, accessibility, coding expectations, and component relationships.

## Page Overview

The homepage has four primary goals: build trust within 5 seconds, clearly communicate the offering, encourage exploration, and drive meaningful interaction.

## Overall Component Hierarchy

- AnnouncementBar
- HeaderNavigation
- HeroSection
- FeaturedAIToolsSection
- WhyAskChetnaSection
- HowItWorksSection
- GuidanceCategoriesSection
- FeaturedAssistantSection
- TestimonialsSection
- LatestArticlesSection
- NewsletterSection
- Footer

## Global Page Rules

- Maximum width 1280px
- Responsive container with comfortable padding
- Large section spacing on desktop and reduced spacing on mobile
- Maintain a calm editorial rhythm

## Section Requirements

### Announcement Bar

- Height: 40px desktop, 44px mobile
- Maximum 1 sentence
- Dismissible and accessible

### Header Navigation

- Logo, nav links, search, login, primary button
- Sticky
- Transparent over hero, solid after scroll
- Mobile drawer with accordion menu

### Hero Section

Two-column layout on desktop, stacked on mobile.

Left side includes eyebrow, heading, paragraph, CTAs, trust indicators.
Right side includes editorial photography and optional overlay cards.

### Featured AI Tools

Tool grid with cards for key experiences. Entire card clickable.

### Why AskChetna

Image plus proof-grid section explaining value and trust.

### How It Works

Three cards: Choose, Ask, Receive Guidance.

### Categories

Grid of browseable category cards.

### Featured Assistant

Product showcase with screenshot, explanation, feature list, CTA.

### Testimonials

Concise testimonial cards with avatar, name, role, rating if needed.

### Latest Articles

Magazine-style article previews.

### Newsletter

Single field form, privacy note, success and error states.

### Footer

Structured multi-column footer with brand summary and links.

## Responsive Behaviour

- Desktop: split hero, multi-column grids, persistent navigation
- Tablet: reduce columns where necessary
- Mobile: stacked sections, full-screen nav drawer, readable text blocks, full-width CTAs where useful

## Motion Rules

Fade and gentle translate only. Respect reduced motion. Avoid bounce, parallax-heavy effects, and decorative motion without purpose.

## Accessibility Rules

All images need alt text unless decorative, all controls must be keyboard accessible, focus visibility must be clear, and WCAG AA contrast must be maintained.

## Performance Rules

Use optimised image formats, lazy loading, avoid autoplay video, and keep the first screen light and fast.

## Reusable Components Required

- AnnouncementBar
- HeaderNav
- HeroSplitFeature
- FeatureCard
- ProofCard
- StepCard
- CategoryCard
- TestimonialCard
- ArticleCard
- NewsletterForm
- FooterColumns

## Acceptance Criteria

- Sections implemented in the approved order
- Components are reusable
- Responsive behaviour matches specification
- Accessibility passes WCAG AA
- Performance target is maintained
- Visual language is consistent
- Real editorial imagery is integrated
- Design tokens are used throughout

---

# COMPONENT LIBRARY

## Purpose

This document defines the reusable UI components for AskChetna. Every page should be built from these components wherever possible.

## Component Design Rules

1. Use design tokens only.
2. Keep components small and composable.
3. Support responsive behaviour by default.
4. Include accessible semantics and keyboard support.
5. Use a single visual language across all components.
6. Avoid duplicate components that solve the same problem.
7. Prefer variants over one-off special cases.
8. Keep motion subtle and consistent.
9. Keep props explicit and minimal.
10. Do not hardcode colours, spacing, radii, or typography values.

## Shared Component States

- default
- hover
- focus
- active
- disabled
- loading
- error
- success
- selected

## 1. Button

### Purpose

Primary call-to-action and secondary action trigger.

### Variants

- primary
- secondary
- ghost
- outline
- link
- icon

### Sizes

- sm
- md
- lg

### Props

```ts
type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'link' | 'icon'
  size?: 'sm' | 'md' | 'lg'
  href?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
  children: ReactNode
}
```

### Behaviour

Primary button is used for the main action only. Secondary is for supporting actions. Loading state shows spinner and prevents duplicate clicks.

### Accessibility

Use button semantics for buttons and anchor semantics for links. Icon-only buttons require aria-label.

## 2. Card

### Purpose

Generic container for content modules, previews, and summaries.

### Variants

- default
- elevated
- outlined
- feature
- article
- testimonial
- category

### Props

```ts
type CardProps = {
  variant?: 'default' | 'elevated' | 'outlined' | 'feature' | 'article' | 'testimonial' | 'category'
  clickable?: boolean
  children: ReactNode
  className?: string
}
```

### Behaviour

Cards should feel soft, premium, and calm. Hover may slightly lift or strengthen the border.

## 3. Input

Text entry for forms and signup interactions. Each input must have a visible label and linked error states.

## 4. Text Area

Multi-line user input for longer messages or notes.

## 5. Select

Single-choice dropdown selector. Use native select where possible.

## 6. Badge

Small contextual label for status, category, or highlight.

## 7. Avatar

Display user profile images or initials.

## 8. Section Heading

Standard section introduction block with eyebrow, title, description, optional action.

## 9. Feature Card

Showcase a capability, benefit, or service.

## 10. Tool Card

Display an AI tool or interactive experience. Entire card should be clickable.

## 11. Testimonial Card

Display trust-building social proof.

## 12. Article Card

Preview a blog article or editorial piece.

## 13. Category Card

Display a topic area such as Career, Relationships, or Mindfulness.

## 14. Navbar

Primary global navigation container with logo, links, search, login, CTA, mobile trigger.

## 15. Footer

Global site footer with structured navigation and brand context.

## 16. Hero Split Layout

Reusable homepage and landing-page hero with content column and media column.

## 17. Newsletter Form

Email capture block with single input, button, and privacy note.

## 18. Divider / Ornament

Light decorative separator used sparingly between sections.

## 19. Stats / Proof Item

Display concise proof points.

## 20. Tabs

Switch between related views or categories.

## 21. Accordion

Expand and collapse content, especially for FAQs.

## 22. Search Field

Global search or content search.

## 23. Empty State

Shown when no data is available.

## 24. Loading State / Skeleton

Subtle skeleton blocks matching the final layout.

## Responsive Behaviour Standard

Mobile-first, comfortable touch targets, no overflow, clean reflow, no distorted media, and graceful grid collapse.

## Accessibility Standard

Keyboard navigation, appropriate ARIA, contrast requirements, semantic HTML, visible focus, reduced motion support.

## Motion Standard

Subtle, short, functional motion only: fade, slight translate, gentle scale, border emphasis.

## Component Usage Rule

If a component can solve the problem for more than one page, it belongs in this library. If it is only useful once, avoid it unless there is a strong reason.

---

# END OF MASTER PACK
