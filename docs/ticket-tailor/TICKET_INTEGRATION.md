# Ticket Tailor Integration — Current State

Supersedes the old root-level `TICKET_INTEGRATION.md`. That doc described the
initial MVP (a single `/tickets` page with two "Buy" buttons). This one
describes what's actually built now: a 4-step account/demographics/avatar/
purchase wizard, plus everything learned by testing against a real Ticket
Tailor event. See `ticket-tailor-flow.png` in this folder for the target flow
diagram this was built against.

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

/tickets/demographics        ~25-field confidential survey -> DemographicInfo collection
/tickets/avatar              Existing placeholder AvatarCustomize component, reused as-is
/tickets/purchase            Existing TicketCard/TicketsSection + TTWidget popup checkout
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

**Auto-link on purchase.** Completing the demographics step immediately sets
`User.hasSeenIntro = true`, which guarantees the legacy scavenger-hunt
onboarding (email-link screen + personality quiz) never shows for a wizard
user, at any point they might abandon the flow. Separately, the Ticket
Tailor webhook (`order.created`) now also matches the buyer's email against
`User.email` and auto-sets `linked_email` + `RegisteredUser.isLinked` —
skipping the manual "link your email" step entirely when the purchase email
matches the account email. The manual `/api/users/link-email` flow still
exists as a fallback if it doesn't match.

## New/changed files

| File | Purpose |
|---|---|
| `src/lib/models.ts` | New `DemographicInfo` model (own collection, ref'd to `User` — kept separate from hunt data for confidentiality). New `ticketWizard` progress subdocument on `userSchema`. |
| `src/lib/ticketWizard.ts` | `getWizardStatus(email)` — derives step completion from real data. |
| `src/lib/ticketWizardOptions.ts` | Client-safe form option lists (t-shirt sizes, degree levels, etc.). Kept separate from `ticketWizard.ts` because that file imports Mongoose and can't be imported into client components. |
| `src/app/api/demographics/route.ts` | GET/PUT the caller's own survey answers. |
| `src/app/api/ticket-wizard/{progress,status}/route.ts` | Mark avatar step done; poll wizard status from the purchase page. |
| `src/app/api/ticket-tailor/webhook/route.ts` | Extended (not replaced) — now also auto-links `User`/`RegisteredUser` on a matching purchase. |
| `src/app/[locale]/tickets/page.tsx` + `(wizard)/{demographics,avatar,purchase}/page.tsx` | The wizard routes. |
| `src/app/components/TicketWizard/*` | `WizardStepNav`, `DemographicsForm`, `AvatarStepClient`, `PurchaseStepClient`. |
| `src/lib/ticketTailor.ts` | Fixed — see "Ticket Tailor API gotchas" below. |

## Environment variables

Unchanged names from the original doc, but two had wrong values discovered
during testing (see gotchas):

```bash
TICKET_TAILOR_API_KEY=sk_...
TICKET_TAILOR_EVENT_ID=            # the PUBLIC id, e.g. 2329159 (see below — do not use the internal ev_ id here)
TICKET_TAILOR_BOX_OFFICE_NAME=     # the URL slug, e.g. "cusec" — NOT the display name
TICKET_TAILOR_CUSTOM_DOMAIN=       # leave truly blank until a custom domain is connected
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
   (shown in checkout/box office URLs, e.g. `buytickets.at/cusec/2329159`,
   and what `TTWidget.loadEvent()` needs) belongs to the **event series**
   resource — Ticket Tailor wraps every event in a series, even a one-off.
   The internal single-**event-occurrence** id (`ev_8760377`) is a different
   number, only used server-side. `getTicketTypes()` now fetches
   `GET /v1/event_series/es_{id}` (reading `default_ticket_types`) first,
   falling back to `GET /v1/events/ev_{id}` (reading `ticket_types`) for box
   offices not using series. **`TICKET_TAILOR_EVENT_ID` must be the public
   id** — using the internal occurrence id breaks the widget popup with
   "This page is not available right now."
3. **`TICKET_TAILOR_BOX_OFFICE_NAME` is the URL slug**, not the display
   name — e.g. `cusec`, not `"Canadian University Software Engineering
   Conference"`. Using the display name breaks the widget popup silently.
4. **Available quantity is the `quantity` field**, not `quantity_available`
   (that field doesn't exist on the real payload). `quantity_total` is the
   original capacity.
5. **An empty-string env var is not the same as unset.** `getTicketWidgetConfig()`
   used `??` (nullish coalescing), which doesn't catch `""` — so
   `TICKET_TAILOR_CUSTOM_DOMAIN=` (present but blank, which is correct until
   a custom domain is connected) was passed to the widget as an empty
   string instead of `null`, causing a DNS resolution error in the popup.
   Fixed by switching to `||`.

## Testing against a real event

1. Create a free/$0 test event in the Ticket Tailor dashboard.
2. Fill in the four `TICKET_TAILOR_*` vars per the rules above — the public
   id/slug from the checkout URL, not any internal id.
3. `npm run dev` → `/tickets/purchase` should show `source: "live"` in
   `/api/ticket-types` and the real ticket name/price/quantity.
4. Click Buy — the Ticket Tailor popup should open in place, not redirect
   off-site, and not show a DNS or "page not available" error.
5. For the webhook/auto-link path: see `scripts/test-ticket-webhook.mjs` for
   local testing without a real purchase, or use Ticket Tailor's dashboard
   "Send test webhook" button once a webhook is registered pointing at
   `/api/ticket-tailor/webhook`.

## Known open items

- **"Pick 3 events" option list is a placeholder** (`EXCITED_EVENT_OPTIONS`
  in `src/lib/ticketWizardOptions.ts`) — the real conference schedule
  doesn't exist yet.
- **Custom domain not connected.** Until `2027.cusec.net` is added in Ticket
  Tailor's dashboard, some users (Safari/Firefox, third-party-cookie
  blocking) will still get redirected to a new tab during checkout. Not a
  code issue — this is Ticket Tailor dashboard setup, tracked as a launch
  blocker.
- **Ticket Tailor webhook payload shape for `extractPurchaser()`** is still
  based on best-effort field-name guessing (unconfirmed against a real
  payload) — verify once a real (or `$0` test) purchase fires the webhook.
- **HD bulk-purchase flow** is not built — out of scope per the flow
  diagram's own unresolved note about mapping shared ticket codes to
  students.
