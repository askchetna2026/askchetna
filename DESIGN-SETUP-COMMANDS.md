# AskChetna Design System — Setup Commands

**Status:** Ready to implement  
**Last Updated:** July 26, 2026

---

## Phase 1: Install Design & Animation Libraries

### Step 1: Install Framer Motion (Enhanced Animations)
Framer Motion is already imported. Ensure it's up to date:

```bash
npm install framer-motion@latest
```

Or update existing:
```bash
npm update framer-motion
```

---

### Step 2: Install Three.js + React Three Fiber (Starfield Background)

```bash
npm install three @react-three/fiber @react-three/drei
```

**Packages added:**
- `three` — 3D graphics library
- `@react-three/fiber` — React renderer for Three.js
- `@react-three/drei` — Helper components for three-fiber

---

### Step 3: Install Storybook (Component Library)

```bash
npx storybook@latest init
```

This command:
- Installs Storybook and dependencies
- Auto-detects your project type (Next.js)
- Creates `.storybook/` directory
- Generates example stories

**After installation, verify:**
```bash
npm run storybook
# Opens http://localhost:6006
```

---

### Step 4: Install Design Token Tools (Optional but Recommended)

**Token Studio Plugin** (for Figma → Code sync):
- Go to Figma → Plugins → Search "Tokens Studio for Figma"
- Install free version
- Cost: FREE tier or $480/year for pro

**Style Dictionary** (Generate CSS from JSON tokens):
```bash
npm install --save-dev style-dictionary
```

---

## Phase 2: Create Figma Design System

### Figma Setup

1. **Create new Figma file** or open existing
2. **Create Design Tokens collection:**
   ```
   File → Libraries → Create library
   Name: "AskChetna Design Tokens"
   ```

3. **Add Figma Variables:**
   ```
   Plugins → Figma Tokens
   Create collections:
   - Colors
   - Spacing
   - Typography
   - Shadows
   - Border Radius
   ```

4. **Setup Code Connect:**
   ```
   Plugin → Code Connect (search and install)
   This links Figma components to React code
   ```

---

## Phase 3: Create Storybook Stories

### Example: Button Component Story

Create file: `src/components/Button.stories.tsx`

```typescript
import { Button } from './Button';
import type { Meta, StoryObj } from '@storybook/react';

export default {
  title: 'Components/Button',
  component: Button,
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/file/YOUR_FILE_ID'
    }
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary']
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    }
  }
} satisfies Meta<typeof Button>;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button'
  }
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button'
  }
};

export const Loading: Story = {
  args: {
    variant: 'primary',
    children: 'Loading...',
    disabled: true
  }
};
```

---

## Phase 4: Create Cosmic Background Component

### Step 1: Create Starfield Component

Create file: `src/lib/cosmic/Starfield.tsx`

```typescript
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';

export function CosmicStarfield() {
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

### Step 2: Add to Layout

Edit: `src/app/layout.tsx`

```typescript
import { CosmicStarfield } from '@/lib/cosmic/Starfield';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <CosmicStarfield />
        {/* Rest of layout */}
        {children}
      </body>
    </html>
  );
}
```

---

## Phase 5: Update Components with Cosmic Styles

### Enhanced Card Component

Edit: `src/components/Card.tsx`

```typescript
import styles from './Card.module.css';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
}

export function Card({ children, className, animate = true }: CardProps) {
  return (
    <motion.div
      className={`sacred-card ${className || ''}`}
      initial={animate ? { opacity: 0, y: 20 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      whileHover={animate ? { y: -8 } : undefined}
    >
      {children}
    </motion.div>
  );
}
```

### Enhanced Button Component

Edit: `src/components/Button.tsx`

```typescript
import { motion } from 'framer-motion';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}

export function Button({ children, variant = 'primary', onClick }: ButtonProps) {
  const className = variant === 'primary' 
    ? 'primary-btn-cosmic' 
    : 'secondary-btn-cosmic';

  return (
    <motion.button
      className={className}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}
```

---

## Phase 6: Create Design Token CSS

### Option A: Auto-generate from Figma (Recommended)

1. Export tokens from Figma Tokens plugin as JSON
2. Save as: `tokens.json`

```json
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

3. Create: `style-dictionary.config.js`

```javascript
module.exports = {
  source: ['tokens.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'src/styles/tokens/',
      files: [{
        destination: 'variables.css',
        format: 'css/variables'
      }]
    }
  }
};
```

4. Add script to `package.json`:

```json
{
  "scripts": {
    "tokens:build": "style-dictionary build"
  }
}
```

5. Generate CSS:

```bash
npm run tokens:build
```

### Option B: Manual CSS Variables (Already done ✅)

Your `globals.css` already has all the color variables defined.

---

## Phase 7: Setup Figma Code Connect (Optional)

### Create Code Connect Mapping

Create file: `src/components/Button.figma.tsx`

```typescript
import { figma } from 'figma-plugin';
import { Button } from './Button';

figma.connect(Button, 'https://www.figma.com/file/YOUR_FILE_ID', {
  example: (props) => <Button {...props} />,
  props: {
    variant: figma.enum('Variant'),
    children: figma.string('Label')
  }
});
```

Then sync with:
```bash
npx figma connect publish
```

---

## Phase 8: NPM Scripts to Add

Add to your `package.json`:

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "storybook:build": "storybook build",
    "tokens:build": "style-dictionary build",
    "tokens:watch": "style-dictionary build --watch",
    "cosmic:check": "npm run type-check && npm run lint"
  }
}
```

---

## Complete Installation Checklist

### Essential (Week 1):
- [ ] `npm install framer-motion@latest` — Update animations
- [ ] `npx storybook@latest init` — Component library
- [ ] Create cosmic utilities in globals.css (✅ Done)
- [ ] Create Starfield component
- [ ] Update Button + Card with Framer Motion

### Recommended (Week 2-3):
- [ ] Set up Figma design tokens
- [ ] Install style-dictionary
- [ ] Create Storybook stories
- [ ] Setup Figma Code Connect

### Optional (Week 4+):
- [ ] Remotion (video generation)
- [ ] Advanced Three.js effects

---

## Quick Test

### Test Animations:

```bash
npm run dev
# Navigate to any page, should see smooth animations on cards/buttons
```

### Test Storybook:

```bash
npm run storybook
# Opens on http://localhost:6006
# Should show Button story with Figma design reference
```

### Test Starfield:

```bash
npm run dev
# Open page, should see subtle starfield in background
# Check browser DevTools for Three.js warnings
```

---

## Commands Summary (Copy-Paste Ready)

```bash
# Install animation libraries
npm install framer-motion@latest three @react-three/fiber @react-three/drei

# Setup Storybook
npx storybook@latest init

# Optional: Token generation
npm install --save-dev style-dictionary

# Run development
npm run dev

# Run Storybook
npm run storybook

# Generate design tokens
npm run tokens:build
```

---

## Troubleshooting

### Storybook Won't Start
```bash
# Clear cache and reinstall
rm -rf node_modules/.cache
npm run storybook -- --no-manager-cache
```

### Three.js Canvas Not Showing
```bash
# Check browser console for WebGL errors
# Ensure GPU acceleration is enabled
# Try reducing star count in Starfield component
```

### Animations Too Smooth/Laggy
```bash
# Reduce animation duration in components
// Instead of: transition={{ duration: 0.8 }}
// Use: transition={{ duration: 0.4 }}
```

---

## Next Steps

1. ✅ **Run installations above**
2. ✅ **Test each component in Storybook**
3. ✅ **Update existing components one by one**
4. ✅ **Create Figma design file + tokens**
5. ✅ **Link Figma to code via Code Connect**
6. ✅ **Deploy and test on production**

---

**Questions?** Check the Design Specification document or reach out!

