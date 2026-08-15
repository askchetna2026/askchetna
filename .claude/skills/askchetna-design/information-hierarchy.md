# AskChetna Information Hierarchy

Use this reference whenever AskChetna content is dense, misplaced,
repetitive, hard to scan, overly card-based, or technically correct but
poorly presented. This file governs **what appears first, what belongs
together, what deserves emphasis, and what can be deferred**.

## 1. Primary principle: meaning before mechanics

Users generally come to AskChetna to understand themselves, a phase, a
relationship, a question, or a pattern---not to inspect raw calculation
output.

Default sequence: **Context → Primary insight → Interpretation →
Supporting evidence → Action/reflection → Technical depth**.

Technical users may receive more evidence, but technical data should not
erase the hierarchy.

## 2. Five-second test

Within roughly five seconds, a user should be able to answer: - What
page/block is this? - What is the most important thing it is telling
me? - What should I look at or do next?

If several elements compete equally for attention, the hierarchy is
probably wrong.

## 3. Classify every content element

Before redesigning a dense page, internally classify content as one
of: - **Primary** --- essential meaning/result for the current user
goal. - **Supporting** --- interpretation that explains the primary
meaning. - **Evidence** --- chart/timing/technical basis for the
interpretation. - **Action** --- next step, reflection or user
control. - **Reference** --- useful technical/background information not
required immediately. - **Navigation** --- helps move between peer views
or deeper detail.

Do not style all six classes equally.

## 4. One dominant message per region

A page may contain many insights, but each visual region should have a
clear dominant idea.

Do not create four identical cards when one contains the primary insight
and the others are supporting details. Use size, typography, position,
whitespace and grouping to communicate importance.

## 5. Above-the-fold priority

On typical product screens, the initial viewport should favor: 1.
concise orientation; 2. the most personalized/relevant insight; 3. the
primary action when one exists; 4. essential timing/status context.

Avoid consuming the first viewport with decorative hero art, repeated
navigation, generic educational copy, filters of low immediate value, or
technical metadata.

On mobile this rule is stricter because vertical space is scarce.

## 6. Group by user question, not data source

Backend/API structure is not automatically good UI structure.

If an API returns separate fields that jointly answer one user question,
present them together when semantically appropriate.

Do not expose internal object boundaries merely because implementation
data arrives that way.

Conversely, do not merge unrelated concepts just to reduce the number of
sections.

## 7. Place explanation next to evidence

Keep interpretation near the chart, planet, phase, relationship factor
or result it explains.

Bad pattern: - chart at top; - several unrelated sections; - explanation
far below with no obvious connection.

Better pattern: - visualization/selection; - selected or primary
interpretation adjacent/nearby; - deeper evidence following it.

## 8. Action follows understanding

Place reflection prompts, practical guidance and CTAs after enough
context exists for them to make sense.

Do not bury the primary action after long technical evidence. Do not
place a major action before the user understands what it means.

## 9. Progressive disclosure

Use progressive disclosure for information that is useful but not
necessary for initial comprehension.

Good candidates: - precise degrees; - Pada; - long yoga explanations; -
methodology/calculation details; - secondary planets/houses; -
historical phases; - extended AI explanation; - technical-mode detail.

Do not hide: - the primary result; - the core interpretation; -
essential caveats; - critical user controls.

## 10. Card decision rule

Before creating a card, ask whether the content forms a meaningful
independent unit.

Use a card when it creates a useful boundary or interaction surface. Use
whitespace/dividers/typography when content is part of one reading flow.

Avoid: - one card per label/value; - card-inside-card nesting; - equal
card grids for unequal insights; - using cards only to make a screen
feel designed.

## 11. Lists vs prose

Use prose for nuanced interpretation and narrative. Use bullets for
discrete, parallel, scannable items. Use definition rows for compact
label/value technical data. Use tables only for genuine comparison or
structured tabular relationships.

Do not convert nuanced astrology into bullets merely to make it shorter.

## 12. Headings

Headings should communicate meaning, not generic containers.

Prefer specific headings such as "Where your attention is strongest"
over repeated generic labels such as "Insights," when content and
product voice permit.

Preserve parser/backend-provided labels where frontend contracts require
them; presentation improvements must not silently change data contracts.

## 13. Repetition

If the same placement, date range, planet name, or interpretation is
repeated in adjacent areas, decide which occurrence is authoritative and
remove or visually demote redundant copies when safe.

Do not repeat metadata in every child card when a parent context already
establishes it.

## 14. Density

When a page feels dense, solve in this order: 1. remove duplication; 2.
improve grouping; 3. strengthen hierarchy; 4. progressively disclose
secondary detail; 5. improve spacing; 6. only then consider reducing
visual size.

Do not solve density by shrinking text, touch targets or chart labels.

## 15. Long AI-generated content

For generated readings: - lead with the key takeaway when supported by
the output structure; - keep paragraphs readable; - separate distinct
supplied sections; - distinguish interpretation from
action/reflection; - keep technical evidence subordinate or
expandable; - preserve nuance.

Do not invent a new astrological conclusion to create a nicer summary.
Any synthesized heading/takeaway must be faithfully supported by
supplied content.

## 16. Beginner vs technical users

Simple mode prioritizes interpretation and plain language. Technical
mode adds evidence and terminology; it does not invert the experience
into a raw-data dump.

The core personalized meaning should remain easy to locate in both
modes.

## 17. Comparison experiences

For Synastry or other comparisons, organize by the concept being
compared when that better supports understanding.

For example, compare communication dynamics together rather than forcing
the user to remember Person A's communication section while reading
Person B much later.

Maintain clear attribution and avoid false symmetry when evidence
differs.

## 18. Time-based information

For Dasha/timing: - establish the current phase first; - show where the
user is in time; - explain the phase; - then expose prior/next phases
and deeper evidence.

Do not let a large timeline visually overpower the current personalized
meaning.

## 19. Decision experiences

For Clarity-style results: - keep the user's question visible; - make
ACT/WAIT/REDIRECT immediately findable; - explain why next; - provide
patterns and action guidance; - put reflective depth afterward.

The result must look like guidance, not a deterministic verdict.

## 20. Editorial experiences

Premium reports should use chapter/reading hierarchy, not dashboard
hierarchy.

Prefer: - contents/navigation; - chapter title; - framing/summary; -
readable narrative; - occasional key insight; - reflection/practical
wisdom; - next chapter.

Avoid grids of equally weighted chapter cards as the primary reading
experience.

## 21. Mobile hierarchy

Do not simply preserve desktop visual order.

On mobile ask: - what must appear before the first major scroll? - what
can collapse? - what needs a focused detail view? - which desktop side
content should move immediately after the item it explains? - will a
user face an endless card stack?

Keep DOM/reading order logical and accessible even when visual
composition changes.

## 22. Hierarchy audit

Before completing a page, internally answer: 1. What is the single most
important element? 2. Is it visually dominant? 3. What is second? 4. Is
supporting evidence near what it supports? 5. What can be deferred? 6.
Is anything repeated? 7. Are cards representing meaning or merely
styling? 8. Does the hierarchy survive long content and missing optional
data? 9. Does it survive a 360px viewport? 10. Can a beginner understand
the main message without decoding technical astrology?
