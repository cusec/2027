# Ticket Tailor Integration — Current State

Supersedes the old root-level `TICKET_INTEGRATION.md`. That doc described the
initial MVP (a single `/tickets` page with two "Buy" buttons). This one
describes what's actually built now: a 4-step account/demographics/avatar/
purchase wizard, plus everything learned by testing against a real Ticket
Tailor event. See `ticket-tailor-flow.png` in this folder for the target flow
diagram this was built against.

> **Setting this up?** `REQUIRED.md` in this folder is the human checklist —
> custom domain, DNS, webhook registration, env vars. This doc is the
> technical/architectural reference, and `KNOWN_ISSUES.md` tracks unverified
> assumptions and known weak spots.

---

## What this is

Two ticket-purchase flows exist in the flow diagram:

1. **General/individual purchase** (this doc, fully implemented) — a person
   buys their own ticket through `2027.cusec.net`.
2. **HD bulk purchase** (out of scope, not implemented) — Head Delegates buy
   tickets in bulk directly on Ticket Tailor first, then distribute codes to
   students. The diagram flags this as still needing a code/email mapping
   solution — not addressed here.

## The wizard (flow #1)

```
/tickets                    Public marketing page + resolver.
                             Logged out -> "Sign Up" (Auth0, screen_hint=signup)
                             Logged in  -> redirects to whichever step is incomplete

/tickets/demographics        Short confidential survey, split into 3 sub-steps
                             (localStorage draft; saved to DemographicInfo on submit)
                             Shows the "already have a ticket" modal instead if
                             this account already holds one.
/tickets/avatar              Existing placeholder AvatarCustomize component, reused as-is
/tickets/purchase            TicketCard/TicketsSection + checkout in an on-page modal
```

Each step is a real sub-route (not client-only state), so a user who closes
the tab mid-purchase resumes exactly where they left off next visit —
progress is derived from real data (does a `DemographicInfo` doc exist? is
`ticketWizard.avatarCompletedAt` set? is `linked_email` verified?), not from a
trusted client-side flag.

**Account creation = Auth0 signup.** No parallel auth system was built — step
1 is just `/auth/login?screen_hint=signup`, and `findOrCreateUser` (the same
helper the scavenger hunt already uses) creates the `User` doc. This means a
wizard user's Auth0 account **is** their account from step 1 onward.

**What the survey does NOT ask.** Ticket Tailor's own checkout already
collects first name, last name, email, student email, university, expected
graduation and degree. Asking again was the single biggest source of friction
in the flow, so those six are deliberately absent from `DemographicInfo` — read
them from the Ticket Tailor order or CSV export, not from Mongo. If TT's
checkout questions change, this list is what has to change with it.

**Student / professional split.** `attendeeType` picks which short branch the
survey shows: students get field of study + head delegate, professionals get
company + job title. This replaced a free-text "current affiliation" field that
just restated whichever the attendee was, duplicating the school info we
already had.

**Previously attended** is a yes/no question plus a single year (2003-2026,
`ATTENDED_YEAR_OPTIONS`), not the old checkbox grid. The year is cleared
server-side and client-side whenever the answer is "no", so a stale value can
never be stored.

**Accommodation was removed.** Delegates are booked a room automatically, so
asking whether they wanted one collected an answer nobody acted on.

**One ticket per account.** If `getWizardStatus().purchaseComplete` is true,
`/tickets/demographics` renders `AlreadyTicketedModal` instead of the form —
naming the account, offering a logout link, and pointing at the dashboard.
Before this, a ticketed user re-entering the wizard saw an empty form over
their saved answers, which read as data loss and would have overwritten them
on submit.

**Auto-link on purchase.** Completing the demographics step immediately sets
`User.hasSeenIntro = true`, which guarantees the legacy scavenger-hunt
onboarding (email-link screen + personality quiz) never shows for a wizard
user, at any point they might abandon the flow. Separately, the Ticket
Tailor webhook (`order.created`) now also matches the buyer's email against
`User.email` and auto-sets `linked_email` + `RegisteredUser.isLinked` —
skipping the manual "link your email" step entirely when the purchase email
matches the account email. The manual `/api/users/link-email` flow still
exists as a fallback if it doesn't match.

## The purchase step (how checkout actually renders)

`/tickets/purchase` shows the ticket cards (live name/price/availability from
the API, with the perk list) up front. Clicking **Buy** opens a Win95-styled
modal containing the Ticket Tailor checkout in an iframe — the user never
leaves the page.

**We render that iframe ourselves rather than using Ticket Tailor's
`widget.js`.** Their script replaces itself with an iframe-resizer frame that
has `scrolling="no"` and depends on a cross-origin height handshake; when the
handshake doesn't land, the frame sits at its initial size with scrolling
disabled — i.e. a checkout that's visibly cut off and can't be interacted
with. Owning the iframe means we control its size and keep it scrollable.
`getTicketWidgetConfig()` exposes `checkoutEmbedUrl`, which is just the
public event URL plus the same query params `widget.js` appends
(`?widget=true&minimal=true&show_logo=false&bg_fill=false`), so the embed
renders identically without the script.

### ⚠️ In-page checkout REQUIRES a custom domain (and never works on localhost)

The embedded checkout needs to set session cookies. Served from
`tickettailor.com` inside a page on another domain, those cookies are
**third-party** and every modern browser blocks them — so Ticket Tailor
detects it can't hold a session and deliberately shows *"Checkout has opened
in a new tab or window"* rather than failing mid-payment. This is a browser
security boundary; no iframe/CSS/code change can defeat it.

The only real fix is Ticket Tailor's **custom domain** feature: point a
subdomain that shares this site's registrable domain
(`tickets.cusec.net`, same `cusec.net` as the site) at Ticket Tailor via
CNAME, then set `TICKET_TAILOR_CUSTOM_DOMAIN`. `getTicketWidgetConfig()`
builds the embed URL from that host, making the cookies first-party and
letting checkout complete inline.

Consequences to plan around:

- **It can never work on localhost** — `localhost` can't share a registrable
  domain with the Ticket Tailor host. Verify in-page checkout on a deployed
  environment only.
- **Until the custom domain is live**, the modal shows a "open checkout in a
  new tab" link. Status polling continues while the modal is open, so a
  purchase completed in the new tab still advances the wizard automatically —
  the flow is completable today, just not fully in-page.
- The custom-domain URL path (`/events/{slug}/{id}`) is assumed to mirror the
  canonical one; confirm on first connection.

### From payment to dashboard

A cross-origin iframe gives no "payment succeeded" callback, so completion is
only ever established server-side. Four independent things have to fail before
a delegate can pay and not get in:

1. **Pre-fill.** The checkout's email field is pre-filled with the delegate's
   CUSEC account email (`&preset_data=1#p[email]=...`, which Ticket Tailor only
   honours on a custom domain). Every automatic link matches an order to an
   account by that address, so pre-filling it is what makes the rest work by
   default rather than by luck.
2. **Webhook.** `order.created` links the account as it always did.
3. **Reconciliation.** The page polls `/api/ticket-wizard/status`; once
   checkout has actually been opened it passes `?reconcile=1`, which asks
   Ticket Tailor's API directly whether that email has a completed order. This
   is what covers an unregistered/late/failed webhook, and a purchase finished
   in a new tab. Cadence follows what the page is doing - 12s idle, 4s with
   checkout open, 1.5s for 90s after checkout closes - and a hidden tab stops
   polling and catches up when it regains focus.
4. **Manual claim.** If the delegate edited the email at checkout, none of the
   above can match. After the 90s burst the page offers *"I checked out with a
   different email"*, and `POST /api/ticket-wizard/claim` links that address to
   the signed-in account - but only after asking Ticket Tailor for a
   **completed** order against the configured event, and only if no other
   account already owns it.

On confirmation the page calls `router.refresh()` (so `/scavenger` re-renders
with the ticket attached rather than the unlinked onboarding screen) and then
routes to the dashboard. The Auth0 session was created back at step one, so
there is no second sign-in.

**Same tab, always.** Where the embed is allowed (a `cusec.net` host) checkout
runs inside the modal. Where it is refused, the page navigates the current tab
to `checkoutPageUrl` - the same event URL and pre-fill without the widget
chrome - rather than opening a second tab. Coming back is handled by Ticket
Tailor's redirect setting (`REQUIRED.md` 2b) or, failing that, by a
sessionStorage resume flag that survives a back-button return; either way the
page starts looking for the order the moment it mounts.

**Did the iframe work?** `tt-checkout-ready` is expected within 8s of opening
the modal. If it never arrives the status line says checkout could not load in
this window and surfaces the new-tab link; if it does arrive, that escape hatch
stays hidden. See `KNOWN_ISSUES.md` B1a for the full message contract, and for
why the embedded event page needs its parent to walk it to checkout.

Cards matching a completed purchase render as disabled **"Purchased"**.

## New/changed files

| File | Purpose |
|---|---|
| `src/lib/models.ts` | New `DemographicInfo` model (own collection, ref'd to `User` — kept separate from hunt data for confidentiality). New `ticketWizard` progress subdocument on `userSchema`. |
| `src/lib/ticketWizard.ts` | `getWizardStatus(email)` — derives step completion from real data. |
| `src/lib/ticketWizardOptions.ts` | Client-safe form option lists (t-shirt sizes, degree levels, etc.). Kept separate from `ticketWizard.ts` because that file imports Mongoose and can't be imported into client components. |
| `src/app/api/demographics/route.ts` | GET/PUT the caller's own survey answers. |
| `src/lib/ticketWizardOptions.ts` | Client-safe option lists (t-shirt, attendee type, head delegate, yes/no, attended years 2003-2026, excited events). Kept in sync by hand with the enums in `models.ts`. |
| `src/app/api/ticket-wizard/{progress,status}/route.ts` | Mark avatar step done; poll wizard status from the purchase page. `status` reconciles against Ticket Tailor's API only when asked with `?reconcile=1`, so an idle poll stays a database read. |
| `src/app/api/ticket-wizard/claim/route.ts` | Manual claim for a purchase made under a different email than the account's. |
| `src/app/api/ticket-tailor/webhook/route.ts` | Extended (not replaced) — now also auto-links `User`/`RegisteredUser` on a matching purchase. |
| `src/app/[locale]/tickets/page.tsx` + `(wizard)/{demographics,avatar,purchase}/page.tsx` | The wizard routes. |
| `src/app/components/TicketWizard/*` | `WizardStepNav`, `DemographicsForm`, `AlreadyTicketedModal`, `AvatarStepClient`, `PurchaseStepClient`. |
| `src/lib/ticketTailor.ts` | Fixed — see "Ticket Tailor API gotchas" below. |

## Environment variables

Unchanged names from the original doc, but two had wrong values discovered
during testing (see gotchas):

```bash
TICKET_TAILOR_API_KEY=sk_...
TICKET_TAILOR_EVENT_ID=            # the PUBLIC id, e.g. 2329159 (see below — do not use the internal ev_ id here)
TICKET_TAILOR_BOX_OFFICE_NAME=     # the URL slug, e.g. "cusec" — NOT the display name
TICKET_TAILOR_CUSTOM_DOMAIN=       # tickets.cusec.net — REQUIRED for in-page checkout AND for checkout pre-fill; blank = checkout opens in a new tab
TICKET_TAILOR_WIDGET_URL=          # optional — overrides the built event URL with the dashboard's own widget data-url
TICKET_TAILOR_WEBHOOK_SECRET=
```

Leave `TICKET_TAILOR_API_KEY`/`TICKET_TAILOR_EVENT_ID` unset to render mock
$0 tickets with no external account — unchanged from before.

## Ticket Tailor API gotchas (discovered testing against a real event)

These were wrong assumptions in the original doc/implementation, found by
calling the real API directly:

1. **`GET /v1/events/{id}/ticket_types` doesn't exist.** It 404s. Ticket
   types are embedded directly on the parent resource (`ticket_types` on an
   event, `default_ticket_types` on an event series) — there's no separate
   sub-resource endpoint.
2. **Two different "Event ID"s exist for the same event.** The public one
   (shown in checkout/box office URLs, e.g. `buytickets.at/cusec/2329159`)
   belongs to the **event series** resource — Ticket Tailor wraps every event
   in a series, even a one-off. The internal single-**event-occurrence** id
   (`ev_8760377`) is a different number, only used server-side.
   `getTicketTypes()` now fetches `GET /v1/event_series/es_{id}` (reading
   `default_ticket_types`) first, falling back to `GET /v1/events/ev_{id}`
   (reading `ticket_types`) for box offices not using series.
   **`TICKET_TAILOR_EVENT_ID` must be the public id** — using the internal
   occurrence id yields "This page is not available right now."
   Note the API endpoints require the prefixed form (`es_`/`ev_`); the bare
   number 404s, so the code adds the prefix itself.
3. **`TICKET_TAILOR_BOX_OFFICE_NAME` is the URL slug**, not the display
   name — e.g. `cusec`, not `"Canadian University Software Engineering
   Conference"`. Using the display name breaks checkout silently.
4. **Available quantity is the `quantity` field**, not `quantity_available`
   (that field doesn't exist on the real payload). `quantity_total` is the
   original capacity.
5. **An empty-string env var is not the same as unset.** `getTicketWidgetConfig()`
   used `??` (nullish coalescing), which doesn't catch `""` — so
   `TICKET_TAILOR_CUSTOM_DOMAIN=` (present but blank, which is correct until
   a custom domain is connected) was passed through as an empty string
   instead of `null`, causing a DNS resolution error. Fixed by switching
   to `||`.
6. **Two public URL forms; use the canonical one.** The API reports an event
   series' `url` as `buytickets.at/{slug}/{id}`, but that **301-redirects**
   to `www.tickettailor.com/events/{slug}/{id}`. Both work; the code builds
   the canonical `tickettailor.com` form so the iframe doesn't take a
   redirect hop on every open.
7. **`widget.js` matches its container class with strict equality.** It finds
   its render target via `element.parentNode.className === 'tt-widget'` — so
   `class="tt-widget my-styles"` makes it silently render nothing. (Moot now
   that we render the iframe directly, but worth knowing if the script is
   ever reintroduced: the styling must live on an ancestor, and the script
   tag must be a real child of the exactly-classed div, which also rules out
   `next/script`, whose load strategies relocate the tag to `<body>`.)
8. **A raw JSX `<script>` tag never executes.** React deliberately renders
   script tags inert on the client. Third-party embed scripts have to be
   injected imperatively (`document.createElement`) or via `next/script` —
   though see the caveat in (7).

## Order payload shape (confirmed via `GET /v1/orders`)

The webhook's `order.created` payload was previously guessed at. Reading real
orders from the API confirmed the fields both helpers in
`src/lib/ticketTailor.ts` rely on:

- `buyer_details.{email,first_name,last_name,name}` → `extractPurchaser()`
  (the other paths it checks are now just defensive fallbacks).
- `line_items[].item_id` (ticket type id) and `line_items[].description`
  (display name) → `extractPurchasedTicket()`, stored on the user as
  `ticketWizard.purchasedTicketTypeId` / `purchasedTicketName`. Only the
  first line item is read.

## Testing against a real event

1. Create a free/$0 test event in the Ticket Tailor dashboard.
2. Fill in the four `TICKET_TAILOR_*` vars per the rules above — the public
   id/slug from the checkout URL, not any internal id.
3. `npm run dev` → `/tickets/purchase` should show `source: "live"` in
   `/api/ticket-types` and the real ticket name/price/quantity.
4. Click Buy — the checkout modal opens in place and the embedded checkout
   should be scrollable and clickable. **Note:** it will say "Checkout has
   opened in a new tab" at the payment step unless a custom domain is
   configured *and* you're testing on a deployed environment (not localhost)
   — see the ⚠️ section above. That's expected, not a regression.
5. For the webhook/auto-link path: see `scripts/test-ticket-webhook.mjs` for
   local testing without a real purchase, or use Ticket Tailor's dashboard
   "Send test webhook" button once a webhook is registered pointing at
   `/api/ticket-tailor/webhook`.

## Known open items

- **"Pick 3 events" option list is a placeholder** (`EXCITED_EVENT_OPTIONS`
  in `src/lib/ticketWizardOptions.ts`) — the real conference schedule
  doesn't exist yet.
- **Custom domain is connected** (`tickets.cusec.net`, Active, path verified).
  What remains is setting `TICKET_TAILOR_CUSTOM_DOMAIN=tickets.cusec.net` in
  Vercel and `.env.local` — until then the code still builds the embed against
  `www.tickettailor.com` and checkout bounces to a new tab.
- **Purchased-card matching is name-based.** `TicketsSection` marks a card
  "Purchased" by comparing the webhook's `line_items[].description` to the
  ticket type's name. Ticket Tailor sometimes prefixes descriptions (real
  orders show e.g. `"UManitoba Tickets - UManitoba General Admission"`), so
  if this ever mismatches, switch to comparing the already-stored
  `ticketWizard.purchasedTicketTypeId` against the ticket's `id`.
- **The webhook auto-link path hasn't been exercised end-to-end yet** — the
  order payload field names are confirmed (see below), but a real purchase
  → webhook → auto-link → confirmation round trip still needs one live run.
- **HD bulk-purchase flow** is not built — out of scope per the flow
  diagram's own unresolved note about mapping shared ticket codes to
  students.
