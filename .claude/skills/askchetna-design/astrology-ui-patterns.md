# AskChetna Astrology UI Patterns

Use this reference when presenting astrology-specific information.
Preserve the actual backend data and interpretation contracts; these are
presentation patterns, not permission to invent or recalculate
astrology.

## Global interpretation hierarchy

For most personalized astrology experiences: **Meaning → manifestation →
evidence → action/reflection → technical depth**

Never force beginners to decode technical placements before receiving
the human-readable interpretation.

## 1. Home / Today

Purpose: orient the user quickly and create a useful daily return
experience.

Recommended order: 1. greeting/context; 2. Daily Insight; 3. today's
Focus; 4. Caution/Awareness; 5. relevant current timing context; 6.
secondary shortcuts/recent activity.

Daily Insight anatomy: - HEADLINE as dominant message; - BODY as short
explanation; - FOCUS as practical attention; - CAUTION as
self-awareness, not external danger.

FOCUS and CAUTION should be distinct but balanced. Do not make caution
red/alarming.

On mobile, the complete primary daily takeaway should appear before
secondary dashboard modules.

## 2. Natal / D1 chart

Purpose: let users understand the chart without drowning in placements.

Recommended structure: 1. page orientation + chart identity; 2. chart
visualization; 3. concise chart-level summary; 4. selected house/planet
interpretation; 5. strengths/patterns; 6. deeper technical data.

Interaction: - selecting a planet/house should update or reveal nearby
interpretation; - preserve selection visibly; - do not make users scroll
far away to understand what they selected.

Mobile: - chart must remain legible; - avoid forcing an entire desktop
chart + side panel into a tiny two-column layout; - chart first or
insight first should be chosen based on the page's actual user task; -
detail may follow below or open in a focused sheet if appropriate.

## 3. Planet Insights

Avoid nine simultaneous long, equal-weight essay cards.

Preferred patterns: - planet selector + focused detail; - compact planet
overview list + selected detail; - accordion if comparison is more
useful than switching.

Detail hierarchy: 1. planet name; 2. placement/context; 3. "What this
means for you"; 4. "How this may show up"; 5. strength/supportive
expression; 6. awareness edge; 7. practical reflection; 8. technical
detail for technical mode.

Simple mode: - human language first; - no unexplained Sanskrit/technical
jargon.

Technical mode: - make degree/nakshatra/pada/functional role visible but
do not let metadata overpower interpretation.

## 4. Timing / Dasha

Purpose: communicate where the user is in a life phase and what the
phase emphasizes.

Recommended order: 1. current Mahadasha/Antardasha identity; 2. accurate
date range; 3. timeline/progress visualization if data supports it; 4.
PHASE_FLAVOR; 5. OPPORTUNITY; 6. AWARENESS_PRACTICE; 7. supporting chart
evidence; 8. upcoming/previous phases if product supports them.

"Opportunity" is not a guaranteed outcome. Avoid countdown language that
implies a promised event.

Mobile: - current phase and core meaning must precede long timelines; -
horizontal timelines need touch/scroll affordance or a mobile
alternative; - never make date labels illegible.

## 5. Clarity

Purpose: answer a user's explicit question with structured
awareness-oriented guidance.

Keep the user's question visible near the answer.

Recommended order: 1. question; 2. ACT / WAIT / REDIRECT; 3. Phase
Overview; 4. concise rationale; 5. Pattern Insights; 6. Action Guidance;
7. Reflective Questions; 8. Ethical Closing.

ACT/WAIT/REDIRECT: - visually clear; - not presented as certainty; - no
casino-like red/green treatment; - explanation immediately follows the
result.

On mobile, result + rationale should appear before secondary astrology
evidence.

## 6. Relationships / Synastry

Purpose: help two people understand dynamics without labeling the
relationship as doomed/perfect.

Recommended order: 1. names/relationship context; 2. OVERVIEW; 3.
MAGNETIC PULL; 4. GROWTH EDGES; 5. COMMUNICATION; 6. HARMONY TIPS; 7.
deeper chart evidence if available.

Use paired/balanced visual treatment. Growth edges should not look like
errors or warnings. Do not introduce a compatibility percentage unless
the product has an explicit defensible metric.

Mobile: - avoid side-by-side person columns that become cramped; -
preserve clear attribution to A/B where needed; - stack by concept
rather than showing all of Person A then all of Person B when comparison
is the task.

## 7. Journal

Purpose: writing first, reflection second.

Recommended structure: 1. journal writing surface; 2. save/status
controls; 3. optional "Analyze Patterns"; 4. separate AI reflection
area; 5. CORRELATION; 6. ASTROLOGICAL CONTEXT; 7. GROWTH SUGGESTION.

The user's writing should never visually look like raw input to an
analysis engine. AI reflection must not resemble medical/psychological
diagnosis.

Mobile: - writing area must work comfortably with the on-screen
keyboard; - preserve draft/input through loading/errors; - analysis
should not cause the editor to jump unexpectedly.

## 8. Consultation / live AI astrologer

Purpose: conversational guidance with minimal friction.

Layout: - clear astrologer identity including AI nature where
appropriate; - readable transcript; - concise message composer; -
session/time/credit information if required, present but unobtrusive.

Messages: - comfortable maximum width; - strong speaker distinction; -
no excessive card chrome; - generated long messages remain
paragraph-readable.

Mobile: - test with virtual keyboard; - composer remains reachable; -
avoid fixed elements fighting safe areas; - latest message remains
visible after send; - scrolling behavior must be deliberate.

## 9. Premium Life Report

Purpose: immersive long-form reading.

Treat as editorial content.

Recommended: 1. report title/context; 2. contents/chapter navigation; 3.
chapter heading; 4. short chapter framing; 5. readable long-form
narrative; 6. occasional key-insight callout; 7. reflection/practical
wisdom where supplied; 8. next/previous chapter navigation.

Do not show ten giant chapter cards on one screen.

Desktop: - reading column with optional sticky contents rail.

Mobile: - contents may collapse into a selector/drawer; - reading column
uses full practical width with comfortable gutters; - no persistent rail
squeezing prose.

## 10. Yearly horizon / future-oriented content

Present timing as themes and periods of attention, not promised events.

Use: - period; - theme; - supporting pattern; - suggested
awareness/action.

Avoid: - "this will happen"; - false exactness; - dramatic countdowns; -
deterministic milestone UI.

## 11. Yogas

Yogas require explanation, not badge collection.

For each important yoga: 1. name; 2. plain-language meaning; 3. why it
is relevant in this chart; 4. likely expression as a tendency; 5.
nuance/conditions if supplied.

Do not display dozens of yoga badges without prioritization.

## 12. Houses

When presenting a house: - domain/meaning first; -
occupants/lord/technical evidence second; - personalized synthesis
next; - technical depth available after.

Use a consistent house navigation pattern across the product.

## 13. Technical vs Simple mode

Simple: - interpretation first; - explain terminology immediately if
unavoidable; - minimize raw degree/calculation exposure.

Technical: - retain the same strong hierarchy; - add technical evidence,
don't replace interpretation with jargon.

Changing complexity should not make the whole interface structurally
unrelated.

## 14. Remedies / practices

Present practices as optional reflective/spiritual practices, not
guaranteed fixes.

Clearly distinguish: - reflection; - habit/practice; - traditional
spiritual practice where relevant.

Do not imply a ritual guarantees health, wealth, relationships, legal
outcomes or other external results.

## 15. Pricing/paywall around insights

Do not intentionally obscure free content to manufacture confusion.

Explain: - what additional depth the user gets; - what action unlocks
it; - what remains available.

Keep the user's astrology context visible so the upgrade feels connected
to value rather than interruption.

## 16. Cross-screen consistency

The same concept should look and behave similarly across Home, Chart,
Timing, Clarity, Relationships and Reports.

Examples: - the same phase name/date treatment; - consistent technical
metadata; - consistent action/reflection callouts; - consistent
expand/collapse behavior; - consistent simple/technical language mode.
