# AskChetna Visual QA

Use this checklist after implementing or materially changing AskChetna
UI. Do not treat compilation as visual verification.

## A. Information hierarchy

-   [ ] Can a user identify the page's purpose immediately?
-   [ ] Is the primary personalized insight visually obvious?
-   [ ] Is one primary action clear where an action is needed?
-   [ ] Are supporting details visually subordinate?
-   [ ] Is technical astrology presented after or alongside
    understandable meaning?
-   [ ] Are unrelated concepts separated and related concepts grouped?
-   [ ] Have equal-weight card grids been avoided where priorities
    differ?
-   [ ] Is duplicated information removed?

## B. Content placement

-   [ ] Is explanatory content near the chart/data/action it explains?
-   [ ] Are labels attached unambiguously to their values?
-   [ ] Is important guidance visible before long secondary content?
-   [ ] Are actions placed at the point where the user is ready to take
    them?
-   [ ] Is optional technical depth progressively disclosed where
    appropriate?
-   [ ] Are empty sections omitted or handled gracefully?

## C. Long-form / AI content

-   [ ] No giant wall of text.
-   [ ] Reading width is controlled on desktop.
-   [ ] Paragraphs and supported semantic sections are readable.
-   [ ] Bullets are used only for actual lists.
-   [ ] Callouts are used sparingly.
-   [ ] Long generated content does not bury the next important action.
-   [ ] No frontend-invented astrology claims were added merely for
    layout.

## D. Mobile

Inspect narrow and common phone widths. - \[ \] Primary insight appears
early. - \[ \] No body-level horizontal overflow. - \[ \] No clipped
content. - \[ \] Charts remain legible. - \[ \] Technical terms and long
names wrap safely. - \[ \] Touch targets are comfortable. - \[ \] No
hover-only behavior. - \[ \] Desktop columns were semantically
recomposed, not blindly stacked. - \[ \] Card stacks are not
unnecessarily endless. - \[ \] Fixed/sticky UI does not consume
excessive viewport. - \[ \] Bottom navigation/CTA does not cover
content. - \[ \] Long AI output remains navigable. - \[ \] Safe areas
are handled where relevant.

## E. Tablet/intermediate

-   [ ] No awkward half-desktop layout.
-   [ ] Grid breakpoints occur before content becomes cramped.
-   [ ] Navigation remains usable.
-   [ ] Chart and interpretation regions have adequate width.
-   [ ] Typography and spacing transition smoothly.

## F. Desktop

-   [ ] Extra width improves hierarchy rather than stretching prose.
-   [ ] Reading columns remain comfortable.
-   [ ] Primary and secondary regions are balanced.
-   [ ] Empty space looks intentional.
-   [ ] No unnecessarily huge headings or cards.

## G. Interaction states

For each changed interactive component: - \[ \] default; - \[ \] hover
where applicable; - \[ \] focus-visible; - \[ \] active/selected; - \[
\] disabled where applicable; - \[ \] loading; - \[ \] error; - \[ \]
empty state where applicable.

## H. Astrology-specific integrity

-   [ ] No deterministic prediction language introduced.
-   [ ] Challenging astrology is not styled as danger/error.
-   [ ] Favorable astrology is not styled as guaranteed success.
-   [ ] Chart labels/data remain accurate and unaltered.
-   [ ] Selected planet/house/phase is obvious.
-   [ ] Technical evidence is associated with the correct
    interpretation.
-   [ ] Missing astrology data was not fabricated.
-   [ ] Simple/technical mode remains coherent if applicable.

## I. Accessibility

-   [ ] Semantic heading hierarchy.
-   [ ] Logical DOM/reading order.
-   [ ] Keyboard navigation.
-   [ ] Visible focus.
-   [ ] Accessible control names.
-   [ ] Adequate contrast.
-   [ ] Status does not rely on color alone.
-   [ ] Text can zoom without breaking critical UI.
-   [ ] Reduced motion respected.
-   [ ] Interactive visualizations expose sufficient accessible context
    where feasible.

## J. Loading/error resilience

-   [ ] AI loading has immediate feedback.
-   [ ] No fake progress percentage.
-   [ ] Layout shift is reasonable.
-   [ ] User input is preserved through recoverable failures.
-   [ ] Errors explain recovery.
-   [ ] Missing optional data does not leave broken-looking gaps.

## K. Product coherence

-   [ ] The page feels like AskChetna, not generic SaaS.
-   [ ] Vedic/celestial decoration is restrained.
-   [ ] Existing shared components/tokens were reused where appropriate.
-   [ ] New patterns are reusable rather than page-specific hacks.
-   [ ] The result is calm, credible and premium.
-   [ ] Functionality, routing, data contracts, analytics and relevant
    tests remain intact.

## L. Rendered verification

When browser/screenshot tooling is available: - \[ \] inspect at least
one narrow phone viewport; - \[ \] inspect one common phone viewport; -
\[ \] inspect one tablet/intermediate viewport when layout changes
materially; - \[ \] inspect desktop; - \[ \] inspect a long-content
case; - \[ \] inspect at least one loading/error/empty state relevant to
the change.

If rendered verification cannot be performed, state that limitation
rather than claiming the UI was visually verified.

## Final questions

Before finishing, answer internally: 1. What is the first thing the user
sees? 2. Is that the most important thing? 3. What should the user
understand next? 4. Is that physically near the first insight? 5. What
is optional detail, and does it visually behave like optional detail? 6.
Does the same hierarchy survive on a 360px phone? 7. Did any design
choice make astrology feel more deterministic, alarming, or less
trustworthy?
