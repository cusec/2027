<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# CUSEC 2027 — Repository Guide

**What this is:** The coming-soon / landing page for CUSEC 2027 (26th annual Canadian University Software Engineering Conference, Montréal QC, January 2027). Currently a single-page splash with a draggable Win95-style UI window, locale switcher, and animated background.

**Live domain:** `https://2027.cusec.net`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.6 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Plain CSS modules + Tailwind v4 (minimal use) |
| i18n | next-intl 4.9.0 |
| Icons | lucide-react |
| React | 19.2.4 |
| Font | `Retropix` (custom woff2, pixel-art style) + MS Sans Serif fallback |

---

## Critical Conventions

### Middleware → `proxy.ts`, NOT `middleware.ts`

Next.js 16 renamed the middleware file convention. **Never create `src/middleware.ts`** — it will conflict and break routing.

```
src/proxy.ts  ← the correct file (already set up with next-intl)
```

### Locale routing — `localePrefix: 'never'`

Locales are detected from the `Accept-Language` header / cookie, **not** from URL path segments. The URL never shows `/en-CA/` or `/fr-CA/`. All navigation uses wrappers from `src/i18n/navigation.ts`, never Next.js's `next/navigation` directly.

### Route structure

```
src/app/
  layout.tsx            ← root layout (metadata, viewport, global CSS imports)
  globals.css           ← Tailwind import + base resets
  manifest.ts           ← Web App Manifest (MetadataRoute.Manifest)
  page.tsx              ← redirected by proxy — effectively unused
  [locale]/
    layout.tsx          ← locale-aware layout: NextIntlClientProvider + Navbar + SplashPage
    page.tsx            ← placeholder (real content is in SplashPage, rendered by locale layout)
```

The `[locale]` segment is internal routing only — it never appears in the browser URL bar.

---

## File Map

### Components

| File | Purpose |
|---|---|
| `src/app/components/SplashPage/SplashPage.tsx` | Server component. Composes the full splash page: wavy animated title, CUSEC logo, `SplashPageUI`, and the waveform video background. |
| `src/app/components/SplashPage/SplashPageUI.tsx` | **Client component** (`"use client"`). The draggable Win95-style application window. Contains all pointer event drag logic (bounds-clamped, auto-returns to origin after 1s idle). |
| `src/app/components/Navbar/Navbar.tsx` | Fixed top navbar shell. Currently just renders `LocaleSwitcher`. |
| `src/app/components/Navbar/LocaleSwitcher.tsx` | **Client component**. Globe icon + `<select>` for en-CA / fr-CA. Uses `useRouter` / `usePathname` from `src/i18n/navigation.ts`. |

### Styles

All CSS is plain files, no CSS Modules. Imported globally via `src/app/styles/index.css`.

| File | Covers |
|---|---|
| `src/app/globals.css` | Tailwind import, `color-scheme: light`, base body background |
| `src/app/styles/index.css` | Imports SplashPage.css + UIWindow.css; patches `splash-wrapper` top padding to account for fixed navbar height + safe-area inset |
| `src/app/styles/Splash/SplashPage.css` | `.splash-wrapper`, `.main-splash-content`, `.splash-title`, `.title-row`, `.splash-logo`, `.splash-ui-wrapper`, waveform video, responsive breakpoints |
| `src/app/styles/Splash/UIWindow.css` | Everything inside `SplashPageUI`: nav bar, window buttons, item icons, CTA area, sponsorship button. Has breakpoints at 1400px, 640px, 370px. |
| `src/app/styles/navbar.css` | `.Navbar`, `.Navbar-locale-switcher`, `.Navbar-locale-icon`, `.Navbar-locale-select-wrapper`, `.Navbar-locale-select` |

### i18n

| File | Purpose |
|---|---|
| `src/i18n/routing.ts` | Defines locales `['en-CA', 'fr-CA']`, `defaultLocale: 'en-CA'`, `localePrefix: 'never'` |
| `src/i18n/request.ts` | Server-side locale resolution from request; loads `messages/<locale>.json` |
| `src/i18n/navigation.ts` | Re-exports `Link`, `redirect`, `usePathname`, `useRouter`, `getPathname` from next-intl — always use these instead of `next/navigation` |
| `src/proxy.ts` | next-intl middleware. Handles locale detection and cookie. Matches all paths except `api`, `_next`, `_vercel`, and files with a dot. |
| `messages/en-CA.json` | English strings |
| `messages/fr-CA.json` | French strings |

**Message namespaces in use:**
- `SplashPage.*` — title, edition-link, attendance-*, sponsorship-interest
- `HomePage.*` — placeholder, not currently rendered

### Assets

**Static assets live in `public/assets/`**, not in `src/`. Reference them as `/assets/filename.ext`.

| File | Dimensions | Usage |
|---|---|---|
| `public/assets/navigation_ui_window.png` | 735×514 | Desktop UI window background |
| `public/assets/navigation_ui_window_skinny.png` | 351×576 | Mobile UI window background (shown ≤640px) |
| `public/assets/splash_bg.webp` | 1448×1086 | Full-page background image |
| `public/assets/calendar.png` | 83×83 | "Jan. 2027" icon in the window |
| `public/assets/globe.png` | 89×89 | "Montreal, QC" icon in the window |
| `public/assets/cusec_aero_logo.png` | 146×146 | Logo beside "2027" title |
| `public/splash_waveform.webm` | — | Animated waveform overlay (screen blend mode for iOS VP9 alpha fix) |
| `public/logo_animated.webm` | — | Animated logo (currently commented out, replaced by static PNG) |
| `public/cusec-logo.png` | — | OG image + PWA icon (should be 1200×630 for best OG) |
| `public/favicon.ico` / `favicon-16x16.png` / `favicon-32x32.png` | — | Favicons |

**SVG components** (code, not static assets) live in `src/app/assets/FigmaSVGs.tsx`:
- `FileFolder` — pixel-art folder icon for "25th Edition" link
- `SponsorshipInterestButton` — Win95-style button SVG, `viewBox="0 0 616 75"` (8.2:1 aspect ratio — render at full width, do not scale height or it distorts)

The SVG file also exports `splitCtaLabel`, a utility that word-wraps long button label strings to at most 2 lines.

### Font

`src/fonts/retropix.woff2` — loaded via `@font-face` in `SplashPage.css` as `"Retropix"`. Used for all monospace/pixel-art text (CTA buttons, email input, etc.).

---

## Design System Notes

**Color palette (key values):**
- `#103436` — dark teal, primary brand colour (text, outlines, theme-color)
- `#ffffff` — highlights / borders
- `#2b2b2b` — shadows / borders
- `#bfbfbf` / `#c0c0c0` — Win95 grey (buttons)
- `#1A66D4` — locale icon blue

**Win95 border pattern** (used on all "window" UI elements):
```css
border-top: 2px solid #ffffff;
border-left: 2px solid #ffffff;
border-right: 2px solid #2b2b2b;
border-bottom: 2px solid #2b2b2b;
box-shadow: inset 1px 1px 0 #dbdbdb;
```
Do not reduce these to 1px on mobile — they become invisible.

**Responsive breakpoints:**
- `≤1400px` — reduce icon sizes slightly
- `≤980px` — stack layout to single column
- `≤640px` — mobile layout: skinny window image, row-layout items, CTA below window
- `≤370px` — very small phones, smaller nav title

---

## SplashPageUI Drag System

`SplashPageUI` implements a pointer-capture drag for the window:

- **Drag handle:** `.UI-nav` bar (top of the window). Clicking a `<button>` inside the nav does NOT initiate drag.
- **Bounds:** Clamped to `.splash-wrapper` on every `pointerdown` so the window can't be dragged outside the page.
- **Auto-return:** If the cursor leaves the window and stays absent for 1 second, the window slides back to `translate(0, 0)` with a spring animation (`cubic-bezier(0.34, 1.4, 0.64, 1)`).
- **Float animation:** `.splash-ui-wrapper` has a CSS `splash-ui-hover` keyframe animation. It pauses while dragging via `:has(.UI-nav--dragging)`.
- **State:** `offsetRef` is the source of truth during drag (avoids React re-render lag); `offset` state drives the `style` prop for the actual transform.

---

## Metadata & SEO

- Defined in `src/app/layout.tsx` (root, language-agnostic defaults) and `src/app/[locale]/layout.tsx` (per-locale overrides for title/description/OG).
- Web App Manifest at `src/app/manifest.ts` (Next.js built-in `MetadataRoute.Manifest`).
- Google Search Console verification token field is empty in `layout.tsx` — fill in when needed.
- OG image is `/cusec-logo.png` — should be replaced with a proper 1200×630 image.

---

## Common Gotchas

1. **Never use `next/navigation`** directly. Always import from `@/i18n/navigation` for locale-aware routing.
2. **Never create `src/middleware.ts`** — use `src/proxy.ts`.
3. **Static assets belong in `public/`**, not `src/app/assets/`. Only code (TSX/TS) goes in `src/`.
4. **The waveform video uses `mix-blend-mode: screen`** — this is intentional. iOS Safari drops VP9 alpha channel, leaving black; screen blend makes black transparent without needing a separate codec.
5. **The `SponsorshipInterestButton` SVG is 8.2:1 wide.** Render it with `width: 100%` and let it scale proportionally. Do not apply `scaleY` or set a fixed height — it will distort.
6. **`src/app/page.tsx` exists but is essentially unused.** The locale layout (`[locale]/layout.tsx`) handles rendering. The root `page.tsx` is a remnant — don't put real content there.
7. **The `HomePage` message namespace is a placeholder** and not rendered anywhere visible. Real content uses `SplashPage.*`.
