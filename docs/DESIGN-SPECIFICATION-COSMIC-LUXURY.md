# AskChetna Design Specification — "Cosmic Luxury" System

**Document Version:** 1.0  
**Date:** July 26, 2026  
**Status:** Ready for Implementation

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Component Design](#component-design)
5. [Animation & Motion](#animation--motion)
6. [Design Tools & MCPs](#design-tools--mcps)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Accessibility Guidelines](#accessibility-guidelines)

---

## Design Philosophy

### "Cosmic Luxury"

Transform AskChetna from "generic SaaS" → "premium astrology experience"

**Three Pillars:**
1. **Mystical** — Evoke wonder (starfields, cosmic elements)
2. **Premium** — High-end feel (glassmorphism, gradients, depth)
3. **Functional** — Beautiful + usable (clear hierarchy, purpose-driven animations)

**Anti-Pattern:** No gratuitous animations. Every pixel serves a purpose.

---

## Color System

### Primary Palette (Keep Current)

```css
Dark Theme (Default):
--background: #0B0F2F          /* Deep indigo void */
--foreground: #DFE0FF           /* Light lavender text */
--accent-gold: #D4AF37          /* Celestial gold */
--accent-iris: #5D3FD3          /* Purple accent */

Light Theme:
--background: #FDF4E3           /* Warm cream */
--foreground: #2C1B18           /* Dark brown */
--accent-gold: #B8860B          /* Muted gold */
--accent-rose: #C48E8E          /* Mauve rose */
```

### Extended Cosmic Palette (NEW)

Based on [2026 Cosmic Color Trends](https://icolorpalette.com/cosmic/):

```css
Dark Theme Additions:
/* Nebula Purples (for depth & glows) */
--nebula-purple: #9F7AEA         /* Soft lavender glow */
--nebula-purple-light: #B89FE8   /* Lighter nebula */
--nebula-indigo: #5D3FD3         /* Deep mystery */
--nebula-blue: #4A90E2           /* Cosmic blue */

/* Mystical Accents */
--star-white: #E8E9FF            /* Soft white (not pure #FFF) */
--moon-silver: #C7C5CF           /* Silver accent */
--cosmic-glow: #D4AF37           /* Gold glow */

/* Success & Feedback */
--success-cosmic: #4ECDC4        /* Teal (life affirmation) */
--warning-cosmic: #F7B731        /* Solar orange */
--error-cosmic: #FF6B9D          /* Cosmic rose */
```

### Semantic Color Usage

```css
/* Planets (for chart visualization) */
--planet-sun: #FFD700           /* Gold */
--planet-moon: #F0F0F0          /* Silver */
--planet-mars: #E74C3C          /* Red */
--planet-mercury: #3498DB       /* Blue */
--planet-venus: #F39C12         /* Orange */
--planet-jupiter: #8E44AD       /* Purple */
--planet-saturn: #95A5A6        /* Gray */
--planet-rahu: #2C3E50          /* Dark (shadow) */
--planet-ketu: #34495E          /* Gray-dark (shadow) */

/* Elements (Vedic) */
--element-fire: #E74C3C         /* Mars/Red */
--element-earth: #8B7355        /* Brown */
--element-air: #87CEEB          /* Sky blue */
--element-water: #3498DB        /* Ocean blue */
```

---

## Typography

### Font Stack (Already in Use ✅)

```css
--font-heading: 'Playfair Display', serif
  /* Weight: 700 (bold), 400 (regular) */
  /* Usage: H1, H2, H3, Feature titles */

--font-main: 'Inter', sans-serif
  /* Weight: 400 (regular), 500 (medium), 600 (semibold) */
  /* Usage: Body text, UI, labels */
```

### Hierarchy (NEW Specifications)

**Desktop Sizes:**

```css
/* H1 - Page Title */
font-size: 48px
line-height: 1.2
font-weight: 700
font-family: var(--font-heading)
letter-spacing: -0.02em
margin-bottom: 32px

/* H2 - Section Title */
font-size: 36px
line-height: 1.3
font-weight: 700
font-family: var(--font-heading)
margin-bottom: 24px

/* H3 - Subsection Title */
font-size: 24px
line-height: 1.4
font-weight: 700
font-family: var(--font-heading)
margin-bottom: 16px

/* H4 - Card Title */
font-size: 20px
line-height: 1.4
font-weight: 700
font-family: var(--font-heading)
margin-bottom: 12px

/* Body - Regular Text */
font-size: 16px
line-height: 1.6
font-weight: 400
font-family: var(--font-main)
color: var(--foreground)

/* Caption - Small Text */
font-size: 12px
line-height: 1.5
font-weight: 500
font-family: var(--font-main)
color: var(--text-muted)
letter-spacing: 0.01em
```

**Mobile Sizes:** Scale down 20-30%

### Decorative Typography

```css
/* Cosmic Heading - With gold underline */
h2.cosmic {
  position: relative;
  display: inline-block;
}

h2.cosmic::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, var(--accent-gold), transparent);
}

/* Subtitle - Elegant, spaced */
.subtitle {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-gold);
  margin-bottom: 8px;
}
```

---

## Component Design

### 1. Cards (Glassmorphism)

**Status:** Currently flat; needs elevation

**New Design:**

```css
.card-cosmic {
  background: rgba(18, 22, 64, 0.4);           /* 40% opacity */
  backdrop-filter: blur(20px);                  /* Frosted glass effect */
  border: 1px solid rgba(212, 175, 55, 0.2);  /* Subtle gold border */
  border-radius: 16px;
  padding: 24px;
  box-shadow: 
    0 20px 50px -10px rgba(0, 0, 0, 0.8),      /* Dark shadow */
    inset 0 1px 0 rgba(255, 255, 255, 0.1);    /* Inner light edge */
  transition: all 0.3s ease;
}

.card-cosmic:hover {
  background: rgba(18, 22, 64, 0.5);           /* Slightly more opaque */
  border-color: rgba(212, 175, 55, 0.4);       /* Brighter border */
  box-shadow: 
    0 30px 60px -10px rgba(93, 63, 211, 0.3);  /* Purple glow on hover */
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}
```

### 2. Buttons (Premium Feel)

**Status:** Current buttons are too plain

**New Design:**

```css
.btn-primary {
  background: linear-gradient(135deg, 
    var(--accent-gold) 0%,
    var(--accent-iris) 100%);
  color: var(--background);
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

/* Ripple effect on click */
.btn-primary::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
}

.btn-primary:active::before {
  width: 300px;
  height: 300px;
  animation: ripple 0.6s ease-out;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(212, 175, 55, 0.4);
}

.btn-secondary {
  background: transparent;
  border: 2px solid var(--accent-gold);
  color: var(--accent-gold);
  padding: 10px 22px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: rgba(212, 175, 55, 0.1);
  box-shadow: inset 0 0 20px rgba(212, 175, 55, 0.2);
}

@keyframes ripple {
  to {
    width: 300px;
    height: 300px;
    opacity: 0;
  }
}
```

### 3. Birth Chart (Interactive & Animated)

**Status:** Functional SVG; needs animation and interactivity

**New Features:**

```typescript
/* React component with framer-motion */
<motion.svg
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.8, ease: "easeOut" }}
>
  {/* Zodiac circle */}
  <circle cx="150" cy="150" r="140" 
    fill="none" 
    stroke="rgba(212, 175, 55, 0.3)" 
    strokeWidth="2" />
  
  {/* Planets with hover glow */}
  {planets.map((planet) => (
    <motion.g
      key={planet.id}
      whileHover={{ scale: 1.3 }}
      onHoverStart={() => setHovered(planet.id)}
    >
      {/* Glow effect */}
      <circle
        cx={planet.x}
        cy={planet.y}
        r={planet.size + 4}
        fill={`url(#glow-${planet.name})`}
        opacity={0.5}
      />
      
      {/* Planet symbol */}
      <text
        x={planet.x}
        y={planet.y}
        fontSize={planet.size * 2}
        fill={getPlanetColor(planet.name)}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {planet.glyph}
      </text>
      
      {/* Tooltip on hover */}
      {hovered === planet.id && (
        <motion.g
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <rect x={planet.x - 40} y={planet.y - 30}
            width="80" height="24"
            fill="rgba(18, 22, 64, 0.9)"
            rx="6"
          />
          <text x={planet.x} y={planet.y - 12}
            fontSize="12" fill="var(--accent-gold)"
            textAnchor="middle"
          >
            {planet.name} {planet.sign}
          </text>
        </motion.g>
      )}
    </motion.g>
  ))}
</motion.svg>
```

**Animations:**
- Chart slides in on page load (0.8s)
- Planets have subtle rotating glow
- Hover enlarges planet + shows tooltip
- Transits animate (planets move smoothly over 12 hours)

### 4. Dasha Timeline (Visual Hierarchy)

**Status:** Currently a horizontal list; needs vertical visualization

**New Design:**

```css
.dasha-timeline {
  position: relative;
  padding: 40px 0;
}

/* Center line */
.dasha-timeline::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, 
    var(--accent-gold) 0%,
    transparent 100%);
}

.dasha-period {
  margin-bottom: 40px;
  opacity: 0.6;
  transition: all 0.3s ease;
}

.dasha-period.current {
  opacity: 1;
}

.dasha-period:nth-child(odd) {
  text-align: right;
  padding-right: 52%;
}

.dasha-period:nth-child(even) {
  text-align: left;
  padding-left: 52%;
}

.dasha-card {
  display: inline-block;
  background: rgba(93, 63, 211, 0.2);
  border: 2px solid var(--accent-iris);
  border-radius: 12px;
  padding: 16px 20px;
  position: relative;
  max-width: 300px;
}

.dasha-card.current {
  background: linear-gradient(135deg,
    rgba(212, 175, 55, 0.3),
    rgba(93, 63, 211, 0.3));
  border-color: var(--accent-gold);
  box-shadow: 0 0 30px rgba(212, 175, 55, 0.2);
}

/* Timeline dot */
.dasha-card::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  background: var(--background);
  border: 3px solid var(--accent-gold);
  border-radius: 50%;
  left: 50%;
  top: 50%;
  transform: translateX(-50%) translateY(-50%);
  z-index: 10;
}

.dasha-card.current::after {
  width: 20px;
  height: 20px;
  box-shadow: 0 0 15px var(--accent-gold);
  animation: pulse-glow 2s infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 15px var(--accent-gold);
  }
  50% {
    box-shadow: 0 0 25px var(--accent-gold);
  }
}
```

### 5. Loading & States

**Zodiac Wheel Spinner (NEW):**

```typescript
<motion.svg width="60" height="60" viewBox="0 0 60 60">
  <motion.circle
    cx="30" cy="30" r="25"
    fill="none"
    stroke="var(--accent-gold)"
    strokeWidth="2"
    strokeDasharray="158" /* 2πr */
    strokeDashoffset={158}
    animate={{ strokeDashoffset: 0 }}
    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
  />
  
  {/* Zodiac glyphs rotating */}
  {ZODIAC_SIGNS.map((sign, i) => (
    <motion.text
      key={i}
      x={30 + 20 * Math.cos((i * 30 * Math.PI) / 180)}
      y={30 + 20 * Math.sin((i * 30 * Math.PI) / 180)}
      fontSize="8"
      fill="var(--accent-gold)"
      animate={{ rotate: 360 }}
      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
    >
      {sign.glyph}
    </motion.text>
  ))}
</motion.svg>
```

**Success Confirmation (Gold Star Animation):**

```typescript
<motion.div
  initial={{ scale: 0, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ duration: 0.5, ease: "easeOut" }}
>
  <motion.svg width="80" height="80" viewBox="0 0 80 80">
    <motion.path
      d="M40,5 L50,30 L75,35 L55,55 L60,80 L40,65 L20,80 L25,55 L5,35 L30,30 Z"
      fill="var(--accent-gold)"
      animate={{
        rotate: [0, 360],
        scale: [1, 1.1, 1]
      }}
      transition={{
        rotate: { duration: 0.6, ease: "easeOut" },
        scale: { duration: 0.6, ease: "easeOut" }
      }}
    />
  </motion.svg>
</motion.div>
```

---

## Animation & Motion

### Principles (From [2026 Best Practices](https://acodez.in/micro-interactions-motion-design/))

✅ **Only animate transform & opacity** (for 60fps)  
✅ **Keep durations under 300ms** (UI interactions)  
✅ **Purposeful animations only** (no gratuitous effects)  
✅ **Respect prefers-reduced-motion** (accessibility)

### Animation Library

**Use:** Framer Motion (already imported ✅)

**Commonly Used Animations:**

```typescript
/* Page Enter */
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.5 }}

/* Hover Scale */
whileHover={{ scale: 1.05 }}
whileTap={{ scale: 0.95 }}

/* Stagger Children */
variants={{
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }
}}

/* Gentle Floating */
animate={{
  y: [0, -10, 0]
}}
transition={{
  duration: 3,
  repeat: Infinity,
  ease: "easeInOut"
}}
```

### Starfield Background (Three.js + React Three Fiber)

**Implementation:**

```bash
npm install three @react-three/fiber @react-three/drei
```

```typescript
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';

export function CosmicBackground() {
  return (
    <Canvas
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1
      }}
      camera={{ position: [0, 0, 1] }}
    >
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />
    </Canvas>
  );
}
```

**Fallback (CSS-only, no dependencies):**

```css
.starfield-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at 50% 50%, 
    rgba(93, 63, 211, 0.1) 0%,
    transparent 100%);
  z-index: -1;
}

.star {
  position: absolute;
  width: 1-2px;
  height: 1-2px;
  background: var(--star-white);
  border-radius: 50%;
  opacity: 0.6-1;
  animation: twinkle 3s infinite;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
```

---

## Design Tools & MCPs

### 1. Figma + Code Connect (MCP) ⭐ CRITICAL

**What:** Link Figma components to React code  
**Cost:** FREE  
**Setup:** 4-6 hours  
**MCP:** Available (you have Figma MCP)

**Implementation Steps:**

1. **Set up Design Tokens in Figma**
   ```
   Create collections:
   - Colors (all semantic colors above)
   - Spacing (4, 8, 12, 16, 24, 32, 48...)
   - Typography (sizes, weights, line-heights)
   - Shadows (glassmorphism, hover, focus)
   - Border Radius (8, 12, 16, 24)
   ```

2. **Create Components in Figma**
   ```
   Button (Primary, Secondary, Sizes)
   Card (Default, Hover, Active)
   Input (Text, Select, Checkbox)
   Badge (Success, Warning, Error)
   Chart (Birth Chart component)
   Timeline (Dasha timeline)
   ```

3. **Use Code Connect**
   ```typescript
   // Button.figma.tsx (in your component library)
   import { figma } from 'figma-plugin'
   
   figma.connect(Button, FigmaButton, {
     example: (props) => <Button {...props} />,
     props: {
       variant: figma.enum('Variant'),
       size: figma.enum('Size'),
       disabled: figma.boolean('Disabled')
     }
   })
   ```

### 2. Design Tokens (Token Studio + CSS Variables)

**What:** Sync Figma tokens to code automatically  
**Tools:** Token Studio (Figma plugin) or native Figma Variables  
**Cost:** FREE (native) or $96-500/yr (Token Studio)

**Setup:**

```json
// tokens.json (generated from Figma)
{
  "color": {
    "bg": { "$value": "#0B0F2F" },
    "gold": { "$value": "#D4AF37" },
    "iris": { "$value": "#5D3FD3" }
  },
  "spacing": {
    "xs": { "$value": "4px" },
    "sm": { "$value": "8px" },
    "md": { "$value": "16px" },
    "lg": { "$value": "24px" }
  }
}
```

**Export to CSS:**

```bash
npm install style-dictionary

# style-dictionary.config.js
module.exports = {
  source: ['tokens.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'src/styles/tokens/',
      files: [{ destination: 'variables.css', format: 'css/variables' }]
    }
  }
};

npm run style-dictionary build
```

### 3. Storybook (Component Library & Documentation)

**What:** Develop, test, document components in isolation  
**Cost:** FREE  
**Setup:** 6-8 hours  
**Current Status:** Not yet set up

**Installation:**

```bash
npx storybook@latest init

# Add essential addons
npm install --save-dev @storybook/addon-designs @storybook/addon-a11y
```

**Story Example:**

```typescript
// Button.stories.tsx
import { Button } from './Button';

export default {
  title: 'Components/Button',
  component: Button,
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/file/...'
    }
  }
};

export const Primary = {
  args: { variant: 'primary', children: 'Primary Button' }
};

export const Secondary = {
  args: { variant: 'secondary', children: 'Secondary Button' }
};
```

**Run:**

```bash
npm run storybook
# Opens on http://localhost:6006
```

### 4. Remotion (Video Generation for Tutorials/Previews)

**What:** Generate videos programmatically with React  
**Cost:** FREE  
**Use Cases:** Chart reveal videos, astrology explainer videos, product demos

**Example: Dasha Timeline Reveal:**

```typescript
import { Composition, Sequence } from 'remotion';

export const DashaTimelineVideo = () => {
  return (
    <Composition
      id="DashaTimeline"
      component={DashaTimelineComp}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

function DashaTimelineComp({ frame }) {
  const progress = frame / 300;
  
  return (
    <div style={{ 
      background: '#0B0F2F', 
      width: '100%', 
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Timeline animates from 0 to 1 */}
      <DashaTimeline progress={progress} />
    </div>
  );
}
```

### 5. Three.js + React Three Fiber (Starfield)

**Already researched above** — Use for cosmic background

---

## Implementation Roadmap

### Phase 1: Design System Foundation (Weeks 1-2)

**Tasks:**
- [ ] Create Figma file with "Cosmic Luxury" design system
- [ ] Define all colors, typography, spacing
- [ ] Create design tokens (JSON)
- [ ] Export tokens to CSS variables
- [ ] Update `globals.css` with new color variables

**Deliverable:** Figma design system file + CSS tokens

**Effort:** 16-20 hours

---

### Phase 2: Component Library (Weeks 3-4)

**Tasks:**
- [ ] Set up Storybook
- [ ] Convert existing components to Cosmic Luxury style:
  - [ ] Button (primary, secondary, sizes)
  - [ ] Card (glassmorphism)
  - [ ] Badge (all variants)
  - [ ] Input/Select (form elements)
  - [ ] Modal (popups, dialogs)
- [ ] Add framer-motion animations to all components
- [ ] Set up Code Connect for each component

**Deliverable:** Storybook running locally + all components updated

**Effort:** 32-40 hours

---

### Phase 3: Feature-Specific Designs (Weeks 5-6)

**Tasks:**
- [ ] Birth Chart (animated, interactive)
- [ ] Dasha Timeline (vertical timeline)
- [ ] Remedy Cards (new component)
- [ ] Life Area Cards (accordion)
- [ ] Transits Visualization (animated chart)

**Deliverable:** All feature components with animations

**Effort:** 24-32 hours

---

### Phase 4: Backgrounds & Effects (Weeks 7-8)

**Tasks:**
- [ ] Implement starfield background (Three.js)
- [ ] Add subtle nebula gradients to key pages
- [ ] Implement glow effects on planets/important data
- [ ] Add constellation graphics (SVG)
- [ ] Polish micro-interactions

**Deliverable:** Fully cosmic visual experience

**Effort:** 20-24 hours

---

### Phase 5: Polish & Testing (Week 9)

**Tasks:**
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Mobile responsiveness check
- [ ] Accessibility audit (WCAG 2.1)
- [ ] Performance optimization (Lighthouse)
- [ ] Dark/light mode testing

**Deliverable:** Production-ready design system

**Effort:** 16-20 hours

---

## Accessibility Guidelines

### Glassmorphism + Text Contrast

**Problem:** Blurred backgrounds reduce text contrast

**Solution:**

```css
.card-cosmic {
  background: rgba(18, 22, 64, 0.5); /* More opaque for contrast */
  backdrop-filter: blur(16px); /* Blur, but not excessive */
}

.card-cosmic p {
  color: var(--foreground); /* High contrast text */
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.3); /* Subtle shadow for readability */
}
```

### Motion Preferences

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Color Contrast

- Text on cards: Minimum WCAG AA (4.5:1 contrast)
- Icons: Use both color + pattern to distinguish (not color alone)
- Charts: Colorblind-friendly palette (no red-only warnings)

### Keyboard Navigation

- All buttons focusable (`:focus` visible)
- Animated elements don't trap focus
- Tab order logical

---

## File Structure for Implementation

```
src/
├── styles/
│   ├── globals.css         (Updated with new colors)
│   ├── tokens.css          (Generated from tokens.json)
│   └── animations.css      (Reusable animation utilities)
├── components/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Chart/
│   │   ├── BirthChart.tsx
│   │   └── BirthChart.figma.tsx (Code Connect)
│   ├── Timeline/
│   │   ├── DashaTimeline.tsx
│   │   └── DashaTimeline.figma.tsx
│   └── ... (all other components)
├── lib/
│   ├── design/
│   │   ├── tokens.ts       (Typed design tokens)
│   │   └── animations.ts   (Reusable animation configs)
│   └── cosmic/
│       └── starfield.tsx   (Three.js component)
└── .storybook/
    ├── main.ts
    ├── preview.ts
    └── manager-head.html
```

---

## Next Steps (Action Items)

### Week 1:
- [ ] Create Figma file (or open existing design file)
- [ ] Define Cosmic Luxury color system in Figma
- [ ] Export tokens to JSON
- [ ] Update CSS variables in globals.css

### Week 2:
- [ ] Set up Storybook
- [ ] Start converting components (Button first)
- [ ] Test animations with Framer Motion

### Week 3+:
- [ ] Follow implementation roadmap above
- [ ] Get design feedback from team
- [ ] Test on real devices

---

## Reference Sources

All design research sourced from 2026 industry benchmarks:

- [Figma Code Connect Best Practices 2026](https://www.figma.com/blog/introducing-code-connect/)
- [Design Tokens W3C Standard 2025](https://www.w3.org/TR/design-tokens/)
- [Glassmorphism 2026 CSS Trends](https://specificit.com.au/what-is-glassmorphism-how-to-implement-2026/)
- [Three.js Starfield in React](https://tobygates.co.uk/web-development-blog/creating-a-3d-starfield-effect-with-react-three/)
- [React Animation Best Practices 2026](https://acodez.in/micro-interactions-motion-design/)
- [Storybook + Figma Integration](https://help.figma.com/hc/en-us/articles/360045003494-Storybook-and-Figma)
- [Cosmic Color Palettes 2026](https://icolorpalette.com/cosmic/)
- [Remotion Video Framework](https://www.remotion.dev/)
- [SVG Astrology Chart Libraries](https://github.com/AstroDraw/AstroChart)

---

**Status:** Ready to implement. Start with Phase 1 this week!

