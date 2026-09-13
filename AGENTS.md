<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

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
    sponsors/page.tsx   ← /sponsors
    (policy)/           ← /privacy-policy, /code-of-conduct, /ticket-terms
    scavenger/          ← /scavenger, /scavenger/profile, /scavenger/submissions
    tickets/            ← ticket wizard (see Ticket Wizard section)
  api/                  ← scavenger backend + ticketing routes (see sections below)
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
  Scene/     V2Scene.tsx
  Reveal/    V2ScrollReveal.tsx
  Hero/      V2Hero.tsx · V2Wordmark.tsx
  Sky/       V2Sky.tsx
  Dawn/      V2Dawn.tsx · V2CdPlayer.tsx · V2Polaroid.tsx
  Archive/   V2Archive.tsx · V2SdCard.tsx · archiveData.ts
  Hunt/      V2Hunt.tsx
  Passes/    V2Passes.tsx
  Sponsors/  V2Sponsors.tsx · V2SponsorHexes.tsx · V2SponsorsHero.tsx
             V2SponsorWhy.tsx · V2SponsorTiers.tsx · V2SponsorCta.tsx
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
| `V2Scene` | `.v2-scene` + the painted backdrop `<img>`. Every page renders one; `screens` opts into the full-viewport rhythm. |
| `V2Sponsors` | Landing-page teaser: heading pill + `V2SponsorHexes`. |
| `V2SponsorHexes` | The honeycomb itself, shared by the teaser and `/sponsors`. |
| `V2Faq` | Lily-pad accordion. |
| `V2Closing` / `V2Footer` | Closing CTA and footer. |

### Styles — `src/app/styles/v2/`

Plain CSS, no CSS Modules, one stylesheet per section folder above.
`index.css` imports them in page order and is pulled in by the root layout.
Everything is namespaced under a `.v2` root class.

| File | Covers |
|---|---|
| `base.css` | Design tokens on `.v2`, `.v2-scene` backdrop, buttons, `.v2-page-hero`, heading pills, cards, `.v2-glass`, reduced-motion guard |
| `reveal.css` | `.v2-reveal`, the hero entrance keyframes |
| `nav.css` | `.v2-nav*`, `.v2-locale` |
| `hero.css` | `.v2-hero*` |
| `sky.css` | `.v2-sky*` |
| `dawn.css` | `.v2-polaroid`, `.v2-stat`, `.v2-cd*`, `.v2-dawn*` |
| `archive.css` | `.v2-cam*`, `.v2-sd*`, `.v2-archive*` |
| `hunt.css` | `.v2-hunt*`, `.v2-board*` |
| `passes.css` | `.v2-pass*`, `.v2-passes*` |
| `sponsors.css` | `.v2-hex*`, `.v2-sponsors*`, and the `/sponsors` page's `.v2-spon-*` |
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

### Light glass cards

The six info surfaces — the three sky tiles and the About / Who comes / Good to
know cards — are **light "bubble glass"**, not the dark panel. One primitive,
`.v2-glass` in `base.css`, carries the whole recipe (gradient fill, 1.5px white
edge, backdrop blur, drop shadow + inner top highlight); `.v2-glass--blue`
swaps the tint tokens for the sky variant. Values come from the Figma card
exports, so don't eyeball them.

`.v2-glass` is deliberately **separate from `.v2-card`** rather than a
replacement for it: `V2Hunt` uses `.v2-card` and stays dark. Restyling
`.v2-card` itself would drag the hunt card along with it.

Text on the glass uses its own inks — `--v2-ink-glass-deep` (titles),
`--v2-ink-glass` (body), `--v2-teal-deep` (eyebrows, links). Lime is still the
tag chips, but lime *text* is unreadable on this surface; don't reach for
`--v2-lime` inside a glass card.

### SD cards travel in a case

Each `V2SdCard` is a clear sleeve (152×184) wrapping the card (128×158) — the
button is the case, `.v2-sd__card` is the card, and the notch/pins/label
position against the card. The resting slots in `archive.css` are spaced and
z-ordered for the sleeve's extra 24×26px; shrinking the sleeve without
re-checking those will overlap the cards' brand strips.

### Sub-pages: /speakers and /sponsors

Both render `V2Scene` **without** `screens`, and neither mounts
`V2ScrollReveal` — so their sections must not carry `.v2-reveal`, or they stay
invisible. Both open with `.v2-page-hero` (badge · title · subline · optional
actions), which lives in `base.css` because two pages share it.

The cards on both pages are `.v2-glass`, matching the landing page rather than
the dark panels in the Figma frames for these two pages. That was a deliberate
instruction, not an oversight — don't "restore" the green cards from the SVGs.

`/sponsors` has no confirmed sponsors, so the honeycomb slots are blank plates,
exactly as the frame draws them. Its audience figures are read out of
`V2.dawn` at render time rather than restated in `V2.sponsors`, so the sponsor
pitch cannot drift from the numbers the landing page shows. The tier card
deliberately describes only logo placement — no packages, benefits or prices
are confirmed.

### The Figma frames are placeholder copy

`src/assets_for_reference/` and the exports carry invented numbers — 25
editions, 500+ attendees, $115 / $160 tickets. **`messages/` is the source of
truth for every string and figure.** Use the frames for geometry and colour
only. In particular there are no ticket prices anywhere on this site: passes
are pre-sale ("Tickets open soon"), so never introduce a price from a mockup.

The Good to know card is built from facts the site already states elsewhere
(the hero pill's dates, the FAQ's ticket and refund answers). It was previously
removed for asserting an unconfirmed venue, meals and transit; keep new bullets
sourced the same way.

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

---

# Scavenger Hunt Subsystem

The CUSEC **scavenger hunt** (backend + UI) was ported from the 2026 monolith into
this repo as a **monorepo**, not a separate backend service. Full setup/handoff
details (env vars, Auth0 config, deploy strategy) live in `SCAVENGER_SETUP.md`.
This section is the architectural contract for working on it.

## Why monorepo (and what that means for you)

The 2026 API routes authenticate via the Auth0 **session cookie**
(`auth0.getSession()`), which works same-origin with **zero auth rework**. A split
backend would have forced cookie→Bearer-JWT conversion on all 33 routes, CORS, and
two deploys. So everything lives here. Consequences:

- **Auth is cookie-based, server-side.** Route handlers and the scavenger page read
  the session directly with `auth0.getSession()`. There is no Bearer-token flow.
- **The scavenger UI fetches relative `/api/...` URLs** (same-origin). Never
  introduce an API base URL or CORS config for these.

## Middleware: ONE file composes Auth0 + next-intl

`src/proxy.ts` is the **only** middleware (Next 16 allows one). It composes both
systems — **never split this into `auth.middleware` + `intl.middleware`, and never
create `src/middleware.ts`**. Contract:

- `/auth/*` → delegated entirely to `auth0.middleware(request)` (login, logout,
  callback, profile, access-token).
- Every other matched path → run `auth0.middleware` first (to roll the session
  cookie). If it returns a redirect or non-200, return it as-is. Otherwise run the
  next-intl middleware and **copy Auth0's Set-Cookie headers onto the intl
  response** before returning. Dropping that cookie-merge step silently logs users
  out on navigation.
- Matcher excludes `api`, `trpc`, `_next`, `_vercel`, and files with a dot.

## Backend lib (`src/lib/`)

| Module | Responsibility |
|---|---|
| `mongodb.ts` | Cached global Mongoose connection. **dbName is `CUSEC2027`.** Throws at import if `MONGODB_URI` is unset — so that var must be present even for `next build` (Vercel included). |
| `models.ts` | All Mongoose schemas/models (User, HuntItem, Collectible, ShopItem, Notice, Day, audit logs, etc.). |
| `auth0.ts` | The Auth0 client instance (`auth0.getSession()`, `auth0.middleware()`). |
| `isAdmin.ts` / `isVolunteer.ts` | Role guards. Read `session.user["cusec/roles"]` and check for `"Admin"` / `"Volunteer"`. Roles arrive via a namespaced ID-token claim set by an Auth0 Login Action. |
| `userService.ts` | `findOrCreateUser` and user-record helpers. |
| `adminAuditLogger.ts` | Writes admin action audit entries. |
| `qrCode.ts` | Hunt-item QR generation. Base URL → `NEXT_PUBLIC_SITE_URL` ?? `https://2027.cusec.net`. |
| `interface.ts` | Shared TS types (incl. `Auth0User`). |
| `utils.ts` | `cn()` (clsx + tailwind-merge) and misc helpers. |

## API routes (`src/app/api/**`) — 33 handlers

All are cookie-authenticated; admin routes additionally call `isAdmin`. Grouped:

- **Hunt items:** `hunt-items/[id]`, `hunt-items/[id]/claimed-users`, `hunt-items/[id]/mass-adjust-points`
- **Collectibles:** `collectibles/redeem`, `collectibles/[id]`, `collectibles/[id]/owned-users`
- **Shop:** `shop/redeem`, `shop/search-users`, `shop/[id]`, `shop/[id]/redeemed-users`
- **Users:** `users/link-email`, `users/[id]`, `users/[id]/discord`, `users/[id]/hunt-items`, `users/[id]/inventory`
- **Public:** `leaderboard`, `notices`, `schedule`
- **Admin suite:** `admin/audit-logs`, `admin/claim-attempts`, `admin/notices`, `admin/redeem-points`, `admin/registered-users`, `admin/shop`, `admin/users`, `admin/users/[userId]/collectibles`, `admin/users/[userId]/hunt-items`, `admin/users/[userId]/shop-prizes`

> `api/schedule` shares the `Day` model and came along with the port; its frontend
> was not ported. Harmless — leave it unless asked to remove it.

## Scavenger page (`src/app/[locale]/scavenger/page.tsx`)

- **The gate lives in `scavenger/layout.tsx`**, so it covers `/scavenger` and every
  page under it. While `SCAVENGER_HUNT_ENABLED` and `SUBMISSIONS_ENABLED` are both off,
  everyone who is not Admin/Volunteer gets `ScavengerPreview` (the public info page)
  and no dock, signed in or not. `getScavengerAccess()` in `src/lib/scavengerAccess.ts`
  is the one place pages read those flags and the staff bypass.
- **A purchase finished while the hunt is closed signs the delegate out** to that
  preview (`PurchaseStepClient`). Safe because `purchaseComplete` is only true once
  the ticket is linked, so the link is already stored server-side.
- Server component. URL is `/scavenger` (locale never in the URL).
- Reads session → `findOrCreateUser` (serialized to a plain object for the client) →
  renders `<Dashboard>` **only if** `SCAVENGER_HUNT_ENABLED === "true"` **OR** the
  user is Admin/Volunteer. Otherwise shows a login / "coming soon" view linking to
  `/auth/login?returnTo=/scavenger`.
- This flag-gate is the late-release mechanism: keep the flag off in production until
  launch; Admin/Volunteer can still preview.

## Scavenger UI island (`src/components/scavenger/**`)

- **Self-contained:** depends only on `react`, `lucide-react`, `react-zxing`,
  `next/image`, and `@/lib/interface`. No imports from the splash-page component
  tree. Entry is `Dashboard.tsx`.
- Shared primitives `src/components/ui/{modal,accordion}.tsx` were ported alongside.
- QR scanner: `react-zxing` v2 — the decode callback is **`onDecodeResult`** (not
  `onResult`, which was the v1 name).

## Theme / "no fancy colors"

The 2026 theme tokens (`primary`, `accent`, `dark-mode`, `light-mode`, `secondary`,
`sunset`, `sea`, …) are redefined as a **neutral grayscale palette** in a single
`@theme` block in `globals.css`. Tailwind v4 errors on unknown utility classes, so
those tokens must exist for the ported components to build. **To restyle the whole
hunt, edit that one `@theme` block** — do not hunt through components.

## Feature flags & deploy

- `SCAVENGER_HUNT_ENABLED` (server) gates the dashboard; `NEXT_PUBLIC_SCAVENGER_HUNT_ENABLED`
  mirrors it for client checks.
- Branch strategy: scavenger work lives on a long-lived `staging` branch (its own
  Vercel preview URL); landing-page work goes to `main` → production. Merge `main`
  → `staging` to pull landing updates in; on launch day merge `staging` → `main`
  and flip the flag on. See `SCAVENGER_SETUP.md` §6.

## Don'ts (scavenger-specific)

1. Don't create `src/middleware.ts` or split `proxy.ts` — it breaks both auth and i18n.
2. Don't convert the API routes to JWT/Bearer or add CORS — they're same-origin cookie auth.
3. Don't change the Mongo `dbName` away from `CUSEC2027`.
4. Don't remove the Auth0 cookie-merge in `proxy.ts` — it keeps sessions alive across navigation.
5. Don't add per-component colors — go through the `@theme` block in `globals.css`.

---

# Ticket Purchase Wizard

The ticket-buying flow on `/tickets`. Full detail lives in
**`docs/ticket-tailor/`** — `TICKET_INTEGRATION.md` (architecture),
`REQUIRED.md` (human setup checklist: DNS, webhook, env), `KNOWN_ISSUES.md`
(unverified assumptions + weak spots). Read those before changing this
subsystem; this section is the contract.

## The flow

```
/tickets                 Public entry. Logged out -> Auth0 signup.
                         Logged in -> redirects to first incomplete step.
/tickets/demographics    ~25-field confidential survey, 5 sub-steps
/tickets/avatar          Reuses the scavenger AvatarCustomize placeholder
/tickets/purchase        Ticket cards + checkout in an on-page modal
```

Steps are **real sub-routes with server-derived progress**, so an abandoned
flow resumes exactly where it left off. Progress is always re-derived from
real data — does a `DemographicInfo` doc exist, is `ticketWizard.avatarCompletedAt`
set, is `linked_email` verified against `RegisteredUser` — never from a
client flag. `ticketWizard.currentStep` is a cache for UI only; don't gate on it.

**Account creation is just Auth0 signup** (`/auth/login?screen_hint=signup`).
There is no second auth system. `findOrCreateUser` creates the `User`, same as
the hunt.

## How it connects to the scavenger hunt

Submitting demographics sets `User.hasSeenIntro = true` **immediately**, which
is what stops the legacy hunt onboarding (email-link screen + personality quiz)
from ever appearing for a wizard user, at any abandonment point. Don't defer
that write to a later step.

A completed purchase auto-links the account — sets `User.linked_email` and
`RegisteredUser.isLinked` — so wizard users arrive at `/scavenger` already
linked. The manual `/api/users/link-email` flow still exists as the fallback.

Two independent paths do that linking, both via `linkTicketPurchase()` in
`src/lib/ticketLinking.ts` (single implementation — keep it that way):
1. The `order.created` webhook.
2. **API reconciliation** — `reconcileTicketPurchase()` asks Ticket Tailor
   directly whether an email has a completed order. Runs on `/scavenger` load
   and on the purchase-step poll, so a purchase is picked up even with no
   webhook registered, and even when checkout completed in a separate tab.

## Key files

| File | Purpose |
|---|---|
| `src/lib/ticketTailor.ts` | All Ticket Tailor API/config. `getTicketTypes()`, `getTicketWidgetConfig()`, webhook verification, `extractPurchaser()`, `extractPurchasedTicket()`, `findCompletedOrderByEmail()`. |
| `src/lib/ticketLinking.ts` | `linkTicketPurchase()` + `reconcileTicketPurchase()`. |
| `src/lib/ticketWizard.ts` | `getWizardStatus()` — server-only (imports Mongoose). |
| `src/lib/ticketWizardOptions.ts` | Client-safe form option lists. **Kept separate on purpose** — client components can't import `ticketWizard.ts`. |
| `src/lib/models.ts` | `DemographicInfo` model + `ticketWizard` subdoc on `userSchema`. |
| `src/app/api/{demographics,ticket-wizard/*,ticket-tailor/webhook}/route.ts` | Wizard APIs. |
| `src/app/components/TicketWizard/*` | `WizardStepNav`, `DemographicsForm`, `AvatarStepClient`, `PurchaseStepClient`. |

## Checkout rendering (hard-won — don't undo)

Checkout is a **plain `<iframe>` we render ourselves**, not Ticket Tailor's
`widget.js`. Their script replaces itself with an iframe-resizer frame using
`scrolling="no"` and a cross-origin height handshake; when that handshake
doesn't land you get a clipped, unscrollable checkout. `checkoutEmbedUrl`
appends the same query params their script would.

Their API has **no payment endpoint at all** — orders are read/update only.
A fully custom checkout would mean integrating Stripe and becoming merchant of
record. Investigated and rejected; don't re-litigate without reading
`TICKET_INTEGRATION.md`.

**The "Checkout has opened in a new tab" message is not a bug** — it's
third-party cookies being blocked. Only fixable by connecting a custom domain
under `cusec.net` (`TICKET_TAILOR_CUSTOM_DOMAIN`). **It can never work on
localhost.** Test in-page checkout on a deployed environment only.

## Ticket Tailor API gotchas (verified against a live event)

1. `GET /v1/events/{id}/ticket_types` **does not exist** (404s). Ticket types
   are embedded on the parent: `default_ticket_types` on an event series,
   `ticket_types` on an event.
2. **Two IDs per event.** `TICKET_TAILOR_EVENT_ID` must be the *public* id
   (from the checkout URL) — that's the **event series**. The internal
   `ev_...` occurrence id is different. API paths need the `es_`/`ev_` prefix;
   the bare number 404s.
3. `TICKET_TAILOR_BOX_OFFICE_NAME` is the URL **slug** (`cusec`), not the
   display name.
4. Available quantity is `quantity`, not `quantity_available`.
5. Env vars use `||`, not `??` — an empty-string var must fall back to null.
6. Order `line_items` include bundles (`bu_...`); prefer the `tt_...` item.
7. Buyer PII is masked (`****`) on the current API key.

## Don'ts (ticket-wizard-specific)

1. Don't render third-party embed scripts as JSX `<script>` — React makes them
   inert. And `next/script` relocates them, breaking scripts that locate
   themselves via `document.currentScript`.
2. Don't import `ticketWizard.ts` (or anything importing `models.ts`) into a
   client component — use `ticketWizardOptions.ts`.
3. Don't duplicate linking logic — extend `linkTicketPurchase()`.
4. Don't drop the guards in `findCompletedOrderByEmail()`: a malformed address
   makes Ticket Tailor silently ignore the `email=` filter and return unrelated
   orders, which reads as a false "has a ticket".
5. Don't log demographic data — it's confidential PII, and the UI promises so.
