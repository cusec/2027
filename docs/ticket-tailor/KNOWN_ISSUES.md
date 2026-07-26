# Known Issues, Unverified Assumptions & Corrections

A running record of what's wrong, unproven, or likely to bite later in the
Ticket Tailor integration. `TICKET_INTEGRATION.md` is the architecture,
`REQUIRED.md` is the setup checklist — this is the "things to be careful
about" list.

---

## A. Corrections made to `REQUIRED.md` after verifying against Ticket Tailor's docs

The DNS steps were originally written from reasoning rather than sourced from
Ticket Tailor. Checking them against the real docs turned up three problems.
All three are **already fixed** in `REQUIRED.md`; recorded here so the same
mistakes don't get reintroduced.

### A1. Hostname advice was backwards ❌ → ✅ fixed

- **Was:** "most registrars want only the subdomain part (`tickets.2027`)."
- **Actually:** Ticket Tailor states most hosts want the **full** record
  (`tickets.2027.cusec.net`); only *some* auto-append the domain.
- **Why it mattered:** following the wrong convention silently creates
  `tickets.2027.cusec.net.cusec.net`, which resolves to nothing and looks
  like a propagation delay rather than a typo.

### A2. TXT records were omitted entirely ❌ → ✅ fixed

- **Was:** doc described only a CNAME.
- **Actually:** the dashboard can show up to **3 records** — the CNAME plus
  TXT verification records. Seeing only 2 is fine (a missing TXT means it's
  already verified).
- **Why it mattered:** whoever does the DNS work would have added the CNAME
  only and assumed they were done.

### A3. Cloudflare claim was stated as fact but wasn't sourced ⚠️ → ✅ relabelled

- **Was:** "Proxying breaks Ticket Tailor's certificate issuance," phrased as
  if it came from their docs.
- **Actually:** not documented by Ticket Tailor anywhere. It remains sound
  general advice — proxying a hostname whose TLS cert is issued by a third
  party commonly breaks their validation — so it's kept, but now explicitly
  labelled as general DNS advice, deferring to TT support if they disagree.

**Sources used:** [Add custom domain](https://help.tickettailor.com/en/articles/6758421-how-can-i-add-my-custom-domain-to-my-box-office) ·
[Troubleshooting custom domain](https://help.tickettailor.com/en/articles/8065496-troubleshooting-your-custom-domain-setup) ·
[Widget + custom domain tips](https://help.tickettailor.com/en/articles/9361210-top-tips-for-using-a-widget-and-a-custom-domain)

---

## B. Unverified assumptions still live in the code

Things that work today but rest on a guess. Each notes how to confirm and
what to change if the guess is wrong.

### B1. Custom-domain URL path

`getTicketWidgetConfig()` (`src/lib/ticketTailor.ts`) builds
`https://{custom-domain}/events/{slug}/{event-id}`. Ticket Tailor's docs
never state the path format used on custom domains.

**Confirm:** once the domain is Active, open the box office on it and look at
a real event URL. **If wrong:** one-line change in `getTicketWidgetConfig()`.

### B2. Webhook → auto-link has never run end-to-end

The `order.created` payload field names *are* confirmed (read from real
orders via `GET /v1/orders`), and the webhook route is unit-testable via
`scripts/test-ticket-webhook.mjs`. But a genuine
purchase → webhook → auto-link → confirmation round trip has never been
observed, because the webhook isn't registered in the dashboard yet.

**Confirm:** register the webhook (`REQUIRED.md` §3), make a $0 purchase,
watch the purchase step flip to confirmed on its own.

> Lower-stakes than it sounds: the API reconciliation path (§B3) covers the
> same ground independently, so a broken webhook is not a single point of
> failure.

### B3. `email=` filter on `GET /v1/orders` is undocumented

`findCompletedOrderByEmail()` relies on a server-side `email=` query param
that isn't in Ticket Tailor's public API docs. Verified empirically:
real address → only that buyer's orders; realistic non-existent address → 0
results.

**The trap:** for a *malformed* address the filter is silently **dropped**
and the endpoint returns unrelated orders — which would read as "this person
has a ticket." Guarded by validating the address before querying, and by
requiring the matched order to be `completed` **and** belong to the
configured event. Don't remove either guard.

### B4. Buyer PII is masked on the current API key

`GET /v1/orders` returns `email`/`name` as `****`. That's why matching goes
through the server-side filter rather than reading the address back.

**Consequence:** if the key is ever regenerated with different scopes, or TT
changes masking behaviour, revisit `findCompletedOrderByEmail()` — it may
become possible (and more robust) to match on the returned email directly.

---

## C. Known weaknesses in current behaviour

### C1. "Purchased" card matching is name-based

`TicketsSection` decides which card shows **Purchased** by comparing the
order's `line_items[].description` against the ticket type name. Ticket
Tailor prefixes descriptions in real data — actual examples seen:
`"UManitoba Tickets - UManitoba General Admission"`,
`"TEST GROUP - General Admission (TEST BUNDLE)"`.

**Better fix, already half-done:** `ticketWizard.purchasedTicketTypeId` is
stored on the user. Compare that to the ticket's `id` instead. Swap it in the
moment this misbehaves.

### C2. Demographics draft is kept in localStorage ✅ fixed, with a tradeoff

The 5-sub-step survey only saves to the server on final submit, so a refresh
used to wipe every answer. `DemographicsForm` now writes a draft (answers +
current sub-step) to `localStorage` on every change and restores it on mount.

**Accepted tradeoff:** this puts confidential survey data — legal name, both
email addresses, university, dietary restrictions — into browser storage:
unencrypted, readable by any script on our origin, and persistent on shared
machines even after logout. A server-side partial-save would avoid that
entirely (the data already lives in Mongo behind session auth) but needs a
draft state in the API. localStorage was chosen for speed.

**Mitigations in place:**
- Key is namespaced per user (`cusec:demographics-draft:{userId}`), so a
  shared browser can't leak one account's draft into another's form.
- Cleared immediately on successful submit.

**Still worth doing if this data gets more sensitive:** clear the key on
logout too, and/or exclude `dietaryRestrictions` from what's persisted (it
can imply religion or medical conditions).

**Implementation note:** restore runs in a `useEffect`, not a lazy `useState`
initializer — the component is server-rendered, so touching `localStorage`
during render would desync client and server HTML. A `restored` flag gates
the save effect so the empty initial state can't clobber a saved draft on
first mount.

### C3. Linking is two non-transactional writes

`linkTicketPurchase()` saves `User` then `RegisteredUser` separately (as does
the pre-existing `/api/users/link-email`). A crash between them leaves
`User.linked_email` set while `RegisteredUser.isLinked` is still false.

**Impact:** low — `/scavenger` re-derives `emailVerified` from
`RegisteredUser` live, so the user simply appears unlinked and can retry.
**Proper fix:** wrap both in a Mongo session/transaction.

### C4. Avatar step is a placeholder

`AvatarCustomize` is a stub with a Continue button. `ticketWizard.avatarCompletedAt`
is genuinely recorded, so wizard progress/resumption works — there's just no
avatar data yet. When it's built, add an `avatarConfig` field (see
`SCAVENGER_SETUP.md` §7).

### C5. "Pick 3 events" list is placeholder content

`EXCITED_EVENT_OPTIONS` in `src/lib/ticketWizardOptions.ts` is invented — the
real schedule doesn't exist yet. Responses collected before it's replaced
will reference events that may never happen.

---

## D. Out of scope / not built

- **HD bulk-purchase flow.** The second flow in `ticket-tailor-flow.png`
- **In-page checkout without an iframe.** Investigated and rejected: Ticket
  Tailor's API has no payment/card-charging endpoint at all (orders are
  read/update only; `POST /issued_tickets` mints a ticket but takes no
  money). A fully custom checkout would mean integrating Stripe directly and
  becoming the merchant of record — owning refunds, inventory holds, tax,
  SCA, and the risk of charging without issuing. Not worth it for a
  properly-configured iframe. See `TICKET_INTEGRATION.md`.
