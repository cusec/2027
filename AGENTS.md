<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# CUSEC 2027 — Repository Guide

**What this is:** The main site for CUSEC 2027 (26th annual Canadian University Software Engineering Conference, Montréal QC, January 2027). One long scrolling page over a single painted backdrop: hero, intro, about collage, an interactive photo archive, the scavenger hunt, passes, sponsors, FAQ and footer.

**Live domain:** `https://2027.cusec.net`

> The old Win95-style splash page has been **deleted**. If you find a reference
> to `SplashPage`, `UIWindow`, `navigation_ui_window*`, Vanta birds, the
> waitlist API or the Win95 cursors, it is a leftover — remove it rather than
> restoring it.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.6 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Plain CSS files + Tailwind v4 (minimal use) |
| i18n | next-intl 4.9.0 |
| Icons | lucide-react |
| React | 19.2.4 |
| Display font | Geist Pixel Square via the `geist` package |
| Body font | `Nunito` via `next/font/google` |

---

## Critical Conventions

### Middleware → `proxy.ts`, NOT `middleware.ts`

Next.js 16 renamed the middleware file convention. **Never create `src/middleware.ts`** — it will conflict and break routing.

```
src/proxy.ts  ← the correct file (already set up with next-intl)
```

### Locale routing — `localePrefix: 'never'`

Locales are detected from the `Accept-Language` header / cookie, **not** from URL path segments. The URL never shows `/en-CA/` or `/fr-CA/`. All navigation uses wrappers from `src/i18n/navigation.ts`, never Next.js's `next/navigation` directly.

Because the locale never appears in the URL, `V2LocaleSwitcher` in the navbar is
the only way a visitor can change language. Don't delete it as "not in the
Figma frame" — it isn't in the frame, but without it `fr-CA` is unreachable.

### Route structure

```
src/app/
  layout.tsx            ← root layout (metadata, viewport, fonts, global CSS)
  globals.css           ← Tailwind import + base resets
  manifest.ts           ← Web App Manifest (MetadataRoute.Manifest)
  page.tsx              ← redirected by proxy — effectively unused
  [locale]/
    layout.tsx          ← NextIntlClientProvider only
    page.tsx            ← the whole main site
    speakers/page.tsx   ← /speakers
```

The `[locale]` segment is internal routing only — it never appears in the browser URL bar. Keep the locale layout to providers; the page composes the sections.

---

## File Map

### Components — `src/app/components/v2/`

One folder per page section, each named after the section and holding that
section's component plus anything only it uses. Sections are composed in order
by `[locale]/page.tsx`. All components are prefixed `V2`; only `V2Nav`,
`V2LocaleSwitcher`, `V2CdPlayer`, `V2Archive`, `V2Wordmark`, `V2ScrollReveal`
and `V2Faq` are client components, everything else is a server component.

```
components/v2/
  Nav/       V2Nav.tsx · V2LocaleSwitcher.tsx
  Reveal/    V2ScrollReveal.tsx
  Hero/      V2Hero.tsx · V2Wordmark.tsx
  Sky/       V2Sky.tsx
  Dawn/      V2Dawn.tsx · V2CdPlayer.tsx · V2Polaroid.tsx
  Archive/   V2Archive.tsx · V2SdCard.tsx · archiveData.ts
  Hunt/      V2Hunt.tsx
  Passes/    V2Passes.tsx
  Sponsors/  V2Sponsors.tsx
  Faq/       V2Faq.tsx
  Closing/   V2Closing.tsx
  Footer/    V2Footer.tsx

  Speakers/  V2SpeakersHero.tsx · V2Keynote.tsx · V2SpeakerGrid.tsx
             V2SpeakerAvatar.tsx · V2SpeakerPitch.tsx · speakersData.ts
```

`Nav/` and `Footer/` are shared by every page, and `Reveal/` is page-agnostic;
`Speakers/` holds the whole `/speakers` page rather than one folder per section,
since its sections are not reused anywhere else.

| Component | Purpose |
|---|---|
| `V2Nav` | Floating capsule navbar (see below). Deepens its glass on scroll. |
| `V2LocaleSwitcher` | Globe pill + a custom listbox for en-CA / fr-CA (see below). Uses `useRouter`/`usePathname` from `@/i18n/navigation`. |
| `V2Hero` | Icosahedron, edition pill, `CUSEC 2027` wordmark, tagline, two CTAs. |
| `V2Wordmark` | The `CUSEC 2027` wordmark: idle letter wave + cursor repel (see below). |
| `V2ScrollReveal` | One IntersectionObserver that fades in every `.v2-reveal` section. Renders nothing. |
| `V2Sky` | Statement heading + three frosted info cards. |
| `V2Dawn` | The collage: polaroids, stat tiles, CUSEC.FM, about / who / good-to-know cards. |
| `V2CdPlayer` | Decorative CUSEC.FM widget. Plays no audio — the button just spins the disc. |
| `V2Polaroid` | Tilted photo frame with a caption. |
| `V2Archive` | CUSEC-CAM 2000 + swappable SD cards (see below). |
| `V2SdCard` | One CUSEC-SD card, rebuilt in CSS so its inserted/idle state can follow the loaded year. |
| `archiveData.ts` | Per-edition photos, counts and card gradients. |
| `V2Hunt` | Scavenger hunt card + 2026 leaderboard + map pins. |
| `V2Passes` | Basic / VIP tickets. |
| `V2Sponsors` | Hex honeycomb by tier. |
| `V2Faq` | Lily-pad accordion. |
| `V2Closing` / `V2Footer` | Closing CTA and footer. |

### Styles — `src/app/styles/v2/`

Plain CSS, no CSS Modules, one stylesheet per section folder above.
`index.css` imports them in page order and is pulled in by the root layout.
Everything is namespaced under a `.v2` root class.

| File | Covers |
|---|---|
| `base.css` | Design tokens on `.v2`, `.v2-scene` backdrop, buttons, heading pills, cards, reduced-motion guard |
| `reveal.css` | `.v2-reveal`, the hero entrance keyframes |
| `nav.css` | `.v2-nav*`, `.v2-locale` |
| `hero.css` | `.v2-hero*` |
| `sky.css` | `.v2-sky*` |
| `dawn.css` | `.v2-polaroid`, `.v2-stat`, `.v2-cd*`, `.v2-dawn*` |
| `archive.css` | `.v2-cam*`, `.v2-sd*`, `.v2-archive*` |
| `hunt.css` | `.v2-hunt*`, `.v2-board*` |
| `passes.css` | `.v2-pass*`, `.v2-passes*` |
| `sponsors.css` | `.v2-hex*`, `.v2-sponsors*` |
| `faq.css` | `.v2-faq*`, `.v2-pad*` |
| `closing.css` | `.v2-closing*` |
| `footer.css` | `.v2-footer*` |
| `speakers.css` | everything on `/speakers` — `.v2-spk-*`, `.v2-keynote*`, `.v2-pitch*`, `.v2-btn--outline` |

**Design tokens** live on `.v2` in `base.css`. The palette values were lifted
verbatim from the Figma SVG exports rather than sampled by eye — do not
"correct" them.

```
--v2-lime #C3E956   --v2-ink #1F3B2C     --v2-mint #DFF6EE   --v2-navy  #0B1A3A
--v2-lime-deep #7FA829  --v2-ink-deep #0E2318  --v2-mint-bright #B2FEE7
--v2-lime-dark #4D7111  --v2-teal #4EC9A8   --v2-white #F4FFFC  --v2-blue #416CED
--v2-slate #5B6B7E  --v2-slate-light #9DBFE8  --v2-gold #E8C34A  --v2-red #E8564A
```

### i18n

| File | Purpose |
|---|---|
| `src/i18n/routing.ts` | Locales `['en-CA', 'fr-CA']`, `defaultLocale: 'en-CA'`, `localePrefix: 'never'` |
| `src/i18n/request.ts` | Server-side locale resolution; loads `messages/<locale>.json` |
| `src/i18n/navigation.ts` | Re-exports `Link`, `redirect`, `usePathname`, `useRouter`, `getPathname` — always use these instead of `next/navigation` |
| `src/proxy.ts` | next-intl middleware. Matches all paths except `api`, `_next`, `_vercel`, and files with a dot. |
| `messages/en-CA.json` / `messages/fr-CA.json` | All copy |

Every string lives under the single `V2.*` namespace, grouped by section:
`V2.nav`, `V2.hero`, `V2.sky`, `V2.dawn`, `V2.archive`, `V2.hunt`, `V2.passes`,
`V2.sponsors`, `V2.faq`, `V2.closing`, `V2.footer`. Both locale files must stay
in sync — add to both or the missing one throws at render.

---

## Design notes

### The exported SVGs have outlined text

Every file in `public/assets/v2/` has its text baked in as `<path>`; there is
not a single `<text>` element. So the exports are **reference art, not
components** — anything with copy in it is rebuilt in HTML/CSS so it stays
translatable, selectable and reflowable. Use the SVGs for measurements and
exact colour values.

### Background

One painting, `public/assets/v2/background.jpg` (1512×7300, bubbles already
baked in), on `.v2-scene` at `background-size: cover`. See the comment in
`base.css` for why `cover` and not `100% 100%` or `100% auto` — the short
version is that it keeps the bubbles circular on desktop *and* keeps the scene
in step with the sections on tall narrow viewports. The footer sits outside
`.v2-scene` on its own solid colour.

### Locale switcher menu

`V2LocaleSwitcher` is a hand-rolled listbox, **not a `<select>`**. It was a
native select stretched invisibly over the pill, but a select's popup is drawn
by the operating system: it takes no border-radius, no backdrop blur and no
brand colour, so it was the one part of the navbar that ignored the design.
`option` styling support is far too thin to fix that.

The trade is that everything a select gives for free is now hand-written, so
don't strip it: `aria-haspopup="listbox"` / `aria-expanded` on the trigger,
`role="listbox"` / `role="option"` / `aria-selected` on the menu, arrow keys,
Home/End, Enter/Space, Escape, Tab-to-close, click-outside-to-close, and focus
returning to the trigger on select. DOM focus is moved onto the active option
(rather than tracked with `aria-activedescendant`), which is why the option's
`:hover` and `:focus` styles are one rule.

Language names are endonyms — "English", "Français" — so they live in the
component, not in `messages/`.

### Entrance motion

The hero animates on load and everything below it animates on scroll, and the
two are deliberately different mechanisms. The hero is on screen by definition,
so it is pure CSS: `v2-rise-in` with staggered `animation-delay`s down the
stack. `animation-fill-mode: both` is what holds each element hidden through its
delay instead of flashing at full opacity first.

Everything else carries a `.v2-reveal` class and is faded in by
`V2ScrollReveal`, a single IntersectionObserver mounted once in
`[locale]/page.tsx`. It is one observer over the whole page rather than a
wrapper component per section, which is what keeps every section a server
component — it only adds `.is-in`. Reveals are one-way; targets are unobserved
once shown.

**`.v2-reveal` starts at `opacity: 0`, so anything that stops the observer must
fall back to *showing* content, never hiding it.** Three guards exist for that,
and all three matter: a `<noscript>` block in `page.tsx` unhides everything for
JS-less clients; the component reveals everything outright if
`IntersectionObserver` is missing or reduced motion is set; and a 2.5s backstop
reveals everything if the observer has not delivered a single callback by then
(an observer always reports every target's initial state shortly after
`observe()`, so one callback having landed proves it is live). The backstop is
not theoretical — headless Chrome under `--virtual-time-budget` never delivers
IntersectionObserver callbacks at all.

Reduced motion is handled in `reveal.css` by showing everything outright, not by
collapsing durations. The global guard in `base.css` only shortens transitions,
which would leave `.v2-reveal` stuck invisible until the observer fired.

### Hero motion — ported from the deleted splash

Two effects carried over from the old splash page, which is otherwise gone.

`V2Wordmark` splits `CUSEC 2027` into **two nested spans per character**, and
the split is load-bearing. The outer `.v2-hero__char` runs the idle
`v2-wordmark-wave` keyframes on a `i * 0.12s` stagger, so a wave travels across
the word; the inner `.v2-hero__char-repel` carries only the cursor-repel offset.
One element cannot do both — whichever writes `transform` last wins, so a
JS-written transform would silently kill the wave. For the same reason the
pointer handler sets `--rx` / `--ry` custom properties and never touches
`transform` itself. Repel is 20px max within a 140px radius, rAF-coalesced.

On touch it only repels while a finger is held, and `.v2-hero__wordmark` sets
`touch-action: none` so the hold-drag doesn't scroll. An `IntersectionObserver`
stops the tracking once the hero scrolls away — this page is ~7500px tall, so
unlike the splash it must not measure letters on every pointer move forever.

`.v2-hero__logo` hovers with `scale` and `translate` as **individual CSS
properties, never inside `transform`**. That is what lets the static pop
(`scale: 1.06`) and the looping `v2-hover-float` bob (`translate`) stack instead
of overwriting each other. Don't "tidy" either of these into a single
`transform`.

Both need explicit `prefers-reduced-motion` overrides in `hero.css` on top of
the global guard in `base.css`: the guard can neutralise CSS animations but not
the inline custom properties the repel writes, so the resting geometry is pinned
with `transform: none` / `scale: 1` / `translate: 0 0`. `V2Wordmark` also checks
the same media query and never attaches its listeners.

### Navbar

A floating capsule inset from the top and sides, not a full-bleed bar, so the
sky reads continuously behind it. `.v2-nav` is the fixed positioning layer and
is `pointer-events: none`; `.v2-nav__bar` re-enables pointer events. Resting
state is a light glass tint that deepens to `.is-lifted` past 40px of scroll.

It also hides by scroll direction — scrolling down tucks it away, scrolling
back up returns it. It always shows within the first 80px and never hides
while the mobile menu is open.

Links use the i18n `Link` (never a bare `<a>` to a route — that trips
`no-html-link-for-pages`), and the link matching the current pathname gets
`.is-active`, which renders as the lime pill.

### Archive interaction

`V2Archive` holds `yearIndex` / `shotIndex`. Clicking an SD card sets a
`swapping` flag (glitches the LCD), swaps the year after 260ms, and clears at
620ms. Card positions are pure CSS: the loaded card gets `.is-inserted`
(camera slot) and the rest get `.v2-archive__slot--rest-{0,1,2}` in order, so
the flight in and out animates from the `transition` on `.v2-archive__slot`.

The camera is `container-type: inline-size` with an `aspect-ratio`, and all its
internals are sized in `cqi` — it scales as one physical object rather than
reflowing. Below 1000px the decorative control column is dropped and the SD
cards become a normal wrapped row.

### Speakers page

Everything is driven by `speakersData.ts`. `SPEAKERS` feeds the grid: an entry
with no `announced` block renders the gradient disc, a pixel `?` and
"Announcing this Fall"; adding `announced` swaps in their photo, name and
role. `ANNOUNCED_KEYNOTES` feeds the cards under the unannounced keynote
teaser — talk titles and names live in that file rather than in messages,
since they aren't translated. `focus` sets `object-position` for headshots
that aren't centred on the face.

**Both files currently hold placeholders using a team member's photo — replace
them before launch.**

`/speakers` is far shorter than the painting, so it only ever shows the top of
the scene — sky into cloud — not the full sky → hills → water journey the
Figma frame implies. **That is deliberate; don't "fix" it by stretching.** A
`background-size: 100% 100%` variant was tried and reverted: squashing a 1:4.8
painting into a ~1:1.6 page turns every painted bubble into a wide oval, which
is immediately obvious. Removing rows from the low-detail bands instead was
also tried and fails for the same reason — at this page height roughly two
thirds of the image has to go, and what survives is all treeline. If a short
page needs the hills or the water behind it, give it its own painting cropped
to that band rather than rescaling this one.

### FAQ

`V2Faq` keeps a single `openPad` index, so exactly one answer is open at a
time. Answers are rich text via `t.rich` (`<p> <b> <ul> <li>` plus `<tickets>`,
`<hotel>` and `<email>` link tags).

The pads look scattered but are a **single flex column in normal flow**, one
pad per row, each given a different `--pad-x` indent so the column reads as
floating platforms rather than a list. They are flat — no tilt.

They were absolutely positioned once; don't go back to that. In flow, an
opening answer grows its row and pushes the pads below it down, so overlap is
impossible and the pads can sit close together. Absolute positioning cannot
push, which forced huge gaps and still overlapped.

Below 900px the indents drop away and the pads run full width in a straight
column. The desktop width animation is also disabled there — a fixed answer
width is exactly what overflows a phone — so only the height animates.

Two details make the open animation smooth, and both matter:
- the wrapper animates `grid-template-rows: 0fr → 1fr`, so no height measuring;
- the answer body is pinned to a fixed width at all times and the wrapper
  animates `width: 0 → var(--pad-answer-w)`, clipping it into view. Letting the
  text re-wrap during the transition is what made it look rough. The 0-width
  wrapper is also what keeps a closed pill tight to its question — otherwise
  the answer inflates the pad's `max-content` width.

### Sponsor hexes

Tier drives both the hex size and its edge colour. The logo area is a wide box
sitting at the hexagon's vertical midpoint (where the shape is full width) —
sponsor wordmarks carry text and go unreadable in a small square, so **do not
shrink `.v2-hex__slot` back into a thin bar.**

### Motion

There is no in-app motion toggle. `base.css` honours
`prefers-reduced-motion: reduce` for everything under `.v2`.

---

## Copy rules

- **The scavenger hunt happens inside the conference venue only** — not across
  Montréal — and **no prize amount is confirmed**. Don't reintroduce a dollar
  figure or "the streets of Montréal" phrasing.
- Avoid small, faint flavour text laid directly over the painting. Several such
  lines were deliberately removed (archive caption/hint, sky eyebrow/subline,
  sponsors caption, CD player hint) because they were unreadable and pulled
  focus from the components they sat under.

---

## Common Gotchas

1. **Never use `next/navigation`** directly. Always import from `@/i18n/navigation` for locale-aware routing.
2. **Never create `src/middleware.ts`** — use `src/proxy.ts`.
3. **Static assets belong in `public/`**, not `src/`. Only code (TSX/TS) goes in `src/`.
4. **Plain `<img>` is intentional** throughout — `next/image` was dropped to avoid Vercel's image-optimization quota. The `no-img-element` lint warnings are expected; don't "fix" them.
5. **Never hand-write `-webkit-backdrop-filter`.** Write only the standard `backdrop-filter` and let the build prefix it. When both are authored, Lightning CSS (Turbopack's minifier) collapses the pair down to *only* the `-webkit-` version, which Chrome ignores — every glass surface silently renders as a flat tint. This bit the whole site once already. If a frosted panel looks flat, check the computed `backdrop-filter` in devtools before touching the colours.
6. **`src/app/page.tsx` (the root one) is essentially unused** — the proxy redirects past it. Real pages live under `[locale]/`.
7. **`public/assets/` still holds splash-era files** (`navigation_ui_window*`, `splash_bg.webp`, `cursor-win95.webp`, `calendar.webp`, `globe.webp`, `/splash_waveform.webm`, `/logo_animated.webm`). Nothing references them; they're safe to delete.
8. **`three` and `vanta` are still in `package.json`** but nothing imports them — the only consumer was the splash background.

---

## Known gaps

- **Fonts.** Geist Pixel Square is used for display type, but the Figma card titles use a
  heavier rounded face that hasn't been supplied. Body copy is Nunito as a
  stand-in. Both are CSS variables (`--v2-font-pixel`, `--v2-font-body`).
- **Archive photos.** Only 2026 has real photos (extracted from the CAM export).
  2023–2025 reuse them — see the note in `archiveData.ts`.
- **Sponsor logos** are placeholder boxes; tiers and counts are invented.
- **French copy** is a first-pass translation and wants a native review.
