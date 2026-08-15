# APS-001 — PROJECT FOUNDATION

Part 03 of 05

Version: 0.1.0

Status: Draft

Classification: Internal Product Specification

---

# SECTION 12

# Product Principles

Purpose

Product Principles are permanent rules.

Every future decision should be validated against these principles.

If a decision violates one of these principles, the decision must be reconsidered.

---

## PP-001

Technology should never become the centre of the experience.

The user should remember the guidance.

Not the interface.

---

## PP-002

The interface should reduce cognitive load.

Every screen should answer only one primary question.

Avoid presenting multiple competing actions.

---

## PP-003

Consistency creates trust.

Buttons.

Cards.

Spacing.

Language.

Photography.

Illustrations.

Everything should feel like one product.

---

## PP-004

The product should guide.

Never manipulate.

Avoid:

- urgency
- fear
- dark patterns
- misleading wording

---

## PP-005

Accessibility is mandatory.

Accessibility is not an enhancement.

It is part of the product.

---

## PP-006

Performance is a feature.

A fast experience builds trust.

Every implementation decision should consider performance.

---

## PP-007

Every feature must justify its existence.

Before building a feature ask

What user problem does it solve?

If the answer is unclear,

do not build it.

---

## PP-008

Real human content takes priority over artificial decoration.

Real photography.

Professional writing.

Thoughtful interactions.

Human illustrations.

Never visual noise.

---

# Acceptance Criteria

✓ Every future APS volume references these principles.

✓ Every implementation decision can be traced back to one or more principles.

---

# SECTION 13

# Product Goals

The goals below define what success looks like over the lifetime of AskChetna.

---

## Goal G-001

Build the most trusted AI guidance platform.

---

## Goal G-002

Provide an exceptional cross-platform experience.

Users should immediately recognise AskChetna on:

- Web
- Android
- iOS

while each platform still feels native.

---

## Goal G-003

Maintain one unified design language.

No platform should invent its own branding.

---

## Goal G-004

Reduce engineering effort through reuse.

Components.

Assets.

Tokens.

Documentation.

Prompts.

Everything should be reusable.

---

## Goal G-005

Ensure future scalability.

The platform should support:

- AI tools
- Courses
- Marketplace
- Community
- Mobile Apps
- APIs
- Admin Portal

without redesigning the product.

---

# Requirement Register

REQ-001

Every page must belong to a documented user journey.

Priority

Critical

---

REQ-002

Every component must exist in the Component Library.

Priority

Critical

---

REQ-003

Every colour must come from the Design Token System.

Priority

Critical

---

REQ-004

Every interaction must satisfy accessibility standards.

Priority

Critical

---

REQ-005

Every platform must share one design language.

Priority

Critical

---

# SECTION 14

# Multi Platform Strategy

Purpose

Define how one product becomes multiple native experiences.

---

## Shared Across Every Platform

Brand

Typography

Photography

Illustration

Design Tokens

Component Philosophy

Motion Language

Accessibility

Content Tone

Information Architecture

---

## Website

Primary Goal

Discovery.

Education.

Conversion.

Characteristics

Editorial.

Large layouts.

Long-form content.

Rich storytelling.

SEO.

---

## Android

Primary Goal

Daily engagement.

Characteristics

Fast.

Gesture friendly.

Bottom navigation.

Material behaviour.

Quick actions.

Native controls.

---

## iOS

Primary Goal

Premium mobile experience.

Characteristics

Human Interface Guidelines.

Large titles.

Native transitions.

Bottom tabs.

Apple conventions.

---

# Platform Rules

Never copy the website directly into the mobile application.

Instead

Reuse

- Design language
- Components
- Content
- Assets

Adapt

- Layout
- Navigation
- Gestures
- Interactions

---

# Acceptance Criteria

Users should immediately recognise AskChetna across all platforms.

However,

no platform should feel like another platform squeezed into a different screen.

---

# SECTION 15

# Product Constraints

These constraints are intentionally strict.

---

Constraint C-001

No platform-specific branding.

---

Constraint C-002

No duplicated design systems.

---

Constraint C-003

No duplicate component solving the same purpose.

---

Constraint C-004

No AI-generated visual identity.

---

Constraint C-005

No inconsistent navigation patterns within the same platform.

---

Constraint C-006

No inaccessible interactions.

---

Constraint C-007

No feature may bypass the documented design system.

---

Constraint C-008

Every future feature requires APS documentation before implementation.

---

# SECTION 16

# Risks

Risk R-001

Design inconsistency.

Mitigation

Single Design System.

---

Risk R-002

Feature creep.

Mitigation

Requirement Register.

---

Risk R-003

Poor AI implementation.

Mitigation

Detailed APS documentation.

---

Risk R-004

Platform divergence.

Mitigation

Shared Design Language.

---

Risk R-005

Future maintenance cost.

Mitigation

Reusable components.

---

# SECTION 17

# Assumptions

A-001

Real editorial photography will be available.

---

A-002

Custom illustrations will be created in a consistent style.

---

A-003

All future engineering follows APS.

---

A-004

Android and iOS will be developed after the web foundation.

---

A-005

Codex implementation will use APS as the authoritative source.

---

# Decision Register

APS-DEC-007

Every implementation starts with documentation.

Approved.

---

APS-DEC-008

Shared Design System.

Platform-specific UX.

Approved.

---

APS-DEC-009

One Component Library.

Multiple Platforms.

Approved.

---

End of APS-001

Part 03

Status

Draft

Awaiting Part 04