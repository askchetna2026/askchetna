# Chetna Editorial Atlas Redesign — Implementation Plan

**Status:** Approved design direction; implementation intentionally not started  
**Direction:** *Editorial Atlas*, tempered with the calm materiality of *Reflection Studio*  
**Purpose:** Replace the current generic dark-cosmic, gold-gradient, glass-card aesthetic with a distinctive, image-led digital experience that treats Vedic astrology as a reflective practice rather than a prediction product.

---

## 1. Design decision and non-negotiables

### 1.1 Core idea

Chetna should feel like opening a contemporary illustrated journal and finding a personal celestial map inside it. It should be warm, intelligent, grounded, crafted and visually memorable. A visitor should see an atmosphere and a point of view before they see a collection of feature cards.

### 1.2 What we will make

- An image-led public homepage built around a commissioned-style **Atlas of the Self** illustration.
- A coherent visual system for public, logged-in, utility, and editorial routes.
- Reusable illustrated route motifs: **Chart** (open chart folio), **Timing** (river/seasonal horizon), **Clarity** (threshold/arch).
- A usable, accessible product interface with text and controls that remain HTML; illustrations are decorative or explanatory, never the sole way to complete an action.
- A responsive web and Capacitor-app experience with an intentional mobile composition, not a compressed desktop page.

### 1.3 What we will explicitly avoid

- Dark galaxy wallpapers, star fields, animated glowing backgrounds and neon purple/blue cosmic gradients.
- Black-and-gold “mystic luxury” visual language.
- Glassmorphism, frosted cards, blurred panels, thick shadows and identical rounded-card grids.
- Stock portraits, stock crystal imagery, generic AI-chat bubbles, generic horoscope icons and generic zodiac wheels used only as decoration.
- All-caps decorative headings, excessive gradient text, repeated mandalas, excessive animations, and copy that promises certainty or fate.
- Text embedded in illustration assets where HTML text can be used instead.

### 1.4 Product and brand constraints to preserve

- Keep existing routes, authentication, profile selection, payment gating, analytics events, SEO content, legal material, and native-app support functional.
- Keep the awareness-first message: astrology is interpretive, not deterministic.
- Preserve light and dark theme support. Dark mode will become **Night Ink**, not a copy of the existing cosmic theme.
- Do not change any astrology calculations, APIs, credit rules, schema, or account lifecycle behavior as part of this visual project.

---

## 2. Current-code inventory and implementation boundary

### 2.1 Shared shell currently in use

The root shell in `src/app/layout.tsx` owns the global font setup, `Header`, `Footer`, profile provider, welcome banner, floating actions, analytics, PWA registration, and Capacitor wrapper. The redesign must update the shell in a coordinated pass so individual pages do not carry competing visual themes.

### 2.2 Existing high-value components to retain functionally

- `src/components/Header.tsx` — change presentation and information architecture only; preserve auth-aware navigation and sign-out behavior.
- `src/components/Footer.tsx` — redesign as a journal colophon; preserve route and social links.
- `src/components/Logo.tsx` — retain until a refined wordmark asset is approved; do not silently replace brand identity.
- `src/components/BirthDataForm.tsx` — preserve inputs, validation, profile behavior and submission flow; reskin and reposition it.
- `src/components/ChartPageContent.tsx`, `TimingPageContent.tsx`, `ClarityPageContent.tsx` — retain domain behavior and recompose each page around a distinct visual metaphor.
- `src/components/ChartDisplay.tsx`, `DashaTimeline.tsx`, `DashaStory.tsx`, `DashaDisplay.tsx` — retain data and interactions; redesign their visual language with diagrammatic clarity.
- `src/components/ProfileSelector.tsx`, `ProfileManager.tsx`, `ProfileDrawer.tsx`, `ProfileTabs.tsx` — retain their profile workflows; make them feel like field notes instead of control panels.
- `src/components/EnergyWidget.tsx`, `PanchangWidget.tsx`, `JournalWidget.tsx` — retain logged-in content; change layout from widgets to a daily field desk.
- `src/components/PricingClient.tsx`, `NewsletterSignupCard.tsx`, `AIClaritySearchBar.tsx` — retain behavior; redesign actions and states.

### 2.3 Existing visual code to retire or replace gradually

- The `CosmicStarfield` and global star/nebula/portal layers in `src/app/layout.tsx` and `src/app/globals.css`.
- Home-page `CosmicMandala` decoration and repeating zodiac/navagraha decorative strips in `src/app/page.tsx`.
- Global “cosmic” utility classes, gradient headings, glassmorphism utilities, gold buttons and gold-border card patterns in `src/app/globals.css`.
- Page-level implementations that depend on the current glass card visual treatment. Their semantic structure and routes remain; only the visual treatment changes.

### 2.4 Scope rule

This is a design-system and presentation project. Any copy, content, API, database or pricing decision discovered during the work must be documented as a separate decision rather than folded into the visual implementation without approval.

---

## 3. Art direction specification

### 3.1 Visual principles

1. **Astrology as a map:** use lines, marks, horizons, ledgers, folded pages and annotated diagrams.
2. **Material before effect:** paper grain, ink variation, block print and restrained collage rather than glow, blur and gradients.
3. **One hero image, many quiet details:** let a few original visual elements carry recognition; do not decorate every surface.
4. **Asymmetry with order:** compositions can be editorially uneven but must use a consistent underlying grid.
5. **Illustration supports orientation:** every large motif should either set a page’s mood or help explain its purpose.
6. **The chart is personal, not ornamental:** real user data must never be visually obscured by decorative astrological imagery.

### 3.2 Color system

Define semantic tokens first; components must use tokens rather than raw hex values.

| Token family | Day Atlas role | Night Ink role | Notes |
| --- | --- | --- | --- |
| `canvas` | uncoated-paper cream | ink-charcoal | page background |
| `surface` | lighter handmade-paper | blue-black paper | panels, forms, table areas |
| `ink` | charcoal-brown | warm bone | primary readable text |
| `muted-ink` | softened umber | softened parchment | secondary metadata only |
| `indigo` | hand-mixed deep blue | moonlit blue | structural lines and important links |
| `terracotta` | mineral red clay | muted coral clay | emphasis and primary actions |
| `saffron` | dry marigold | burnt marigold | small markers, never a dominant background |
| `rose` | dusty floral rose | faded rose | subtle category/supporting highlight |
| `moss` | oxidized green | dark eucalyptus | calm secondary accent |
| `rule` | low-contrast graphite line | low-contrast parchment line | dividers, table structure, diagram geometry |

Implementation details:

- Make contrast decisions in code using semantic CSS variables in `globals.css`.
- Use terracotta for the primary action only; no more than one primary action per visual cluster.
- Use saffron for markers, tiny labels, active rules and chart highlights, never for body copy.
- Use full-bleed indigo only on selected editorial breaks and the Night Ink theme; do not apply it globally.
- Never encode astrology meaning with colour alone; pair colours with a label, glyph, line style or position.

### 3.3 Typography

- Replace the current default `Inter` + `Playfair Display` “luxury astrology” pairing with a typography decision recorded before implementation.
- Target pairing: one highly readable humanist sans for UI/body and one literary display serif for editorial headlines.
- Keep weights restrained: regular and medium for interface, regular/semibold for editorial hierarchy. Avoid all-caps paragraph headings.
- Use sentence case by default. Small labels can use tracked uppercase sparingly for dates, section numbering and field labels.
- Establish fluid type tokens: display, `h1`, `h2`, `h3`, lead, body, small metadata and caption. Use `clamp()` for display and major headings.
- Set line lengths: 42–62 characters for long body copy; 28–38 characters for hero copy; do not center long paragraphs.
- Ensure no text is rendered with CSS gradient clipping.

### 3.4 Texture and image rules

- Use one subtle reusable paper-grain texture at low opacity; test it with system contrast settings and disable it for forced-colours mode.
- Use fine ink rules, dotted orbital paths and stamped markers as recurring elements.
- Avoid texture behind dense interactive content, lengthy reading, data tables, forms and charts.
- Store final raster artwork in `public/illustrations/` with descriptive lower-case kebab filenames, meaningful alt-text documentation and optimized WebP/AVIF fallbacks where appropriate.
- Use SVG for line-based diagrams, utility symbols and scalable ornaments; retain editable source files separately.
- Every decorative image uses `alt=""`; meaningful explanatory illustration receives concise, relevant alt text.

---

## 4. Illustration and asset programme

### 4.1 Required art assets

| Asset | Intended placement | Format | Requirements |
| --- | --- | --- | --- |
| Atlas of the Self | public home hero | layered SVG plus responsive raster fallback | central celestial map; no embedded copy; clear negative space for HTML headline/form |
| Chart folio | home route and chart page | SVG | open field notebook and Vedic chart geometry |
| Timing horizon | home route and timing page | SVG | landscape, seasonal phases, river/time line; not a clock cliché |
| Clarity threshold | home route and clarity page | SVG | doorway/arch/line of sight; no chatbot imagery |
| Relationship threads | synastry page | SVG | two constellations connected by labelled, non-deterministic paths |
| Daily desk | dashboard | SVG or lightweight raster | desk map and movable daily markers; does not obscure widgets |
| Editorial dividers | shared sections | SVG | three to five simple motifs, used sparingly |
| Share/OG artwork | social metadata | 1200×630 raster | same Atlas palette and readable title-safe area |
| Favicon/app icons | platform assets | PNG/SVG source | refine only after wordmark/mark approval |

### 4.2 Asset creation process

1. Write a short creative brief for each asset: purpose, page, crop ratios, required empty areas, theme variants and accessibility meaning.
2. Generate or commission initial concept sketches only after the brief is approved.
3. Check each concept against the “avoid” list in Section 1.3.
4. Select one visual language; do not mix unrelated art styles across pages.
5. Create desktop, tablet and mobile crops rather than relying on `object-position` for every viewport.
6. Export vector master, high-density raster fallback and compressed web output.
7. Run image compression and check file size before adding to Git; do not commit unoptimized originals.
8. Document source, licensing, creator, prompt/version (if generated), date and intended route in an asset manifest.

### 4.3 Image performance budget

- Home above-the-fold artwork: aim for <= 250 KB compressed modern image or <= 100 KB SVG after optimization.
- Total above-the-fold imagery on mobile: aim for <= 400 KB.
- Lazy-load below-the-fold imagery with stable dimensions to avoid layout shift.
- Set explicit `width`, `height` or aspect ratio for every image.
- Use `next/image` for rasters; use inline or `<img>` SVG only where sanitised and appropriate.
- Never use a CSS fixed attachment, oversized background image, filter-heavy image or perpetual video for atmosphere.

---

## 5. Shared experience and navigation

### 5.1 Header

- Replace the current broad cosmic navigation bar with a thin editorial masthead.
- Day Atlas: paper-coloured surface with an ink bottom rule; Night Ink: deep ink surface with a warm rule.
- Left: wordmark. Centre desktop: primary navigation. Right: profile/sign-in plus one quiet utility control.
- Keep public information architecture: Home, About, Journal (currently Blog), Ask Chetna.
- Keep authenticated information architecture: Home, Chart, Timing, Clarity, Relationships, Journal, Credits when enabled, Dashboard, Account, Admin when applicable.
- Rename visible labels only after a copy review; routes and analytics destinations remain unchanged.
- Make the primary navigation action “Ask Chetna” a terracotta ink-stamp button, not a glowing pill.
- Use a visible active state: a short coloured rule or small star/marker beside the active label; do not rely solely on colour.
- Header stays sticky only if it remains unobtrusive and has no backdrop blur. Confirm that it does not cover anchors or mobile browser chrome.
- Mobile: use a full-height paper-sheet drawer with route groups and illustrated markers; preserve existing menu close, focus, sign-out, theme and auth behavior.

### 5.2 Footer

- Treat it as a printed colophon: calm paper surface, top rule, grouped links, contact/social links and legal note.
- Preserve all existing routes and the “Astrology is interpretive, not deterministic” statement.
- Add the year and a concise editorial line without clutter.
- Ensure social placeholders remain visibly non-functional only if intentionally retained; otherwise obtain real URLs before launch.

### 5.3 Global transitions and motion

- Use short opacity/translate transitions for page entry and locally triggered state changes only.
- No continuous wheel/mandala spin, twinkling background, parallax drift or pulse glow.
- Respect `prefers-reduced-motion` by removing non-essential motion and ensuring all state changes remain visible.
- Keep Framer Motion where it improves clarity; remove it where it only decorates.

---

## 6. Public homepage specification

### 6.1 Purpose

The homepage should guide an unfamiliar visitor through one simple story: **notice a pattern → locate it in your chart → understand its timing → reflect with Chetna**.

### 6.2 Section order

1. Editorial masthead.
2. Atlas hero.
3. Compact trust/ethos line.
4. Three illustrated routes.
5. “How a reading becomes reflection” diagram.
6. A tangible sample insight/editorial spread.
7. Journal/latest writing strip, if posts exist.
8. Quiet signup/CTA break.
9. Colophon footer.

### 6.3 Atlas hero

- Use a two-column desktop composition with text and CTA on the left, Atlas art on the right/centre, and the birth-date teaser integrated as a structured field slip—not a floating card.
- Use the approved message: “A clearer way to meet your patterns.” and supporting language that describes astrology as a lens rather than a verdict.
- Preserve the existing teaser API request, error handling, loading state and analytics events.
- Teaser inputs must have visible labels, native date input support, keyboard focus, validation messages and no text inside image assets.
- The form can be compact by default. Avoid asking for more personal data than the current teaser flow requires.
- Place primary CTA toward Clarity and secondary CTA toward Chart. They must remain visible without relying on art contrast.
- Place proof points only after verification; remove or qualify the existing “1,200+ charts / 18 countries” claim if it cannot be substantiated.
- Mobile composition: headline, short lead, form, art crop; do not place controls on top of fine illustration details.

### 6.4 Three illustrated routes

- Replace uniform feature cards with three full-width or staggered editorial panels.
- **Chart:** visual = open chart folio; message = understand the pattern’s structure; CTA = “Explore your chart”.
- **Timing:** visual = river/horizon and lunar phases; message = understand seasons and cycles; CTA = “See your timing”.
- **Clarity:** visual = threshold/arch; message = bring a lived question to a reflection; CTA = “Ask Chetna”.
- Each route must use an HTML heading, one short paragraph, one clear link and an image with stable dimensions.
- Use alternating image/text positions on desktop and a simple stacked sequence on mobile.
- The route should link to existing `/chart`, `/timing`, and `/clarity` routes without changing access control.

### 6.5 Reflection method section

- Replace the long simulated chat transcript with an illustrated four-step pathway: Observation → Pattern → Choice → Practice.
- Keep the present ethical/agency framing but reduce body copy into scan-friendly editorial notes.
- Use a line diagram or four numbered markers, not four visually identical cards.
- Provide a direct link to `/how-it-works`.

### 6.6 Sample content and journal section

- Present one sample reading as a magazine marginalia layout: question, what the chart points to, a reflective prompt, and a free-will reminder.
- Do not present real user data or imply clinical advice.
- Replace plain blog-card repetition with a newspaper-like “From the Journal” strip using the existing `/api/blogs` data.
- Include loading, empty and error states that do not collapse layout or expose raw API language.

### 6.7 Logged-in homepage

- Do not reuse the public marketing hero for signed-in users.
- Create a “Today’s field desk” with date, selected profile, current energy/Panchang/Journal content and three clear next steps.
- Keep `EnergyWidget`, `PanchangWidget`, and `JournalWidget` functional but arrange them as a responsive desk/ledger rather than glass widgets.
- Make Chart, Timing and Clarity actions visible without requiring a sidebar.
- Do not show a visual-only daily claim that is not generated by the existing product logic.

---

## 7. Route-by-route redesign plan

### 7.1 `/chart`

- Reframe as **Your Chart Folio**.
- Place profile selection and birth data in a left/intro band; the actual chart remains the visual focal point.
- Use notebook rules, annotated labels and a “chart key” legend that explains symbols semantically.
- Preserve `ChartDisplay`, tab behavior, calculations, exports/sharing and any existing loading/error states.
- Avoid decorative zodiac rings behind real chart data.
- Provide print contrast and a clean PDF/share render path; test `html2canvas` behavior after visual changes.

### 7.2 `/timing` and `/dasha-timeline`

- Reframe as **Seasons of Your Life**.
- Display the selected dasha/timeline as a navigable horizontal/vertical river with clear date anchors and labelled segments.
- Use the Timing horizon motif as a section illustration only; do not use it as the data visualisation itself.
- Preserve keyboard navigation, focus order, dynamic date logic, and mobile access to every time range.
- Give active period, upcoming period and past periods distinct non-colour cues.

### 7.3 `/clarity` and `/clarity/history/[id]`

- Reframe as **The Reflection Room**.
- Use a calm page with an architectural threshold illustration at the introduction; the working conversation remains straightforward, high-legibility UI.
- Keep AI questions, credit handling, session history and error/retry states functionally unchanged.
- Remove generic chatbot bubbles where possible in favour of a readable question/response transcript with headings, observation and reflection prompts.
- Clearly retain limitations, interpretation disclaimer, reporting/safety pathways and “not deterministic” language.
- History pages must visually distinguish historical record from active session.

### 7.4 `/synastry`, `/relationship-astrology`

- Use Relationship Threads: two distinct constellations or chart fields connected by fine lines.
- Preserve neutral, non-deterministic framing and avoid compatibility-score aesthetics unless the product currently requires it.
- Use visual pairing, labels and explanatory copy to avoid suggesting fate or definitive outcomes.

### 7.5 `/dashboard`, `/dashboard/profiles`, `/account`, `/onboarding`

- Treat dashboard as the daily field desk, profile management as a personal archive, account as a quiet settings ledger and onboarding as a guided opening of a folio.
- Preserve all profile limits, account deletion access, credit visibility, native requirements and completion/error states.
- Do not hide destructive actions in decorative menus; retain clear confirmation patterns and accessible labels.
- Onboarding should use one illustration per step at most, with progress that is HTML and screen-reader accessible.

### 7.6 `/pricing`

- Reframe as **Ways to Continue the Practice**, not a sales-card grid.
- Retain the exact live pricing, credit math, payment availability and legal disclosures.
- Use a comparison table or ledger layout that is readable on narrow screens; do not use decorative price badges or fake scarcity.
- Clearly identify free signup credits and what one credit represents.

### 7.7 `/blog`, `/blog/[id]`, `/glossary`, `/about`, `/how-it-works`, `/how-we-calculate`

- Reframe the blog as **Journal** with illustrated article lead images, large readable text and calm metadata.
- Make glossary and calculation pages look like reference pages: alphabet/section navigation, strong hierarchy, line rules and accessible term anchors.
- About page can carry the complete Atlas narrative and ethical approach.
- Use the same small set of divider motifs; do not invent a new aesthetic per article.

### 7.8 Community, contact, legal, SEO and admin routes

- Community routes: apply the typography, surface and rules system without making conversation pages art-heavy.
- Contact and login: focused, sparse forms with small supporting illustration only.
- Legal, privacy, refund, disclaimer and terms: maximise legibility, table clarity and printability; no textured background beneath long text.
- SEO landing pages (`career-astrology`, `relationship-astrology` and content generated by `SeoLandingPage`) must inherit the new editorial system while protecting semantic heading structure and search performance.
- Admin pages should receive a restrained operational skin only; prioritise information density, contrast and form clarity over brand art direction.

---

## 8. Component and CSS architecture

### 8.1 New component groups

- `components/editorial/AtlasHero`
- `components/editorial/IllustratedRoute`
- `components/editorial/SectionMarker`
- `components/editorial/FieldSlipFormShell`
- `components/editorial/FolioHeader`
- `components/editorial/ReflectionPath`
- `components/editorial/JournalStrip`
- `components/editorial/DayDesk`
- `components/editorial/Illustration`

Each component should own semantics and layout; pages should pass copy, image data and route-specific configuration. Do not build a generic “magic card” component that recreates a new template problem.

### 8.2 Tokens and styles

- Consolidate colour, type, spacing, radius, rule and motion tokens near the top of `src/app/globals.css` or a dedicated imported token file.
- Split global visual primitives from page-specific CSS modules.
- Define `data-theme="light"` as Day Atlas and `data-theme="dark"` as Night Ink; map existing `ThemeToggle` behavior to those tokens.
- Create a `surface--paper`, `surface--ink`, `rule`, `eyebrow`, `button--primary`, `button--text`, `field-slip`, and `editorial-link` primitive set only where recurring semantics justify it.
- Remove the old global cosmic helpers only after all consumers are migrated; use `rg` to confirm there are no remaining references.
- Do not set inline colours in React components except when data visualisations require computed values.

### 8.3 Spacing and layout rules

- Adopt a four-pixel base rhythm with named spacing tokens.
- Use a shared content maximum width and a wider art maximum width.
- Use CSS Grid for asymmetrical page compositions; use flexbox for short aligned control groups.
- Avoid arbitrary absolute positioning for primary copy, form fields or CTAs.
- Use container queries where they reduce brittle screen-width breakpoints.
- Define breakpoints from content failure rather than device names; test 320 px, 375 px, 768 px, 1024 px, 1280 px and 1440 px.

---

## 9. Responsive and native-app requirements

- Design mobile as an editorial sequence: text → action → image, with no hovering interactions required.
- Provide touch targets of at least 44×44 CSS pixels for all actionable controls.
- Ensure inputs do not trigger iOS zoom (minimum 16 px effective text size).
- Retain safe-area handling in the current root styles; re-test header, drawer, footer and floating actions on iOS/Android after any shell changes.
- Replace expensive backdrop filters and fixed decorative layers with static/tiny assets; this directly improves WebView scroll performance.
- Do not place essential controls behind the mobile menu, iOS home indicator or Android system bar.
- Validate both themes in native shell, browser, offline route and reduced-motion settings.

---

## 10. Accessibility and inclusive-design checklist

- Meet WCAG 2.2 AA colour contrast for text, controls, chart labels and focus indicators in both themes.
- Preserve a visible, high-contrast `:focus-visible` outline on every interactive element.
- Use one `h1` per page and logical `h2`/`h3` structure; do not use headings only for visual styling.
- Ensure all form fields retain labels, hint text, validation association and error announcements.
- Mark decorative illustrations as decorative; give meaningful diagram SVGs titles/descriptions and an equivalent text summary where required.
- Respect text zoom to 200% and browser reflow at 320 px without loss of action or horizontal page scrolling.
- Ensure tables/timelines are usable with keyboard and screen readers, including a non-visual summary of data relationships.
- Do not use animation as the only cue for loading, completion, active state or errors.
- Support `prefers-reduced-motion`, forced colours, high contrast and light/dark user preference.
- Test using keyboard only, VoiceOver/Safari, NVDA/Chrome or equivalent before release.

---

## 11. Content and microcopy pass

- Establish a copy style: clear, reflective, non-fatalistic, non-clinical, precise and warm.
- Prefer “notice,” “explore,” “pattern,” “season,” “choice” and “practice” over “destiny,” “guarantee,” “unlock” and “prediction.”
- Keep Sanskrit labels only where they offer real context; pair each with plain-language explanation on first use.
- Replace CTA verbs that sound transactional (“Get Teaser”) with clear, honest actions (“See a short reading”).
- Review all user-facing copy for character-encoding issues visible in current source output before visual work ships.
- Verify all social-proof, number and country claims or remove them.
- Maintain legal/disclaimer language without making it visually hidden or hostile.

---

## 12. SEO, analytics and metadata protection

- Preserve every public route, canonical URL, sitemap entry, robots rule and existing structured data unless separately approved.
- Keep semantic text in HTML; do not convert important H1s, benefit statements or links into images.
- Update `metadata` and Open Graph artwork only after the visual identity is approved; do not lose existing title/description coverage.
- Add `alt` descriptions to new content imagery and empty alt attributes to decorative assets.
- Preserve existing landing-view and teaser analytics events in `src/app/page.tsx`; add new event names only after analytics taxonomy review.
- If CTA labels change, ensure funnel reporting continues to identify the same destination and intent.
- Run Lighthouse and inspect rendered metadata after deployment preview.

---

## 13. Performance and technical quality gates

- Avoid WebGL and Three.js for this redesign unless an approved interaction cannot be represented with SVG/CSS; the visual direction does not require them.
- Remove global fixed starfield/nebula layers and expensive filters from normal browsing paths.
- Use `next/font` with only the required subsets/weights; do not load several decorative faces.
- Set image `sizes`, stable dimensions and lazy loading correctly.
- Audit client components: do not turn server-renderable editorial sections into client components solely for animation.
- Keep the homepage’s interactive JavaScript limited to the birth teaser, existing auth behavior, deliberate navigation and modest progressive enhancement.
- Check bundle impact before and after; visual assets must not cause material LCP regression.
- Test loading, empty, success and error states at slow-network conditions.

---

## 14. Implementation sequence

### Phase 0 — decisions and audit (no production styling)

1. Confirm this exact direction and the homepage copy hierarchy.
2. Confirm whether the current wordmark stays, is refined, or is replaced.
3. Approve the font pairing and colour token swatches.
4. Inventory every current use of cosmic utility classes, `CosmicMandala`, `CosmicStarfield`, gradients, blur and card styles.
5. Capture baseline screenshots of key routes in desktop/mobile and both themes.
6. Record baseline performance, accessibility and bundle measurements.

### Phase 1 — asset and design-system foundation

1. Produce/approve the asset briefs and art direction sheet.
2. Create final Atlas, route motifs and divider system.
3. Add optimized assets and the asset manifest.
4. Add semantic design tokens and typography tokens.
5. Create Storybook stories for typography, buttons, field slips, links, surfaces, header states and illustration placements.
6. Test day/night themes and forced-colours behaviour before migrating pages.

### Phase 2 — shared shell

1. Redesign `Logo` presentation if approved.
2. Migrate `Header` desktop, mobile drawer, authenticated/public states and theme toggle.
3. Migrate `Footer` and check every link.
4. Replace root cosmic backgrounds with paper/ink base layers and restrained grain.
5. Re-test native safe-area, sign-out, account access, admin visibility and menu focus trapping.

### Phase 3 — public homepage

1. Recompose the public branch of `src/app/page.tsx` into Atlas hero and illustrated route sections.
2. Integrate the existing teaser flow into the Field Slip form shell.
3. Replace chat sample and credits-card treatment with approved editorial sections.
4. Rework blog loading into Journal strip.
5. Implement mobile and reduced-motion variants.
6. Test public, authenticated and unauthenticated branches separately.

### Phase 4 — core product pages

1. Chart folio.
2. Timing/Seasons and dasha timeline.
3. Reflection Room and history pages.
4. Synastry/relationship threads.
5. Dashboard/day desk and profile/archive surfaces.

### Phase 5 — supporting routes

1. Onboarding, login, account, pricing and contact.
2. Journal/blog, article, about, glossary and explanatory pages.
3. Community routes.
4. Legal, SEO landing and admin routes.
5. Offline and global error states.

### Phase 6 — cleanup and verification

1. Remove unused cosmic code, assets and CSS only after confirmed no references.
2. Update visual regression screenshots and Storybook documentation.
3. Run lint, type checking, production build and relevant tests.
4. Run manual browser, responsive, accessibility and Capacitor verification.
5. Review production preview with real auth states and a representative chart/profile.

---

## 15. Acceptance criteria

The redesign is ready only when all of the following are true:

- A first-time visitor recognises a coherent Editorial Atlas visual world within the first viewport.
- The homepage contains a dominant original illustration and visual paths, not a grid of generic SaaS cards.
- No gold-on-black, purple nebula, glassmorphism, perpetual celestial animation or generic chatbot style remains in customer-facing product pages.
- Every primary action remains findable by keyboard, screen reader and touch.
- Existing authentication, profile, chart, timing, clarity, pricing, account deletion, analytics, SEO and native shell behavior still works.
- Both Day Atlas and Night Ink themes have verified AA contrast.
- Mobile has no clipped fields, overlapping CTA/artwork, inaccessible drawer items, scroll jank or safe-area collisions.
- New image assets meet the performance budget and do not introduce material LCP or layout-shift regression.
- All remaining source text uses valid UTF-8 encoding and no user-facing mojibake is present.
- The final implementation is visually reviewed against the approved mockup direction, not just functionally tested.

---

## 16. Deliverables checklist

- [ ] Approved art-direction sheet and token palette.
- [ ] Approved wordmark/font decision.
- [ ] Asset briefs and visual-asset manifest.
- [ ] Final optimized illustration set with source files retained.
- [ ] Updated shared shell and theme system.
- [ ] Redesigned homepage, authenticated home and all in-scope routes.
- [ ] Storybook coverage for shared visual primitives.
- [ ] Responsive screenshot set at required breakpoints.
- [ ] Accessibility test notes and remediations.
- [ ] Performance before/after comparison.
- [ ] Native iOS/Android shell verification notes.
- [ ] SEO/metadata and analytics verification notes.
- [ ] Release checklist and rollback reference.

---

## 17. Decisions required before implementation starts

1. Confirm the chosen direction: **Editorial Atlas + restrained Reflection Studio**.
2. Confirm whether “Chetna” is the public-facing name or whether “AskChetna” should remain the dominant wordmark everywhere.
3. Approve a final type pairing and ownership/licensing plan.
4. Approve whether original illustrations will be generated, commissioned, or created as in-house vector/raster artwork.
5. Confirm which homepage claims and statistics are verified for publication.
6. Confirm whether the Theme Toggle remains a user-facing feature or whether Night Ink is automatically derived from device preference.
7. Confirm the desired rollout: all routes in one release or phased release beginning with shell + homepage.

