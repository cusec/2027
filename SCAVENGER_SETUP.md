# Scavenger Hunt — Port & Setup Guide

This document describes the CUSEC 2026 **scavenger hunt** feature that was ported
into the `cusec-2027` repository, and **everything you need to provide** to get
it running locally and in production.

---

## 1. Architecture decision

The scavenger hunt was ported as a **monorepo** inside `cusec-2027` — *not* as a
separate `2027-scavenger` backend repo.

**Why monorepo over a split backend:**
- The bulk of the feature (~11K LOC of frontend UI) has to live in `cusec-2027`
  regardless, so a split would not have kept this repo lean.
- The 2026 API routes authenticate via the Auth0 **session cookie**
  (`auth0.getSession()`), which works same-origin in a monorepo with **zero auth
  rework**. A split would have forced: cookie→Bearer-JWT conversion on all 33
  routes, CORS, an Auth0 Action to move roles into the access token, and two
  deploys.
- The "release the hunt very late" goal is met by a **branch strategy + feature
  flag** (see §6), which live in this repo either way.

The only genuinely tricky integration point — composing the Auth0 middleware
with the existing next-intl i18n middleware — is solved in a single
`src/proxy.ts` (Next.js 16 allows only one middleware file).

---

## 2. What was implemented

| Area | Files | Notes |
|---|---|---|
| **Backend lib** | `src/lib/{models,mongodb,auth0,isAdmin,isVolunteer,userService,adminAuditLogger,qrCode,interface,utils}.ts` | Mongo connects to db **`CUSEC2027`** (changed from `CUSEC2026`). QR base URL → `2027.cusec.net`. |
| **API routes** | `src/app/api/**` (33 routes) | Ported verbatim — hunt-items, collectibles, shop, notices, leaderboard, users, full admin suite, schedule. Cookie-based Auth0 auth unchanged. |
| **Combined middleware** | `src/proxy.ts` | Auth0 owns `/auth/*`; next-intl handles locale; Auth0 session cookies are merged onto the intl response. |
| **Scavenger UI** | `src/components/scavenger/**` (56 files) + `src/components/ui/{modal,accordion}.tsx` | Self-contained island: depends only on `react`, `lucide-react`, `react-zxing`, `next/image`, `@/lib/interface`. All `fetch()` calls use relative `/api/...` (same-origin). |
| **Scavenger page** | `src/app/[locale]/scavenger/page.tsx` | Server component: reads session, `findOrCreateUser`, gates on the feature flag, renders the `Dashboard` (or a login/coming-soon view). URL is `/scavenger` (locale is never in the URL). |
| **Layout refactor** | `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx` | The layout previously hard-rendered `SplashPage` and ignored `children`, so no sub-route could appear. `SplashPage` moved into the home `page.tsx`; the layout now renders `{children}`. The landing page is unchanged visually. |
| **De-styling ("no fancy colors")** | `src/app/globals.css` | The 2026 theme tokens (`primary`, `accent`, `dark-mode`, …) are redefined as a **neutral grayscale palette** in one `@theme` block. Tweak there to restyle everything. |

**New dependencies added:** `@auth0/nextjs-auth0`, `mongoose`, `react-zxing`,
`clsx`, `tailwind-merge`, `@radix-ui/react-accordion`.

**Verified:** `tsc --noEmit` clean · `next build` clean (all 33 routes + proxy) ·
runtime smoke test (`/`→200, `/scavenger`→200, `/auth/login`→307).

---

## 3. What YOU need to provide

### 3a. MongoDB
- A MongoDB connection string. The app uses database name **`CUSEC2027`**
  (hard-coded in `src/lib/mongodb.ts`).
- Set `MONGODB_URI`.
- **Note:** `src/lib/mongodb.ts` throws at import if `MONGODB_URI` is unset, so it
  must be present in **every** environment that runs `next build` (i.e. Vercel).
- Collections are created automatically by Mongoose on first write. There is no
  seed data — hunt items, collectibles, shop items, and notices are created
  through the in-app **admin panel** (visible to users with the `Admin` role).

### 3b. Auth0
You can reuse the **same Auth0 tenant and Application** as CUSEC 2026 (the
authentication model is identical — cookie session + roles in the ID token).

1. **Application** type: *Regular Web Application*.
2. **Allowed Callback URLs** — add:
   - `http://localhost:3000/auth/callback`
   - `https://2027.cusec.net/auth/callback`
   - your staging preview URL + `/auth/callback`
3. **Allowed Logout URLs** — add: `http://localhost:3000`, `https://2027.cusec.net`,
   staging URL.
4. **Allowed Web Origins** — same set of origins.
5. **Roles claim (required for Admin / Volunteer):** an Auth0 **Login Action**
   must add the namespaced claim `cusec/roles` to the ID token. The code reads
   `session.user["cusec/roles"]` and checks for `"Admin"` / `"Volunteer"`.
   Example Action:
   ```js
   exports.onExecutePostLogin = async (event, api) => {
     const roles = event.authorization?.roles || [];
     api.idToken.setCustomClaim("cusec/roles", roles);
   };
   ```
   Then assign the `Admin` / `Volunteer` roles to the appropriate users in Auth0.

> **First-admin bootstrap (do this first on any fresh environment).** There is no
> seed data, and the in-app admin panel — the only way to create hunt items,
> collectibles, shop items, and notices — is visible **only** to users with the
> `Admin` role. So before anything works, log into Auth0, assign your own user the
> `Admin` role, then log into the app at `/scavenger`. Without this you'll see an
> empty hunt with no way to add content.

### 3c. Environment variables
Fill these in `cusec-2027/.env.local` (local) and in your Vercel project settings
(production + staging). `.env.example` already lists them.

| Variable | Required | Used by | Notes |
|---|---|---|---|
| `MONGODB_URI` | ✅ | `lib/mongodb.ts` | Must be set even at build time. |
| `AUTH0_SECRET` | ✅ | Auth0 SDK | Random 32+ char string (`openssl rand -hex 32`). |
| `AUTH0_DOMAIN` | ✅ | Auth0 SDK | e.g. `cusec.us.auth0.com`. |
| `AUTH0_CLIENT_ID` | ✅ | Auth0 SDK | |
| `AUTH0_CLIENT_SECRET` | ✅ | Auth0 SDK | |
| `APP_BASE_URL` | ✅ | Auth0 SDK + `Dashboard` | e.g. `http://localhost:3000` / `https://2027.cusec.net`. |
| `AUTH0_AUDIENCE` | ⬜ | Auth0 SDK | Only needed if you later call an Auth0-protected API; harmless to leave set. |
| `NEXT_PUBLIC_SITE_URL` | ⬜ | `lib/qrCode.ts` | Falls back to `https://2027.cusec.net` for QR code generation. |
| `SCAVENGER_HUNT_ENABLED` | ✅ | scavenger page (server) | `"true"` to open the hunt to all logged-in users; otherwise only Admin/Volunteer see the dashboard. |
| `NEXT_PUBLIC_SCAVENGER_HUNT_ENABLED` | ⬜ | client components | Mirror of the flag for client-side checks. |

> **Image storage (Cloudinary).** When `CLOUDINARY_URL` (or the
> `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` trio)
> is set, hunt-item QR codes, shop prizes, and collectible images are uploaded to
> Cloudinary under a **`cusec-2027/`** root folder (`cusec-2027/qr-codes`,
> `cusec-2027/shop`, `cusec-2027/collectibles`) — keeping 2027 isolated from
> prior years on the same shared account, with photos stored as compressed WebP.
> When the keys are unset, the app falls back to the legacy base64-in-Mongo
> behaviour, so it still runs with zero config. See `src/lib/imageStorage.ts`.

---

## 4. Run locally

```bash
cd cusec-2027
npm install          # already done, run again if needed
# fill in .env.local (see §3c)
npm run dev          # http://localhost:3000
```

- Landing page: `http://localhost:3000/`
- Scavenger hunt: `http://localhost:3000/scavenger`
- Log in: the "Start Hunting" button → `/auth/login?returnTo=/scavenger`.
- Admin panel appears inside the dashboard for users with the `Admin` role.

---

## 5. Data / content

There is no automatic data migration from the 2026 database. For 2027 you start
fresh in the `CUSEC2027` database. Populate content via the admin panel:
hunt items (+ QR codes), collectibles, shop items, notices. If you *want* to copy
2026 content, that would be a separate `mongodump`/`mongorestore` between the
`CUSEC2026` and `CUSEC2027` databases (not done here).

---

## 6. Deploy & branch strategy (release the hunt late)

The goal: normal landing-page changes ship to `main` / production; the scavenger
hunt stays dark until just before the conference.

**Recommended setup (configured in GitHub + Vercel — outside this repo):**
1. Keep all scavenger work on a long-lived **`staging`** branch.
2. In Vercel, point the **staging preview deployment** at the `staging` branch
   (a fixed preview URL, e.g. `staging.2027.cusec.net` or the Vercel branch URL).
   This is where the scavenger hunt is tested.
3. Normal feature branches → PR → **`main`** → production (`2027.cusec.net`).
   These never include scavenger UI in the user's flow because…
4. …the scavenger page is gated by `SCAVENGER_HUNT_ENABLED`. On production keep it
   **unset/false** until launch; on staging set it **true**.
5. To pull the latest landing-page changes into the scavenger branch, periodically
   **merge `main` into `staging`**.
6. **Launch day:** merge `staging` → `main` and flip `SCAVENGER_HUNT_ENABLED=true`
   in production.

> Add the staging URL to the Auth0 Allowed Callback/Logout/Web-Origin lists (§3b).

---

## 7. Onboarding flow

A guided onboarding experience was added on top of the scavenger dashboard. It presents up to three full-page screens (each with its own bubble-gradient background) when a user logs in for the first time.

### Screens

| # | Background asset | Purpose |
|---|---|---|
| 1 | `public/assets/linking-screen-1.png` | Link ticket email (or skip) |
| 2 | `public/assets/linking-screen-2.png` | Personality quiz (2 questions) |
| 3 | `public/assets/linking-screen-3.png` | Avatar customization placeholder |

All screens are `fixed inset-0 z-50` overlays rendered inside the client Dashboard component — the URL stays at `/scavenger`.

### User flows

**First-time login** (`hasSeenIntro === false` and no verified linked email):
```
Login → Screen 1 (email link)
  ↓ Skip  → mark hasSeenIntro=true → dashboard (email CTA banner shown)
  ↓ Link  → Screen 2 (personality quiz)
               ↓ Skip/Submit → Screen 3 (avatar placeholder)
                                 ↓ Continue → mark hasSeenIntro=true → dashboard
```

**From the dashboard** (returning users):
- No linked email → teal CTA banner with "Link Email" button → Screen 1 → 2 → 3
- Has linked email → "Edit Profile" link (top-right of dashboard) → Screen 2 → 3

### Onboarding gate logic

The gate is evaluated server-side in `src/app/[locale]/scavenger/page.tsx` and passed to Dashboard as `emailVerified`. Dashboard skips onboarding if **either** condition holds:

1. `dbUser.linked_email` is set **and** `RegisteredUser.isLinked === true` for that email — covers all users who linked before `hasSeenIntro` was introduced.
2. `dbUser.hasSeenIntro === true` — covers users who explicitly skipped email linking.

This means existing users with a linked email will never see the onboarding screens after a reload or re-login.

### New model fields (`src/lib/models.ts` — `userSchema`)

| Field | Type | Default | Purpose |
|---|---|---|---|
| `hasSeenIntro` | Boolean | `false` | Set to `true` once the user completes or skips the onboarding flow |
| `personalityType` | String | `null` | Result of the personality quiz (e.g. `"hunter"`, `"strategist"`, `"connector"`, `"explorer"`) |

### New API route

`PATCH /api/users/onboarding` — authenticated. Accepts `{ hasSeenIntro?: boolean, personalityType?: string }`. Used by the onboarding components to persist quiz results and mark the intro as seen.

### Component tree

```
src/components/scavenger/onboarding/
  OnboardingFlow.tsx      ← orchestrator; mode prop controls start step
  EmailLinkScreen.tsx     ← Screen 1 (wraps existing /api/users/link-email)
  PersonalityQuiz.tsx     ← Screen 2 (two radio-card questions)
  AvatarCustomize.tsx     ← Screen 3 (placeholder, no data saved yet)
```

`OnboardingFlow` accepts a `mode` prop:
- `"first-login"` / `"link"` — start at Screen 1
- `"edit"` — start at Screen 2 (for users who already have a linked email)

### Personality types

Quiz Q1 answer determines the stored `personalityType`:

| Q1 answer | `personalityType` |
|---|---|
| Dive in headfirst | `hunter` |
| Plan it out | `strategist` |
| Rally the team | `connector` |
| Think outside the box | `explorer` |

Q2 ("What's your CUSEC goal?") is captured in the UI but does not currently affect the stored type — reserved for future use.

### Avatar customization

Screen 3 is a placeholder. The `avatarConfig` field is not yet in the model. When avatar customization is built out, add `avatarConfig: { type: Schema.Types.Mixed, default: null }` to `userSchema` and update `DbUser` in `src/lib/interface.ts`.

---

## 8. Known gaps / optional follow-ups

- **PWA service worker not ported.** The "Install" prompt components were ported,
  but the 2026 offline service worker (serwist) was not. Install-to-homescreen
  works via the existing `manifest.ts`; offline caching is not configured. Port
  `@serwist/next` only if you need offline support.
- **QR code base URL** is hard-coded to `2027.cusec.net` in `lib/qrCode.ts`
  (overridable via `NEXT_PUBLIC_SITE_URL`). Confirm before printing codes.
- **Conference `schedule` API** (`/api/schedule`) came along with the port (it
  shares the `Day` model). Its frontend was *not* ported. Harmless; remove if
  unwanted.
- **`mongodb.ts` build-time throw** — see §3a; keep `MONGODB_URI` set in CI/Vercel.
```
