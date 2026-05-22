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

> The `CLOUDINARY_*` keys in `.env.example` are **not used** by the ported code
> (images are stored as base64 in Mongo). You can delete them.

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

## 7. Known gaps / optional follow-ups

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
