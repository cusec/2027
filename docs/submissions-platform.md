# Challenge Submission Platform

Delegates submit **links** to videos (YouTube / TikTok / etc.) for challenges
that each event hosts itself. Tech does not host the challenges — the only
requirement is collecting the links. Source: `TECHxEVENTS.txt` (Franklin).

Built on `feature/challenge-submissions`, branched off `staging`.

---

## What is in scope

- Admins create/edit/delete **challenges** (title, event, description,
  **point value**, **individual or group mode**, optional open/close window,
  optional submission cap).
- Delegates open **one central page** (`/scavenger/submissions`), pick a challenge, and
  submit a link.
- Admins review submissions per challenge and mark them
  `pending` / `approved` / `rejected`. **Approving credits the challenge's
  points to the delegate.**

**Not built:** file uploads. Links only.

---

## Environment

| Variable | Required | Notes |
|---|---|---|
| `SUBMISSIONS_ENABLED` | ✅ | `"true"` opens `/scavenger/submissions` to all logged-in delegates. Anything else, and only Admin/Volunteer can reach it. |

Deliberately **separate from `SCAVENGER_HUNT_ENABLED`** so submissions can open
on submission day without also opening the hunt.

Everything else (MongoDB, Auth0, roles) is shared with the scavenger hunt — see
`SCAVENGER_SETUP.md`. No new services and no new dependencies.

---

## Group challenges (Dev's Den)

A challenge is `individual` (default) or `group`. Group challenges are answered
**once per team** rather than once per delegate; everything else — points,
review, activation windows, caps — behaves identically.

**Teams are global, not per-challenge.** You form one once and it can submit to
any group challenge, because a team is a real-world unit rather than a
per-task grouping. Capped at `MAX_TEAM_SIZE` (4, `src/lib/challenges.ts`).

**There is no leader role.** Any member can post the team's entry, and any
member can edit or withdraw it — otherwise a team is stuck whenever whoever
submitted goes offline. The submitter shown is simply whoever last saved it.
The "only one person submits" rule is enforced as *one entry exists*, not *one
person is allowed*.

Delegates create a team, join one with space from the browse list, or join by
its **join code**. Codes avoid `O/0/I/1/L` so they can be read aloud.

| Route | Purpose |
|---|---|
| `GET /api/teams` | every team, plus the caller's own and the size cap |
| `POST /api/teams` | create a team and join it |
| `POST /api/teams/join` | join by `teamId` or `joinCode` |
| `POST /api/teams/leave` | leave; the last member out deletes the team |

**Enforcement.** One entry per team per challenge is a **partial unique index**
on `{ challengeId, teamId }` — partial so individual submissions (`teamId`
null) don't collide with each other. Joining re-reads team size after the write
and rolls back if two people filled the last seat at once. Leaving is blocked
once the team has submitted, so work isn't orphaned; an organizer can override.

One team per delegate at a time: create and join both refuse if you're already
on one.

---

## Points

Each challenge carries a `points` value. Approving a submission adds it to the
delegate's `User.points` — the same field the hunt and shop use — and records
the amount on the submission as `pointsAwarded`.

**Points are never removed automatically.** Rejecting, resetting, or deleting an
already-approved submission leaves the delegate's total untouched and instead
returns a `warning` naming the exact amount, which the admin modal shows as a
"Manual points adjustment required" banner. The admin deducts it in Manage
Users.

The reason is that an automatic claw-back can drive a delegate negative or
silently undo points they have already spent in the shop. Keeping a human in
the loop is deliberate.

Because of that policy, an **approved submission is locked**: the delegate can
no longer edit or withdraw it (both return 400). Otherwise a delegate could
bank the points and then remove the evidence. Admins can still change or delete
it, and get the warning when they do.

Changing a challenge's `points` does **not** re-score submissions already
approved — those delegates keep what they were granted. Both admin forms say so
inline.

---

## Data model — `src/lib/models.ts`

**`Challenge`** — `title`, `description`, `eventName`, `points`, `active`,
`activationStart`/`activationEnd`, `maxSubmissions` (null = unlimited),
`submissionCount`, `createdBy`.
The activation-window fields mirror `huntItemSchema`, so open/closed behaves
exactly like hunt items.

**`Submission`** — `challengeId`, `userId`, `userEmail`, `teamId` (group
entries only), `url`, `notes`, `status`, `pointsAwarded` (what approval actually granted; retained after a
revert so the warning can name the exact figure).
A **unique compound index on `{ challengeId, userId }`** is what enforces one
submission per delegate per challenge; re-submitting replaces the existing row
and resets its status to `pending`.

`submissionCount` is denormalised onto the challenge (incremented on create,
decremented on delete) because it drives the cap check.

---

## API

| Route | Methods | Access |
|---|---|---|
| `/api/challenges` | `GET`, `POST` | GET: any session (admins see inactive too) · POST: admin |
| `/api/challenges/[id]` | `GET`, `PUT`, `DELETE` | writes admin-only; DELETE also removes that challenge's submissions |
| `/api/challenges/[id]/submissions` | `GET` | admin |
| `/api/submissions` | `GET` (own), `POST` | any session |
| `/api/submissions/[id]` | `PUT`, `DELETE` | owner, or admin; **only admins may set `status`**; owners cannot touch an approved entry |

Auth follows the existing pattern exactly: `auth0.getSession()` → 401,
`isAdmin()` → 403, then `connectMongoDB()`. Admin mutations call
`logAdminAction`, so challenge and submission changes show up in the existing
Audit Logs modal (`resourceType` was extended with `challenge` / `submission`
in both `models.ts` and `adminAuditLogger.ts` — extend **both** or Mongoose
silently rejects the log write).

### Validation

Shared rules live in `src/lib/challenges.ts` so the delegate POST and the UI
agree on what "open" means:

- `isChallengeOpen` — active, inside the window, under the cap.
- `isValidSubmissionUrl` — parses as `http(s)`; rejects `javascript:` etc.
- `validateActivationWindow` — both dates or neither; end after start.

The cap gates **new** entries only — a delegate editing their existing
submission is never blocked by a full challenge.

`POST /api/submissions` also refuses outright when `SUBMISSIONS_ENABLED` is not
`"true"`, so the flag is enforced server-side and not just in the page gate.

---

## UI

**Delegate** — `src/app/[locale]/scavenger/submissions/page.tsx` (server
component, mirrors the sibling `/scavenger` page) renders `src/components/submissions/SubmissionsPage.tsx`.
Challenges are grouped by event. Each card has an inline form and shows the
delegate's current status. `submissionsDAO.ts` is the `useSubmissions()` hook.

Delegates reach the page from a **Submissions** button in the scavenger
dashboard's existing action row (`UserHunt.tsx`, next to Scan Item and
Inventory). It uses the i18n `Link`, never a bare `<a>`.

**Per-user** — Manage Users gains a **Submissions** button per row, opening
`users/UserSubmissionsModal.tsx`. It lists that delegate's submissions with the
challenge title, event, status and points granted, and lets an admin delete
one. Built on `GET`/`DELETE /api/admin/users/[userId]/submissions`, following
the same shape as the collectibles and shop-prizes routes (GET is Admin +
Volunteer, DELETE is Admin only). The DELETE is scoped to `{ _id, userId }` so
a stray id cannot reach another user's submission, decrements the challenge's
`submissionCount`, and returns the usual points warning.

**Admin** — `src/components/scavenger/admin/actions/challenges/`, cloning the
`huntItems/` folder pattern (Modal · List · AddForm · EditForm · Display · DAO)
plus `ChallengeSubmissionsModal.tsx` for review. Reached from the Admin Panel's
"Manage Challenges" button.

Like the rest of the authenticated app, this UI is **hardcoded English** — the
scavenger island uses no `next-intl` translations, and `messages/` only covers
the public marketing pages.

---

## Verifying

1. Assign yourself the `Admin` role in Auth0 (`SCAVENGER_SETUP.md` §3b).
2. `/scavenger` → Admin Panel → **Manage Challenges** → create one.
3. With `SUBMISSIONS_ENABLED=true`, open `/scavenger/submissions` as a delegate and
   submit a link.
4. Back in the admin modal, the entry should appear and be approvable.

Points specifically: approve a submission and confirm the delegate's total goes
up by the challenge's value; then reset it and confirm the total does **not**
drop and the amber "Manual points adjustment required" banner names the right
number.

Guard rails worth re-testing after any change: re-submitting replaces rather
than duplicates; an inactive or expired challenge rejects with 400; a non-admin
`POST /api/challenges` returns 403; a non-admin cannot set `status`; a delegate
cannot edit or withdraw an approved submission.
