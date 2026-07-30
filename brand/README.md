# MyLo brand assets

The SVGs in this directory are the source of truth. Every logo PNG in both apps is
generated from them, so the brand can be re-cut at any size without redrawing
anything.

```bash
npm run brand:render
```

## The mark

An open book beneath a rising sun — the Gazette made readable, and a nod to the
sun Rwanda carries on its own flag.

It is built from two robust silhouettes and nothing finer, because it has to
survive being scaled to a 16px browser tab. Two decisions follow from that:

- **The base is near-flat while the top sweeps into a deep V.** A book rests on a
  surface, and once detail is lost it is the notch, not the outline, that still
  reads as "open book". An earlier draft curved the base as sharply as the top and
  the silhouette read as a moustache.
- **The pages meet on the centre line with no drawn spine.** A separate spine rect
  only cut a distracting notch out of the shape at small sizes.

## Colour

| Token | Hex       | Use                             |
| ----- | --------- | ------------------------------- |
| `INK` | `#1e355c` | Wordmark, book, app-icon ground |
| `SUN` | `#e8a33d` | The sun, in every variant       |

The navy is carried over unchanged from the MenyaLo mark this replaces — the name
changed, the project did not. The gold is new: it warms an otherwise institutional
palette, which matters for a product meant to be approachable rather than
lawyerly.

`INK` and `SUN` are tokens in the SVG sources, substituted at render time. That is
why a single source produces the navy, the reversed-white and the app-icon
variants. **Do not hardcode colours into the sources.**

## Outputs

| File                                    | What                               |
| --------------------------------------- | ---------------------------------- |
| `MyLo-frontend/src/assets/Logodark.png` | Navy lockup, for light backgrounds |
| `MyLo-frontend/src/assets/Logo.png`     | White lockup, for dark backgrounds |
| `MyLo-frontend/public/favicon.png`      | Rounded-square app icon            |
| `MyLo-Backend/public/logo.png`          | Email logo, served by the API      |

Two constraints worth preserving:

**The lockup keeps the aspect ratio of the mark it replaced** (634×583), and
`Logo.png` / `Logodark.png` keep their original filenames. That is why the rebrand
touched no component layout or CSS.

**The email logo is a PNG served over http from the API**, at `/public/logo.png`.
Mail clients will not render SVG and most refuse `data:` URIs. It used to be a
Cloudinary URL that had started returning 404, so every subscriber email was
rendering a broken image. `BASE_URL` must be reachable by mail clients in
production.

## Changing the wordmark

The wordmark is live `<text>` set in Georgia, rasterised at render time. It is a
serif to keep the legal register the old all-caps serif wordmark carried, but in
mixed case rather than shouting capitals.

If you switch to a font that is not installed on the machine running the render,
the output will silently fall back to another serif. Check the PNGs after any font
change.
