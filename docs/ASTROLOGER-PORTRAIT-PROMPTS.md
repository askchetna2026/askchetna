# AI astrologer portrait prompts

Generation prompts for the built-in AI personas seeded by
`scripts/seed-ai-astrologers.mjs`. Kept here so a portrait can be regenerated,
or a new persona given one, without re-deriving the constraints.

## Why illustrated and not photographic

Vidhi and Maitri are AI personas. A photorealistic portrait asserts that a
specific person exists, which is the claim the `AI` badge in the directory and
the "you are an AI" line in each system prompt exist to prevent — and an
undisclosed-feeling AI persona is a documented rejection reason for consultation
apps on both stores. A stylized illustration reads immediately as a
representation and carries none of that risk.

If a photographic style is used anyway: it must not resemble an identifiable
real person, and the `AI` disclosure in `AstrologerDirectory.tsx` becomes
load-bearing rather than belt-and-braces.

## Constraints that apply to every portrait

These are driven by where the image is actually used, not by taste:

- **Square, 1:1, at least 1024x1024.** Installed at 512x512.
- **Tight head-and-shoulders crop.** The head should fill roughly 55–60% of the
  frame height and sit centred. It renders as a **64px circle** in the directory
  and a **40px circle** in the chat header — anything shot wider turns into an
  unreadable smudge at that size.
- **Circular crop safe.** Corners are clipped away; nothing that matters may sit
  outside the inscribed circle.
- **Background: deep indigo night** (`#0B0F2F`), plain or very softly graded.
  It sits on the app's own dark background, and a busy backdrop fights the card.
- **No fortune-telling props** — no crystal ball, tarot cards, zodiac wheel or
  glowing hands. The platform's line is "patterns, not predictions", and the art
  should not contradict the copy.
- **No text, watermark, signature or logo. No hands in frame.**

## Vidhi — career, work, money

Structured, calm, practical. Indigo.

```
Stylized digital illustration, portrait of an Indian woman in her late thirties,
head-and-shoulders bust filling the frame, facing the viewer in a slight
three-quarter turn, eyes level with the upper third of the image.

Warm medium-brown skin, North Indian features, high cheekbones, calm direct
gaze, faint closed-lip smile — composed and self-possessed rather than
welcoming. Black hair with a clean centre parting, pulled back smoothly into a
low neat bun, no loose strands.

Deep indigo silk saree with a fine gold zari border draped over one shoulder.
Small round gold bindi. Gold jhumka earrings. One thin gold chain at the throat.
Minimal jewellery — she is precise, not ornate.

Colour palette: deep indigo and royal blue (#2A1F6B to #4436A6), antique gold
accents (#D4AF37), warm brown skin, background a plain deep indigo night
(#0B0F2F) with a very faint gold halo behind the head.

Soft key light from the upper left, cool indigo rim light along the right edge.
Clean flat shapes with soft cel shading, smooth gradients, crisp edges.
Elegant, dignified, contemporary Indian editorial illustration.

Square 1:1 composition. No text, no watermark, no hands, no props.
```

**Negative prompt**

```
photorealistic, photograph, 3D render, anime, chibi, cartoon, caricature, text,
watermark, signature, logo, hands, fingers, distorted face, asymmetric eyes,
extra limbs, heavy makeup, cleavage, western clothing, crystal ball, tarot
cards, zodiac wheel, glowing eyes, neon, oversaturated, cluttered background,
full body, wide shot
```

## Maitri — relationships, family, inner life

Warm, unhurried, gentle. Rose and marigold.

```
Stylized digital illustration, portrait of an Indian woman in her late forties,
head-and-shoulders bust filling the frame, facing the viewer with her head
tilted very slightly, eyes level with the upper third of the image.

Warm golden-brown skin, soft rounded features, kind attentive eyes with gentle
laugh lines, a small warm closed-lip smile — someone who listens before she
speaks. Black hair with a few silver strands at the temples, centre-parted,
falling into a long braid over her left shoulder.

Deep rose and wine coloured saree, with a marigold-gold dupatta draped loosely
over her head and around her shoulders. Small maroon bindi. Gold jhumka
earrings, a tiny gold nose stud, a simple gold chain.

Colour palette: deep rose and wine (#93394F to #5E2337), marigold gold
(#C98A3C), antique gold accents (#D4AF37), warm golden-brown skin, background a
plain deep indigo night (#0B0F2F) with a very faint gold halo behind the head.

Warm soft key light from the front left, gentle gold rim light. Clean flat
shapes with soft cel shading, smooth gradients, warm and rounded.
Elegant, maternal, contemporary Indian editorial illustration.

Square 1:1 composition. No text, no watermark, no hands, no props.
```

**Negative prompt**

```
photorealistic, photograph, 3D render, anime, chibi, cartoon, caricature, text,
watermark, signature, logo, hands, fingers, distorted face, asymmetric eyes,
extra limbs, heavy makeup, cleavage, western clothing, crystal ball, tarot
cards, zodiac wheel, glowing eyes, neon, oversaturated, cluttered background,
full body, wide shot
```

## Installing a generated portrait

Any JPG, PNG or WebP. It is squared on the face, stripped of metadata and
written as WebP at 512x512:

```
npm run photo:astrologer -- vidhi  C:/Users/rahul/Downloads/vidhi.png
npm run photo:astrologer -- maitri C:/Users/rahul/Downloads/maitri.png
```

Then seed each environment that should show it — the three databases are
separate, and seeding one does not touch the others:

```
npm run seed:ai
npm run seed:ai:preview
npm run seed:ai:prod
```

Check the result at a real avatar size, not full screen. A portrait that looks
good at 1024px and muddy at 64px is the usual failure.
