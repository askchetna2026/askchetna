# AskChetna Responsive & Mobile Standard

Mobile responsiveness is mandatory for AskChetna design work. A feature
is not complete when desktop looks correct and mobile merely "doesn't
break."

## 1. Mobile-first principle

Design the information hierarchy for the narrow screen first, then use
additional width to enhance it.

Do not: - build a desktop grid and simply stack every column; - preserve
desktop whitespace at mobile scale; - shrink typography until everything
fits; - hide core content to avoid responsive work.

## 2. Viewport verification

For every meaningful UI change, inspect representative widths
covering: - narrow phone around 320--360 CSS px; - common phone around
375--430 CSS px; - tablet/intermediate around 768 CSS px; - desktop
around 1024--1440+ CSS px.

Use the project's established breakpoints where available. The widths
above are verification targets, not a mandate to replace existing
breakpoint tokens.

Test content expansion, not only ideal short copy.

## 3. Priority on mobile

The first mobile viewport should favor: 1. page identity/context; 2.
primary personalized insight; 3. primary action; 4. essential
status/timing; 5. supporting detail.

Do not let decorative headers, large illustrations, breadcrumbs, filters
or secondary controls push the actual insight far below the fold.

## 4. Responsive recomposition

When desktop uses two or three columns, determine the semantic mobile
order.

Example: Desktop: `Chart | Interpretation`

Mobile may become: `Primary interpretation → Chart → selected detail`

or: `Chart → primary interpretation → detail`

Choose based on the user's main task, not source-code order.

Use CSS grid/flex ordering carefully; DOM order should remain logical
for accessibility.

## 5. Navigation

Mobile navigation must: - make primary destinations reachable; - clearly
show current location; - avoid covering content; - account for safe
areas; - not require hover; - close predictably after navigation.

If using bottom navigation, reserve it for a small number of
high-frequency destinations. Ensure content and CTAs are not obscured
behind it.

## 6. Touch targets

Interactive controls should have comfortable touch areas, generally
around 44×44 CSS px where practical.

This applies to: - icon buttons; - chart selectors; - tabs; - accordion
triggers; - close buttons; - previous/next controls; - navigation.

Visual icons can be smaller while the hit target remains comfortable.

## 7. Typography on mobile

-   Never rely on tiny type to fit technical data.
-   Maintain comfortable body size and line-height.
-   Prevent long technical strings from causing overflow.
-   Long readings need reasonable side gutters.
-   Headings should wrap naturally without dominating multiple screens.
-   Avoid center-aligning long paragraphs.

## 8. Long AI responses

Mobile generated content can become extremely tall.

Improve navigation by: - meaningful section headings; - concise summary
before depth; - accordions for optional technical material; -
sticky/local navigation only when it provides clear value and does not
consume excessive space; - keeping the next important action
discoverable.

Do not truncate important generated content without an obvious way to
expand it.

## 9. Cards on mobile

Avoid the "endless card stack."

Ask whether each desktop card still needs a card boundary on mobile.
Often use: - one primary card; - flat secondary sections separated by
spacing/dividers; - accordions for deep technical content.

Do not preserve multi-column mini-card grids when they become cramped.

## 10. Astrology charts

Charts are a high-risk responsive area.

Requirements: - no clipped labels; - no unreadably small text; - no
accidental page-level horizontal overflow; - clear selected state; -
touch interaction works without hover; - interpretation is easy to
associate with selected chart data.

If the visualization has a minimum usable width: - use a deliberate
contained horizontal scroll with affordance, or - provide an appropriate
mobile representation.

Never silently scale the chart until labels become unusable.

## 11. Tables and dense technical data

Do not squeeze wide technical tables.

Choose deliberately: - responsive rows/cards for semantic records; -
contained horizontal scrolling for genuinely tabular comparison; -
prioritized columns; - expandable detail.

Keep table headers understandable and preserve relationships between
labels and values.

## 12. Timelines

Desktop horizontal timelines often fail on mobile.

Mobile options: - vertical timeline; - focused current-phase card with
previous/next controls; - horizontally scrollable timeline with visible
affordance.

Current phase must remain obvious.

## 13. Tabs

Tabs must fit or scroll intentionally. Do not compress many tab labels
into illegible widths. Use accessible horizontal scrolling or another
navigation pattern for large sets.

Selected state must not rely on color alone.

## 14. Modals, drawers and sheets

On small screens: - bottom sheets/full-screen dialogs may be more
appropriate than narrow centered desktop modals; - account for safe-area
insets; - keep close/action controls reachable; - prevent background
scroll when appropriate; - handle virtual keyboard resizing.

Do not put essential long-form report content permanently inside a
modal.

## 15. Forms

-   labels remain visible;
-   inputs use appropriate keyboard/input modes;
-   errors appear near fields;
-   do not place two cramped fields side-by-side unless each remains
    usable;
-   primary submit action is obvious;
-   loading does not erase input;
-   focus the first meaningful invalid field when appropriate.

## 16. Chat and virtual keyboard

Consultation/WhatsApp-like UI requires special verification: - composer
stays visible when keyboard opens; - viewport units do not cause hidden
controls; - safe areas are respected; - transcript can scroll
independently as intended; - send button remains tappable; - latest
message is not hidden under fixed UI.

Prefer modern dynamic viewport handling where supported by the existing
stack.

## 17. Sticky/fixed UI

Use sparingly.

Check: - does it cover content? - does it leave enough reading
viewport? - does it conflict with browser chrome/keyboard/safe area? -
can the user still reach the final content/action?

Avoid stacking sticky header + sticky tabs + sticky CTA + bottom nav.

## 18. Images and decoration

Decorative assets should crop/scale intentionally. Do not let celestial
decoration consume scarce mobile space. Hide nonessential decoration if
it improves comprehension, but preserve meaningful visualization.

## 19. Orientation and zoom

The interface should remain usable with text zoom and common orientation
changes. Do not disable user zoom. Avoid fixed heights for text-heavy
modules.

## 20. Overflow checklist

Explicitly check for: - body horizontal scroll; - clipped chart
labels; - long names; - long dates; - Sanskrit/technical terms; -
generated AI text; - unbroken identifiers; - tabs; - buttons with
translated/long labels; - tables; - badges/chips.

## 21. Performance perception

Mobile networks/devices may be slower.

-   reserve layout space to reduce shifts;
-   lazy-load noncritical heavy content when the stack supports it;
-   do not make decorative effects block insight rendering;
-   provide immediate loading feedback for AI calls.

## 22. Accessibility on touch devices

Verify: - logical reading order; - focus order; - visible focus for
keyboard users even on responsive layouts; - touch target size; -
labels; - screen-reader state for tabs/accordions; - no hover-only
information; - sufficient contrast outdoors/low-quality displays.

## 23. Mobile QA scenarios

For every major changed page, test at least: - normal content; -
unusually long AI content; - missing/unknown optional data; - loading; -
error; - long user/profile name where applicable.

For interactive pages also test: - keyboard open; - accordion/tab
switching; - chart selection; - navigation; - primary CTA.

## 24. Completion rule

Do not report a responsive UI task as complete until mobile hierarchy,
overflow, touch behavior, typography, long-content behavior and relevant
interaction states have been checked.
