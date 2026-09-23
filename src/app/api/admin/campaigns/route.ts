import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { CAMPAIGN_CHANNELS, campaignDestination } from "@/lib/campaigns";
import { Campaign } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";
import { hasVerifiedCusecEmail } from "@/lib/staffAccess";

export async function POST(request: Request) {
  const session = await auth0.getSession();
  const user = session?.user;
  if (!user || !(user["cusec/roles"]?.includes("Admin") || hasVerifiedCusecEmail(user))) {
    return new Response("Forbidden", { status: 403 });
  }

  const form = await request.formData();
  const locale = form.get("locale") === "fr-CA" ? "fr-CA" : "en-CA";
  const name = String(form.get("name") ?? "").trim();
  const channel = String(form.get("channel") ?? "");
  const destination = campaignDestination(String(form.get("destination") ?? ""));
  const back = new URL(locale === "fr-CA" ? "/fr-CA/admin/campaigns" : "/admin/campaigns", request.url);

  if (!name || name.length > 100 || !CAMPAIGN_CHANNELS.some((value) => value === channel) || !destination) {
    back.searchParams.set("status", "invalid");
    return NextResponse.redirect(back, 303);
  }

  try {
    await connectMongoDB();
    const id = randomBytes(8).toString("hex");
    await Campaign.create({ id, name, channel, destination, createdBy: user.email, visits: 0 });
    back.searchParams.set("created", id);
    return NextResponse.redirect(back, 303);
  } catch (error) {
    console.error("Campaign creation failed:", error);
    back.searchParams.set("status", "error");
    return NextResponse.redirect(back, 303);
  }
}
