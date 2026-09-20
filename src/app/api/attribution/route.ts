import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import {
  ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
  ATTRIBUTION_COOKIE_NAME,
  attachAttribution,
  decodePendingAttribution,
  mergePendingTouch,
  sanitizeTouch,
  type AttributionTouch,
} from "@/lib/attribution";

/**
 * Receives one sanitized acquisition touch per page load from the root
 * `AttributionCapture` client component and does two things:
 *
 *   1. Signed out: keeps the touch in a short-lived first-party cookie so it
 *      survives the Auth0 redirect (Auth0 bounces the browser off-site, so
 *      the touch cannot simply ride the return URL).
 *   2. Signed in: attaches the pending cookie's first touch to the Mongo user
 *      (firstTouch is set once, latestTouch moves only on a new acquisition)
 *      and clears the pending cookie.
 *
 * Best-effort by contract: attribution failures never fail the request, and
 * the response is always 200 so the client has nothing to retry.
 */
export async function POST(request: NextRequest) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    // no body - fall through with an empty touch
  }

  const touch: AttributionTouch = sanitizeTouch(body);

  // Mongo stores capturedAt as a Date; the cookie and the client payload
  // carry it as an ISO string.
  const asMongoTouch = (
    t: AttributionTouch,
  ): Omit<AttributionTouch, "capturedAt"> & { capturedAt: Date } => ({
    ...t,
    capturedAt: new Date(t.capturedAt),
  });

  try {
    const session = await auth0.getSession();
    const email = session?.user?.email;

    if (email) {
      const { default: connectMongoDB } = await import("@/lib/mongodb");
      const { User } = await import("@/lib/models");
      await connectMongoDB();

      const user = await User.findOne({ email });
      if (user) {
        const pending = decodePendingAttribution(
          request.cookies.get(ATTRIBUTION_COOKIE_NAME)?.value,
        );
        const applied = attachAttribution(
          user.attribution,
          pending
            ? {
                first: asMongoTouch(pending.first),
                latest: asMongoTouch(pending.latest),
              }
            : null,
          asMongoTouch(touch),
        );

        const changed =
          JSON.stringify(applied) !==
          JSON.stringify({
            firstTouch: user.attribution?.firstTouch ?? null,
            latestTouch: user.attribution?.latestTouch ?? null,
          });
        if (changed) {
          user.attribution = {
            firstTouch: applied.firstTouch,
            latestTouch: applied.latestTouch,
          };
          await user.save();
        }

        // Attached (or already there) - the pending cookie has served its
        // purpose. With no user record yet, keep it so a later page load can
        // still attach the touch.
        const response = NextResponse.json({ ok: true });
        response.cookies.delete(ATTRIBUTION_COOKIE_NAME);
        return response;
      }

      return NextResponse.json({ ok: true });
    }

    // Signed out: rotate the pending cookie. The first touch is pinned; the
    // latest moves only on a new campaign/referrer touch, never on an
    // internal navigation or a direct return.
    const pending = decodePendingAttribution(
      request.cookies.get(ATTRIBUTION_COOKIE_NAME)?.value,
    );
    const merged = mergePendingTouch(pending, touch);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ATTRIBUTION_COOKIE_NAME, JSON.stringify(merged), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    console.error("[attribution] failed to record touch:", error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
