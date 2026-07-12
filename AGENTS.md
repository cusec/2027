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
    layout.tsx          ← locale-aware layout: NextIntlClientProvider + Navbar + {children}
    page.tsx            ← home route, renders <SplashPage />
    scavenger/
      page.tsx          ← scavenger hunt entry (server component, feature-flag gated)
  api/                  ← scavenger backend (33 route handlers, see Scavenger section)
```

> **Layout note:** `[locale]/layout.tsx` renders `{children}` (it used to hard-render
> `SplashPage` and ignore children, which blocked every sub-route). The home page
> content moved into `[locale]/page.tsx`. Do not move `SplashPage` back into the layout.

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
