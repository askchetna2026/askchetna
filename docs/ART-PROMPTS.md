# AskChetna — Image Generation Prompts

Prompts for sourcing the site's artwork through an image model (Midjourney,
DALL·E 3, Firefly, Imagen — notes per model at the end).

**The key adaptation:** the Astroflora reference that inspired this is cream,
terracotta and sage. AskChetna is dark-default — `#0B0F2F` midnight, `#D4AF37`
gold, `#5D3FD3` iris. Every prompt below keeps that reference's *drawing style*
(hand-drawn line work, botanical framing, celestial ornament, medallion
composition) and swaps its *palette* for ours. Art generated in the original
cream/terracotta will disappear against the site background.

All output is raster — PNG or WebP. No SVG anywhere.

---

## 1. The style anchor

Prepend this to every prompt so the set holds together. Do not paraphrase it
between runs — consistency across twelve medallions comes from repeating this
verbatim.

> Hand-drawn illustration in a fine ink-line style, single-weight gold linework
> on a transparent background, warm antique gold `#D4AF37` with faint iris-violet
> `#5D3FD3` accents, delicate botanical and celestial ornament, small stars and
> crescent moons, dotted circular border, symmetrical and centred, flat with no
> shading or gradient, engraved almanac feeling, calm and elegant, no text.

## 2. The negative prompt

> no text, no lettering, no watermark, no signature, no photorealism, no 3D
> render, no drop shadow, no gradient mesh, no neon, no glassmorphism, no cartoon
> mascot, no anime, no white background, no cream background, no terracotta,
> no sage green, not cluttered

The last three matter: the reference's palette will otherwise leak in.

---

## 3. The twelve rashi medallions — highest priority

Twelve square medallions, transparent background, **600 × 600 PNG**.

Files land at `public/art/rashi/<sanskrit>.png`, then pass `src` to the
`ImageSlot` already in place for each card in
`src/components/sections/RashiMedallions.tsx`. Nothing else changes.

Format: `[style anchor] + [subject] + centred in a dotted circular medallion frame.`

| File | Subject to append |
|---|---|
| `mesha.png` | a ram's head in profile, curved spiral horns, sprig of new spring leaves below |
| `vrishabha.png` | a bull's head facing forward, broad horns, lotus buds at the base |
| `mithuna.png` | two mirrored human figures in profile facing each other, joined by a ribbon of stars |
| `karka.png` | a crab seen from above, symmetrical claws, crescent moon behind it |
| `simha.png` | a lion's head facing forward, radiating mane drawn as sun rays |
| `kanya.png` | a seated maiden in profile holding a sheaf of wheat, long flowing hair |
| `tula.png` | a balance scale, perfectly level, small star suspended from each pan |
| `vrishchika.png` | a scorpion seen from above, curved tail raised, night-blooming flowers |
| `dhanu.png` | a drawn bow with arrow pointing upward, ornamental fletching, distant stars |
| `makara.png` | a mythological sea-goat, crocodile head and fish tail, curling waves |
| `kumbha.png` | an ornate water vessel tipped and pouring a stream of small stars |
| `meena.png` | two fish circling head-to-tail in a ring, water ripples between them |

**Consistency technique.** Generate `mesha.png` first and iterate until it is
right — that becomes the reference. Then for the remaining eleven:

- **Midjourney:** append `--sref <url-of-mesha> --sw 100 --ar 1:1 --style raw`
- **DALL·E 3:** open the Mesha result in the same conversation and ask for each
  next sign "in exactly this style"
- **Firefly:** upload Mesha as a Style Reference at ~75% strength

Generating all twelve independently will produce twelve different styles. That
is the single most common way this set fails.

---

## 4. Hero image

**1600 × 900 PNG or WebP.** Slot: `public/art/hero/night-sky.webp`.

> [style anchor], a wide horizontal composition: an ornate celestial mandala at
> centre, concentric rings of zodiac and lunar-mansion markings, fine gold
> linework over a deep midnight-blue `#0B0F2F` field, scattered stars of varying
> size, botanical vines curling in from the left and right edges, generous empty
> space through the middle third for text to sit over, symmetrical, calm

The empty middle third is deliberate — the headline overlays it, and the brand
rule forbids text over busy imagery.

---

## 5. How It Works — three step illustrations

**800 × 1000 PNG, transparent.** Slots: `public/art/steps/step-<n>.png`.

Same anchor for all three, appended with:

1. **`step-1.png`** — a pair of overlapping cards at a slight angle, the front
   one showing a birth-chart square grid, the back one showing a crescent moon
   and stars, small ornaments floating around them
2. **`step-2.png`** — an open journal with a hand resting on it holding a pen,
   loose pages, a small oil lamp beside it, stars rising from the page
3. **`step-3.png`** — a constellation diagram drawn as connected points, a
   growing plant twining up through it, roots visible below

---

## 6. Photography

Photographs, **not** illustration — this is the mix that stops the page reading
as clip art. Buy, licence or shoot; models won't give you consistent
photorealism across a set.

**1600px wide, WebP.** Slots under `public/art/photo/`.

Direction to brief a photographer or search with: shot on a dark surface, single
warm light source, deep shadow, shallow depth of field, no bright backgrounds,
no visible faces, warm gold tones against near-black.

| File | Subject |
|---|---|
| `lamp.webp` | a lit diya or oil lamp on dark wood, flame sharp, background falling to black |
| `journal.webp` | hands writing in a journal, warm lamplight from one side |
| `sky.webp` | a real night sky, visible stars, no light pollution, deep blue-black |
| `botanical.webp` | dried flowers and leaves arranged on dark stone, overhead |
| `texture.webp` | aged parchment or handmade paper, raking light, tileable |

Faces are excluded on purpose: a recognisable person implies a testimonial, and
the identity should not hinge on one model's look.

---

## 7. Technical requirements

- **Transparent background** for medallions and step illustrations — they sit on
  the cosmic background and a baked-in fill will show as a rectangle.
- **Generate at 2× the display size**, then downscale. Medallions display at
  ~132px; 600px source covers every density.
- **Convert to WebP** for the photographs and hero. Keep PNG for anything with
  transparency where WebP alpha looks lossy.
- **No SVG**, per the project rule.
- Run everything through the existing `ImageSlot` component — it holds the
  aspect ratio so the page does not reflow when art lands.

## 8. Model notes

- **Midjourney v6/v7** — best line-art consistency, and `--sref` is the reliable
  way to lock a style across twelve images. Use `--style raw` to stop it
  prettifying. Transparency needs post-processing; it does not export alpha.
- **DALL·E 3** — follows long prompts most literally and will honour "transparent
  background" more often, but drifts in style across separate generations. Keep
  all twelve in one conversation.
- **Firefly** — the only one of the three that is explicitly trained on licensed
  material, which matters if this art is going into store listings. Native
  transparent PNG export.
- **Imagen / Gemini** — good at the botanical framing, weaker at symmetry. Worth
  a try for the hero, less so for the medallion set.

## 9. What to send back

Drop files at the paths listed above and tell me they are there — the slots are
already wired, so it is a one-line change per image to switch each `ImageSlot`
from placeholder to real art.
