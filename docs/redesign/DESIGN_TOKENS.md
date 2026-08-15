# DESIGN TOKENS

---

| Property | Value |
|----------|-------|
| Project | AskChetna Premium Redesign |
| Version | 1.0.0 |
| Status | Approved |
| Type | Design Foundation |
| Used By | Figma, Tailwind CSS, React, Next.js, Codex |

---

# Purpose

This document defines the design primitives used throughout the AskChetna platform.

Every UI component must consume these tokens.

Never hardcode values inside components.

---

# Token Naming Convention

```
category-purpose-variant-state
```

Example

```
color-primary-500

spacing-xl

radius-lg

shadow-md
```

---

# ===========================================
# COLOUR TOKENS
# ===========================================

## Primary Brand Colours

| Token | HEX | Usage |
|--------|------|-------|
| color-primary-50 | #FCF8F3 | Light backgrounds |
| color-primary-100 | #F7F0E7 | Page background |
| color-primary-200 | #EEDFCB | Cards |
| color-primary-300 | #D8C0A1 | Decorative elements |
| color-primary-400 | #C09A74 | Secondary accents |
| color-primary-500 | #A56E43 | Primary brand colour |
| color-primary-600 | #875732 | Hover |
| color-primary-700 | #6A4326 | Active |
| color-primary-800 | #4A2F1C | Dark |
| color-primary-900 | #2C1B10 | Deep accents |

---

## Neutral Colours

| Token | HEX |
|--------|------|
| color-neutral-0 | #FFFFFF |
| color-neutral-50 | #FAFAF9 |
| color-neutral-100 | #F5F5F4 |
| color-neutral-200 | #E7E5E4 |
| color-neutral-300 | #D6D3D1 |
| color-neutral-400 | #A8A29E |
| color-neutral-500 | #78716C |
| color-neutral-600 | #57534E |
| color-neutral-700 | #44403C |
| color-neutral-800 | #292524 |
| color-neutral-900 | #1C1917 |

---

## Accent Colours

### Sage

```
#78866B
```

Usage

Nature

Growth

Calm

---

### Olive

```
#6B705C
```

Usage

Highlights

Buttons

Decorations

---

### Terracotta

```
#B36A4C
```

Usage

CTA

Icons

Links

---

### Gold

```
#C8A96A
```

Usage

Premium badges

Highlights

Borders

---

# Semantic Colours

Success

```
#5C8D5C
```

Warning

```
#D9A441
```

Danger

```
#B85450
```

Info

```
#5E81AC
```

---

# Background Tokens

```
bg-page

bg-card

bg-section

bg-accent

bg-footer

bg-overlay
```

---

# ===========================================
# TYPOGRAPHY TOKENS
# ===========================================

## Heading Font

Cormorant Garamond

Fallback

Georgia

Serif

---

## Body Font

Inter

Fallback

System UI

Sans-serif

---

## Typography Scale

Display XL

64px

Display L

56px

H1

48px

H2

40px

H3

32px

H4

28px

H5

24px

H6

20px

Body XL

20px

Body L

18px

Body

16px

Small

14px

Caption

12px

---

## Font Weight

Light

300

Regular

400

Medium

500

Semibold

600

Bold

700

---

## Line Height

Display

110%

Heading

120%

Paragraph

170%

Small

150%

---

# ===========================================
# SPACING TOKENS
# ===========================================

Base Unit

```
8px
```

Spacing Scale

```
0

4

8

12

16

20

24

32

40

48

56

64

72

80

96

120

160
```

Never invent spacing.

Only use this scale.

---

# ===========================================
# CONTAINER WIDTHS
# ===========================================

Small

```
640px
```

Medium

```
768px
```

Large

```
1024px
```

XL

```
1200px
```

Maximum Content Width

```
1280px
```

Never exceed

1280px

---

# ===========================================
# BORDER RADIUS
# ===========================================

XS

```
4px
```

SM

```
8px
```

MD

```
12px
```

LG

```
20px
```

XL

```
28px
```

2XL

```
36px
```

Cards use

20px

Buttons use

12px

Inputs use

12px

---

# ===========================================
# BORDER WIDTH
# ===========================================

Hairline

1px

Standard

1px

Heavy

2px

Never exceed 2px.

---

# ===========================================
# SHADOW TOKENS
# ===========================================

None

XS

SM

MD

LG

XL

Design principle

Soft.

Natural.

Never dramatic.

---

# ===========================================
# ICON TOKENS
# ===========================================

Stroke

1.5px

Rounded ends

Outline only

Never filled.

---

# ===========================================
# BUTTON HEIGHTS
# ===========================================

Small

40px

Medium

48px

Large

56px

Extra Large

64px

---

# ===========================================
# INPUT HEIGHTS
# ===========================================

Small

40px

Default

48px

Large

56px

---

# ===========================================
# Z INDEX SCALE
# ===========================================

Dropdown

100

Sticky Header

200

Drawer

300

Modal

500

Toast

700

Tooltip

900

---

# ===========================================
# MOTION TOKENS
# ===========================================

Fast

150ms

Default

250ms

Slow

400ms

Very Slow

600ms

Ease

ease-out

Default

cubic-bezier(0.4,0,0.2,1)

Never exceed

600ms

---

# ===========================================
# GRID
# ===========================================

Desktop

12 Columns

Tablet

8 Columns

Mobile

4 Columns

---

# ===========================================
# IMAGE RULES
# ===========================================

Hero

16:9

Card

4:3

Blog

16:9

Avatar

1:1

Gallery

3:2

Always use

WebP

AVIF

---

# ===========================================
# COMPONENT RULES
# ===========================================

Every component must

✓ Use design tokens

✓ Be reusable

✓ Be responsive

✓ Be accessible

✓ Support dark mode

✓ Avoid hardcoded colours

✓ Avoid hardcoded spacing

✓ Avoid duplicated styles

---

# End of Document