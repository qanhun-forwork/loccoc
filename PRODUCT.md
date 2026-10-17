# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Whoever needs a short branded motion sting for a product: the person re-skinning this template for a given brand or product, and the audience who sees the finished 12-second clip in a square social feed.

## Product Purpose
A reusable, code-rendered brand sting template. One scene (`sting/index.html`) takes a brand and its content as inputs and renders a 12-second square motion piece that tells a short story: a header and window, the app icon, someone typing a prompt, an answer page, result cards, and a closing logo disc. Success means the same piece can be re-skinned for a new brand or product just by changing its inputs, with no re-animation and no drop in craft.

## Positioning
Every frame is a continuous function of the frame number, written as SVG in plain HTML and captured headlessly. So a re-skin is a data edit, not a motion-design job. Motion, audio and stills all come from the same source, and any frame can be re-rendered on demand.

## Operating Context
- Edit the inputs at the top of `sting/index.html`: `BRAND`, `PROMPT`, `ANSWER` (crumb, title, body, key phrase), `CARDS`, and the palette `P`.
- Render checkpoint stills with `node sting/render.mjs stills <outdir> <frames…>`, and the film (video only) with `node sting/render.mjs film <out.mp4>`. Both use Playwright Chromium and ffmpeg.
- Build the score with `sting/master.sh`, which runs `audio.py` and then masters `raw.wav` into `music.wav`. The `.wav` files are gitignored.
- Review the result through the stills in `stills/`.

## Capabilities and Constraints
- **Binding:** 12.075 s duration, 1080×1080 square format, 59.94 fps (60000/1001) output.
- Seven scenes on a frame timeline (S1–S7, f0–300). The logo disc holds still at f269–287, the only frozen stretch.
- The current implementation is deterministic and masters audio to −14 LUFS / −1 dBTP (124 BPM, drop at 2.467 s). These are current behavior, not binding requirements. They may change if the work calls for it.
- Typeface is Inter, loaded from system font files.
- **Open decision:** a second distribution channel beyond square social feeds was indicated but not named.

## Brand Commitments
None binding at the template level. The shipped defaults use Canva as demo content: the name, a "C" mark, and a teal/blue/cyan/mint palette. Each re-skin takes on the target brand's own name, assets and palette. Never imply that a brand endorses or is affiliated with the template.

## Evidence on Hand
- Checkpoint stills: `stills/f040.png`, `f086.png`, `f150.png`, `f180.png`, `f230.png`, plus contact sheets `stills/sheet.png` and `stills/stills_2x2.png`.
- No rendered final MP4, audience metrics, testimonials or client list is in the repo. Do not fabricate any of them.

## Product Principles
1. A re-skin is a data change. New brands go in through the inputs, never through per-brand edits to the animation code.
2. The format is fixed. Duration, square framing and frame rate hold for every brand.
3. Built for the feed. The story has to read at a glance on a phone in a square, and it may start muted.
4. Craft survives the swap. Text lengths, palettes and marks that vary by brand must still lay out and move cleanly.
