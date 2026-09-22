import { NextRequest, NextResponse } from "next/server";
import { ATTRIBUTION_COOKIE_MAX_AGE_SECONDS, ATTRIBUTION_COOKIE_NAME, decodePendingAttribution, mergePendingTouch, pickTouch } from "@/lib/attribution";
import { campaignLandingUrl, type CampaignChannel } from "@/lib/campaigns";
import { Campaign } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-f0-9]{16}$/.test(id)) return new Response("Not found", { status: 404 });

  try {
    await connectMongoDB();
    const campaign = await Campaign.findOneAndUpdate(
      { id },
      { $inc: { visits: 1 } },
      { new: false },
    ).lean<{ destination: string; id: string; channel: CampaignChannel }>();
    if (!campaign) return new Response("Not found", { status: 404 });

    const requestUrl = new URL(request.url);
    const target = campaignLandingUrl(
      requestUrl.origin,
      campaign.destination,
      campaign.id,
      campaign.channel,
    );
    const touch = pickTouch({
      params: target.searchParams,
      referrer: request.headers.get("referer"),
      siteHost: requestUrl.hostname,
      landingPath: target.pathname,
    });
    const pending = decodePendingAttribution(request.cookies.get(ATTRIBUTION_COOKIE_NAME)?.value);
    const response = NextResponse.redirect(target, 307);
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(ATTRIBUTION_COOKIE_NAME, JSON.stringify(mergePendingTouch(pending, touch)), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" && requestUrl.protocol === "https:",
      path: "/",
      maxAge: ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    console.error("Campaign redirect failed:", error);
    return new Response("Link temporarily unavailable", { status: 503 });
  }
}
