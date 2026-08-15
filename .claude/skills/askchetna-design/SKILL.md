---
description: Autonomously design, redesign, implement, or review
  AskChetna interfaces. Use for AskChetna pages, blocks, components,
  dashboards, astrology charts, Daily Insight, Timing, Clarity,
  Relationships, Journal, consultations, reports, onboarding, pricing,
  responsive/mobile UI, visual hierarchy, information presentation,
  accessibility, and design-system decisions. Select and combine the
  relevant AskChetna design references automatically; the user does not
  need to name them.
name: askchetna-design
---

# AskChetna Product Design Orchestrator

## Mission

Design AskChetna as a calm, credible, premium Vedic-astrology product
where complex personal information becomes easy to understand. Optimize
comprehension, hierarchy, scanning, trust, and actionability---not
decoration.

Visual direction: **Contemporary Vedic + Editorial Wellness + Quiet
Luxury**.

## Autonomous reference selection

You are responsible for deciding which AskChetna design references
apply. The user should not need to name individual Markdown files.

First inspect the page/component, user goal, content type, existing
implementation, viewport concerns, and requested change. Then consult
and combine only the references that materially apply.

### Reference roles

-   `design-system.md` --- foundational visual and interaction language:
    typography, spacing, surfaces, components, navigation, states,
    color, accessibility and general UI decisions.
-   `information-hierarchy.md` --- how to prioritize, group, sequence
    and progressively disclose information. Use whenever details feel
    misplaced, dense, repetitive, hard to scan, or equally weighted.
-   `astrology-ui-patterns.md` --- domain-specific information
    architecture for charts, planets, houses, Dashas, Daily Insight,
    Clarity, Synastry, Journal, consultations, yogas, reports, remedies
    and other personalized astrology experiences.
-   `responsive-mobile.md` --- mobile-first composition, breakpoints,
    touch, charts, tables, timelines, long content, forms, chat and
    viewport behavior. Assume it applies to every substantial
    page/component change unless the task explicitly targets a fixed
    non-mobile surface.
-   `visual-qa.md` --- post-implementation verification. Use
    automatically after material UI work; the user should not need to
    request QA.

## Automatic routing defaults

These are defaults, not rigid combinations. Add references when they
materially improve the result.

-   General component or visual styling → `design-system.md`.
-   Misplaced, cluttered, dense, repetitive or confusing information →
    `information-hierarchy.md` + `design-system.md`.
-   Astrology information presentation → `astrology-ui-patterns.md` +
    `information-hierarchy.md` + `design-system.md`.
-   Page layout or substantial redesign → `information-hierarchy.md` +
    `design-system.md` + relevant `astrology-ui-patterns.md` +
    `responsive-mobile.md`.
-   Mobile/responsive issue → `responsive-mobile.md` + the reference
    governing that content/component.
-   Long AI-generated content → `information-hierarchy.md` +
    `design-system.md` + relevant astrology pattern +
    `responsive-mobile.md`.
-   Chart, timeline, table or dense technical astrology →
    `astrology-ui-patterns.md` + `information-hierarchy.md` +
    `responsive-mobile.md` + relevant design-system rules.
-   Consultation/chat → consultation guidance in
    `astrology-ui-patterns.md` + `responsive-mobile.md` + relevant
    design-system rules.
-   Premium report/editorial reading → report guidance in
    `astrology-ui-patterns.md` + `information-hierarchy.md` +
    typography/layout rules in `design-system.md` +
    `responsive-mobile.md`.
-   Final UI verification → `visual-qa.md` automatically.

## Autonomous design decisions

Do not ask the user which AskChetna pattern/reference to use when the
existing product context and these files provide enough information to
decide.

Instead: 1. Inspect the existing implementation and adjacent patterns.
2. Determine the page/block's primary user goal. 3. Determine the
primary insight and primary action. 4. Diagnose hierarchy, placement,
density, readability, responsive and accessibility problems. 5. Select
the relevant references automatically. 6. Choose the presentation
pattern that best fits the actual content. 7. Implement consistently
with the surrounding product. 8. Verify mobile and desktop behavior. 9.
Run relevant visual QA checks.

The references are principles and preferred patterns, not templates that
must be copied literally.

## Pattern selection authority

You may choose between appropriate UI patterns without asking the user,
including: - card vs flat section; - grid vs list; - tabs vs
accordion; - selected-detail view vs overview; - inline expansion vs
drawer/sheet; - single-column vs multi-column layout; - horizontal vs
vertical timeline; - desktop side panel vs mobile stacked/focused
detail; - persistent vs collapsible supporting information; - compact
metadata vs expanded technical detail.

Choose based on content hierarchy, comprehension, user task,
accessibility and device constraints---not visual novelty.

Do not change underlying product behavior, astrology calculations, data
contracts, navigation architecture, monetization logic or business rules
merely because another presentation pattern looks better.

## Core information hierarchy

For substantial personalized astrology content, default to: 1.
Orientation --- what am I looking at? 2. Primary meaning --- what
matters most? 3. Supporting evidence --- why is this being said? 4.
Practical interpretation --- how might this show up? 5.
Action/reflection --- what can I do with it? 6. Technical depth ---
placements, degrees, yogas and calculations when useful.

A user should understand the screen's main message within roughly five
seconds.

## Responsive autonomy

Responsive behavior is part of every substantial AskChetna UI decision.
The user does not need to request "make it mobile responsive."

For substantial page/component work: 1. determine the optimal desktop
composition; 2. independently determine the optimal mobile composition;
3. preserve semantic information order; 4. adapt navigation and
interaction for touch; 5. verify long and edge-case content; 6. prevent
overflow and illegible astrology data; 7. verify relevant responsive
states before completion.

Mobile is not a vertically stacked copy of desktop.

## Existing design vs new pattern

Do not redesign a component merely because another pattern exists.

-   **Keep it** when it is already clear, responsive, accessible,
    consistent and appropriate.
-   **Refine it** when the basic pattern is correct but hierarchy,
    spacing, typography, placement, responsiveness or states can
    improve.
-   **Replace the presentation pattern** when the current structure
    materially harms comprehension, usability, accessibility or mobile
    behavior.

Prefer the smallest coherent change that produces a meaningful
improvement.

## AskChetna product principles

-   Awareness, not prediction.
-   No deterministic fortune-telling UI.
-   No alarming treatment for difficult placements or relationship
    friction.
-   Do not introduce medical, legal, financial, death, or
    guaranteed-event claims in UI copy.
-   Astrology charts are information visualizations, not decoration.
-   Long reports should feel editorial, not like dashboards.
-   Journal analysis is reflective support, not diagnosis.
-   ACT/WAIT/REDIRECT is guidance, not prophecy.
-   Never invent astrology information to solve a layout problem.

## Conflict resolution

If references suggest different approaches, prioritize: 1. data and
astrology correctness; 2. safety and awareness-not-prediction
principles; 3. accessibility; 4. comprehension and information
hierarchy; 5. mobile/responsive usability; 6. consistency with
established AskChetna patterns; 7. interaction efficiency; 8. visual
aesthetics.

Never sacrifice comprehension or correctness for decoration.

## Implementation workflow

1.  Inspect relevant page/component code, shared components, tokens and
    adjacent screens.
2.  Diagnose before editing.
3.  Select references autonomously.
4.  Plan the smallest coherent improvement.
5.  Implement using the existing stack and reusable semantic components.
6.  Preserve APIs, calculations, data contracts, routing, analytics and
    tests.
7.  Run available lint/typecheck/tests/build appropriate to the change.
8.  If browser/screenshot tooling exists, inspect rendered mobile and
    desktop results.
9.  Apply `visual-qa.md` before considering the task complete.

## User intent overrides

These rules define default autonomous behavior. If the user explicitly
requests a particular layout, visual direction, interaction pattern or
form factor, follow that request unless it creates a serious
correctness, accessibility, safety or technical problem.

For high-level requests such as "Improve this page," "Make this block
easier to understand," "Redesign Timing," or "Fix the mobile UI," do not
ask which design reference to use. Inspect, classify, select, implement
and verify autonomously.

## Definition of done

A UI change is complete only when the hierarchy is clearer, primary
insight is obvious, related details are correctly grouped, long content
is readable, mobile and desktop are verified, accessibility is not
degraded, data/functionality remain intact, and the result feels
coherent with AskChetna.
