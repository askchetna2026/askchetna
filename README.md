This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Branding & Logo

The brand mark is the **zodiac-ring "C"**: an open gold horoscope ring forming a `C`,
with twelve house dots and a central `✦` sparkle, paired with the `AskChetna` wordmark.
All colors are pulled from the theme tokens in `globals.css`.

Logo assets:

- `src/components/Logo.tsx` — the header lockup, rendered **inline as theme-aware SVG**
  (emblem + wordmark). It switches with `data-theme` / system preference and uses the
  site heading font (`Playfair Display`) loaded in `layout.tsx`, so it stays crisp at any size.
- `public/chetna_logo_light.svg` / `public/chetna_logo_dark.svg` — the **full lockup**
  (emblem + wordmark + `Astrology for Awareness` tagline) for large-format / external use.
- `public/chetna_icon.svg` — the **square app icon / favicon** (ring-only emblem on indigo),
  wired via `metadata.icons` in `layout.tsx`.
- `src/app/opengraph-image.tsx` — the social share card, built around the same emblem.

### PDF logos (Environment Variables)

PDF exports embed a raster logo via `pdf-lib` (which only supports PNG/JPG, not SVG).
These variables control the PNG file names used by the PDF generators
(`src/lib/pdf.ts`, `src/app/api/charts/export/route.ts`) without changing code:

```bash
# Light theme logo (PDF cover)
NEXT_PUBLIC_LOGO_LIGHT_FILE=chetna_logo_light.png

# Dark theme logo (PDF header)
NEXT_PUBLIC_LOGO_DARK_FILE=chetna_logo_dark.png
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
