# APS-001 — PROJECT FOUNDATION

Part 02 of 05

Version: 0.1.0

Status: Draft

Classification: Internal Product Specification

---

# SECTION 5

# Product Boundaries

## Purpose

This section defines what AskChetna IS and what it IS NOT.

These boundaries prevent future feature creep and ensure every design and engineering decision aligns with the product vision.

---

# AskChetna IS

✓ AI-powered guidance platform

✓ Personal reflection platform

✓ Self-discovery platform

✓ Educational platform

✓ Productivity companion

✓ Decision support platform

✓ Knowledge platform

✓ Personal growth platform

---

# AskChetna IS NOT

✗ Social Media

✗ Dating Platform

✗ Fortune Telling Website

✗ Gambling Product

✗ Entertainment-first Platform

✗ Religious Platform

✗ Medical Platform

✗ Financial Advisory Platform

✗ Legal Advisory Platform

---

# Product Responsibilities

AskChetna should

Help users think.

Help users reflect.

Help users learn.

Help users organise thoughts.

Help users explore possibilities.

Help users make informed decisions.

---

# Product Limitations

The platform must never imply certainty.

Responses should encourage thoughtful decision making rather than claiming absolute truth.

The UI should reinforce this philosophy.

---

# SECTION 6

# Stakeholders

Every product decision should satisfy one or more stakeholders.

---

## Primary User

Visitors seeking thoughtful AI guidance.

Priority

★★★★★

---

## Returning User

Uses AskChetna regularly.

Priority

★★★★★

---

## Subscriber

Pays for premium features.

Priority

★★★★★

---

## Content Team

Creates articles.

Manages educational resources.

Priority

★★★★☆

---

## Product Team

Defines UX.

Reviews quality.

Priority

★★★★★

---

## Engineering Team

Implements platform.

Maintains architecture.

Priority

★★★★★

---

## AI Coding Agent

Codex

Claude Code

Cursor

Gemini CLI

Priority

★★★★★

Every APS document should be written so an AI coding assistant can implement it.

---

# SECTION 7

# Product Ecosystem

AskChetna consists of multiple products sharing a common design system.

---

## Platform 1

Website

Purpose

Discovery

SEO

Education

Conversion

---

## Platform 2

Android

Purpose

Daily engagement.

Quick actions.

Notifications.

Offline usage.

---

## Platform 3

iOS

Purpose

Native mobile experience.

Fast interaction.

Apple ecosystem integration.

---

## Future Platform

Admin Portal

Purpose

Content management.

Analytics.

User administration.

---

## Future Platform

API

Purpose

Third-party integrations.

Partner applications.

Automation.

---

# Product Relationship

```
                AskChetna

                     │

     ┌───────────────┼───────────────┐

     │               │               │

 Website         Android          iOS

     │               │               │

     └───────────────┼───────────────┘

                     │

              Shared Design System

                     │

              Shared Component Library

                     │

               Shared Asset Library

                     │

               Shared AI Guidelines
```

---

# SECTION 8

# User Personas

The product should always optimise for real user needs.

---

## Persona A

Explorer

Age

18-30

Goals

Curiosity

Learning

Exploration

Needs

Easy onboarding.

Friendly language.

Minimal friction.

---

## Persona B

Professional

Age

25-50

Goals

Career

Productivity

Decision support.

Needs

Fast results.

Clear interface.

Reliable information.

---

## Persona C

Returning Member

Already trusts AskChetna.

Uses platform daily.

Needs

Speed.

History.

Saved items.

Personal dashboard.

---

## Persona D

Premium Subscriber

Invests financially.

Needs

High quality.

Exclusive features.

Excellent UX.

Reliable performance.

---

# SECTION 9

# Core User Problems

Every feature should solve at least one problem.

---

Problem 001

"I don't know where to begin."

Solution

Strong homepage.

Simple navigation.

Guided onboarding.

---

Problem 002

"There is too much information."

Solution

Editorial layouts.

Whitespace.

Progressive disclosure.

---

Problem 003

"I don't trust AI."

Solution

Real photography.

Professional writing.

Explain reasoning.

Transparent UX.

---

Problem 004

"I don't have much time."

Solution

Quick actions.

Saved history.

Continue where you left off.

---

Problem 005

"I feel overwhelmed."

Solution

Calm design.

Limited choices.

Readable typography.

Simple interactions.

---

# SECTION 10

# Success Metrics

Business Metrics

Increase user engagement.

Increase returning visitors.

Increase premium conversions.

Increase session duration.

---

UX Metrics

Lower bounce rate.

Higher completion rate.

Lower navigation errors.

Higher task success.

---

Engineering Metrics

Reusable components.

Reduced duplication.

Token-based styling.

Maintainability.

---

Performance Metrics

Lighthouse 95+

Accessibility WCAG AA

Core Web Vitals

Responsive across all devices.

---

# SECTION 11

# Non Goals

The following are explicitly outside product scope.

- Build social network features.

- Encourage addictive usage patterns.

- Use manipulative dark patterns.

- Force unnecessary signups.

- Overcomplicate navigation.

- Copy competitors.

- Depend on AI generated visual identity.

- Use intrusive advertisements.

- Sacrifice accessibility for aesthetics.

---

# Decision Register

APS-DEC-004

Decision

Every new feature must solve a documented user problem.

Status

Approved.

---

APS-DEC-005

Decision

Every platform shares one design language while maintaining native UX.

Status

Approved.

---

APS-DEC-006

Decision

Homepage exists to build trust before conversion.

Status

Approved.

---

End of APS-001

Part 02

Status

Draft

Not Approved

Awaiting Parts 03–05