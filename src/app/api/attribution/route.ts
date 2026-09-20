import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import {
  ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
  ATTRIBUTION_COOKIE_NAME,
  applyTouchToAttribution,
  decodePendingAttribution,
  isNewAcquisition,
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
        // A pending pre-auth touch outranks a fresh direct visit: the visitor
        // may have landed on a campaign and signed up on a later page load.
        // A fresh acquisition touch always outranks the pending one.
        const effective =
          isNewAcquisition(touch) || !pending?.first ? touch : pending.latest;
        const applied = applyTouchToAttribution(user.attribution, {
          ...effective,
          capturedAt: new Date(effective.capturedAt),
        });

        const firstChanged =
          JSON.stringify(applied.firstTouch) !==
          JSON.stringify(user.attribution?.firstTouch ?? null);
        const latestChanged =
          JSON.stringify(applied.latestTouch) !==
          JSON.stringify(user.attribution?.latestTouch ?? null);
        if (firstChanged || latestChanged) {
          user.attribution = {
            firstTouch: applied.firstTouch,
            latestTouch: applied.latestTouch,
          };
          await user.save();
        }
      }

      const response = NextResponse.json({ ok: true });
      response.cookies.delete(ATTRIBUTION_COOKIE_NAME);
      return response;
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
