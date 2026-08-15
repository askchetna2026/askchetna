# COMPONENT_LIBRARY.md

---

| Property | Value |
|---|---|
| Project | AskChetna Premium Redesign |
| Version | 1.0.0 |
| Status | Draft |
| Purpose | Reusable UI Component Specification |
| Source Documents | `MASTER_DESIGN_SPECIFICATION.md`, `DESIGN_TOKENS.md`, `HOMEPAGE_IMPLEMENTATION_SPEC.md` |

---

# Purpose

This document defines the reusable UI components for AskChetna.

Every page should be built from these components wherever possible.

The goal is to ensure:

- visual consistency
- code reusability
- predictable behaviour
- accessibility
- scalable frontend architecture
- AI-assisted implementation without design drift

---

# Component Design Rules

1. Use design tokens only.
2. Keep components small and composable.
3. Support responsive behaviour by default.
4. Include accessible semantics and keyboard support.
5. Use a single visual language across all components.
6. Avoid duplicate components that solve the same problem.
7. Prefer variants over one-off special cases.
8. Keep motion subtle and consistent.
9. Keep props explicit and minimal.
10. Do not hardcode colours, spacing, radii, or typography values.

---

# Shared Component States

Every interactive component should support the following states when relevant:

- default
- hover
- focus
- active
- disabled
- loading
- error
- success
- selected

---

# 1. Button

## Purpose

Primary call-to-action and secondary action trigger.

## Variants

- primary
- secondary
- ghost
- outline
- link
- icon

## Sizes

- sm
- md
- lg

## Props

```ts
type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'link' | 'icon'
  size?: 'sm' | 'md' | 'lg'
  href?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
  children: ReactNode
}