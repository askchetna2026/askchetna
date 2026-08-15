You are implementing AskChetna.

Authoritative source:
- Read the attached file: askchetna_redesign_master_pack_v1_1.md
- Treat it as the single source of truth for design, architecture, component rules, and platform strategy.
- Do not contradict it or invent a different design language.

Project goal:
Build the AskChetna design system and frontend implementation in a way that supports web, Android, and iOS as one brand family.

Critical platform rule:
- The website is the first implementation phase.
- The shared design system must be reusable for Android and iOS.
- Do not make mobile app experiences look like webpages.
- Mobile apps must feel native, task-oriented, and gesture-friendly.
- The web experience may be editorial and content-rich.
- The app experience must be concise, quick, and app-first.

What to build first:
1. Project scaffold for the web app
2. Shared design tokens
3. Shared reusable components
4. Web layout shell
5. Homepage for the web surface
6. Architecture that can later support native mobile adaptations

Implementation expectations:
- Next.js App Router for the web surface
- TypeScript everywhere
- Tailwind CSS for styling
- Reusable components in a clean folder structure
- Centralised design tokens
- Responsive layout for mobile, tablet, and desktop on the web
- Keyboard-accessible navigation and controls
- Image handling with next/image
- Clean separation between layout, components, and page content
- Platform strategy awareness baked into naming, architecture, and documentation

Design direction:
- Warm parchment / cream / sand background
- Elegant serif for headings, clean sans for body
- Thin borders
- Soft shadows
- Rounded cards
- Editorial composition for web
- Calm spacing
- Realistic image treatment
- Botanical / celestial accents only when subtle and appropriate

Platform direction:
- Web: editorial, immersive, multi-column, SEO-friendly, story-rich
- Android: native, concise, bottom-nav, quick-actions, gesture-friendly
- iOS: native, concise, tab-bar, sheet-based, clean grouped sections

Do not:
- hardcode new design tokens
- invent app styles that conflict with the master pack
- copy the web homepage directly into future mobile app layouts
- use SVG-style placeholder imagery or AI-generated illustrations for final visuals
- create one-off components when a reusable one can solve the need

Deliverables:
- web project scaffold
- design token foundation
- shared component system
- web homepage implementation
- code structure that can later be reused for Android and iOS presentation layers

Start now by creating the web scaffold and shared design-token foundation while keeping the platform strategy in mind.