You are working on the AskChetna redesign.

Authoritative source:
- Read and follow the attached file: askchetna_redesign_master_pack.md
- Treat it as the single source of truth for design, structure, components, and implementation rules.
- Do not contradict it, simplify it away, or invent new design language.

Goal:
Build the AskChetna frontend from scratch as a premium editorial-style website using Next.js, React, TypeScript, and Tailwind CSS. The implementation must be consistent, reusable, responsive, accessible, and visually aligned with the master specification.

What to build first:
1. Project scaffold
2. Global design tokens
3. Base layout shell
4. Shared reusable components
5. Homepage
6. Then prepare for inner pages using the same system

Important constraints:
- Use only the design tokens and rules from the master pack.
- Do not invent new colours, spacing, radii, shadows, or fonts.
- Do not use generic AI-looking UI.
- Do not use SVG-style placeholder imagery or AI-generated illustrations for final visuals.
- Prefer real editorial photography and human-made artwork placeholders where assets are not yet available.
- Keep the UI calm, premium, warm, and editorial.
- Keep motion subtle.
- Use semantic HTML.
- Use accessible patterns throughout.
- Use reusable components instead of page-specific one-offs.
- Ensure the codebase is easy to extend for additional pages.

Implementation expectations:
- Next.js App Router structure
- TypeScript everywhere
- Tailwind CSS for styling
- Reusable components in a clean folder structure
- Centralised design tokens
- Responsive layout for mobile, tablet, and desktop
- Keyboard-accessible navigation and controls
- Image handling with next/image
- Clean separation between layout, components, and page content

Deliverables:
Create the initial codebase with:
- a polished app shell
- token definitions
- shared layout components
- a homepage that follows the homepage blueprint and implementation spec
- reusable UI primitives for buttons, cards, headings, section wrappers, navigation, footer, and content blocks

How to work:
- Read the attached spec first.
- Then inspect the repo structure.
- If the app is empty, create the required folders and files.
- Implement the foundation in a maintainable way.
- Comment only where necessary.
- Prefer clarity over cleverness.
- Do not ask questions unless the spec is truly ambiguous.
- If something is missing, make the most conservative reasonable assumption and proceed.
- After implementation, summarise exactly what you created and which files changed.

Homepage requirements:
- Announcement bar
- Sticky header navigation
- Split hero with editorial image area
- Featured AI tools grid
- Why AskChetna section
- Three-step process section
- Guidance categories grid
- Assistant preview section
- Testimonials
- Latest articles grid
- Newsletter signup
- Footer

Component requirements:
Build reusable components for:
- announcement bar
- navigation/header
- button
- card
- feature card
- tool card
- category card
- testimonial card
- article card
- section heading
- newsletter form
- footer columns
- hero split layout
- divider/ornament
- stats/proof item
- accordion
- tabs
- search field
- empty state
- loading skeleton

Design direction:
- Warm parchment / cream / sand background
- Elegant serif for headings, clean sans for body
- Thin borders
- Soft shadows
- Rounded cards
- Editorial composition
- Calm spacing
- Realistic image treatment
- Botanical / celestial accents only when subtle and appropriate

Quality bar:
The result should feel like a premium editorial publication rather than a template. It must be consistent across the entire interface and ready to expand into the rest of the site.

Start now by creating the project scaffold and the core design-token foundation.