# HOMEPAGE IMPLEMENTATION SPECIFICATION

---

| Property | Value |
|----------|-------|
| Project | AskChetna Premium Redesign |
| Document | Homepage Implementation Specification |
| Version | 1.0.0 |
| Status | Production Ready |
| Framework Target | Next.js 15 + React + TypeScript + Tailwind CSS |
| Dependencies | MASTER_DESIGN_SPECIFICATION.md, DESIGN_TOKENS.md, HOMEPAGE_BLUEPRINT.md |

---

# Purpose

This document defines the exact implementation requirements for the AskChetna homepage.

Unlike the Homepage Blueprint, this document specifies:

- Component hierarchy
- Layout behaviour
- Responsive behaviour
- Assets
- Animation
- Accessibility
- Coding expectations
- Component relationships

This document should be considered the implementation contract for frontend development.

---

# Page Overview

The homepage has four primary goals.

1. Build trust within 5 seconds.
2. Clearly communicate what AskChetna offers.
3. Encourage exploration of AI-powered guidance tools.
4. Drive users toward meaningful interaction.

---

# Overall Component Hierarchy

```text
<AppLayout>

├── AnnouncementBar
├── HeaderNavigation

└── Main

    ├── HeroSection

    ├── FeaturedAIToolsSection

    ├── WhyAskChetnaSection

    ├── HowItWorksSection

    ├── GuidanceCategoriesSection

    ├── FeaturedAssistantSection

    ├── TestimonialsSection

    ├── LatestArticlesSection

    ├── NewsletterSection

    └── Footer
```

---

# Global Page Rules

## Maximum Width

1280px

---

## Container

```text
width: 100%

max-width: 1280px

margin: auto

padding-inline: responsive
```

---

## Section Spacing

Desktop

120px

Tablet

96px

Mobile

72px

---

## Vertical Rhythm

Every section should visually breathe.

Never stack sections tightly.

---

# SECTION 01

# Announcement Bar

## Height

40px Desktop

44px Mobile

---

## Content

Maximum

1 sentence

Examples

Platform announcement

Feature release

Holiday notice

Offer

---

## Structure

```text
AnnouncementBar

├── Text

└── Close Button
```

---

## Behaviour

Dismissible

Sticky

Accessible

Keyboard operable

---

# SECTION 02

# Header Navigation

## Height

88px

---

## Layout

```text
Logo

Navigation

Search

Login

Primary Button
```

---

## Navigation Items

Home

AI Tools

Guidance

Resources

About

Contact

---

## Behaviour

Transparent over hero

↓

Solid after scroll

↓

Sticky

---

## Mobile

Hamburger

↓

Full-screen drawer

↓

Accordion menu

---

# SECTION 03

# Hero Section

Purpose

Immediately answer

What is AskChetna?

Why should I trust it?

What can I do?

---

## Layout

Desktop

```text
45%

Content

|

55%

Editorial Image
```

---

Mobile

```text
Image

↓

Heading

↓

Description

↓

Buttons
```

---

## Left Side

Contains

Eyebrow Text

Heading

Paragraph

CTA

Secondary CTA

Trust Row

---

## Hero Heading

Maximum

2 lines

Large typography

Editorial serif

---

## Description

Maximum

3 lines

Readable

No marketing fluff

---

## CTA

Primary

Start Exploring

Secondary

Learn More

---

## Trust Row

Privacy First

AI Powered

Human Centred

Secure

---

## Right Side

Editorial Photography

Decorative Illustration

Floating Cards

---

## Floating Cards

Example

"Trusted Guidance"

"Private"

"Available 24/7"

Subtle.

Do not overuse.

---

## Hero Image Requirements

Real human.

Warm lighting.

Natural environment.

Editorial composition.

Never use

AI faces

3D renders

Illustration-only hero

---

# SECTION 04

# Featured AI Tools

Purpose

Introduce core capabilities.

---

## Grid

Desktop

3 Columns

Tablet

2

Mobile

1

---

## Card Layout

```text
Icon

Title

Description

Arrow
```

---

## Cards

AI Chat

Tarot

Birth Chart

Compatibility

Dream Interpretation

Numerology

---

## Behaviour

Entire card clickable.

Hover

Lift

Border highlight

Soft shadow

---

# SECTION 05

# Why AskChetna

Purpose

Explain platform value.

---

## Layout

Image

+

Content Grid

---

## Value Cards

AI Powered

Thoughtfully Designed

Private

Reliable

Available Anytime

Personalised

---

# SECTION 06

# How It Works

Three cards

Step 01

Choose

↓

Step 02

Ask

↓

Step 03

Receive Guidance

---

Cards contain

Number

Title

Description

---

# SECTION 07

# Categories

Purpose

Allow browsing.

---

Grid

Desktop

4 columns

Tablet

2

Mobile

2

---

Categories

Career

Relationships

Health

Finance

Learning

Spirituality

Mindfulness

Growth

---

# SECTION 08

# Featured Assistant

Purpose

Demonstrate actual product.

---

Contains

Screenshot

Explanation

Feature List

CTA

---

Screenshot

Real product UI.

Never mock with fake chat.

---

# SECTION 09

# Testimonials

Desktop

3 Cards

Tablet

2

Mobile

1

---

Each card

Avatar

Name

Role

Review

Rating

---

Reviews

Maximum

90 words

---

# SECTION 10

# Latest Articles

Desktop

3 columns

---

Each card

Image

Category

Title

Reading Time

CTA

---

# SECTION 11

# Newsletter

Single input

Button

Privacy text

---

Maximum width

640px

---

# SECTION 12

# Footer

Four columns

Company

Resources

AI Tools

Legal

---

Bottom Row

Copyright

Social

Policies

---

# Component Mapping

| Section | Component |
|----------|-----------|
| Announcement | AnnouncementBar |
| Navigation | HeaderNavigation |
| Hero | HeroSection |
| AI Tools | ToolGrid |
| Why Us | FeatureGrid |
| Process | StepsSection |
| Categories | CategoryGrid |
| Assistant | ProductShowcase |
| Testimonials | TestimonialGrid |
| Articles | BlogGrid |
| Newsletter | NewsletterCTA |
| Footer | Footer |

---

# Required Assets

Hero Image

1

---

Section Images

5–8

---

Category Icons

8

---

Decorative Illustrations

10–15

---

Background Textures

3–5

---

Botanical Decorations

15+

---

# Animation Rules

Fade Up

Cards

Fade

Buttons

Scale 1.03

Images

Fade

Navigation

Slide

No animation longer than

400ms

---

# Accessibility

All buttons keyboard accessible.

Alt text required.

ARIA labels required.

Heading hierarchy correct.

WCAG AA minimum.

Focus visible.

Reduced motion supported.

---

# Performance

Use

next/image

WebP

AVIF

Lazy Loading

No autoplay video

No blocking JavaScript

No oversized images

---

# Codex Instructions

When generating this page:

1. Build layout before styling.
2. Use design tokens only.
3. Build reusable components.
4. Never hardcode colours.
5. Never hardcode spacing.
6. Use semantic HTML.
7. Ensure mobile-first responsiveness.
8. Optimise all images.
9. Validate accessibility before completion.
10. Match the visual language defined in MASTER_DESIGN_SPECIFICATION.md.

---

# Acceptance Criteria

The homepage implementation is complete only if:

- All sections are implemented.
- Components are reusable.
- Responsive behaviour matches specification.
- Accessibility passes WCAG AA.
- Performance target is maintained.
- Visual language is consistent.
- Real editorial imagery is integrated.
- Design tokens are used throughout.

---

End of Document