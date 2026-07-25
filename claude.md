# 🎯 Project Rules — NO GENERIC / FLAT DESIGN
## 🧱 Tech Stack
- Web: Next.js 15 + Tailwind v3 + shadcn/ui
- Mobile: React Native + Expo + Material 3 / Apple HIG
- Icons: Lucide only — NO emojis as icons

## 🎨 Design Identity (CHOOSE ONE & DELETE OTHERS)
- [ ] **Soft Minimal**: subtle depth, soft shadows, rounded 12–20px
- [ ] **Neo-Brutalist**: bold shapes, thick borders, high contrast
- [ ] **Editorial**: large typography, generous whitespace, asymmetry
- [ ] **Apple-Inspired**: clean, translucency, iOS HIG spacing

## 🚫 FORBIDDEN (ENFORCED ALWAYS)
❌ Default fonts: Inter, Roboto, Arial, Lato
❌ Flat white cards with zero depth
❌ Generic blue/gray default palettes
❌ Uniform grids + equal spacing everywhere
❌ "Slightly rounded" / "nice shadow" — use exact values

## ✅ MANDATORY SPECIFICS
### Typography
- Headings: Clash Display / Fraunces — weights 700–900
- Body: Bricolage Grotesque / Space Grotesk — weights 300–500
- Mono: JetBrains Mono
- Scale: jumps ≥ 1.5x; use 200/800 not just 400/600

### Colors (EXACT HEX ONLY)
- Primary: #2563eb | Accent: #ef4444 | Neutrals: slate-50 → slate-950
- Always add: subtle gradients, layered backgrounds, glass/transparency, soft shadows

### Layout & Depth
- Spacing: strict 4/8/16/24/32px grid — never "more space"
- Mix: asymmetrical layouts, overlapping elements, varied card heights
- Depth: 8px–24px radius; subtle inner glow + drop shadow; border opacity variations

### Platform Rules
- **Web**: responsive breakpoints sm/md/lg/xl; hover + focus states
- **iOS**: follow Apple HIG; 44px minimum tap targets; SF Symbols style
- **Android**: Material 3; adaptive icons; ripple effects; proper elevation

## 🧠 Workflow
1. State design intent → layout → colors → typography → components → motion → code
2. Pull specs DIRECTLY from Figma via MCP — never guess values
3. Use shadcn/ui / Magic UI components — build custom only when needed
4. Before final: check for generic defaults; propose 2 distinct visual variants
5. Preview with Playwright / Expo MCP — verify spacing, depth, animations live