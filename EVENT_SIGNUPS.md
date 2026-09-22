# Event QR signups

After deployment, a signed-in person with a verified `@cusec.net` email or the Auth0 Admin role can open `/admin`, choose Event links, enter an event name and date, and copy the signup URL. Use that URL in a QR code. Generating another link needs no code change or MR. The dashboard also links Admins to CSV export and Admins or Volunteers to the scavenger dashboard. Those existing tools still require their Auth0 roles.

For example, a September 24 Montréal event could use:

`https://2027.cusec.net/meet?event=montreal-2026-09-24`

The event ID is generated from the name and date using lowercase letters, numbers, and hyphens. It is stored with each signup; no event setup step is required. Email and opt-in are required, name is optional. The `EventSignup` MongoDB collection stores event ID, normalized email, name, consent time, and creation time. A repeated email at the same event appears once; the same email at different events creates a record for each event.

On Vercel previews, the generator uses the branch URL for its QR destination and Auth0 uses the visited preview host for its callback. Use a separate Auth0 application for Vercel Preview with `https://2027-*-my-team-f7153810.vercel.app/auth/callback` in Allowed Callback URLs and `https://2027-*-my-team-f7153810.vercel.app` in Allowed Logout URLs and Allowed Web Origins. Add that application's credentials as `AUTH0_PREVIEW_CLIENT_ID` and `AUTH0_PREVIEW_CLIENT_SECRET` in Vercel's Preview environment; the existing `AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET` stay untouched. Keep the production Auth0 application's callback URLs exact. Outside preview, the generator uses `NEXT_PUBLIC_SITE_URL` and falls back to `https://2027.cusec.net`.

An Admin can download all signups at `/api/admin/event-signups` or one event at `/api/admin/event-signups?event=montreal-2026-09-24`. The response is a CSV with event, email, name, and consent time. Open the URL while signed in with the Admin role. The form does not send email; use the export for the later invitation campaign.

Before printing a QR code, open its exact URL on a phone, submit a test address, and confirm that its row appears in the Admin CSV. Use the production deployment with its configured `MONGODB_URI`.
