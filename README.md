# subsmap homepage

Three design directions for the subsmap marketing homepage. Same content, same
section structure, same placeholders. Only the design language changes.

Static HTML and CSS. No build step, no dependencies, no framework. The only
external requests are Google Fonts.

| | Version | Design language | Palette | Motion |
|---|---|---|---|---|
| 1 | [`/cartographic`](./cartographic) | Warm paper canvas, serif display, map-room feel | `#0E7C6B` teal on `#FAF8F4` | none |
| 2 | [`/editorial`](./editorial) | Modern Business Intelligence: flat surfaces, no shadows, 96px serif, 4px/16px radii only | `#FF4500` / `#000000` / `#FFFFFF` | none |
| 3 | [`/radar`](./radar) | Technical near-white, mono bracket labels, pill controls | `#FF4500` / `#000000` / `#FFFFFF` | canvas radar hero plus scroll reveals |

## Structure

```
/                     version index
/cartographic/        index.html, styles.css
/editorial/           index.html, styles.css
/radar/               index.html, styles.css, radar.js, motion.js
/switcher.js          version switcher (review chrome)
/switcher.css
/vercel.json
```

## Local preview

Serve the repo root with anything static. From this directory:

```bash
python3 -m http.server 4324
```

Then open <http://localhost:4324>. Open the file paths directly with `file://`
and the switcher will not resolve, because it uses root relative paths.

## Deploying to Vercel

The repo is already shaped for it. Import it in Vercel and accept the defaults:

- Framework preset: **Other**
- Build command: **none**
- Output directory: **leave empty** (the repo root is the site)
- Install command: **none**

There is deliberately no `package.json`, so Vercel treats this as a static
site and skips the build step entirely. `vercel.json` sets clean URLs,
trailing slashes, security headers, and short cache lifetimes on CSS and JS
so edits show up without a hard refresh.

Or from the CLI:

```bash
npx vercel deploy --prod
```

## The version switcher

`switcher.js` injects a fixed pill at the bottom of each page listing all three
builds. Press <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> to jump between them,
<kbd>H</kbd> to hide it. Hidden state is remembered in `localStorage`, and it
never prints.

It is review chrome, not part of any of the three designs. **To ship one version
on its own, delete the `switcher.js` script tag from that version's
`index.html`.** It is the last line before `</body>` and is marked with a
comment.

## Before any of this ships

Each item is flagged with an HTML comment in the source.

1. **Every number is a placeholder.** The stat strip, the "4.1 billion posts"
   headline, the growth chart, and the fit scores in the mock panels.
2. **The FAQ answers need review.** The data source, freshness, and ban risk
   answers make claims about how subsmap works and how Reddit's rules apply.
3. **"No account needed to browse. No credit card."** Delete it if signing up
   is required.
4. **The hero search is not wired.** One commented out `window.location.href`
   near the bottom of each `index.html` points at your app.
5. **Links are placeholders.** Nav, CTAs, and footer point at anchors and paths
   that do not exist yet.

The footer `Explore` and `Free tools` columns point at `/r/<subreddit>` and
`/tools/*`. Those pages do not exist yet, and are left in on purpose: they are
likely the biggest organic acquisition channel, so the internal linking is
ready when they get built.

No customer logos and no testimonials appear anywhere. Both blocks were left
out rather than filled with placeholder praise. Add them when they are real.

Not affiliated with or endorsed by Reddit, Inc.
