# CUSEC 2027 — Ticket Tailor Integration Plan

This document describes how to integrate Ticket Tailor into the CUSEC 2027 website so
attendees can purchase General and VIP tickets directly on `2027.cusec.net` without
being redirected to the Ticket Tailor website.

---

## Background: What We Had Before

In 2026, the site showed pricing cards (Basic at $115/$270 and VIP at $160/$320) with
anchor tags that opened `https://www.tickettailor.com/events/cusec/1914839` in a new
tab. The user left the CUSEC site completely to buy a ticket.

The goal now is to keep the user on `2027.cusec.net` throughout the entire purchase
flow while still relying on Ticket Tailor to handle the checkout form, payment
processing, ticket issuance, and confirmation emails. CUSEC never touches card data.

---

## How Ticket Tailor's Integration Options Work

Ticket Tailor offers two mechanisms relevant to this goal. Understanding both is
essential to making the right architectural choice.

### Option A — Embedded Widget (Script Embed)

Ticket Tailor provides a JavaScript snippet that, when added to any HTML page, renders
a fully functional ticket shop inline on that page. The widget source is:

```
https://cdn.tickettailor.com/js/widgets/min/widget.js
```

The embed code looks like this:

```html
<div class="tt-widget">
  <script
    src="https://cdn.tickettailor.com/js/widgets/min/widget.js"
    data-url="https://www.tickettailor.com/events/cusec/EVENT_ID"
    data-type="inline"
    data-inline-minimal="true"
    data-inline-show-logo="false"
    data-inline-bg-fill="false"
    data-inline-ref="cusec2027_website">
  </script>
</div>
```

Key `data-*` attributes:

| Attribute | Purpose |
|---|---|
| `data-url` | The Ticket Tailor event or box-office URL |
| `data-type` | `"inline"` renders inside the page; `"popup"` adds a button that opens a modal |
| `data-inline-minimal` | `"true"` strips excess padding/borders from the widget |
| `data-inline-show-logo` | `"false"` hides the Ticket Tailor branding |
| `data-inline-bg-fill` | `"false"` makes the widget background transparent |
| `data-inline-ref` | A tracking string for analytics attribution |

The widget is responsive and fills the width of its container (up to ~800 px wide).
The full checkout flow — ticket selection, attendee details form, payment — all happen
inside the widget, rendered as Ticket Tailor's own UI. CUSEC does not touch payment
information at any point.

**Critical limitation — third-party cookies**: Modern browsers block third-party
cookies by default. Because the widget is served from Ticket Tailor's domain but
embedded on cusec.net, browsers may treat its cookies as third-party and refuse them.
When this happens, the widget detects it and redirects the user to a new tab on the
Ticket Tailor domain to complete the purchase — exactly the behavior we're trying to
avoid. The fix is described below in the Custom Domain section.

### Option B — REST API

Ticket Tailor exposes a REST API at `https://api.tickettailor.com/v1` authenticated
with HTTP Basic Auth using an API key. Relevant resources include:

| Endpoint | What it returns |
|---|---|
| `GET /v1/events` | All events in the box office |
| `GET /v1/event_series/{id}/ticket_types` | Ticket types for a series (name, price, availability) |
| `GET /v1/events/{id}/ticket_types` | Ticket types for a single event occurrence |
| `GET /v1/orders` | All orders |
| `POST /v1/orders` | Create an order |

**Important**: The REST API is designed for data access and management. It does not
expose a payment endpoint. Ticket Tailor's payment processing runs through a connected
Stripe (or Square/PayPal) account, and the API's order creation is for offline/manual
orders, not for building a custom card-payment checkout. If you create an order via
the API, you cannot then charge a credit card through the API — you would need to
integrate directly with Stripe yourself, which would mean managing your own Stripe
account separate from Ticket Tailor's. This defeats the purpose and adds significant
PCI compliance scope.

The API's practical use here is: **fetching live ticket data** (prices, names,
availability) to render a custom CUSEC-branded UI before handing off to the widget for
payment.

---

## Recommended Architecture: Hybrid Approach

Use the REST API to power a custom CUSEC-branded ticket selection page, and use the
embedded widget (popup/modal mode) to handle the actual checkout and payment.

```
User visits /tickets
      │
      ▼
Next.js server component fetches ticket types
from Ticket Tailor API (cached, server-side)
      │
      ▼
Renders custom CUSEC-styled ticket cards
(General ticket + VIP ticket, live prices from API)
      │
      ▼
User clicks "Buy General" or "Buy VIP"
      │
      ▼
Ticket Tailor popup widget opens as an overlay
(Ticket Tailor UI, handles payment, issues ticket)
      │
      ▼
Confirmation email sent by Ticket Tailor
User stays on 2027.cusec.net throughout
```

This gives CUSEC full control over how the tickets are presented (matching the
Win95/CUSEC 2027 aesthetic) while delegating all payment processing to Ticket Tailor.

---

## Phase 1 — Ticket Tailor Dashboard Setup

These steps must be done by an account admin in the Ticket Tailor dashboard before
any code is written.

### 1.1 Create the CUSEC 2027 Event

In the Ticket Tailor dashboard, create a new event:
- **Event name**: CUSEC 2027 (or "26th Annual Canadian University Software Engineering Conference")
- **Date**: January 2027 (exact dates TBD)
- **Location**: Montréal, QC

Note the **Event ID** from the URL once created (format: a numeric string like
`1914839`). You will need this.

### 1.2 Create Ticket Types

Add two ticket types to the event:

**General Ticket**
- Name: `General`
- Set price(s) — consider whether you want a single price or multiple tiers
  (Student / Professional) as in 2026. If you use tiers, Ticket Tailor supports
  multiple ticket types; name them `General — Student` and `General — Professional`.
- Set quantity/capacity limits
- Configure any sale window (start date / end date)

**VIP Ticket**
- Name: `VIP`
- Set VIP pricing (higher than General)
- Set quantity limit (VIP is typically limited)
- Configure sale window

### 1.3 Connect a Payment Processor

Go to **Box Office Settings → Payment Systems** and connect Stripe. This is required
before any tickets can actually be purchased. Ticket money goes directly from the
buyer to the CUSEC Stripe account — Ticket Tailor never holds the funds.

If a CUSEC Stripe account does not yet exist, create one at stripe.com using the
organization's banking details before doing this step.

### 1.4 Connect the Custom Domain

This is the most critical setup step for the widget to work correctly.

In **Box Office Settings → Custom Domain**, add `2027.cusec.net`. Ticket Tailor will
provide a CNAME record to add to the DNS. Once the DNS propagates, the widget will
be served in a first-party context on 2027.cusec.net, meaning browser cookie
restrictions will no longer apply. The checkout will complete entirely on-site without
any popup or redirect.

Until the custom domain is connected, the widget will redirect some users to a new
tab. This step must be done before launch.

### 1.5 Generate an API Key

Go to **Box Office Settings → API** and generate a new API key. When generating, scope
it to **read-only** permissions — specifically the `events` and `ticket_types` endpoints
are all we need.

The key format is `sk_[account]_[box_office]_[encoded_data]`.

Store this key as an environment variable immediately (see Phase 2). Do not commit it
to the repository.

---

## Phase 2 — Environment Variables

Add the following to your `.env.local` (and to Vercel's environment variable settings
for the staging and production deployments):

```bash
# Ticket Tailor — server-side only, never expose to the client
TICKET_TAILOR_API_KEY=sk_your_api_key_here

# The Ticket Tailor event URL (used by the widget's data-url attribute)
# This is the public-facing URL for your event
NEXT_PUBLIC_TICKET_TAILOR_EVENT_URL=https://www.tickettailor.com/events/cusec/YOUR_EVENT_ID

# Your Ticket Tailor event ID (numeric string)
TICKET_TAILOR_EVENT_ID=YOUR_EVENT_ID
```

`TICKET_TAILOR_API_KEY` is server-side only (no `NEXT_PUBLIC_` prefix). It must never
appear in client-side code. The two `NEXT_PUBLIC_` variables are safe to expose — they
point to the public box office URL and event ID, which are already public.

---

## Phase 3 — API Route for Ticket Data

Create `src/app/api/ticket-types/route.ts`.

This is a Next.js route handler that calls the Ticket Tailor REST API server-side and
returns the ticket types for our event. Keeping this server-side means the API key
never reaches the browser.

**What this route should do:**

1. Read `TICKET_TAILOR_API_KEY` and `TICKET_TAILOR_EVENT_ID` from environment variables.
2. Make a GET request to:
   ```
   https://api.tickettailor.com/v1/events/{TICKET_TAILOR_EVENT_ID}/ticket_types
   ```
   with the Authorization header:
   ```
   Authorization: Basic BASE64(TICKET_TAILOR_API_KEY:)
   ```
   Note the trailing colon — Ticket Tailor uses HTTP Basic Auth with the API key as
   the username and an empty password.
3. Return the relevant fields from each ticket type: `id`, `name`, `price` (in cents),
   `status` (e.g., `"on_sale"`, `"sold_out"`, `"unavailable"`), and `quantity_available`.
4. Add a `Cache-Control: s-maxage=300, stale-while-revalidate=60` header so the
   response is cached at the CDN/edge for 5 minutes. Ticket prices and availability do
   not change frequently, so aggressive caching is fine. This also protects against
   Ticket Tailor's rate limit (5,000 requests per 30 minutes).

**Response shape** the route should return (for the tickets page to consume):

```json
{
  "tickets": [
    {
      "id": "tti_abc123",
      "name": "General",
      "priceCents": 11500,
      "status": "on_sale",
      "quantityAvailable": 150
    },
    {
      "id": "tti_def456",
      "name": "VIP",
      "priceCents": 16000,
      "status": "on_sale",
      "quantityAvailable": 20
    }
  ]
}
```

If the Ticket Tailor API call fails, return a graceful error response with status 503
and an empty `tickets` array so the UI can display a fallback state.

**Note on event series vs. single event**: If the event is set up as an "event series"
(recurring dates) in Ticket Tailor, the endpoint is different:
```
GET /v1/event_series/{id}/ticket_types
```
Confirm which structure is used when creating the event in Phase 1.

---

## Phase 4 — Tickets Page

Create `src/app/[locale]/tickets/page.tsx`.

This is a **server component** that:
1. Fetches ticket type data from the `/api/ticket-types` route (or directly from the
   Ticket Tailor API, since server components can make fetch calls with the API key
   from environment variables without needing to go through a route handler).
2. Passes the data to a client component for rendering and interactivity.

The URL is `/tickets` (locale is never in the URL bar, per the existing routing
convention). Add the route by creating the file at the path above — Next.js handles
the rest.

**What the page should show:**

- A page heading ("Get Your Ticket" or similar, in the CUSEC Win95/Retropix style)
- Two ticket cards side by side: General and VIP
- Each card shows: ticket name, price, feature list, availability status, and a
  "Buy" button
- The "Buy" button triggers the Ticket Tailor checkout widget in popup mode

The page does not need to be gated behind authentication. It is a public page.

**Add translations** for the new strings in `messages/en-CA.json` and
`messages/fr-CA.json` under a new `TicketsPage.*` namespace. Example keys:
- `TicketsPage.heading`
- `TicketsPage.general-name`
- `TicketsPage.vip-name`
- `TicketsPage.buy-button`
- `TicketsPage.sold-out`
- `TicketsPage.unavailable`

---

## Phase 5 — Ticket Card Components

Create the UI components for displaying the two ticket types. These should be **client
components** (`"use client"`) because the "Buy" button triggers the Ticket Tailor
popup widget, which calls a JavaScript function.

### 5.1 Ticket Card Component

Create `src/app/components/Tickets/TicketCard.tsx`.

Props:
```typescript
interface TicketCardProps {
  name: string;           // "General" or "VIP"
  priceCents: number;     // price in cents, e.g. 11500
  status: string;         // "on_sale" | "sold_out" | "unavailable"
  features: string[];     // list of included features
  isVip?: boolean;        // drives styling differences
  eventUrl: string;       // Ticket Tailor event URL for the popup
}
```

The component renders the ticket card and handles the "Buy" button click. When the
user clicks Buy:
- If `status` is `"sold_out"`, the button is disabled and shows "Sold Out"
- If `status` is `"unavailable"`, the button is disabled and shows "Not Yet Available"
- If `status` is `"on_sale"`, the button calls the Ticket Tailor popup function (see
  Phase 6 below)

Style the cards to match the existing Win95 aesthetic — the same border pattern
(`border-top: 2px solid #ffffff; border-left: 2px solid #ffffff; border-right: 2px
solid #2b2b2b; border-bottom: 2px solid #2b2b2b`) and Retropix font used throughout
the site. The VIP card can have a visual distinguisher (a "Popular" badge or gold
accent) similar to the 2026 design.

**Feature lists for each tier** (confirm with the team before finalizing, these are
based on the 2026 site):

General:
- Workshops, Sponsor-Hosted Talks and Social Events
- Access to all conference sessions
- Conference materials

VIP:
- Everything in General
- Priority Networking Sessions
- Exclusive CUSEC 2027 Merchandise

### 5.2 Price display

`priceCents` is an integer in cents (Ticket Tailor returns currency values this way,
per ISO 4217). Convert it to a human-readable string for display:

```typescript
const formatPrice = (cents: number): string =>
  `$${(cents / 100).toFixed(2)} CAD`;
```

This ensures prices from the API are always accurate — do not hardcode prices in the
UI. If Ticket Tailor prices change, the UI updates automatically.

---

## Phase 6 — Checkout Widget Integration (Popup Mode)

When the user clicks a "Buy" button on a ticket card, we open the Ticket Tailor
checkout as an overlay modal so the user never navigates away from `2027.cusec.net`.

Ticket Tailor supports this with a second widget script:

```
https://cdn.tickettailor.com/js/TTWidget.js
```

This script exposes a global `TTWidget.loadEvent()` function that opens a modal popup.

### 6.1 Load the Widget Script

In the tickets page layout (or in the `TicketCard` client component using a `useEffect`
with dynamic script injection), load the `TTWidget.js` script once per page:

```html
<script src="https://cdn.tickettailor.com/js/TTWidget.js"></script>
```

In a Next.js client component, use `useEffect` to inject this script tag into the
document if it is not already present, or use Next.js's `<Script>` component with
`strategy="lazyOnload"` on the tickets page.

### 6.2 Trigger the Modal

When the user clicks a "Buy" button, call:

```typescript
TTWidget.loadEvent(boxOfficeName, eventId, widgetType, customDomain);
```

Parameters:
- `boxOfficeName`: Your Ticket Tailor box office name (the slug in your box office URL)
- `eventId`: The numeric event ID from Phase 1.5
- `widgetType`: `"tt-wgt-popup"` for the modal mode
- `customDomain`: Your connected custom domain (`"2027.cusec.net"`) — required for the
  cookie/same-origin fix described in Phase 1.4

Because `TTWidget` is a global injected by the script, TypeScript won't know about it.
Declare it in a `.d.ts` file or cast with `(window as any).TTWidget.loadEvent(...)`.

### 6.3 Directing Users to a Specific Ticket Type

The standard popup opens the full Ticket Tailor event page (showing all ticket types).
As of the current API, there is no officially documented way to deep-link the popup
directly to a single ticket type. The widget will show all ticket types and the user
selects which one they want.

If this becomes a UX concern (users landing on the General card should see General
pre-selected), one workaround is to check whether Ticket Tailor supports URL parameters
on the event URL that pre-select a ticket type. This is worth testing once the event is
set up in the dashboard. If supported, pass a modified `eventUrl` with the ticket type
ID as a query parameter to `TTWidget.loadEvent()`.

### 6.4 Inline Widget Alternative

If the popup approach has issues (script load timing, accessibility, etc.), the inline
embed is a drop-in fallback. Add a section below the ticket cards with:

```html
<div class="tt-widget">
  <script
    src="https://cdn.tickettailor.com/js/widgets/min/widget.js"
    data-url="https://www.tickettailor.com/events/cusec/EVENT_ID"
    data-type="inline"
    data-inline-minimal="true"
    data-inline-show-logo="false"
    data-inline-bg-fill="false">
  </script>
</div>
```

This renders the full Ticket Tailor checkout inline on the page. It is less elegant
(the widget has Ticket Tailor's own styling that is hard to override) but is the
simplest possible path to working on-site checkout.

---

## Phase 7 — Navbar / Navigation Entry Point

Add a "Tickets" link to the splash page so users can get to `/tickets`. The current
Navbar (`src/app/components/Navbar/Navbar.tsx`) only has the locale switcher.

Two options:
1. **Add a Tickets button to the Navbar** — simple, always visible
2. **Add a CTA button inside the Win95 window** (`SplashPageUI`) — more thematic,
   keeps the current single-page feel

For (2), add a "Get Tickets" button alongside the existing sponsorship button in the
`SplashPageUI` component. This button links to `/tickets` using `Link` from
`src/i18n/navigation.ts` (never `next/link` directly).

Add the button label to `messages/en-CA.json` and `messages/fr-CA.json` under the
existing `SplashPage.*` namespace.

---

## Phase 8 — Splash Page Pricing Preview (Optional)

Optionally, on the main splash page, show the ticket tiers with pricing as a preview
(similar to 2026's Pricing section) without a full checkout widget. Each tier's "Buy"
button links to `/tickets` rather than to Ticket Tailor directly.

This is a nice-to-have and can be added once the `/tickets` page is complete.

---

## File Structure Summary

The following new files need to be created:

```
src/
  app/
    api/
      ticket-types/
        route.ts               ← fetches ticket types from Ticket Tailor API (server-side)
    [locale]/
      tickets/
        page.tsx               ← tickets route (server component, fetches data)
    components/
      Tickets/
        TicketCard.tsx         ← client component, renders one ticket tier
        TicketsSection.tsx     ← layout wrapper for General + VIP cards side by side
    styles/
      Tickets/
        TicketCard.css         ← styles for ticket cards (Win95 aesthetic)
messages/
  en-CA.json                   ← add TicketsPage.* keys
  fr-CA.json                   ← add TicketsPage.* keys
```

No new dependencies are required. The Ticket Tailor widget is loaded from their CDN
at runtime.

---

## Critical Gotchas

### Gotcha 1 — Custom Domain is Non-Negotiable

Without connecting `2027.cusec.net` as the custom domain in Ticket Tailor's dashboard,
the widget will redirect a significant portion of users (particularly those on Safari
and Firefox, which aggressively block third-party cookies) to a new tab on
tickettailor.com. This defeats the whole goal of on-site checkout. Do Phase 1.4 before
launch.

### Gotcha 2 — API Key Never in Client Code

`TICKET_TAILOR_API_KEY` must only appear in server-side code: the route handler or a
server component `fetch` call. If it is included in a client component, it will be
exposed in the JavaScript bundle. Use the `src/app/api/ticket-types/route.ts` approach
to keep it server-side.

### Gotcha 3 — Widget Styling is Limited

The Ticket Tailor checkout widget (the form inside the popup/inline embed) uses Ticket
Tailor's own CSS. You can control the surrounding page but not the form itself (ticket
selection, attendee info fields, credit card form). This is intentional — it keeps
payment UI under Ticket Tailor's PCI-compliant control. Do not attempt to override
widget CSS with `!important` hacks; it will break across Ticket Tailor updates.

What you can control: everything outside the widget — the ticket cards, the page
layout, the button that triggers the popup.

### Gotcha 4 — Prices Come from the API, Not Hardcoded

Hardcoding prices in the UI (as 2026 did: `$115 / Student`) means the site goes
out of sync if prices are updated in the Ticket Tailor dashboard. The 2027 implementation
should always render prices from the API response so there is a single source of truth.

### Gotcha 5 — Ticket Sale Windows

Ticket Tailor supports opening and closing ticket sales on a schedule. The API returns
a `status` field for each ticket type (`on_sale`, `sold_out`, `unavailable`). The UI
must handle all three states gracefully — disabled buttons with clear labels, not a
broken or confusing state.

### Gotcha 6 — TTWidget Global TypeScript

`TTWidget` is injected as a browser global by the CDN script. TypeScript will not know
it exists. Add a type declaration in `src/types/ticket-tailor.d.ts`:

```typescript
interface Window {
  TTWidget: {
    loadEvent: (
      boxOfficeName: string,
      eventId: string,
      widgetType: string,
      customDomain?: string
    ) => void;
  };
}
```

### Gotcha 7 — Script Loading Timing

The `TTWidget.loadEvent()` call will fail if the script has not yet loaded when the
user clicks "Buy." Use the script's `onload` event or check `window.TTWidget !== undefined`
before calling it. A `useEffect` that listens for the script load event before enabling
the button is the safe approach.

---

## Launch Checklist

Before shipping this feature to production:

- [ ] Ticket Tailor event is created with General and VIP ticket types
- [ ] Stripe is connected to the Ticket Tailor box office
- [ ] `2027.cusec.net` is added as the custom domain in Ticket Tailor (DNS propagated)
- [ ] API key is generated (read-only scope) and added to Vercel environment variables on both staging and production
- [ ] `NEXT_PUBLIC_TICKET_TAILOR_EVENT_URL` and `TICKET_TAILOR_EVENT_ID` are set
- [ ] Widget tested end-to-end on staging (buy a test ticket, confirm email arrives)
- [ ] Sold-out and unavailable states tested (manually set a ticket type to sold-out in the dashboard and verify the UI reflects it)
- [ ] Mobile layout verified (widget is responsive but confirm the popup looks correct on phones)
- [ ] French translations added for all new `TicketsPage.*` strings

---

## References

- [Ticket Tailor API Documentation](https://developers.tickettailor.com/docs/api/ticket-tailor-api/)
- [How to connect to the Ticket Tailor API](https://help.tickettailor.com/en/articles/4593218-how-do-i-connect-to-the-ticket-tailor-api)
- [Embed a widget for one event](https://help.tickettailor.com/en/articles/10354160-how-to-embed-a-widget-for-one-event)
- [Pop-out checkout from your website](https://help.tickettailor.com/en/articles/6354611-can-i-add-my-event-checkout-as-a-pop-out-from-my-website)
- [Widget + custom domain tips](https://help.tickettailor.com/en/articles/9361210-top-tips-for-using-a-widget-and-a-custom-domain)
- [How to use Stripe for payment processing](https://help.tickettailor.com/en/articles/950956-how-to-use-stripe-for-payment-processing)
- [Send customer data to your widget](https://help.tickettailor.com/en/articles/9859154-how-to-send-customer-data-to-your-widget)

---

## Appendix A — MVP Status & What Ticket Tailor Setup Is Still Needed

An MVP of this plan is implemented and testable today with **zero external
account and zero cost**:

| File | Purpose |
|---|---|
| `src/lib/ticketTailor.ts` | `getTicketTypes()` — calls the real Ticket Tailor API when credentials are set; otherwise returns mock `General`/`VIP` tickets at **$0.00** so the page works with no account at all. Also `getTicketWidgetConfig()` and the webhook helpers (Appendix B). |
| `src/app/api/ticket-types/route.ts` | Thin route wrapper, edge-cached 5 min. |
| `src/app/[locale]/tickets/page.tsx` | The `/tickets` page (server component). |
| `src/app/components/Tickets/{TicketCard,TicketsSection}.tsx` | Win95-styled cards + popup checkout trigger; handles sold-out / unavailable / not-configured states. |
| `src/types/ticket-tailor.d.ts` | `window.TTWidget` type declaration (Gotcha 6). |
| `src/app/styles/Tickets/TicketCard.css` | Styles, imported via `src/app/styles/index.css`. |
| `messages/{en-CA,fr-CA}.json` | `TicketsPage.*` namespace. |
| A "Get Tickets" button was added to the splash page CTA row, linking to `/tickets`. |

**Test it right now:** `npm run dev` → `http://localhost:3000/tickets`. No
credentials needed — you'll see the mock-data banner and two $0.00 ticket
cards.

### What only an account admin can do (Phase 1 of this doc)

I cannot create these myself — they require Ticket Tailor dashboard access:

1. **Create the event** with `General` and `VIP` ticket types, both priced
   **$0.00** for now (test mode — no Stripe needed to test the page/API; Stripe
   is still needed before the popup checkout can actually complete an order,
   confirm this when you get there).
2. Note the **Event ID** (numeric, from the event URL) and the **box office
   name** (the slug in your box office URL, e.g. `cusec` in
   `tickettailor.com/events/cusec/12345`).
3. **API key**: Box Office Settings → API → generate, **read-only** scope.
4. Paste into `.env.local` (placeholders already there, commented out):
   ```bash
   TICKET_TAILOR_API_KEY=sk_...
   TICKET_TAILOR_EVENT_ID=12345
   TICKET_TAILOR_BOX_OFFICE_NAME=cusec
   ```
   Leave `TICKET_TAILOR_CUSTOM_DOMAIN` empty until the DNS/custom-domain step
   (Phase 1.4) is done — not required for local testing, but required before
   real launch per Gotcha 1.
5. Restart `npm run dev`. The page will now show live data and the "Buy"
   button will open the real Ticket Tailor popup.

---

## Appendix B — Phase 9: Webhook → `RegisteredUser` (Scavenger Hunt Link)

**Why this exists:** the scavenger hunt's `/api/users/link-email` route (see
`SCAVENGER_SETUP.md` and `AGENTS.md`) only lets a logged-in Auth0 user link an
email that already exists in the `RegisteredUser` Mongo collection — that
collection is the "you have a valid ticket" allowlist. Previously this had to
be populated by hand (e.g. a CSV import). This webhook automates it: **the
moment someone buys a ticket, their email is added to `RegisteredUser`**, so
they can immediately link it when they log into `/scavenger`.

### How it fits the existing flow — nothing else changes

```
Ticket Tailor order.created webhook
      │
      ▼
POST /api/ticket-tailor/webhook
      │  verify signature, extract buyer email
      ▼
RegisteredUser upsert: { linkedEmail, name, isLinked: false }
      │
      ▼
User logs into /scavenger (Auth0) → onboarding Screen 1 (EmailLinkScreen)
      │
      ▼
POST /api/users/link-email  (unchanged — checks RegisteredUser, sets isLinked: true)
      │
      ▼
Dashboard unlocked
```

The webhook **only ever pre-seeds the allowlist**. It never creates a `User`
document, never sets `isLinked: true`, never touches `hasSeenIntro` or the
onboarding gate. Linking is still a deliberate action the attendee takes
inside the existing onboarding flow — this doc's changes are purely upstream
of that, and the onboarding gate logic in `src/app/[locale]/scavenger/page.tsx`
needs no changes.

**Safety guarantees (important since this touches the hunt's trust boundary):**
- If `TICKET_TAILOR_WEBHOOK_SECRET` is unset, the route returns `503` and does
  nothing — it never processes an unverified request.
- Every request's HMAC signature is verified before the body is trusted (see
  below). An unsigned or wrongly-signed request is rejected with `401` and
  never reaches the database.
- If a `RegisteredUser` for that email already exists, the webhook **never**
  overwrites `isLinked` — it only fills in `name` if that record didn't have
  one yet. A record that's already linked can't be un-linked or reset by a
  webhook replay.
- Duplicate/retried deliveries for the same email are idempotent (upsert on
  the unique `linkedEmail` index; a `11000` duplicate-key race is caught and
  treated as success).

### New file

`src/app/api/ticket-tailor/webhook/route.ts` — verifies the signature, checks
`event === "order.created"`, extracts the buyer's email/name, upserts into
`RegisteredUser`. Excluded from `proxy.ts` automatically (the matcher already
skips all `/api/*` paths), so it needs no changes there.

### New env var

```bash
# Signs the order.created webhook that links ticket buyers into RegisteredUser.
TICKET_TAILOR_WEBHOOK_SECRET=
```

### Dashboard setup (admin-only, do this alongside Phase 1)

1. Ticket Tailor dashboard → **Settings → API → Webhooks**.
2. Add a webhook: URL = `https://2027.cusec.net/api/ticket-tailor/webhook`
   (or your staging URL + the same path), event = **Order Created**
   (`order.created`).
3. Copy the **signing secret** it shows you into `TICKET_TAILOR_WEBHOOK_SECRET`
   on Vercel (staging + production) — this is a real secret, not a
   `NEXT_PUBLIC_` value.
4. Ticket Tailor's dashboard has a **"Send test webhook"** button — use it
   once configured, then check the `RegisteredUser` collection for a new
   document and check your server logs for anything printed by the "no
   parseable buyer email" warning (see caveat below).

### ⚠️ One thing to verify before trusting this in production

Ticket Tailor's public docs site renders its JSON payload examples client-side
(not visible to static fetching), so the **exact field names Ticket Tailor
uses for buyer email/name inside the order payload are not 100% confirmed** —
`src/lib/ticketTailor.ts`'s `extractPurchaser()` reads several plausible paths
(`payload.email`, `payload.buyer_email`, `payload.buyer_details.email`, etc.)
defensively, and logs the raw payload server-side if none of them match. What
**is** fully confirmed and correctly implemented: the webhook envelope shape
(`{ id, created_at, event, resource_url, payload }`), the event name
(`order.created`), and the signature scheme (HMAC-SHA256 of
`timestamp + rawBody`, header `Tickettailor-Webhook-Signature`, 5-minute
replay tolerance) — that part is spec-accurate, not guessed.

**Before relying on this for real ticket sales:** trigger one real test
delivery (the dashboard's "Send test webhook", or a real $0 purchase), check
whether a `RegisteredUser` document was created with the right email, and if
not, share the logged raw payload so `extractPurchaser()` can be corrected to
the real field names in one small edit.

### Local testing (no Ticket Tailor account needed)

`scripts/test-ticket-webhook.mjs` signs and sends a fake `order.created`
delivery to a local dev server, exercising the full route (signature check +
Mongo upsert) without any external dependency:

```bash
# 1. Set any throwaway value for TICKET_TAILOR_WEBHOOK_SECRET in .env.local
#    (it only needs to match what you pass below — it does not need to be a
#    real Ticket Tailor secret for this local test)

# 2. In one terminal
npm run dev

# 3. In another terminal (bash)
TICKET_TAILOR_WEBHOOK_SECRET=<same value as .env.local> node scripts/test-ticket-webhook.mjs someone@example.com "Some Name"

# PowerShell
$env:TICKET_TAILOR_WEBHOOK_SECRET="<same value as .env.local>"; node scripts/test-ticket-webhook.mjs someone@example.com "Some Name"
```

Verified working (2026-07-12): the route correctly returns `503` with no
secret configured, `401` on a wrong/invalid signature, `200` and creates a
`RegisteredUser` document on a valid delivery, and `200` with no duplicate or
error on a repeated delivery for the same email.
