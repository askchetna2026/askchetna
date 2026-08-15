# AskChetna Design System

This file defines the visual and structural design language for
AskChetna. Existing production brand tokens take precedence where they
already exist; do not blindly replace established values. When the
codebase lacks a coherent token, use these principles to establish one
centrally rather than hardcoding page-level values.

## 1. Brand character

AskChetna should feel: - calm and contemplative; - credible rather than
superstitious; - personal rather than corporate; - premium rather than
flashy; - warm rather than sterile; - rooted in Vedic tradition without
becoming ornamental; - modern enough to feel like a trusted digital
product.

The visual reference is **Contemporary Vedic + Editorial Wellness +
Quiet Luxury**.

## 2. Color system

Prefer semantic tokens, not literal colors throughout components.

Recommended roles: - `background`: warm, very light neutral. -
`surface`: subtle elevated neutral. - `surface-subtle`: quiet grouping
area. - `text-primary`: deep neutral with excellent contrast. -
`text-secondary`: muted but readable neutral. - `border`: low-emphasis
divider. - `accent`: restrained AskChetna saffron/ochre/muted-gold
family when consistent with current branding. - `accent-soft`:
low-intensity accent background. - `success`, `warning`, `error`,
`info`: semantic states only.

Rules: - Do not use red merely to describe astrologically challenging
information. - Do not use green merely to label astrologically favorable
information. - Do not communicate meaning through color alone. - Avoid
generic purple cosmic gradients unless already fundamental to the
established brand. - Avoid excessive gold and black "luxury astrology"
styling. - Verify text/background contrast.

## 3. Typography

Typography should carry much of the premium feel.

Use existing project fonts first.

Hierarchy: - Display: rare, emotionally important moments or public
marketing. - H1: page identity. - H2: major conceptual section. - H3:
subsection/card title. - Body: primary reading text. - Small/meta:
supporting context only.

Rules: - Product screens should not open with oversized marketing H1s
that push useful content below the fold. - Long AI readings require
comfortable line-height and controlled measure. - Target a readable
long-form line length rather than stretching text across wide desktop
containers. - Avoid tiny text for chart labels and technical metadata. -
Avoid excessive uppercase and letter spacing. - Values may be stronger
than labels; labels should not compete with interpretations.

## 4. Spacing

Use a consistent spacing scale from the existing system. If absent,
establish a compact token scale rather than arbitrary pixel values.

Principles: - semantic relationship controls spacing; - related
label/value pairs are tight; - separate concepts get stronger vertical
separation; - major page sections receive clear rhythm; - mobile spacing
may tighten modestly but must remain comfortable; - do not solve dense
screens by reducing font size and padding indiscriminately.

## 5. Layout

Use a consistent content container.

Desktop: - keep reading content narrower than data-heavy visualization
regions; - allow chart + interpretation split layouts when both remain
legible; - use extra width to clarify relationships, not stretch
paragraphs.

Mobile: - use one dominant reading column; - recompose multi-column
layouts according to priority; - see `responsive-mobile.md`.

## 6. Surfaces and cards

A card means "these items form one meaningful unit."

Use cards for: - primary personalized insight; - a coherent interactive
module; - bounded data visualization; - a distinct actionable unit.

Prefer whitespace/dividers for: - sequential editorial content; - simple
label/value metadata; - closely related report sections.

Avoid: - card inside card inside card; - nine identical planet essay
cards at once; - separate cards for every tiny metric; - shadows on
every surface.

Use restrained borders, radius and shadows consistent with existing
components.

## 7. Primary insight pattern

A primary insight surface should normally contain: 1. small
context/eyebrow if useful; 2. concise meaningful headline; 3. short
personalized interpretation; 4. one relevant action or reflection; 5.
optional route to deeper detail.

It should dominate through hierarchy, not excessive size or decoration.

## 8. Section pattern

Major content sections should normally have: - meaningful heading; -
optional one-line context; - content; - optional secondary action.

Do not use headings like "Insights" repeatedly when a more specific
heading communicates meaning.

## 9. Metadata

Astrological metadata such as sign, house, degree, nakshatra and pada
should be compact and adjacent to what it explains.

Use: - inline metadata; - compact definition rows; - chips only where
selection/filtering/status semantics justify them.

Do not turn all metadata into decorative pills.

## 10. Buttons and actions

Maintain clear action hierarchy: - primary: the main next action; -
secondary: useful alternative; - tertiary/text: low-emphasis
navigation/detail.

Rules: - one visually dominant primary action per decision region; -
labels describe the action; - avoid ambiguous "Continue" where a
specific verb is possible; - provide loading/disabled/focus states; -
mobile primary actions must remain easy to tap.

## 11. Navigation

Navigation should answer: - where am I? - where can I go? - how do I
return?

Authenticated product navigation should prioritize frequent product
destinations, not imitate a marketing website.

Mobile navigation must not obscure primary content or consume excessive
viewport height.

## 12. Tabs, accordions and progressive disclosure

Tabs: use for peer views where switching preserves context. Accordions:
use for secondary detail and long technical explanations.
Drawers/modals: use for temporary focused tasks, not as a dumping ground
for core page content.

Never hide the page's main personalized interpretation inside an
accordion.

## 13. Astrology visualizations

Charts and timelines require: - explicit labels; - selected state; -
keyboard/focus support where interactive; - adjacent interpretation; -
responsive legibility; - no decorative distortion of actual data.

Do not use chart visuals merely as mystical background art.

## 14. AI-generated content

Generated content must visually feel authored and readable.

Use: - controlled width; - paragraphs; - semantic headings already
supported by output structure; - bullets for actual lists; - callouts
sparingly for key takeaways; - clear distinction between interpretation
and action.

Do not: - dump JSON-like data; - create one giant paragraph; - center
long prose; - make every paragraph a colored box.

## 15. Loading, empty and error states

Loading: - show immediate acknowledgement; - preserve approximate
layout; - do not fake progress percentages.

Empty: - explain what is absent and what the user can do next. - omit
meaningless empty containers.

Error: - plain language; - preserve user input where possible; - offer
recovery.

## 16. Motion

Motion should explain state or hierarchy.

Good: - subtle expand/collapse; - selected-state transitions; - modest
page/module entrance where useful.

Avoid: - perpetual floating planets; - pulsing spiritual effects; -
gratuitous parallax; - shimmer beyond useful loading states.

Respect reduced motion.

## 17. Iconography and imagery

Use one established icon family. Icons support labels rather than
replacing unfamiliar concepts.

Astrological/Vedic decorative imagery must be restrained and culturally
respectful. Personal content remains the visual hero.

## 18. Accessibility

Minimum expectations: - semantic landmarks/headings; - logical focus
order; - visible focus; - keyboard operation; - accessible names; -
sufficient contrast; - status not communicated by color alone; -
scalable text; - reduced-motion support; - appropriate touch targets; -
accessible context for visual astrology information where feasible.

## 19. Consistency rule

Before creating a new component, search for an existing AskChetna
pattern. Extend a sound shared pattern instead of producing a slightly
different page-specific copy.

## 20. Design decision test

For every visual element ask: 1. What information or action does this
clarify? 2. Why is it at this level of visual emphasis? 3. Does it help
the user understand their astrology? 4. Does it remain useful on mobile?
5. Could whitespace or typography do the job more cleanly?
