# Required Setup - Ticket Tailor

Things **you** have to do outside the codebase before ticket purchasing fully
works. The code is done and waiting on these.

Ordered by priority. Item 1 is the only thing blocking in-page checkout.

> Hitting something unexpected? `KNOWN_ISSUES.md` lists the unverified
> assumptions and known weak spots in this integration.

---

## 1. Custom domain (blocks in-page checkout)

**The problem it solves:** the checkout is embedded in an iframe served by
Ticket Tailor. Browsers treat its session cookies as *third-party* and block
them, so Ticket Tailor refuses to run checkout inline and shows *"Checkout
has opened in a new tab or window."* This is a browser security rule - it
cannot be fixed in code.

The fix is to serve checkout from a subdomain of **our own** domain, so the
cookies become first-party.

### Steps

1. **Ticket Tailor dashboard** → Box Office Settings → Custom Domain.
   Enter a subdomain of `cusec.net` - e.g. `tickets.2027.cusec.net`.
   > It **must** be under `cusec.net`, the same registrable domain as the
   > site. A domain like `cusec-tickets.com` will not work - it'd still be
   > third-party.
2. Ticket Tailor then shows you the DNS record(s) to create - **always a
   CNAME, and possibly one or more TXT records** for domain verification.
   Their dashboard may list up to 3; if you only see 2, the missing TXT is
   already verified and can be ignored. Copy the values **exactly** as shown
   - don't copy any example from this doc.

3. Add those records wherever `cusec.net`'s DNS is managed (Cloudflare,
   Namecheap, GoDaddy, etc.). If you don't have access, this is the step to
   hand to whoever administers the CUSEC domain.

   Notes that trip people up:
   - **Name/Host field:** per Ticket Tailor, *most* hosts want the **full**
     record (`tickets.2027.cusec.net`), but *some* auto-append the domain and
     want only the subdomain part (`tickets.2027`). Check your registrar's
     convention - getting it wrong the second way produces
     `tickets.2027.cusec.net.cusec.net`.
   - A CNAME can't coexist with other records on the same name, and can't be
     used on the root domain - another reason to use a subdomain.
   - Leave TTL on automatic/default.
   - **If DNS is on Cloudflare** (general DNS advice, not something Ticket
     Tailor documents): set the record to **DNS only** (grey cloud, not
     orange). Proxying a hostname whose certificate is issued by a third
     party commonly breaks their validation. If TT's docs or support say
     otherwise, follow them.

4. Verify the records resolve before going back to Ticket Tailor. Ticket
   Tailor recommends pasting the values into a lookup tool like
   [MX Toolbox](https://mxtoolbox.com/) and selecting CNAME or TXT to confirm
   they match the dashboard. From a terminal:
   ```bash
   nslookup tickets.2027.cusec.net
   # or
   dig +short tickets.2027.cusec.net CNAME
   ```
   Nothing returned = not propagated yet, or a typo in the record.

5. Back in the Ticket Tailor dashboard, confirm the Custom Domain section
   shows status **Active**. Timings per their docs: up to **1 hour** to
   activate (usually much faster), and up to **24 hours** for DNS to
   propagate globally.

   > If loading the box office on the custom domain shows **"This page is
   > not available right now"**, that's typically DNS still verifying - wait
   > it out. (Same message also appears if the event ID/slug is wrong, so
   > double-check those if it persists.) Still stuck after propagation?
   > Ticket Tailor asks you to email **hi@tickettailor.com** with a
   > screenshot of the records in your DNS provider.
6. Set the env var in **Vercel** (both Production and any Preview env you
   test on):
   ```
   TICKET_TAILOR_CUSTOM_DOMAIN=tickets.2027.cusec.net
   ```
   Hostname only - no `https://`, no trailing slash. Redeploy after setting.

### Verify

Open `/tickets/purchase` on the deployed site, click Buy, add a ticket, click
through to payment. You should reach the card/payment step **inside the
modal**, with no "opened in a new tab" message.

> **One thing to confirm on first connection:** the code builds the checkout
> URL as `https://{custom-domain}/events/{box-office-slug}/{event-id}`. Their
> docs don't state the path format used on custom domains, so this is an
> assumption. Once the domain is Active, just open your box office on it and
> see what the real event URL looks like - if it differs (e.g. drops the
> slug), it's a one-line change in `getTicketWidgetConfig()` in
> `src/lib/ticketTailor.ts`.

### Sources

- [How can I add my custom domain to my box office?](https://help.tickettailor.com/en/articles/6758421-how-can-i-add-my-custom-domain-to-my-box-office)
- [Troubleshooting your custom domain setup](https://help.tickettailor.com/en/articles/8065496-troubleshooting-your-custom-domain-setup)
- [Top tips for using a widget and a custom domain](https://help.tickettailor.com/en/articles/9361210-top-tips-for-using-a-widget-and-a-custom-domain)

---

## 2. Test on a deployed environment, not localhost

**In-page checkout can never work on `localhost`** - it can't share a
registrable domain with the Ticket Tailor host, so cookies are third-party no
matter what. You will *always* see the "new tab" message locally.

So: test this specific behavior on a Vercel Preview or Production deploy.
Everything else (ticket data, the wizard, the demographics form, the modal
itself) works fine locally.

Whichever deployed URL you use, add it to **Auth0** - Application Settings →
Allowed Callback URLs (`{url}/auth/callback`), Allowed Logout URLs, and
Allowed Web Origins. Without this the wizard can't sign anyone in.

---

## 3. Webhook (required for auto-linking a purchase to an account)

Without this, a purchase never gets linked to the buyer's CUSEC account -
they'd stay stuck on the purchase step and have to link their email by hand
later.

1. **Ticket Tailor dashboard** → Settings → API → Webhooks → add:
   - **URL:** `https://<your-deployed-domain>/api/ticket-tailor/webhook`
   - **Event:** `order.created`
2. Copy the **signing secret** it shows you into Vercel:
   ```
   TICKET_TAILOR_WEBHOOK_SECRET=<the signing secret>
   ```
   This is a real secret - never `NEXT_PUBLIC_`.
3. Use the dashboard's **"Send test webhook"** button, then confirm a
   document appeared in the `RegisteredUser` collection in Mongo.

> Locally you can exercise this without Ticket Tailor at all:
> `node scripts/test-ticket-webhook.mjs someone@example.com "Some Name"`
> (set `TICKET_TAILOR_WEBHOOK_SECRET` to any string that matches
> `.env.local`).

---

## 4. Real event + Stripe (before actually selling)

The current event is a $0 test event. Before real sales:

- Create the **real** CUSEC 2027 event with its real ticket types/prices.
- Connect **Stripe** under Box Office Settings → Payment Systems. Required
  before any paid ticket can be purchased; money goes buyer → CUSEC's Stripe
  directly, Ticket Tailor never holds it.
- Update the env vars to the real event (see below).

---

## Environment variable reference

Set in Vercel (Production + Preview), and `.env.local` for local dev:

| Variable | Where to find it | Notes |
|---|---|---|
| `TICKET_TAILOR_API_KEY` | Box Office Settings → API | Read-only scope is enough. Server-side only. |
| `TICKET_TAILOR_EVENT_ID` | The number in the public event URL, e.g. `2329159` in `buytickets.at/cusec/2329159` | **Public** id. Not the internal `ev_...` id. |
| `TICKET_TAILOR_BOX_OFFICE_NAME` | The slug in that same URL - `cusec` | The URL slug, **not** the display name. |
| `TICKET_TAILOR_CUSTOM_DOMAIN` | Item 1 above | Blank = checkout opens in a new tab. |
| `TICKET_TAILOR_WEBHOOK_SECRET` | Item 3 above | Real secret. |

Leaving `TICKET_TAILOR_API_KEY` / `TICKET_TAILOR_EVENT_ID` unset makes the
site render mock $0 tickets - useful for local UI work with no account.

---

## Quick status check

| Need | Status |
|---|---|
| API key + event configured | ✅ done (test event) |
| Webhook secret set locally | ✅ done (dev placeholder) |
| Webhook registered in Ticket Tailor dashboard | ❌ **todo** |
| Custom domain + CNAME | ❌ **todo** - blocks in-page checkout |
| Tested on deployed environment | ❌ **todo** |
| Stripe connected | ❌ todo (only needed for paid tickets) |
| Real 2027 event created | ❌ todo |
