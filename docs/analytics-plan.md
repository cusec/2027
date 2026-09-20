# Analytics implementation plan

Last reviewed: 2026-09-20

> **Update 2026-09-20 — Hobby plan, events moved to PostHog.** CUSEC's Vercel
> project is on **Hobby and staying there**, so Vercel custom events are not
> available. Vercel Web Analytics keeps **pageviews only** (`<Analytics />` in
> `src/app/layout.tsx`); do not add Speed Insights. The event catalog below is
> unchanged, but it is delivered through **PostHog** instead of
> `@vercel/analytics`:
>
> - `src/lib/analytics/client.ts` → `posthog-js`; `src/lib/analytics/server.ts`
>   → `posthog-node`. Every call site still uses `trackEvent` /
>   `trackServerEvent` with the same catalog, so the two-property budget and
>   controlled values hold.
> - Distinct ids are the random `User.analyticsId` UUID (never emails, Auth0
>   ids, or Mongo ids). `PostHogIdentify` stitches client events to the
>   server-side funnel on the ticket-flow pages.
> - Privacy-safe config: autocapture off, session recording off, pageview
>   capture off, `person_profiles: "identified_only"`. Events reach PostHog
>   through the same-origin `/ingest` rewrite proxy (ad-blocker resilient);
>   `/ingest` is excluded from the proxy.ts matcher.
> - Env vars: `NEXT_PUBLIC_POSTHOG_KEY` (required), `NEXT_PUBLIC_POSTHOG_HOST`
>   (optional, e.g. `https://eu.i.posthog.com` for EU hosting). Without a key
>   everything no-ops, so local dev stays clean.
> - The funnel below is still validated against **Mongo** (section timestamps,
>   `User.createdAt`, linked purchases) — PostHog is for the click-level
>   events Vercel could not hold, not a second source of truth.
> - Session replay remains deferred pending a privacy review.

## Decisions and constraints

- Vercel Web Analytics pageviews are installed globally through `<Analytics />` in `src/app/layout.tsx`.
- **Do not add Vercel Speed Insights.** It is intentionally out of scope.
- **Confirm the Vercel project is on Pro or Enterprise before implementing custom events.** Vercel custom events are not available on Hobby.
- Design every event for the base Pro limit of **two custom properties**. Web Analytics Plus raises this to eight, but the site should not require that add-on.
- Native UTM reporting is a Web Analytics Plus feature. Persist first-party attribution in Mongo instead of depending on that add-on.
- Event names use lowercase `snake_case`.
- Event properties must be low-cardinality strings, numbers, booleans, or `null`. Vercel does not support nested properties.
- Never send names, email addresses, Auth0 IDs, Mongo IDs, student IDs, free-text form answers, résumé data, or full URLs that may contain PII.
- Analytics failures must never fail authentication, profile saves, or ticket linking.

## Phase 0 — verify the base installation

- [ ] Enable Web Analytics for the production Vercel project, if it is not already enabled in the dashboard.
- [ ] Deploy the existing `<Analytics />` integration.
- [ ] Confirm production pageviews appear for `/`, `/speakers`, `/sponsors`, and `/tickets`.
- [ ] Confirm the Vercel plan supports custom events before starting Phase 1.
- [ ] Set a Web Analytics spend alert if the project is on Pro; pageviews and custom events are billable events.

## Phase 1 — event foundation

Create one small, typed analytics layer rather than importing `track()` throughout unrelated components.

- [ ] Define the approved event names and property shapes in a client-safe module.
- [ ] Add a best-effort server helper around `track` from `@vercel/analytics/server`; it must catch/report analytics delivery failures without breaking the primary operation.
- [ ] Add a small root client component that delegates clicks from elements carrying `data-analytics-event` attributes. This lets server components add tracking metadata without being converted into client components.
- [ ] Use direct `track()` calls only for interactions that already live in client components or require state, such as FAQ opens and checkout opening.
- [ ] Do not add one global tracker for every link. Track only interactions tied to a decision.
- [ ] In development, verify each event once and check that navigation does not cause duplicate sends.

### Initial event catalog

The table below is the recommended first release. Keep the exact two-property budget shown here.

| Event | Properties | Trigger | Integration point |
|---|---|---|---|
| `ticket_cta_clicked` | `location`, `destination` | A visitor clicks a ticket-intent CTA | `V2Hero.tsx`, `V2Nav.tsx` desktop/mobile, `V2Dawn.tsx`, `V2Closing.tsx`, `V2Passes.tsx` |
| `registration_started` | `location`, `method` | The logged-out `/tickets` signup CTA is clicked | `src/app/[locale]/tickets/page.tsx`; `method: auth0_signup` |
| `account_created` | `entry_point`, `method` | A new Mongo `User` is successfully created | `src/lib/userService.ts`; only inside the new-user branch |
| `registration_step_completed` | `step`, `flow` | A wizard section is successfully saved for the first time | `src/app/api/demographics/route.ts`; steps are `basics`, `background`, `goals`, `travel`, `experience`, `links` |
| `profile_completed` | `attendee_type`, `flow` | `basics` and `background` become complete for the first time | `src/app/api/demographics/route.ts`; use the controlled attendee-type option, never free text |
| `registration_completed` | `flow`, `next_step` | All six profile/interests sections first become complete | `src/app/api/demographics/route.ts`; completion means ready for purchase, not ticket purchased |
| `ticket_checkout_started` | `ticket_type`, `checkout_mode` | A ticket buy action opens or redirects to Ticket Tailor | `src/app/components/TicketWizard/PurchaseStepClient.tsx` / the ticket-card buy callback |
| `ticket_purchase_completed` | `ticket_type`, `completion_path` | A purchase is successfully linked to the account for the first time | `src/lib/ticketLinking.ts`, after both `User` and `RegisteredUser` are saved |
| `login_started` | `location`, `return_to` | A sign-in CTA is clicked | `SignInCard.tsx` and scavenger sign-in gates |
| `faq_opened` | `faq_id`, `page` | A closed FAQ item is opened | `src/app/components/v2/Faq/V2Faq.tsx`; use stable IDs such as `faq_1`, not translated question text |
| `social_clicked` | `platform`, `location` | A footer social link is clicked | `src/app/components/v2/Footer/V2Footer.tsx` |
| `contact_clicked` | `purpose`, `location` | A meaningful email/contact CTA is clicked | FAQ email, speaker pitch CTAs, and policy contact links |
| `sponsor_application_clicked` | `location`, `destination` | The sponsor application form is opened | `src/app/components/v2/Sponsors/V2SponsorsHero.tsx`; add other locations only when uncommented |

### Event semantics

- `ticket_cta_clicked` includes both scroll-to-passes CTAs and the final `/tickets` CTA. Distinguish them with `destination: passes` versus `destination: tickets`.
- `registration_step_completed` must fire only if `sections.<step>` was previously empty. A user editing and re-saving a section must not inflate the funnel.
- `registration_completed` means the attendee reached the purchase step. It does not mean payment succeeded.
- `ticket_purchase_completed` is the purchase conversion. Emit it in `linkTicketPurchase()`, not in the browser poll, so webhook, reconciliation, and manual claim paths share one source of truth.
- Add a `completion_path` argument to the linking call sites with controlled values such as `webhook`, `reconciliation`, or `claim`.
- Do not fire `ticket_purchase_completed` from the already-linked early-return branch.
- Use a stable ticket type ID or controlled category for `ticket_type`; do not send purchaser or order data.
- Do not emit a generic `external_link_clicked` for links that already emit `social_clicked`, `contact_clicked`, or `sponsor_application_clicked`. That would double-count one action.

## Phase 2 — first-party attribution

Vercel's aggregate analytics cannot by itself connect an anonymous campaign visit to a later Mongo attendee and Ticket Tailor purchase. Add first-party attribution specifically for that question.

### User schema

Add an `attribution` subdocument to `User` in `src/lib/models.ts` and its corresponding TypeScript shape in `src/lib/interface.ts`:

```text
attribution
  firstTouch
    source
    medium
    campaign
    content
    term
    referrerHost
    landingPath
    capturedAt
  latestTouch
    source
    medium
    campaign
    content
    term
    referrerHost
    landingPath
    capturedAt
```

Use `landingPath`, not a full URL. Store only the referrer's hostname. Limit every text field to a reasonable length.

### Capture and attachment

- [ ] Add a root attribution-capture client component.
- [ ] Whitelist `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and `utm_term`; never persist arbitrary query parameters.
- [ ] Send a sanitized touch to a same-origin route such as `POST /api/attribution`.
- [ ] Before authentication, retain the touch in a short, first-party cookie so it survives the Auth0 redirect.
- [ ] After authentication, have the route attach the cookie's first touch to the Mongo user and clear or rotate the pending cookie.
- [ ] Set `firstTouch` once. Update `latestTouch` only when a new campaign/referrer touch is present, not on every internal route change.
- [ ] Treat direct traffic as a real controlled value rather than leaving attribution ambiguous.
- [ ] Update `src/app/[locale]/(policy)/privacy-policy/page.tsx` to disclose campaign/referrer attribution, its purpose, and retention.
- [ ] Decide and document a retention period before launch.
- [ ] Add tests for first-touch immutability, latest-touch updates, field truncation, arbitrary-query rejection, and Auth0 redirect persistence.

Do **not** store a second copy of every Vercel event in Mongo. Mongo attribution should answer acquisition-to-account/ticket questions; Vercel should hold aggregate behavioral events.

## Phase 3 — error monitoring, separate from analytics

Custom analytics events are not an error-monitoring system. Add a dedicated service only after choosing its privacy and pricing policy.

Recommended scope for Sentry or an equivalent tool:

- uncaught browser exceptions;
- failed route handlers and server exceptions;
- profile section save failures;
- résumé upload/delete failures;
- Ticket Tailor API, webhook, checkout, and reconciliation failures;
- Auth0 callback/session errors;
- Mongo connection and write failures.

Implementation rules:

- [ ] Scrub email addresses, names, form answers, résumé metadata, Auth0 claims, and request bodies.
- [ ] Never attach the demographics payload to an error report.
- [ ] Add operation tags such as `profile_save`, `ticket_link`, and `ticket_tailor`, not user identifiers.
- [ ] Remove the existing email-heavy debug logging in `src/lib/userService.ts` before production monitoring is enabled.
- [ ] Remove or revise the profile-save log in `src/app/api/demographics/route.ts`; analytics/error logs should not identify a demographic record.
- [ ] Add explicit handling for the currently silent client failures in `profileAnswers.ts`, `ResumeUpload.tsx`, and purchase status polling.

## Deferred until the feature exists

Do not add placeholder events now. Add these alongside the corresponding product feature:

| Proposed event | Status in the current site |
|---|---|
| `speaker_clicked` / `speaker_card_viewed` | Speaker cards are currently commented out; `/speakers` only shows a coming-soon section. |
| `sponsor_clicked` / `sponsor_impression` | No confirmed sponsor logos are rendered; the current sponsor CTA is an application link. |
| `schedule_viewed` / `schedule_item_clicked` | No schedule frontend exists. The backend schedule route alone is not a user interaction. |
| `devs_den_clicked` / application events | No Devs Den UI or application flow exists. |
| `newsletter_signup` | No newsletter form exists. |
| `discord_clicked` | No public Discord CTA exists in the current v2 site. |
| `calendar_add_clicked` | No add-to-calendar control exists. |
| `share_clicked` | No share control exists. |
| search events | No site search exists. |
| sponsor/speaker exposure events | Wait for real cards and a reporting requirement. Define exposure as at least 50% visible for one second. |

When these features ship, use stable IDs rather than display names where possible. Never fire an impression merely because markup rendered.

## Events intentionally omitted initially

- `registration_viewed`: automatic `/tickets` pageviews already provide this.
- `login_completed`: the current Auth0 middleware/session flow has no single app-owned callback that is guaranteed to represent one completed login without duplicates. `account_created` is the useful conversion now. Add `login_completed` only after defining a reliable Auth0 callback/session deduplication rule.
- `navigation_clicked` and `footer_link_clicked`: pageviews already answer destination usage. Add these only if there is a concrete navigation question pageviews cannot answer.
- `mobile_menu_opened`: low decision value compared with the event cost.
- generic `external_link_clicked`: named events are more actionable and avoid double-counting.

## Session replay

Do not add PostHog/session replay as part of the initial analytics setup.

The ticket wizard contains confidential demographic fields and résumé handling, so replay needs a separate privacy review. If adopted later:

- mask all inputs and text by default;
- disable replay on `/tickets/**`, `/scavenger/**`, and policy-sensitive authenticated pages until explicitly reviewed;
- sample sessions rather than recording everyone;
- update the privacy policy and consent behavior;
- define a short retention period;
- do not use replay as a substitute for server-side conversion and error tracking.

## Reporting sequence

1. Collect at least a few weeks of clean pageview and funnel data.
2. Validate counts against Mongo section timestamps and Ticket Tailor completed orders.
3. Build acquisition-to-ticket reports from Mongo attribution plus linked purchase state.
4. Only then consider an internal dashboard or Vercel Web Analytics API integration.

The first useful funnel should be:

```text
/tickets viewed (automatic pageview)
  → registration_started
  → account_created
  → registration_step_completed: basics
  → registration_step_completed: background
  → profile_completed
  → registration_step_completed: goals/travel/experience/links
  → registration_completed
  → ticket_checkout_started
  → ticket_purchase_completed
```

## Validation checklist

- [ ] Every client click event fires once.
- [ ] Re-saving a wizard section does not emit another completion event.
- [ ] Webhook retries and reconciliation do not duplicate purchase completions.
- [ ] Failed API requests do not emit success events.
- [ ] Analytics delivery failures do not affect the primary request.
- [ ] Events contain no PII or free text.
- [ ] Every event has at most two properties.
- [ ] Attribution survives the Auth0 redirect.
- [ ] First touch never changes after it is set.
- [ ] Latest touch changes only on a new acquisition touch.
- [ ] English and French routes produce the same stable event names and values.
- [ ] Preview/development traffic is excluded from production analysis.

## Official Vercel references

- Custom events: https://vercel.com/docs/analytics/custom-events
- Web Analytics pricing and limits: https://vercel.com/docs/analytics/limits-and-pricing
- Server-side custom events: https://vercel.com/changelog/track-server-side-custom-events-with-vercel-web-analytics
